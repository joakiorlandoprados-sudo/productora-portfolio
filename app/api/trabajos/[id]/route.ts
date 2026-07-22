/**
 * PUT    /api/trabajos/[id]   → edita un Trabajo
 * DELETE /api/trabajos/[id]   → borra un Trabajo (y su media en Cloudinary)
 *
 * PUT acepta:
 *   - campos escalares (titulo, slug, cliente, tipo, descripcion, destacado,
 *     publicado, orden) — se actualizan solo los que llegan.
 *   - `media`: lista final del Trabajo. El PUT hace un "sync":
 *       * media en la lista y NO en DB → se crea
 *       * media en DB y NO en la lista → se destruye en Cloudinary y se
 *         borra de la DB
 *       * media en ambos → se actualiza `orden` (y `tipo`/`url`/`publicId`
 *         si cambiaron — por si re-suben el mismo asset).
 *
 * DELETE destruye TODOS los media en Cloudinary primero y después borra
 * la fila de `Trabajo`. El `onDelete: Cascade` del schema se encarga de
 * las filas de `Media`.
 *
 * Ambos protegidos con `getSessionUser()`.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/trabajo-slug";
import {
  destroyCloudinaryAsset,
  mediaTipoToResourceType,
} from "@/lib/cloudinary-destroy";

interface MediaInput {
  id?: string; // si está, es un media existente; si no, es nuevo
  tipo: "imagen" | "video";
  url: string;
  publicId: string;
  orden?: number;
}

interface UpdateBody {
  titulo?: unknown;
  slug?: unknown;
  cliente?: unknown;
  tipo?: unknown;
  descripcion?: unknown;
  destacado?: unknown;
  publicado?: unknown;
  orden?: unknown;
  media?: unknown;
}

function isMediaInput(value: unknown): value is MediaInput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.tipo === "imagen" || v.tipo === "video") &&
    typeof v.url === "string" &&
    typeof v.publicId === "string" &&
    (v.id === undefined || typeof v.id === "string") &&
    (v.orden === undefined || typeof v.orden === "number")
  );
}

function parseId(raw: string): string | null {
  // cuid empieza con "c" + alfanum; si no matchea, devolvemos null.
  // Aceptamos cualquier string no vacío — Prisma va a fallar con claridad
  // si el formato no existe en la DB.
  return raw.length > 0 ? raw : null;
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  const existing = await prisma.trabajo.findUnique({
    where: { id },
    include: { media: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Trabajo no encontrado" },
      { status: 404 },
    );
  }

  let body: UpdateBody;
  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // ---------- campos escalares ----------
  const data: Record<string, unknown> = {};

  if (typeof body.titulo === "string") {
    const t = body.titulo.trim();
    if (!t) {
      return NextResponse.json(
        { error: "El título no puede estar vacío" },
        { status: 400 },
      );
    }
    data.titulo = t;
  }

  // El slug se regenera si el usuario lo edita o si cambia el título.
  // Si llega `slug` explícito, ese gana; si no, recalculamos desde el título
  // (nuevo o existente).
  if (typeof body.slug === "string" && body.slug.trim().length > 0) {
    data.slug = await generateUniqueSlug(prisma, body.slug, id);
  } else if (typeof body.titulo === "string") {
    data.slug = await generateUniqueSlug(prisma, body.titulo, id);
  }

  if (body.cliente !== undefined) {
    if (typeof body.cliente === "string" && body.cliente.trim().length > 0) {
      data.cliente = body.cliente.trim();
    } else {
      data.cliente = null;
    }
  }

  if (typeof body.tipo === "string") {
    const t = body.tipo.trim();
    if (!t) {
      return NextResponse.json(
        { error: "El tipo no puede estar vacío" },
        { status: 400 },
      );
    }
    data.tipo = t;
  }

  if (body.descripcion !== undefined) {
    if (
      typeof body.descripcion === "string" &&
      body.descripcion.trim().length > 0
    ) {
      data.descripcion = body.descripcion;
    } else {
      data.descripcion = null;
    }
  }

  if (typeof body.destacado === "boolean") data.destacado = body.destacado;
  if (typeof body.publicado === "boolean") data.publicado = body.publicado;
  if (typeof body.orden === "number") data.orden = body.orden;

  // ---------- media (sync) ----------
  if (body.media !== undefined) {
    if (!Array.isArray(body.media) || !body.media.every(isMediaInput)) {
      return NextResponse.json(
        { error: "Lista de media inválida" },
        { status: 400 },
      );
    }

    const incoming: MediaInput[] = body.media;
    const existingById = new Map(existing.media.map((m) => [m.id, m]));
    const incomingIds = new Set(
      incoming.filter((m) => typeof m.id === "string").map((m) => m.id!),
    );

    // 1) eliminar los media que ya no están
    for (const m of existing.media) {
      if (!incomingIds.has(m.id)) {
        await destroyCloudinaryAsset(
          m.publicId,
          mediaTipoToResourceType(m.tipo),
        );
        await prisma.media.delete({ where: { id: m.id } });
      }
    }

    // 2) crear los nuevos, 3) actualizar los existentes
    for (const [idx, m] of incoming.entries()) {
      if (typeof m.id === "string" && existingById.has(m.id)) {
        const prev = existingById.get(m.id)!;
        const updates: Record<string, unknown> = {
          tipo: m.tipo,
          url: m.url,
          publicId: m.publicId,
          orden: typeof m.orden === "number" ? m.orden : idx,
        };
        // Si el publicId cambió, el asset viejo queda huérfano — no lo
        // podemos borrar de forma confiable sin más contexto. Lo dejamos
        // en Cloudinary; el admin lo limpia a mano si le importa.
        await prisma.media.update({
          where: { id: m.id },
          data: updates,
        });
        // Referencia para silenciar lint de "no usado".
        void prev;
      } else {
        await prisma.media.create({
          data: {
            trabajoId: id,
            tipo: m.tipo,
            url: m.url,
            publicId: m.publicId,
            orden: typeof m.orden === "number" ? m.orden : idx,
          },
        });
      }
    }
  }

  try {
    const trabajo = await prisma.trabajo.update({
      where: { id },
      data,
      include: { media: { orderBy: { orden: "asc" } } },
    });
    return NextResponse.json({ trabajo });
  } catch (err) {
    console.error("[PUT /api/trabajos/:id] error:", err);
    return NextResponse.json(
      { error: "No se pudo actualizar el Trabajo" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  const existing = await prisma.trabajo.findUnique({
    where: { id },
    include: { media: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Trabajo no encontrado" },
      { status: 404 },
    );
  }

  // Destruir todos los assets en Cloudinary. Si alguno falla, igual seguimos:
  // lo importante es que la DB quede consistente. El admin puede limpiar
  // huérfanos desde el dashboard de Cloudinary.
  for (const m of existing.media) {
    await destroyCloudinaryAsset(m.publicId, mediaTipoToResourceType(m.tipo));
  }

  // El cascade borra las filas de `Media` automáticamente.
  await prisma.trabajo.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
