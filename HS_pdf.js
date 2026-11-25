/* © 2026 BFS HSE — Jérémy Bizeul / Vigie-lance. Tous droits réservés. */
'use strict';
// Documents PDF : registre de suivi des EPI et fiche individuelle d'un EPI (jsPDF + autotable en CDN).
const NATURES_VERIF = { vgp: 'Vérification générale périodique', approfondie: 'Vérification approfondie', avant_usage: 'Contrôle avant usage', autre: 'Autre' };
const RESULTATS_VERIF = { conforme: 'Conforme', a_remplacer: 'À remplacer', retire: 'Retiré' };
const PDF_GRIS = [70, 70, 69], PDF_JAUNE = [243, 171, 18];

async function chargerSuiviEpi(dotationId) {
  let q = SB.from('epi_dotations').select('*, epi_types(nom,famille,norme_reference,duree_vie_ans)').order('cree_le');
  if (dotationId) q = q.eq('id', dotationId);
  const { data: dot, error } = await q;
  if (error) throw error;
  const ids = (dot || []).map(d => d.id);
  let ech = [], vers = [];
  if (ids.length) {
    const r = await SB.from('echeances').select('id,epi_dotation_id').in('epi_dotation_id', ids);
    ech = r.data || [];
    if (ech.length) {
      const r2 = await SB.from('interventions').select('*').in('echeance_id', ech.map(e => e.id)).order('date_intervention');
      vers = r2.data || [];
    }
  }
  await chargerEcheances();
  return (dot || []).map(d => {
    const eids = ech.filter(e => e.epi_dotation_id === d.id).map(e => e.id);
    const verifs = vers.filter(v => eids.includes(v.echeance_id));
    const prochaines = S.echeances.filter(e => e.epi_dotation_id === d.id && e.type_code === 'verif_epi_annuelle' && e.date_echeance);
    return { d, verifs, prochaine: prochaines.length ? prochaines[0].date_echeance : null };
  });
}
function enteteEtPied(doc, titre, sousTitre) {
  const n = doc.internal.getNumberOfPages(), w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`BFS HSE — ${titre} — édité le ${fmtDate(aujourdhui())}${sousTitre ? ' — ' + sousTitre : ''}`, 10, h - 6);
    doc.text(`Page ${i} / ${n}`, w - 10, h - 6, { align: 'right' });
  }
}
function construireRegistre(lignes) {
  const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(15); doc.setTextColor(8, 8, 8);
  doc.text('Registre de suivi des équipements de protection individuelle', 10, 14);
  doc.setFontSize(9); doc.setTextColor(90);
  doc.text(`BFS — édité le ${fmtDate(aujourdhui())} — ${lignes.length} équipement(s)`, 10, 20);
  const corps = lignes.map(({ d, verifs, prochaine }) => {
    const v = verifs[verifs.length - 1];
    const fin = d.date_peremption || (d.date_fabrication && d.epi_types && d.epi_types.duree_vie_ans
      ? (() => { const x = new Date(d.date_fabrication); x.setFullYear(x.getFullYear() + d.epi_types.duree_vie_ans); return x.toISOString().slice(0, 10); })() : null);
    return [nomProfil(d.agent_id) || '—', d.epi_types ? d.epi_types.nom : '', [d.marque, d.modele].filter(Boolean).join(' ') || '—',
      d.numero_serie || '—', fmtDate(d.date_fabrication), fmtDate(d.date_achat), fmtDate(d.date_mise_en_service),
      v ? `${fmtDate(v.date_intervention)}\n${NATURES_VERIF[v.nature] || ''}${v.realise_par ? '\npar ' + v.realise_par : ''}` : 'Aucune',
      v ? (RESULTATS_VERIF[v.resultat] || '—') : '—', fmtDate(prochaine), fmtDate(fin), ETATS_EPI[d.etat] || d.etat];
  });
  doc.autoTable({
    startY: 25, head: [['Agent', 'EPI', 'Marque / modèle', 'N° de série', 'Fabrication', 'Achat', 'Mise en service',
      'Dernière vérification', 'Résultat', 'Prochaine vérif.', 'Fin de vie', 'État']],
    body: corps, styles: { fontSize: 7.5, cellPadding: 1.6, valign: 'top' },
    headStyles: { fillColor: PDF_GRIS, textColor: 255 }, alternateRowStyles: { fillColor: [247, 247, 245] },
    margin: { left: 10, right: 10, bottom: 12 }
  });
  enteteEtPied(doc, 'Registre EPI');
  return doc;
}
function construireFiche(l) {
  const { d, verifs, prochaine } = l;
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFontSize(16); doc.setTextColor(8, 8, 8);
  doc.text("Fiche individuelle de suivi d'un EPI", 14, 16);
  doc.setFillColor(...PDF_JAUNE); doc.rect(14, 19, 40, 1.2, 'F');
  const t = d.epi_types || {};
  doc.autoTable({
    startY: 25, theme: 'grid', styles: { fontSize: 9, cellPadding: 2 }, columnStyles: { 0: { fillColor: [240, 240, 238], fontStyle: 'bold', cellWidth: 55 } },
    body: [['Équipement', t.nom || ''], ['Famille', t.famille || ''], ['Norme de référence', t.norme_reference || '—'],
      ['Marque / modèle', [d.marque, d.modele].filter(Boolean).join(' ') || '—'], ['N° de série', d.numero_serie || '—'],
      ['Date de fabrication', fmtDate(d.date_fabrication)], ["Date d'achat", fmtDate(d.date_achat)],
      ['Date de mise en service', fmtDate(d.date_mise_en_service)], ['Date de péremption / fin de vie', fmtDate(d.date_peremption)],
      ['Durée de vie maximale', t.duree_vie_ans ? t.duree_vie_ans + ' ans à partir de la fabrication' : '—'],
      ['Utilisateur (agent)', nomProfil(d.agent_id) || '—'], ['État actuel', ETATS_EPI[d.etat] || d.etat],
      ['Prochaine vérification', fmtDate(prochaine)], ['Précisions', d.commentaire || '—']]
  });
  doc.setFontSize(12); doc.setTextColor(8, 8, 8);
  doc.text('Vérifications successives', 14, doc.lastAutoTable.finalY + 10);
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 13, styles: { fontSize: 8.5, cellPadding: 2 }, headStyles: { fillColor: PDF_GRIS, textColor: 255 },
    head: [['Date', 'Nature', 'Réalisé par', 'Résultat', 'Observations']],
    body: verifs.length ? verifs.map(v => [fmtDate(v.date_intervention), NATURES_VERIF[v.nature] || '—', v.realise_par || '—',
      RESULTATS_VERIF[v.resultat] || '—', v.commentaire || '']) : [['—', 'Aucune vérification enregistrée', '', '', '']],
    margin: { bottom: 12 }
  });
  enteteEtPied(doc, 'Fiche EPI', d.numero_serie ? 'n° ' + d.numero_serie : '');
  return doc;
}
async function registreEpiPdf() {
  try {
    const lignes = await chargerSuiviEpi();
    if (!lignes.length) { toast('Aucun EPI à inclure dans le registre.', false); return; }
    construireRegistre(lignes).save(`HS_registre_EPI_${aujourdhui()}.pdf`);
  } catch (e) { toast(messageLisible(e), false); }
}
async function ficheEpiPdf(dotationId) {
  try {
    const [l] = await chargerSuiviEpi(dotationId);
    if (!l) { toast('EPI introuvable.', false); return; }
    construireFiche(l).save(`HS_fiche_EPI_${(l.d.numero_serie || l.d.id.slice(0, 8)).replace(/[^\w-]/g, '_')}.pdf`);
  } catch (e) { toast(messageLisible(e), false); }
}
