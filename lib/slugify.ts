/**
 * Slugify de un título a URL-friendly, en ASCII puro.
 *
 * Reglas:
 * - minúsculas
 * - sin acentos (NFD + strip combining marks)
 * - todo lo que no sea [a-z0-9] se reemplaza por `-`
 * - sin guiones al inicio / final, sin guiones duplicados
 *
 * `Boda en Bariloche 2025!` → `boda-en-bariloche-2025`
 */

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
