/* © 2026 BFS HSE — Jérémy Bizeul / Vigie-lance. Tous droits réservés. */
'use strict';
// Socle : connexion Supabase, état global, utilitaires.
const SB = supabase.createClient(HS_CONFIG.url, HS_CONFIG.cle, {
  auth: { storageKey: HS_CONFIG.storageKey },
  db: { schema: HS_CONFIG.schema }
});
const S = { user: null, role: null, onglet: 'echeances', echeances: [], filtre: 'tous', profils: [] };

const $ = (s, r = document) => r.querySelector(s);
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtDate(d) { if (!d) return '—'; const [y, m, j] = String(d).slice(0, 10).split('-'); return `${j}/${m}/${y}`; }
function fmtKm(k) { return k == null ? '—' : Number(k).toLocaleString('fr-FR') + ' km'; }
function aujourdhui() { return new Date().toISOString().slice(0, 10); }
function peutEcrire() { return S.role === 'admin' || S.role === 'saisie'; }

function toast(msg, ok = true) {
  const t = document.createElement('div');
  t.className = 'toast ' + (ok ? 'ok' : 'ko');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}
function messageLisible(e) {
  const m = (e && e.message) || String(e);
  if (/row-level security|permission denied/i.test(m)) return "Vous n'avez pas le droit d'effectuer cette action.";
  if (/inférieur au dernier relevé/i.test(m)) return m;
  if (/kilométrage est obligatoire/i.test(m)) return 'Le kilométrage est obligatoire pour un véhicule.';
  if (/duplicate key/i.test(m)) return 'Cet élément existe déjà (immatriculation ou code en double).';
  return m;
}

function ouvrirModal(html) {
  fermerModal();
  const m = document.createElement('div');
  m.id = 'modal'; m.className = 'modal-fond';
  m.innerHTML = `<div class="modal" role="dialog">${html}</div>`;
  m.addEventListener('click', e => { if (e.target === m) fermerModal(); });
  document.body.appendChild(m);
}
function fermerModal() { const m = $('#modal'); if (m) m.remove(); }

async function chargerRole() {
  const { data, error } = await SB.rpc('mon_role');
  if (error) throw error;
  S.role = data || null;
  return S.role;
}
async function chargerProfils() {
  if (!peutEcrire()) { S.profils = []; return; }
  const { data, error } = await SB.from('profils').select('id,prenom,nom,email,role,actif').eq('actif', true).order('nom');
  if (error) throw error;
  S.profils = data || [];
}
function nomProfil(id) {
  const p = S.profils.find(x => x.id === id);
  return p ? [p.prenom, p.nom].filter(Boolean).join(' ') || p.email : '';
}
function optionsProfils(sel) {
  return '<option value="">—</option>' + S.profils.map(p =>
    `<option value="${esc(p.id)}"${p.id === sel ? ' selected' : ''}>${esc(nomProfil(p.id))}</option>`).join('');
}
const ETATS = { ok: ['À jour', 'ok'], a_venir: ['À venir', 'av'], en_retard: ['En retard', 'ret'] };
function badgeEtat(e) { const [l, c] = ETATS[e] || [e, '']; return `<span class="badge ${c}">${l}</span>`; }
