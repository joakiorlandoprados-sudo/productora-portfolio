import { TrabajosGrid, type TrabajoCardData } from "./_components/trabajos-grid";
import { prisma } from "@/lib/prisma";

/**
 * Landing pública: grid de Trabajos publicados.
 *
 * Server component: trae los Trabajos con `publicado: true` (incluyendo
 * la media para que el cliente pueda filtrar sin re-pedir a la API).
 *
 * Filtros (cliente / tipo) viven en el componente cliente y se aplican
 * sobre la lista ya traída — sin re-fetch por cada cambio de filtro.
 */
export default async function HomePage() {
  const trabajos = await prisma.trabajo.findMany({
    where: { publicado: true },
    orderBy: [{ orden: "asc" }, { creadoEn: "desc" }],
    include: {
      media: {
        orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
        take: 1, // para la portada
      },
    },
  });

  const data: TrabajoCardData[] = trabajos.map((t) => ({
    id: t.id,
    slug: t.slug,
    titulo: t.titulo,
    cliente: t.cliente,
    tipo: t.tipo,
    portada: t.media[0]
      ? {
          url: t.media[0].url,
          tipo:
            t.media[0].tipo === "video"
              ? ("video" as const)
              : ("imagen" as const),
        }
      : null,
  }));

  return (
    <main className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-sm font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Productora
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Trabajos
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Foto y video. Cada historia, contada con tiempo y oficio.
        </p>

        <TrabajosGrid trabajos={data} />
      </section>

      <footer className="border-t border-zinc-200 bg-white py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
        © Productora
      </footer>
    </main>
  );
}
