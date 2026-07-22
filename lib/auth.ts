/**
 * Helper único para leer y validar la cookie de sesión JWT.
 *
 * Antes había dos copias de esta lógica: una en `proxy.ts` y otra en
 * `app/api/auth/me/route.ts`. Este helper centraliza la verificación y la
 * expone para que todos los endpoints nuevos (CRUD de Trabajos, firma de
 * Cloudinary, etc.) lo usen sin duplicar el código.
 *
 * `getSessionUser()` devuelve el payload del JWT (con `sub` y `usuario`) o
 * `null` si la cookie está ausente, expirada o la firma no valida. Nunca
 * tira excepciones para que el caller decida cómo responder (401, redirect,
 * etc.).
 */

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const COOKIE_NAME = "auth-token";

export interface SessionUser {
  /** Id del usuario (lo emite el login con `sub: user.id`). */
  sub: string;
  /** Nombre de usuario humano, p.ej. "Augusto". */
  usuario: string;
}

/**
 * Lee y valida la cookie de sesión.
 *
 * Devuelve `null` si:
 * - no hay cookie,
 * - no hay `JWT_SECRET` configurado,
 * - el token no verifica (firma inválida, expirado, malformado).
 *
 * @example
 *   const user = await getSessionUser();
 *   if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    const payload = jwt.verify(token, secret) as Partial<SessionUser>;
    if (typeof payload.sub !== "string" || typeof payload.usuario !== "string") {
      return null;
    }
    return { sub: payload.sub, usuario: payload.usuario };
  } catch {
    return null;
  }
}
