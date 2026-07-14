import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "auth-token";

function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const secret = process.env.JWT_SECRET;
  if (!secret) return false;
  try {
    jwt.verify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  // El matcher ya excluye /admin/login, así que cualquier request que llegue
  // acá bajo /admin/* requiere cookie válida.
  if (isAuthenticated(request)) {
    return NextResponse.next();
  }
  const loginUrl = new URL("/admin/login", request.url);
  // Preservamos la URL original como ?next= para volver tras login (futuro).
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Protege /admin y todo bajo /admin/* excepto /admin/login (y sub-rutas).
  matcher: ["/admin", "/admin/((?!login).*)"],
};
