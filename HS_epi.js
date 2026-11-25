/* © 2026 BFS HSE — Jérémy Bizeul / Vigie-lance. Tous droits réservés. */
'use strict';
// Équipements de protection individuelle : types, dotations par agent.
const ETATS_EPI = { conforme: 'Conforme', a_verifier: 'À vérifier', a_remplacer: 'À remplacer', retire: 'Retiré' };
async function rendreEpi() {
  const zone = $('#contenu');
  zone.innerHTML = '<p class="vide">Chargement…</p>';
  const [{ data, error }] = await Promise.all([
    SB.from('epi_dotations').select('*, epi_types(nom,code)').eq('actif', true).order('date_peremption', { nullsFirst: false }),
    chargerEcheances()]);
  if (error) throw error;
  const pire = id => {
    const l = S.echeances.filter(e => e.epi_dotation_id === id).map(e => e.etat);
    return l.includes('en_retard') ? 'en_retard' : l.includes('a_venir') ? 'a_venir' : l.length ? 'ok' : null;
  };
  const titre = peutEcrire() ? 'Équipements de protection individuelle' : 'Mes EPI';
  zone.innerHTML = `
    <div class="barre"><h2>${titre}</h2>
      ${S.role === 'admin' ? '<button class="btn sec" onclick="formTypeEpi()">+ Type d\'EPI</button>' : ''}
      ${peutEcrire() ? '<button class="btn" onclick="formDotation()">+ Doter un agent</button>' : ''}</div>
    ${(data || []).length ? `<div class="tableau"><table>
      <thead><tr><th>EPI</th><th>Agent</th><th>N° de série</th><th>Mise en service</th><th>Péremption</th><th>État</th><th>Suivi</th></tr></thead>
      <tbody>${data.map(d => `<tr><td><b>${esc(d.epi_types ? d.epi_types.nom : '')}</b></td>
        <td>${esc(nomProfil(d.agent_id)) || (d.agent_id === (S.user && S.user.id) ? 'Moi' : '—')}</td>
        <td>${esc(d.numero_serie)}</td><td>${fmtDate(d.date_mise_en_service)}</td><td>${fmtDate(d.date_peremption)}</td>
        <td>${esc(ETATS_EPI[d.etat] || d.etat)}</td><td>${pire(d.id) ? badgeEtat(pire(d.id)) : '—'}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="vide">Aucun EPI à afficher.</p>'}`;
}
function formTypeEpi() {
  ouvrirModal(`<h3>Nouveau type d'EPI</h3>
    <form onsubmit="enregistrerTypeEpi(event)">
      <label>Code<input name="code" required placeholder="ex. casque_chantier"></label>
      <label>Nom<input name="nom" required placeholder="ex. Casque de chantier"></label>
      <label>Famille<input name="famille" placeholder="ex. Protection de la tête"></label>
      <label>Vérification périodique<select name="verif"><option value="true">Oui</option><option value="false">Non</option></select></label>
      <div class="actions"><button type="button" class="btn sec" onclick="fermerModal()">Annuler</button><button class="btn">Enregistrer</button></div>
    </form>`);
}
async function enregistrerTypeEpi(ev) {
  ev.preventDefault();
  const f = ev.target.elements;
  const { error } = await SB.from('epi_types').insert({
    code: f.code.value.trim(), nom: f.nom.value.trim(), famille: f.famille.value.trim() || null,
    verification_periodique: f.verif.value === 'true' });
  if (error) { toast(messageLisible(error), false); return; }
  fermerModal(); toast("Type d'EPI créé");
}
async function formDotation() {
  const { data: types } = await SB.from('epi_types').select('id,nom,verification_periodique').eq('actif', true).order('nom');
  if (!(types || []).length) { toast("Créez d'abord un type d'EPI.", false); return; }
  ouvrirModal(`<h3>Doter un agent</h3>
    <form onsubmit="enregistrerDotation(event)">
      <label>EPI<select name="type">${types.map(t => `<option value="${esc(t.id)}" data-verif="${t.verification_periodique}">${esc(t.nom)}</option>`).join('')}</select></label>
      <label>Agent<select name="agent">${optionsProfils('')}</select></label>
      <label>N° de série<input name="serie"></label>
      <label>Mise en service<input type="date" name="mes" value="${aujourdhui()}"></label>
      <label>Date de péremption <small>(si applicable)</small><input type="date" name="per"></label>
      <div class="actions"><button type="button" class="btn sec" onclick="fermerModal()">Annuler</button><button class="btn">Enregistrer</button></div>
    </form>`);
}
async function enregistrerDotation(ev) {
  ev.preventDefault();
  const f = ev.target.elements;
  const verif = f.type.selectedOptions[0].dataset.verif === 'true';
  const ligne = { type_id: f.type.value, agent_id: f.agent.value || null, numero_serie: f.serie.value.trim() || null,
    date_mise_en_service: f.mes.value || null, date_peremption: f.per.value || null };
  const { data, error } = await SB.from('epi_dotations').insert(ligne).select('id').single();
  if (error) { toast(messageLisible(error), false); return; }
  const { data: types } = await SB.from('types_echeance').select('id,code').in('code', ['verif_epi_annuelle', 'peremption_epi']);
  const lignes = [];
  (types || []).forEach(t => {
    if (t.code === 'verif_epi_annuelle' && verif) lignes.push({ type_id: t.id, epi_dotation_id: data.id, reference_date: ligne.date_mise_en_service || aujourdhui() });
    if (t.code === 'peremption_epi' && ligne.date_peremption) lignes.push({ type_id: t.id, epi_dotation_id: data.id, date_fixe: ligne.date_peremption });
  });
  if (lignes.length) { const r = await SB.from('echeances').insert(lignes); if (r.error) toast(messageLisible(r.error), false); }
  fermerModal(); toast('Dotation enregistrée'); rafraichir();
}
