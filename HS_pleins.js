/* © 2026 BFS HSE — Jérémy Bizeul / Vigie-lance. Tous droits réservés. */
'use strict';
// Suivi des pleins (carburant / AdBlue) d'un véhicule. Tout compte avec un profil peut enregistrer un plein.
// Consommation (L/100 km) = litres du plein ÷ km parcourus depuis le plein complet précédent (méthode « plein à plein »).

function consommations(pleins) {
  // pleins : carburant uniquement, triés du plus récent au plus ancien
  const res = {};
  const asc = pleins.filter(p => p.produit === 'carburant' && p.km != null).slice().reverse();
  let precedent = null;
  asc.forEach(p => {
    if (precedent && p.plein_complet && p.km > precedent.km) {
      res[p.id] = Math.round(p.litres / (p.km - precedent.km) * 1000) / 10;
    }
    if (p.plein_complet) precedent = p;
  });
  return res;
}

async function sectionPleins(vehiculeId) {
  const { data } = await SB.from('pleins').select('*').eq('vehicule_id', vehiculeId)
    .order('date_plein', { ascending: false }).order('cree_le', { ascending: false }).limit(20);
  const l = data || [];
  const conso = consommations(l);
  const valeurs = Object.values(conso);
  const moyenne = valeurs.length ? (valeurs.reduce((a, b) => a + b, 0) / valeurs.length).toFixed(1).replace('.', ',') : null;
  const num = n => n == null ? '—' : String(n).replace('.', ',');
  return `<h3>Pleins${moyenne ? ` <small>· conso moyenne ${moyenne} L/100 km</small>` : ''}</h3>
    ${l.length ? `<div class="tableau"><table><thead><tr><th>Date</th><th>Produit</th><th>Km</th><th>Litres</th><th>Montant</th><th>L/100 km</th><th>Par</th></tr></thead>
      <tbody>${l.map(p => `<tr><td>${fmtDate(p.date_plein)}</td><td>${p.produit === 'adblue' ? 'AdBlue' : 'Carburant'}${p.produit === 'carburant' && !p.plein_complet ? ' <small>(partiel)</small>' : ''}</td>
        <td>${fmtKm(p.km)}</td><td>${num(p.litres)}</td><td>${p.montant_ttc == null ? '—' : num(p.montant_ttc) + ' €'}</td>
        <td>${conso[p.id] != null ? num(conso[p.id]) : '—'}</td><td>${esc(nomProfil(p.realise_par))}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="vide">Aucun plein enregistré.</p>'}`;
}

async function formPlein(vehiculeId) {
  const { data: v } = await SB.from('vehicules').select('immatriculation,km_actuel').eq('id', vehiculeId).single();
  ouvrirModal(`<h2>Plein — ${esc(v.immatriculation)}</h2>
    <label>Produit<select id="pl_produit" onchange="document.getElementById('pl_complet_l').style.display = this.value === 'carburant' ? '' : 'none'">
      <option value="carburant">Carburant</option><option value="adblue">AdBlue</option></select></label>
    <label>Date<input type="date" id="pl_date" value="${aujourdhui()}"></label>
    <label>Kilométrage au compteur<input type="number" id="pl_km" inputmode="numeric" min="0" value="${v.km_actuel ?? ''}"></label>
    <label>Litres<input type="number" id="pl_litres" inputmode="decimal" step="0.01" min="0"></label>
    <label>Montant TTC (€) <small>facultatif</small><input type="number" id="pl_montant" inputmode="decimal" step="0.01" min="0"></label>
    <label id="pl_complet_l" class="case"><input type="checkbox" id="pl_complet" checked> Plein complet (réservoir rempli jusqu'au clapet)</label>
    <div class="barre"><button class="btn sec" onclick="fermerModal()">Annuler</button>
      <button class="btn" onclick="enregistrerPlein('${esc(vehiculeId)}')">Enregistrer</button></div>`);
}

async function enregistrerPlein(vehiculeId) {
  const g = id => document.getElementById(id);
  const litres = parseFloat(String(g('pl_litres').value).replace(',', '.'));
  if (!(litres > 0)) { toast('Indiquez le nombre de litres.', false); return; }
  const produit = g('pl_produit').value;
  const ligne = { vehicule_id: vehiculeId, produit, date_plein: g('pl_date').value || aujourdhui(), litres,
    km: g('pl_km').value === '' ? null : parseInt(g('pl_km').value, 10),
    montant_ttc: g('pl_montant').value === '' ? null : parseFloat(String(g('pl_montant').value).replace(',', '.')),
    plein_complet: produit === 'carburant' ? g('pl_complet').checked : false };
  const { error } = await SB.from('pleins').insert(ligne);
  if (error) { toast(messageLisible(error), false); return; }
  fermerModal(); toast('Plein enregistré'); ficheVehicule(vehiculeId).catch(e => toast(messageLisible(e), false));
}
