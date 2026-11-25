/* © 2026 BFS HSE — Jérémy Bizeul / Vigie-lance. Tous droits réservés. */
'use strict';
// Tableau des échéances (véhicules et EPI) + saisie d'une intervention.
async function chargerEcheances() {
  const { data, error } = await SB.from('v_echeances_etat').select('*');
  if (error) throw error;
  const ordre = { en_retard: 0, a_venir: 1, ok: 2 };
  S.echeances = (data || []).sort((a, b) =>
    (ordre[a.etat] - ordre[b.etat]) || ((a.jours_restants ?? 99999) - (b.jours_restants ?? 99999)));
  return S.echeances;
}
function texteReste(r) {
  const p = [];
  if (r.jours_restants != null) p.push(r.jours_restants < 0 ? `retard de ${-r.jours_restants} j` : `dans ${r.jours_restants} j`);
  if (r.km_restants != null) p.push(r.km_restants < 0 ? `${fmtKm(-r.km_restants)} dépassés` : `${fmtKm(r.km_restants)} restants`);
  return p.join(' · ') || '—';
}
function texteProchaine(r) {
  const p = [];
  if (r.saison_debut) p.push('saison du ' + fmtDate(r.saison_debut));
  else if (r.date_echeance) p.push(fmtDate(r.date_echeance));
  if (r.km_echeance != null) p.push(fmtKm(r.km_echeance));
  return p.join(' · ') || '—';
}
function ligneEcheance(r, avecCible = true) {
  return `<tr class="${r.etat}">
    ${avecCible ? `<td><b>${esc(r.cible_libelle)}</b></td>` : ''}
    <td>${esc(r.type_nom)}</td>
    <td>${fmtDate(r.derniere_date)}${r.dernier_km != null ? '<br><small>' + fmtKm(r.dernier_km) + '</small>' : ''}</td>
    <td>${texteProchaine(r)}</td>
    <td>${esc(texteReste(r))}</td>
    <td>${badgeEtat(r.etat)}</td>
    <td>${(peutEcrire() || r.cible_type === 'plateau') ? `<button class="btn petit" onclick="ouvrirIntervention('${esc(r.echeance_id)}')">Saisir</button>` : ''}</td>
  </tr>`;
}
async function rendreEcheances() {
  const zone = $('#contenu');
  zone.innerHTML = '<p class="vide">Chargement…</p>';
  await chargerEcheances();
  const n = e => S.echeances.filter(r => r.etat === e).length;
  const f = S.filtre;
  const lignes = S.echeances.filter(r => f === 'tous' || r.etat === f);
  zone.innerHTML = `
    <div class="kpis">
      <button class="kpi ret${f === 'en_retard' ? ' actif' : ''}" onclick="filtrer('en_retard')"><b>${n('en_retard')}</b>En retard</button>
      <button class="kpi av${f === 'a_venir' ? ' actif' : ''}" onclick="filtrer('a_venir')"><b>${n('a_venir')}</b>À venir</button>
      <button class="kpi ok${f === 'ok' ? ' actif' : ''}" onclick="filtrer('ok')"><b>${n('ok')}</b>À jour</button>
      <button class="kpi${f === 'tous' ? ' actif' : ''}" onclick="filtrer('tous')"><b>${S.echeances.length}</b>Tout</button>
    </div>
    ${lignes.length ? `<div class="tableau"><table>
      <thead><tr><th>Élément</th><th>Échéance</th><th>Dernière</th><th>Prochaine</th><th>Reste</th><th>État</th><th></th></tr></thead>
      <tbody>${lignes.map(r => ligneEcheance(r)).join('')}</tbody></table></div>`
      : '<p class="vide">Aucune échéance à afficher.</p>'}`;
}
function filtrer(f) { S.filtre = f; rendreEcheances().catch(e => toast(messageLisible(e), false)); }

function ouvrirIntervention(id) {
  const r = S.echeances.find(x => x.echeance_id === id);
  if (!r) return;
  const estVehicule = r.cible_type === 'vehicule';
  const estEpi = r.cible_type === 'epi';
  const estPlateau = r.cible_type === 'plateau';
  const perem = /^peremption/.test(r.type_code);
  const opt = (v, l, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${l}</option>`;
  const nature = estEpi
    ? opt('vgp', 'Vérification générale périodique', r.type_code === 'verif_epi_annuelle') + opt('approfondie', 'Vérification approfondie') + opt('avant_usage', 'Contrôle avant usage') + opt('autre', 'Autre')
    : opt('visuelle', 'Inspection visuelle', /visuelle$/.test(r.type_code)) + opt('vgp', 'Vérification périodique', !/visuelle$/.test(r.type_code) && !perem)
      + opt('approfondie', 'Vérification approfondie') + opt('entretien', 'Entretien / remplacement', perem) + opt('autre', 'Autre');
  ouvrirModal(`
    <h3>Saisir une intervention</h3>
    <p class="sous">${esc(r.type_nom)} — <b>${esc(r.cible_libelle)}</b></p>
    <form onsubmit="enregistrerIntervention(event,'${esc(id)}')">
      <label>Date<input type="date" name="date" value="${aujourdhui()}" required></label>
      ${estVehicule ? `<label>Kilométrage <small>(dernier relevé : ${fmtKm(r.km_actuel)})</small>
        <input type="number" name="km" min="0" inputmode="numeric" required></label>` : ''}
      <label>Réalisé par<input type="text" name="par" value="${estVehicule ? '' : esc(S.nomMoi)}" placeholder="Garage, agent, organisme…"></label>
      ${(estEpi || estPlateau) ? `<label>Nature de l'intervention<select name="nature">${nature}</select></label>
        <label>Résultat<select name="resultat"><option value="conforme">Conforme</option>
        <option value="a_remplacer">À remplacer</option><option value="retire">Retiré</option></select></label>` : ''}
      ${perem ? '<label>Nouvelle date de péremption <small>(si le produit a été remplacé)</small><input type="date" name="nouvelle"></label>' : ''}
      <label>Commentaire<textarea name="com" rows="2"></textarea></label>
      <div class="actions"><button type="button" class="btn sec" onclick="fermerModal()">Annuler</button>
      <button class="btn">Enregistrer</button></div>
    </form>`);
}
async function enregistrerIntervention(ev, echeanceId) {
  ev.preventDefault();
  const f = ev.target, v = n => (f.elements[n] ? f.elements[n].value.trim() : '');
  const ligne = {
    echeance_id: echeanceId,
    date_intervention: v('date'),
    km: v('km') === '' ? null : parseInt(v('km'), 10),
    realise_par: v('par') || null,
    commentaire: v('com') || null,
    resultat: v('resultat') || null,
    nature: v('nature') || null,
    nouvelle_date_fixe: v('nouvelle') || null
  };
  const { error } = await SB.from('interventions').insert(ligne);
  if (error) { toast(messageLisible(error), false); return; }
  fermerModal();
  toast('Intervention enregistrée');
  rafraichir();
}
