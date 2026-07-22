import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TrabajosList } from "./_components/trabajos-list";

/**
 * Listado de Trabajos para el panel admin.
 *
 * Server component: hace el fetch a Prisma del lado del servidor (más
 * rápido y sin exponer la query a la red) y le pasa la data hidratada al
 * componente cliente `TrabajosList` que se encarga de la confirmación
 * de borrado + invalidación.
 */
export default async function AdminTrabajosPage() {
  const trabajos = await prisma.trabajo.findMany({
    orderBy: [{ orden: "asc" }, { creadoEn: "desc" }],
    include: {
      media: {
        orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
        take: 1, // solo la portada
      },
    },
  });

  // Serializamos: `Date` no cruza el límite server → client.
  const serializable = trabajos.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    slug: t.slug,
    cliente: t.cliente,
    tipo: t.tipo,
    publicado: t.publicado,
    destacado: t.destacado,
    orden: t.orden,
    creadoEn: t.creadoEn.toISOString(),
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
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Trabajos
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {serializable.length === 0
              ? "Todavía no hay Trabajos cargados."
              : `${serializable.length} ${
                  serializable.length === 1 ? "Trabajo" : "Trabajos"
                } en total.`}
          </p>
        </div>
        <Link
          href="/admin/trabajos/nuevo"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-base font-medium text-zinc-50 transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + Nuevo trabajo
        </Link>
      </header>

      <TrabajosList trabajos={serializable} />
    </section>
  );
}
