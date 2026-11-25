/* © 2026 BFS HSE — Jérémy Bizeul / Vigie-lance. Tous droits réservés. */
'use strict';
// Diagnostic : les erreurs s'affichent à l'écran (pas de console accessible sur téléphone).
const HS_LOG = [];
function dbg(...a) { HS_LOG.push(a.map(String).join(' ')); if (HS_LOG.length > 50) HS_LOG.shift(); }
function afficherErreurEcran(msg) {
  let b = document.getElementById('hs-erreur');
  if (!b) { b = document.createElement('div'); b.id = 'hs-erreur'; document.body.appendChild(b); }
  b.textContent = 'Erreur : ' + msg;
  b.style.display = 'block';
  setTimeout(() => { b.style.display = 'none'; }, 8000);
}
window.addEventListener('error', e => { dbg('error', e.message); afficherErreurEcran(e.message); });
window.addEventListener('unhandledrejection', e => {
  const m = (e.reason && e.reason.message) || String(e.reason);
  dbg('promesse', m); afficherErreurEcran(m);
});
