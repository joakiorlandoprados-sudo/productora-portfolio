import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TrabajoForm } from "../../_components/trabajo-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarTrabajoPage({ params }: PageProps) {
  const { id } = await params;

  const trabajo = await prisma.trabajo.findUnique({
    where: { id },
    include: {
      media: { orderBy: [{ orden: "asc" }, { creadoEn: "asc" }] },
    },
  });

  if (!trabajo) notFound();

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Editar Trabajo
        </h1>
        <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
          {trabajo.titulo} · <span className="opacity-70">/{trabajo.slug}</span>
        </p>
      </header>

      <TrabajoForm
        trabajoId={trabajo.id}
        initialValues={{
          titulo: trabajo.titulo,
          slug: trabajo.slug,
          cliente: trabajo.cliente ?? "",
          tipo: trabajo.tipo,
          descripcion: trabajo.descripcion ?? "",
          destacado: trabajo.destacado,
          publicado: trabajo.publicado,
          orden: trabajo.orden,
          media: trabajo.media.map((m) => ({
            id: m.id,
            tipo: m.tipo === "video" ? "video" : "imagen",
            url: m.url,
            publicId: m.publicId,
            orden: m.orden,
          })),
        }}
      />
    </section>
  );
}
