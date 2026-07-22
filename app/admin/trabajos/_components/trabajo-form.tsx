"use client";

import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { slugify } from "@/lib/slugify";
import {
  loadCloudinaryWidget,
  type CloudinaryUploadResult,
} from "./cloudinary-widget";

export interface MediaItem {
  /** Id interno (cuid) — presente para media existente, undefined para nuevo. */
  id?: string;
  tipo: "imagen" | "video";
  url: string;
  publicId: string;
  orden: number;
}

export interface TrabajoFormValues {
  titulo: string;
  slug: string;
  cliente: string;
  tipo: string;
  descripcion: string;
  destacado: boolean;
  publicado: boolean;
  orden: number;
  media: MediaItem[];
}

interface Props {
  /** Si está presente, la página está en modo edición. */
  trabajoId?: string;
  initialValues: TrabajoFormValues;
}

const TIPOS_SUGERIDOS = ["Foto", "Video", "Foto y Video"];

/**
 * Formulario de Trabajo compartido entre `/admin/trabajos/nuevo` y
 * `/admin/trabajos/[id]/editar`. Mismo componente, dos páginas server
 * que lo hidratan con diferentes `initialValues`.
 *
 * Mobile-first: todos los inputs apuntan a h-11 (44px) y text-base
 * (16px) para que Safari iOS no haga zoom al enfocar y los targets
 * táctiles cumplan el mínimo de Apple HIG.
 *
 * Subida de medios: el botón "Subir medio" abre el Upload Widget de
 * Cloudinary, que sube DIRECTO a Cloudinary (los bytes nunca tocan
 * Vercel). Al terminar, agrega el Media resultante al estado local.
 */
