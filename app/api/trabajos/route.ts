/**
 * GET  /api/trabajos          → lista todos (panel admin)
 * POST /api/trabajos          → crea un Trabajo nuevo
 *
 * GET está pensado para el panel admin: trae TODO, publicados o no,
 * ordenados por `orden` ascendente. La página pública arma su propio
 * filtrado con otra ruta.
 *
 * POST valida el body, genera un slug único a partir del título y
 * permite adjuntar Media ya subido (los assets que el cliente subió a
 * Cloudinary en pasos previos). NO recibe archivos.
 *
 * Ambos protegidos con `getSessionUser()`.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/trabajo-slug";

interface MediaInput {
  tipo: "imagen" | "video";
  url: string;
  publicId: string;
  orden?: number;
}

interface CreateBody {
  titulo?: unknown;
  slug?: unknown; // opcional; si falta, se autogenera de `titulo`
  cliente?: unknown;
  tipo?: unknown;
  descripcion?: unknown;
  destacado?: unknown;
  publicado?: unknown;
  orden?: unknown;
  media?: unknown; // MediaInput[]
}

function isMediaInput(value: unknown): value is MediaInput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.tipo === "imagen" || v.tipo === "video") &&
    typeof v.url === "string" &&
    typeof v.publicId === "string" &&
    (v.orden === undefined || typeof v.orden === "number")
  );
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const trabajos = await prisma.trabajo.findMany({
    orderBy: [{ orden: "asc" }, { creadoEn: "desc" }],
    include: {
      media: {
        orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
      },
    },
  });

  return NextResponse.json({ trabajos });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // Validación mínima. Cualquier string vacio en un campo requerido falla.
  const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
  const tipo = typeof body.tipo === "string" ? body.tipo.trim() : "";

  if (!titulo || !tipo) {
    return NextResponse.json(
      { error: "Título y tipo son obligatorios" },
      { status: 400 },
    );
  }

  const cliente =
    typeof body.cliente === "string" && body.cliente.trim().length > 0
      ? body.cliente.trim()
      : null;
  const descripcion =
    typeof body.descripcion === "string" && body.descripcion.trim().length > 0
      ? body.descripcion
      : null;

  const destacado = body.destacado === true;
  const publicado = body.publicado !== false; // default true
  const orden = typeof body.orden === "number" ? body.orden : 0;

  const slugBase =
    typeof body.slug === "string" && body.slug.trim().length > 0
      ? body.slug
      : titulo;

  const mediaList: MediaInput[] = Array.isArray(body.media)
    ? body.media.filter(isMediaInput)
    : [];

  try {
    const slug = await generateUniqueSlug(prisma, slugBase);

    const trabajo = await prisma.trabajo.create({
      data: {
        titulo,
        slug,
        cliente,
        tipo,
        descripcion,
        destacado,
        publicado,
        orden,
        media: {
          create: mediaList.map((m, idx) => ({
            tipo: m.tipo,
            url: m.url,
            publicId: m.publicId,
            orden: typeof m.orden === "number" ? m.orden : idx,
          })),
        },
      },
      include: { media: true },
    });

    return NextResponse.json({ trabajo }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/trabajos] error:", err);
    return NextResponse.json(
      { error: "No se pudo crear el Trabajo" },
      { status: 500 },
    );
  }
}
