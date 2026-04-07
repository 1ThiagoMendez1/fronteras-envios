/**
 * Utilidades para decodificar JWT de Supabase en el frontend.
 * 
 * NOTA: No verificamos la firma — eso lo hace Supabase en el servidor.
 * Solo leemos el payload para obtener los claims personalizados
 * (app_role, app_is_active, app_branch, app_permissions).
 */

export interface JwtClaims {
  /** User ID (same as Supabase auth.uid()) */
  sub: string;
  /** User email */
  email: string;
  /** Custom claim: user role from profiles table */
  app_role?: string;
  /** Custom claim: whether user is active */
  app_is_active?: boolean;
  /** Custom claim: user branch */
  app_branch?: string;
  /** Custom claim: granular permissions */
  app_permissions?: Record<string, boolean>;
  /** Standard JWT: issued at (unix seconds) */
  iat: number;
  /** Standard JWT: expires at (unix seconds) */
  exp: number;
  /** Supabase role (anon or authenticated) */
  role?: string;
  /** User metadata from Supabase auth */
  user_metadata?: Record<string, any>;
}

/**
 * Decodifica el payload (segunda parte) de un JWT.
 * Retorna null si el token es inválido o no se puede parsear.
 */
export function decodeJwtPayload(token: string): JwtClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload) as JwtClaims;
  } catch {
    console.warn('Failed to decode JWT payload');
    return null;
  }
}

/**
 * Verifica si un JWT ha expirado basándose en el claim `exp`.
 */
export function isJwtExpired(token: string): boolean {
  const claims = decodeJwtPayload(token);
  if (!claims?.exp) return true;
  return Date.now() > claims.exp * 1000;
}
