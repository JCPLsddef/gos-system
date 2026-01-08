/**
 * PREVIEW MODE DETECTION
 *
 * Permet de détecter automatiquement si l'application tourne dans un environnement
 * de preview (Bolt.new, StackBlitz, etc.) où Supabase n'est pas configuré.
 *
 * RÈGLES:
 * - Preview Mode = NEXT_PUBLIC_SUPABASE_URL absent
 * - Production = Variables Supabase présentes
 *
 * COMPORTEMENT EN PREVIEW:
 * - Auth bypassée (mock user)
 * - Middleware autorise accès aux routes protégées
 * - Aucune requête Supabase exécutée
 * - UI affichée normalement
 *
 * COMPORTEMENT EN PRODUCTION:
 * - Auth stricte (Supabase)
 * - Middleware bloque accès non autorisé
 * - Toutes les fonctionnalités actives
 */

/**
 * Détecte si l'application tourne en mode preview
 * @returns true si preview mode (env vars Supabase absentes), false sinon
 */
export function isPreviewMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/**
 * Détecte si l'application tourne en mode production
 * @returns true si production (env vars Supabase présentes), false sinon
 */
export function isProductionMode(): boolean {
  return !isPreviewMode();
}

/**
 * Log de debug pour tracking du mode actuel
 * Utile pour diagnostiquer les problèmes d'environnement
 */
export function logCurrentMode(context: string): void {
  if (isPreviewMode()) {
    console.warn(`🎨 [${context}] Preview Mode Active - Auth bypassée, UI seulement`);
  } else {
    console.log(`🔒 [${context}] Production Mode - Auth stricte active`);
  }
}

/**
 * Mock user pour Preview Mode
 * Permet à l'UI de s'afficher comme si un utilisateur était connecté
 * IMPORTANT: Ce mock n'existe QUE en preview, jamais en production
 */
export const PREVIEW_MOCK_USER = {
  id: 'preview-user-id',
  email: 'preview@example.com',
  role: 'authenticated',
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {
    name: 'Preview User',
  },
} as const;

/**
 * Mock session pour Preview Mode
 */
export const PREVIEW_MOCK_SESSION = {
  access_token: 'preview-token',
  refresh_token: 'preview-refresh',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: PREVIEW_MOCK_USER,
} as const;
