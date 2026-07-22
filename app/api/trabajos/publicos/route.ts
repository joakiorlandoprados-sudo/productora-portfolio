/**
 * GET /api/trabajos/publicos
 *
 * Variante SIN autenticación de `GET /api/trabajos` — solo trae
 * `publicado: true` ordenados por `orden` y trae la media (la portada la
 * calcula el cliente con el `Media` de menor `orden`).
 *
 * El sitio público hace una sola llamada y filtra cliente-side por
 * `cliente` y `tipo`.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const trabajos = await prisma.trabajo.findMany({
    where: { publicado: true },
    orderBy: [{ orden: "asc" }, { creadoEn: "desc" }],
    include: {
      media: {
        orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
      },
    },
  });
  return NextResponse.json({ trabajos });
}
