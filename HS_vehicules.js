/* © 2026 BFS HSE — Jérémy Bizeul / Vigie-lance. Tous droits réservés. */
'use strict';
// Registre des véhicules et remorques, fiche détaillée.
async function rendreVehicules() {
  const zone = $('#contenu');
  zone.innerHTML = '<p class="vide">Chargement…</p>';
  const [{ data, error }] = await Promise.all([
    SB.from('vehicules').select('*').order('immatriculation'), chargerEcheances()]);
  if (error) throw error;
  const pire = id => {
    const l = S.echeances.filter(e => e.vehicule_id === id).map(e => e.etat);
    return l.includes('en_retard') ? 'en_retard' : l.includes('a_venir') ? 'a_venir' : l.length ? 'ok' : null;
  };
  zone.innerHTML = `
    <div class="barre"><h2>Véhicules et remorques</h2>
      ${peutEcrire() ? '<button class="btn" onclick="formVehicule()">+ Ajouter</button>' : ''}</div>
    ${(data || []).length ? `<div class="tableau"><table>
      <thead><tr><th>Immatriculation</th><th>Type</th><th>Désignation</th><th>Conducteur</th><th>Km</th><th>État</th></tr></thead>
      <tbody>${data.map(v => `<tr class="cliquable" onclick="ficheVehicule('${esc(v.id)}')">
        <td><b>${esc(v.immatriculation)}</b></td><td>${v.type === 'remorque' ? 'Remorque' : 'Véhicule'}</td>
        <td>${esc([v.marque, v.modele, v.designation].filter(Boolean).join(' '))}</td>
        <td>${esc(nomProfil(v.conducteur_id))}</td><td>${fmtKm(v.km_actuel)}</td>
        <td>${pire(v.id) ? badgeEtat(pire(v.id)) : '—'}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="vide">Aucun véhicule enregistré.</p>'}`;
}
async function formVehicule(id) {
  let v = {};
  if (id) { const r = await SB.from('vehicules').select('*').eq('id', id).single(); v = r.data || {}; }
  ouvrirModal(`
    <h3>${id ? 'Modifier' : 'Ajouter'} un véhicule</h3>
    <form onsubmit="enregistrerVehicule(event,${id ? `'${esc(id)}'` : 'null'})">
      <label>Type<select name="type" ${id ? 'disabled' : ''}>
        <option value="vehicule"${v.type !== 'remorque' ? ' selected' : ''}>Véhicule</option>
        <option value="remorque"${v.type === 'remorque' ? ' selected' : ''}>Remorque</option></select></label>
      <label>Immatriculation<input name="immat" value="${esc(v.immatriculation)}" required></label>
      <label>Marque<input name="marque" value="${esc(v.marque)}"></label>
      <label>Modèle<input name="modele" value="${esc(v.modele)}"></label>
      <label>Désignation<input name="desig" value="${esc(v.designation)}" placeholder="ex. Camion atelier"></label>
      <label>Conducteur habituel<select name="cond">${optionsProfils(v.conducteur_id)}</select></label>
      ${id ? '' : '<label>Kilométrage actuel <small>(véhicule uniquement)</small><input type="number" name="km" min="0"></label>'}
      <div class="actions"><button type="button" class="btn sec" onclick="fermerModal()">Annuler</button>
      <button class="btn">Enregistrer</button></div>
    </form>`);
}
async function enregistrerVehicule(ev, id) {
  ev.preventDefault();
  const f = ev.target, v = n => (f.elements[n] ? f.elements[n].value.trim() : '');
  const ligne = {
    immatriculation: v('immat').toUpperCase(), marque: v('marque') || null, modele: v('modele') || null,
    designation: v('desig') || null, conducteur_id: v('cond') || null
  };
  if (id) {
    const { error } = await SB.from('vehicules').update(ligne).eq('id', id);
    if (error) { toast(messageLisible(error), false); return; }
  } else {
    ligne.type = v('type');
    if (ligne.type === 'vehicule' && v('km') !== '') { ligne.km_actuel = parseInt(v('km'), 10); ligne.km_releve_le = new Date().toISOString(); }
    const { data, error } = await SB.from('vehicules').insert(ligne).select('id').single();
    if (error) { toast(messageLisible(error), false); return; }
    // Création automatique des échéances applicables à ce type de véhicule
    const { data: types } = await SB.from('types_echeance').select('id,cibles').eq('actif', true);
    const lignes = (types || []).filter(t => t.cibles.includes(ligne.type)).map(t => ({
      type_id: t.id, vehicule_id: data.id, reference_date: aujourdhui(), reference_km: ligne.km_actuel ?? null }));
    if (lignes.length) {
      const r = await SB.from('echeances').insert(lignes);
      if (r.error) { toast(messageLisible(r.error), false); }
    }
  }
  fermerModal(); toast('Véhicule enregistré'); rafraichir();
}
async function ficheVehicule(id) {
  const [{ data: v, error }, , ] = await Promise.all([SB.from('vehicules').select('*').eq('id', id).single(), chargerEcheances()]);
  if (error) throw error;
  const ech = S.echeances.filter(e => e.vehicule_id === id);
  const ids = ech.map(e => e.echeance_id);
  let hist = [];
  if (ids.length) {
    const r = await SB.from('interventions').select('*').in('echeance_id', ids).order('date_intervention', { ascending: false }).limit(30);
    hist = r.data || [];
  }
  const rc = await SB.from('controles').select('id,date_controle,km,anomalie,remarque').eq('vehicule_id', id).order('date_controle', { ascending: false }).limit(10);
  const verifs = rc.data || [];
  const sectionPleinsHtml = v.type === 'vehicule' ? await sectionPleins(id) : '';
  const nomType = eid => (ech.find(e => e.echeance_id === eid) || {}).type_nom || '';
  $('#contenu').innerHTML = `
    <div class="barre"><button class="btn sec" onclick="rafraichir()">← Retour</button>
      <button class="btn" onclick="ouvrirVerification('${esc(id)}')">✔ Vérifier le véhicule</button>
      ${v.type === 'vehicule' ? `<button class="btn" onclick="formPlein('${esc(id)}')">⛽ Plein</button>` : ''}
      ${peutEcrire() ? `<button class="btn sec" onclick="formVehicule('${esc(id)}')">Modifier</button>` : ''}</div>
    <div class="carte"><h2>${esc(v.immatriculation)} <small>${v.type === 'remorque' ? 'Remorque' : 'Véhicule'}</small></h2>
      <p>${esc([v.marque, v.modele, v.designation].filter(Boolean).join(' '))}</p>
      <p>Conducteur : <b>${esc(nomProfil(v.conducteur_id)) || '—'}</b> · Kilométrage : <b>${fmtKm(v.km_actuel)}</b>
      ${v.km_releve_le ? `<small>(relevé le ${fmtDate(v.km_releve_le)})</small>` : ''}</p></div>
    <h3>Échéances</h3>
    ${ech.length ? `<div class="tableau"><table><thead><tr><th>Échéance</th><th>Dernière</th><th>Prochaine</th><th>Reste</th><th>État</th><th></th></tr></thead>
      <tbody>${ech.map(r => ligneEcheance(r, false)).join('')}</tbody></table></div>` : '<p class="vide">Aucune échéance suivie.</p>'}
    ${v.type === 'vehicule' ? sectionPleinsHtml : ''}
    <h3>Vérifications du véhicule</h3>
    ${verifs.length ? `<div class="tableau"><table><thead><tr><th>Date</th><th>Km</th><th>Résultat</th><th>Remarque</th><th></th></tr></thead>
      <tbody>${verifs.map(c => `<tr><td>${fmtDate(c.date_controle)}</td><td>${fmtKm(c.km)}</td>
        <td>${c.anomalie ? '<span class="badge ret">Anomalie</span>' : '<span class="badge ok">Conforme</span>'}</td>
        <td>${esc(c.remarque)}</td><td><button class="btn sec petit" onclick="detailVerification('${esc(c.id)}')">Détail</button></td></tr>`).join('')}</tbody></table></div>`
      : '<p class="vide">Aucune vérification enregistrée.</p>'}
    <h3>Historique</h3>
    ${hist.length ? `<div class="tableau"><table><thead><tr><th>Date</th><th>Intervention</th><th>Km</th><th>Réalisé par</th><th>Commentaire</th></tr></thead>
      <tbody>${hist.map(h => `<tr><td>${fmtDate(h.date_intervention)}</td><td>${esc(nomType(h.echeance_id))}</td>
        <td>${fmtKm(h.km)}</td><td>${esc(h.realise_par)}</td><td>${esc(h.commentaire)}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="vide">Aucune intervention enregistrée.</p>'}`;
}
