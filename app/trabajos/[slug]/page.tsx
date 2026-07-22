import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TrabajoDetallePage({ params }: PageProps) {
  const { slug } = await params;

  const trabajo = await prisma.trabajo.findUnique({
    where: { slug },
    include: {
      media: { orderBy: [{ orden: "asc" }, { creadoEn: "asc" }] },
    },
  });

  if (!trabajo || !trabajo.publicado) notFound();

  return (
    <main className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-widest text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← Productora
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            {trabajo.tipo}
            {trabajo.cliente ? ` · ${trabajo.cliente}` : ""}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {trabajo.titulo}
          </h1>
          {trabajo.descripcion ? (
            <p className="mt-2 max-w-3xl whitespace-pre-line text-base text-zinc-700 dark:text-zinc-300">
              {trabajo.descripcion}
            </p>
          ) : null}
        </header>

        {trabajo.media.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            Este Trabajo todavía no tiene medios.
          </p>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            {trabajo.media.map((m) =>
              m.tipo === "video" ? (
                <video
                  key={m.id}
                  src={m.url}
                  controls
                  preload="metadata"
                  playsInline
                  className="w-full rounded-2xl bg-black"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={m.id}
                  src={m.url}
                  alt={trabajo.titulo}
                  loading="lazy"
                  className="w-full rounded-2xl object-cover"
                />
              ),
            )}
          </div>
        )}
      </article>

      <footer className="border-t border-zinc-200 bg-white py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
        © Productora
      </footer>
    </main>
  );
}
