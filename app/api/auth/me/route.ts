import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "auth-token";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  try {
    const payload = jwt.verify(token, secret) as { usuario?: string };
    if (!payload.usuario) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    return NextResponse.json({ usuario: payload.usuario });
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
}