export function TrabajoForm({ trabajoId, initialValues }: Props) {
  const router = useRouter();
  const isEdit = Boolean(trabajoId);

  const [titulo, setTitulo] = useState(initialValues.titulo);
  const [slug, setSlug] = useState(initialValues.slug);
  const [slugDirty, setSlugDirty] = useState(isEdit); // en edit, el usuario ya lo tocó
  const [cliente, setCliente] = useState(initialValues.cliente);
  const [tipo, setTipo] = useState(initialValues.tipo);
  const [descripcion, setDescripcion] = useState(initialValues.descripcion);
  const [destacado, setDestacado] = useState(initialValues.destacado);
  const [publicado, setPublicado] = useState(initialValues.publicado);
  const [orden, setOrden] = useState(initialValues.orden);
  const [media, setMedia] = useState<MediaItem[]>(initialValues.media);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetBusy, setWidgetBusy] = useState(false);

  // Si solo se está creando y el usuario no tocó el slug a mano, mantenelo
  // sincronizado con el título.
  useEffect(() => {
    if (!slugDirty) setSlug(slugify(titulo));
  }, [titulo, slugDirty]);

  const sortedMedia = useMemo(
    () => [...media].sort((a, b) => a.orden - b.orden),
    [media],
  );

  const openUploader = useCallback(async () => {
    if (widgetBusy) return;
    setError(null);
    setWidgetBusy(true);
    try {
      // 1) Pedimos la firma al backend.
      const sigRes = await fetch("/api/upload/signature", { method: "POST" });
      if (!sigRes.ok) {
        throw new Error("No se pudo obtener la firma de subida");
      }
      const sig = (await sigRes.json()) as {
        signature: string;
        timestamp: number;
        apiKey: string;
        cloudName: string;
        folder: string;
      };

      // 2) Cargamos el script del widget (cacheado después de la primera vez).
      const cloudinary = await loadCloudinaryWidget();

      // 3) Abrimos el widget. El callback se llama múltiples veces: una por
      // archivo subido. Filtramos solo los eventos `success`.
      await new Promise<void>((resolve, reject) => {
        const widget = cloudinary.createUploadWidget(
          {
            cloudName: sig.cloudName,
            apiKey: sig.apiKey,
            folder: sig.folder,
            // uploadSignature como función: el widget te pasa los parámetros
            // exactos que está por enviar (incluye "source: uw", que el widget
            // agrega solo) y vos los firmás en ese momento, no antes. Esto es
            // lo que evita el "Invalid Signature".
            uploadSignature: (
              callback: (signature: string) => void,
              paramsToSign: Record<string, unknown>,
            ) => {
              fetch("/api/upload/signature", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paramsToSign }),
              })
                .then((res) => res.json())
                .then((data) => callback(data.signature))
                .catch((err) => reject(err));
            },
            // Que el cliente pueda elegir varias cosas y subir varias a la vez
            multiple: true,
            // En el plan free, videos >100MB necesitan chunking; el widget
            // lo resuelve solo.
            sources: ["local", "camera", "url"],
            maxFileSize: 500_000_000, // 500MB de tope defensivo
          },
          (err, result) => {
            if (err) {
              widget.close();
              reject(new Error(err.message ?? "Error del widget"));
              return;
            }
            if (result.event === "success") {
              const info: CloudinaryUploadResult = result.info;
              addMediaFromUpload(info);
            } else if (result.event === "abort" || result.event === "close") {
              widget.close();
              resolve();
            }
          },
        );
        widget.open();
      })} catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo abrir el uploader",
      );
    } finally {
      setWidgetBusy(false);
    }
  }, [widgetBusy]); // eslint-disable-line react-hooks/exhaustive-deps

  function addMediaFromUpload(info: CloudinaryUploadResult) {
    const tipo: "imagen" | "video" =
      info.resource_type === "video" ? "video" : "imagen";
    setMedia((prev) => [
      ...prev,
      {
        tipo,
        url: info.secure_url,
        publicId: info.public_id,
        orden: prev.length,
      },
    ]);
  }

  function updateMediaOrden(index: number, value: number) {
    setMedia((prev) => {
      const next = [...prev];
      // `index` viene del array ordenado; mapeamos al id real.
      const sorted = [...next].sort((a, b) => a.orden - b.orden);
      const target = sorted[index];
      const realIndex = next.findIndex((m) => m === target);
      if (realIndex === -1) return prev;
      next[realIndex] = { ...next[realIndex], orden: value };
      return next;
    });
  }

  function removeMedia(index: number) {
    setMedia((prev) => {
      const sorted = [...prev].sort((a, b) => a.orden - b.orden);
      const target = sorted[index];
      return prev.filter((m) => m !== target);
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!titulo.trim() || !tipo.trim()) {
      setError("Título y tipo son obligatorios");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        slug: slug.trim() || undefined,
        cliente: cliente.trim() || null,
        tipo: tipo.trim(),
        descripcion: descripcion.trim() || null,
        destacado,
        publicado,
        orden,
        media: media.map((m) => ({
          id: m.id,
          tipo: m.tipo,
          url: m.url,
          publicId: m.publicId,
          orden: m.orden,
        })),
      };

      const res = await fetch(
        isEdit ? `/api/trabajos/${trabajoId}` : "/api/trabajos",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "No se pudo guardar el Trabajo");
      }

      router.push("/admin/trabajos");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6"
      noValidate
    >
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Datos del Trabajo
        </legend>

        <Field label="Título" htmlFor="titulo" required>
          <input
            id="titulo"
            type="text"
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            disabled={submitting}
            className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/10"
          />
        </Field>

        <Field
          label="Slug"
          htmlFor="slug"
          help="Se usa en la URL: /trabajos/este-slug. Si lo dejás vacío, se genera del título."
        >
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugDirty(true);
            }}
            disabled={submitting}
            className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/10"
          />
        </Field>

        <Field label="Cliente" htmlFor="cliente" help="Opcional. Si es contenido propio, dejalo vacío.">
          <input
            id="cliente"
            type="text"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            disabled={submitting}
            className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/10"
          />
        </Field>

        <Field label="Tipo" htmlFor="tipo" required>
          <input
            id="tipo"
            type="text"
            list="tipos-sugeridos"
            required
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            disabled={submitting}
            className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/10"
          />
          <datalist id="tipos-sugeridos">
            {TIPOS_SUGERIDOS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>

        <Field label="Descripción" htmlFor="descripcion">
          <textarea
            id="descripcion"
            rows={4}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={submitting}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/10"
          />
        </Field>

        <Field label="Orden" htmlFor="orden" help="Más bajo = aparece primero.">
          <input
            id="orden"
            type="number"
            value={orden}
            onChange={(e) => setOrden(Number(e.target.value) || 0)}
            disabled={submitting}
            className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/10"
          />
        </Field>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
          <CheckField
            label="Destacado"
            htmlFor="destacado"
            checked={destacado}
            onChange={setDestacado}
            disabled={submitting}
          />
          <CheckField
            label="Publicado"
            htmlFor="publicado"
            checked={publicado}
            onChange={setPublicado}
            disabled={submitting}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Medios
        </legend>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={openUploader}
            disabled={widgetBusy || submitting}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-base font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            {widgetBusy ? "Abriendo uploader…" : "+ Subir medio"}
          </button>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Imágenes y videos van directo a Cloudinary, sin pasar por el
            servidor. La portada del Trabajo es el medio con orden más bajo.
          </p>
        </div>

        {sortedMedia.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            Todavía no subiste medios.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sortedMedia.map((m, idx) => (
              <li
                key={`${m.publicId}-${idx}`}
                className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-2 sm:p-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 sm:h-20 sm:w-20 dark:bg-zinc-800">
                  {m.tipo === "video" ? (
                    <video
                      src={m.url}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {m.tipo}
                  </span>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`orden-${idx}`}
                      className="text-sm text-zinc-600 dark:text-zinc-300"
                    >
                      Orden
                    </label>
                    <input
                      id={`orden-${idx}`}
                      type="number"
                      value={m.orden}
                      onChange={(e) =>
                        updateMediaOrden(idx, Number(e.target.value) || 0)
                      }
                      disabled={submitting}
                      className="h-9 w-20 rounded-md border border-zinc-300 bg-white px-2 text-base text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/10"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeMedia(idx)}
                  disabled={submitting}
                  aria-label="Borrar este medio"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/admin/trabajos")}
          disabled={submitting}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-base font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-base font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {submitting
            ? "Guardando…"
            : isEdit
              ? "Guardar cambios"
              : "Crear Trabajo"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  help,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
        {required ? (
          <span className="ml-1 text-red-600" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {help ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-500">{help}</p>
      ) : null}
    </div>
  );
}

function CheckField({
  label,
  htmlFor,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  htmlFor: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex h-11 cursor-pointer items-center gap-3 rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
    >
      <input
        id={htmlFor}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-5 w-5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950"
      />
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}
