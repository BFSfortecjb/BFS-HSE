/* © 2026 BFS HSE — Jérémy Bizeul / Vigie-lance. Catalogue générique d'EPI (issu de CATALOGUE_EPI_GENERIQUE.xlsx). */
'use strict';
// [code, famille, libellé, norme de référence, vérification périodique]
const CATALOGUE_EPI = [
 [
  "casque_chantier",
  "Protection de la tête",
  "Casque de protection industriel",
  "EN 397",
  false
 ],
 [
  "casque_antibruit",
  "Protection auditive",
  "Casque antibruit (serre-tête)",
  "EN 352-1",
  false
 ],
 [
  "bouchons_oreilles",
  "Protection auditive",
  "Bouchons d'oreille (jetables / réutilisables)",
  "EN 352-2",
  false
 ],
 [
  "lunettes_protection",
  "Protection des yeux et du visage",
  "Lunettes ou sur-lunettes de protection",
  "EN 166",
  false
 ],
 [
  "visiere_ecran",
  "Protection des yeux et du visage",
  "Écran facial / visière",
  "EN 166",
  false
 ],
 [
  "gants_mecaniques",
  "Protection des mains",
  "Gants de protection contre les risques mécaniques",
  "EN 388",
  false
 ],
 [
  "gants_chimiques",
  "Protection des mains",
  "Gants de protection chimique",
  "EN ISO 374-1",
  false
 ],
 [
  "chaussures_securite",
  "Protection des pieds",
  "Chaussures de sécurité (S1P / S3…)",
  "EN ISO 20345",
  false
 ],
 [
  "gilet_hv",
  "Protection du corps",
  "Gilet / vêtement à haute visibilité",
  "EN ISO 20471",
  false
 ],
 [
  "vetement_travail",
  "Protection du corps",
  "Vêtement de travail / de protection",
  "Selon risque",
  false
 ],
 [
  "ffp_jetable",
  "Protection respiratoire",
  "Demi-masque filtrant jetable (FFP1/2/3)",
  "EN 149",
  false
 ],
 [
  "demi_masque_cartouches",
  "Protection respiratoire",
  "Demi-masque ou masque complet réutilisable avec cartouches / filtres",
  "EN 140 / EN 136 ; filtres EN 143, EN 14387",
  false
 ],
 [
  "appareil_respiratoire_evacuation",
  "Protection respiratoire",
  "Appareil de protection respiratoire autonome d'évacuation",
  "Selon modèle",
  true
 ],
 [
  "harnais_antichute",
  "Protection contre les chutes de hauteur",
  "Harnais d'antichute",
  "EN 361",
  true
 ],
 [
  "longe_antichute",
  "Protection contre les chutes de hauteur",
  "Longe de sécurité avec absorbeur d'énergie",
  "EN 354 ; EN 355",
  true
 ],
 [
  "antichute_rappel_auto",
  "Protection contre les chutes de hauteur",
  "Antichute à rappel automatique",
  "EN 360",
  true
 ],
 [
  "antichute_mobile_support",
  "Protection contre les chutes de hauteur",
  "Antichute mobile sur support d'assurage rigide ou flexible",
  "EN 353-1 / EN 353-2",
  true
 ],
 [
  "connecteur",
  "Protection contre les chutes de hauteur",
  "Connecteur (mousqueton)",
  "EN 362",
  true
 ],
 [
  "corde_sangle",
  "Protection contre les chutes de hauteur",
  "Corde ou sangle de sécurité",
  "EN 1891 / EN 795",
  true
 ],
 [
  "ancrage_transportable",
  "Protection contre les chutes de hauteur",
  "Dispositif d'ancrage transportable",
  "EN 795",
  true
 ],
 [
  "gants_isolants_elec",
  "Protection électrique",
  "Gants isolants pour travaux électriques",
  "EN 60903",
  true
 ]
];
