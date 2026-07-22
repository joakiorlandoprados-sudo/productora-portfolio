import { TrabajoForm } from "../_components/trabajo-form";

export default function NuevoTrabajoPage() {
  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Nuevo Trabajo
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Empezás guardando los datos; los medios se suben después con el
          botón de Cloudinary.
        </p>
      </header>

      <TrabajoForm
        initialValues={{
          titulo: "",
          slug: "",
          cliente: "",
          tipo: "Foto",
          descripcion: "",
          destacado: false,
          publicado: true,
          orden: 0,
          media: [],
        }}
      />
    </section>
  );
}
