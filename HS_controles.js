/* © 2026 BFS HSE — Jérémy Bizeul / Vigie-lance. Tous droits réservés. */
'use strict';
// Vérification d'un véhicule par son conducteur (checklist), avec photos des anomalies.
function reduireImage(fichier, max = 1280) {
  return new Promise((ok, ko) => {
    const img = new Image(), url = URL.createObjectURL(fichier);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => (b ? ok(b) : ko(new Error('Image illisible'))), 'image/jpeg', 0.72);
    };
    img.onerror = () => ko(new Error('Image illisible'));
    img.src = url;
  });
}
async function ouvrirVerification(vehiculeId) {
  const { data: v, error } = await SB.from('vehicules').select('id,type,immatriculation,km_actuel').eq('id', vehiculeId).single();
  if (error) throw error;
  const { data: modeles } = await SB.from('controle_modeles').select('id,nom').eq('actif', true).eq('cible', v.type).order('nom');
  if (!(modeles || []).length) { toast('Aucune checklist disponible pour ce type de véhicule.', false); return; }
  const modele = modeles[0];
  const { data: points, error: e2 } = await SB.from('controle_points').select('*').eq('modele_id', modele.id).order('ordre');
  if (e2) throw e2;
  let section = '', corps = '';
  (points || []).forEach(p => {
    if (p.section !== section) { section = p.section; corps += `<h4>${esc(section)}</h4>`; }
    corps += `<div class="point" data-id="${esc(p.id)}" data-bloquant="${p.bloquant}">
      <div class="point-ligne"><span>${esc(p.libelle)}${p.bloquant ? ' <span class="bloq" title="Anomalie bloquante">⚠</span>' : ''}</span>
        <span class="choix">
          <label class="radio ok"><input type="radio" name="p_${esc(p.id)}" value="ok" checked onchange="basculerAnomalie(this)">OK</label>
          <label class="radio ko"><input type="radio" name="p_${esc(p.id)}" value="ko" onchange="basculerAnomalie(this)">Anomalie</label></span></div>
      <div class="anomalie" hidden>
        <input type="text" class="com" placeholder="Décrivez le problème">
        <label class="photo">📷 Prendre une photo<input type="file" accept="image/*" capture="environment" onchange="nomPhoto(this)"></label>
        <small class="nomphoto"></small></div></div>`;
  });
  ouvrirModal(`<h3>Vérification du véhicule</h3>
    <p class="sous"><b>${esc(v.immatriculation)}</b> — ${esc(modele.nom)}</p>
    <form id="form-verif" onsubmit="enregistrerVerification(event,'${esc(v.id)}','${esc(modele.id)}')">
      ${v.type === 'vehicule' ? `<label>Kilométrage <small>(dernier relevé : ${fmtKm(v.km_actuel)})</small>
        <input type="number" name="km" min="0" inputmode="numeric" required></label>` : ''}
      ${corps}
      <label>Remarque générale<textarea name="rem" rows="2"></textarea></label>
      <div class="actions"><button type="button" class="btn sec" onclick="fermerModal()">Annuler</button>
      <button class="btn" id="btn-verif">Valider la vérification</button></div></form>`);
  $('#modal .modal').classList.add('large');
}
function basculerAnomalie(radio) {
  const bloc = radio.closest('.point');
  bloc.querySelector('.anomalie').hidden = radio.value !== 'ko';
  bloc.classList.toggle('ko', radio.value === 'ko');
}
function nomPhoto(input) {
  input.closest('.anomalie').querySelector('.nomphoto').textContent = input.files[0] ? '✔ ' + input.files[0].name : '';
}
async function enregistrerVerification(ev, vehiculeId, modeleId) {
  ev.preventDefault();
  const f = ev.target, btn = $('#btn-verif');
  btn.disabled = true; btn.textContent = 'Envoi…';
  try {
    const blocs = [...f.querySelectorAll('.point')];
    const ko = blocs.filter(b => b.querySelector('input[type=radio][value=ko]').checked);
    const bloquant = ko.some(b => b.dataset.bloquant === 'true');
    const { data: c, error } = await SB.from('controles').insert({
      vehicule_id: vehiculeId, modele_id: modeleId,
      km: f.elements.km && f.elements.km.value !== '' ? parseInt(f.elements.km.value, 10) : null,
      remarque: f.elements.rem.value.trim() || null, anomalie: ko.length > 0 }).select('id').single();
    if (error) throw error;
    let photosKo = 0;
    const resultats = [];
    for (const b of blocs) {
      const pointId = b.dataset.id;
      const enAnomalie = ko.includes(b);
      let chemin = null;
      const fichier = enAnomalie ? b.querySelector('input[type=file]').files[0] : null;
      if (fichier) {
        try {
          const blob = await reduireImage(fichier);
          const p = `controles/${S.user.id}/${c.id}_${pointId}.jpg`;
          const up = await SB.storage.from('hse-fichiers').upload(p, blob, { contentType: 'image/jpeg', upsert: true });
          if (up.error) throw up.error;
          chemin = p;
        } catch (e) { photosKo++; dbg('photo', e.message); }
      }
      resultats.push({ controle_id: c.id, point_id: pointId, ok: !enAnomalie,
        commentaire: enAnomalie ? (b.querySelector('.com').value.trim() || null) : null, photo_path: chemin });
    }
    const r = await SB.from('controle_resultats').insert(resultats);
    if (r.error) throw r.error;
    fermerModal();
    if (bloquant) toast('Anomalie bloquante : ne prenez pas la route et prévenez le responsable HSE.', false);
    else toast(ko.length ? `Vérification enregistrée (${ko.length} anomalie${ko.length > 1 ? 's' : ''}).` : 'Vérification enregistrée : tout est conforme.');
    if (photosKo) toast(`${photosKo} photo(s) n'ont pas pu être envoyées.`, false);
    ficheVehicule(vehiculeId);
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Valider la vérification';
    toast(messageLisible(e), false);
  }
}
async function detailVerification(controleId) {
  const { data, error } = await SB.from('controle_resultats').select('*, controle_points(libelle,section)').eq('controle_id', controleId);
  if (error) throw error;
  const ko = (data || []).filter(r => !r.ok);
  const chemins = ko.map(r => r.photo_path).filter(Boolean);
  let urls = {};
  if (chemins.length) {
    const s = await SB.storage.from('hse-fichiers').createSignedUrls(chemins, 600);
    (s.data || []).forEach(x => { if (x.signedUrl) urls[x.path] = x.signedUrl; });
  }
  ouvrirModal(`<h3>Détail de la vérification</h3>
    <p class="sous">${(data || []).length} points contrôlés, ${ko.length} anomalie${ko.length > 1 ? 's' : ''}.</p>
    ${ko.length ? ko.map(r => `<div class="carte"><b>${esc(r.controle_points ? r.controle_points.libelle : '')}</b>
      <p>${esc(r.commentaire) || '<i>Pas de commentaire</i>'}</p>
      ${urls[r.photo_path] ? `<a href="${esc(urls[r.photo_path])}" target="_blank" rel="noopener"><img class="photo-anomalie" src="${esc(urls[r.photo_path])}" alt="Photo de l'anomalie"></a>` : ''}</div>`).join('')
      : '<p class="vide">Tout était conforme.</p>'}
    <div class="actions"><button class="btn sec" onclick="fermerModal()">Fermer</button></div>`);
}
