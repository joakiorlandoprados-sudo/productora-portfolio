import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "auth-token";
const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos" },
      { status: 400 },
    );
  }

  const { usuario, password } = (body ?? {}) as {
    usuario?: unknown;
    password?: unknown;
  };

  if (
    typeof usuario !== "string" ||
    typeof password !== "string" ||
    usuario.length === 0 ||
    password.length === 0
  ) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos" },
      { status: 400 },
    );
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Falla de configuración del servidor; no filtramos detalles al cliente.
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  const user = await prisma.usuario.findUnique({ where: { usuario } });

  // Mensaje genérico indistinto del motivo: usuario inexistente o pass incorrecta.
  // Para no filtrar timing tampoco, hacemos bcrypt.compare contra un hash dummy
  // cuando el usuario no existe.
  const DUMMY_HASH =
    "$2b$12$CwTycUXWue0Thq9StjUM0uJ8sP1hY8xRk8gK8pB8Yxkqk3WJZQ5Km";
  const hashToCompare = user?.password ?? DUMMY_HASH;
  const passwordOk = await bcrypt.compare(password, hashToCompare);

  if (!user || !passwordOk) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos" },
      { status: 401 },
    );
  }

  const token = jwt.sign(
    { sub: user.id, usuario: user.usuario },
    secret,
    { expiresIn: "7d" },
  );

  const response = NextResponse.json({ ok: true, usuario: user.usuario });
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS_SECONDS,
  });
  return response;
}
