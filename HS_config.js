/* © 2026 BFS HSE — Jérémy Bizeul / Vigie-lance. Tous droits réservés. */
'use strict';
// Seule la clé publique (publishable) figure ici : elle est faite pour être publique.
// La sécurité repose sur les règles RLS de la base. Jamais de clé service_role dans ce dépôt.
const HS_CONFIG = {
  url: 'https://dqraobwozowtnrieitkp.supabase.co',
  cle: 'sb_publishable_UhkImOyooXPnAqTCNMJ4wA_VVqscCmK',
  schema: 'hse',
  storageKey: 'hse-auth',      // préfixé : la mémoire du navigateur est commune aux applis BFS
  version: '0.6.0'
};
