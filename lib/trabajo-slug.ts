/**
 * Genera un slug único para `Trabajo` basado en el título.
 *
 * Si el slug base ya existe en la base, le va sumando sufijos numéricos
 * hasta encontrar uno libre: `boda`, `boda-2`, `boda-3`, ...
 *
 * Se usa tanto en `POST` (creación) como en `PUT` (cuando el usuario edita
 * el título o el slug).
 *
 * @param base       título o slug propuesto por el usuario
 * @param prisma     cliente Prisma (se inyecta para mantener el helper puro)
 * @param excludeId  id del Trabajo actual (en `PUT`, para no chocar consigo
 *                   mismo al validar unicidad)
 */

import type { PrismaClient } from "@/app/generated/prisma/client";
import { slugify } from "@/lib/slugify";

export async function generateUniqueSlug(
  prisma: PrismaClient,
  base: string,
  excludeId?: string,
): Promise<string> {
  const baseSlug = slugify(base);
  if (!baseSlug) {
    throw new Error("No se pudo generar un slug a partir del título");
  }

  let candidate = baseSlug;
  let suffix = 1;
  // Límite de seguridad para no loopear infinito si algo está muy mal.
  while (suffix < 10_000) {
    const existing = await prisma.trabajo.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) {
      return candidate;
    }
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
  throw new Error("No se pudo generar un slug único");
}
