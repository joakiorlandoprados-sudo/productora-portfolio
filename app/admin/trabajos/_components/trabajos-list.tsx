"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface TrabajoListItem {
  id: string;
  titulo: string;
  slug: string;
  cliente: string | null;
  tipo: string;
  publicado: boolean;
  destacado: boolean;
  orden: number;
  creadoEn: string;
  portada: { url: string; tipo: "imagen" | "video" } | null;
}

interface Props {
  trabajos: TrabajoListItem[];
}

/**
 * Listado renderizado. La confirmación de borrado vive acá porque la
 * decisión de si disparar el DELETE o no necesita estado de UI.
 */
export function TrabajosList({ trabajos }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (pendingId) return;
    setPendingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/trabajos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "No se pudo borrar el Trabajo");
      }
      // Refresca la lista: revalidar la ruta padre y recargar.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setPendingId(null);
      setConfirmId(null);
    }
  }

  if (trabajos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        <p className="mb-3">Empezá creando tu primer Trabajo.</p>
        <Link
          href="/admin/trabajos/nuevo"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-base font-medium text-zinc-50 transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Crear Trabajo
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}

      <ul className="flex flex-col gap-2">
        {trabajos.map((t) => {
          const confirming = confirmId === t.id;
          const isPending = pendingId === t.id;
          return (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 sm:gap-4 sm:p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 sm:h-20 sm:w-20 dark:bg-zinc-800">
                {t.portada ? (
                  t.portada.tipo === "video" ? (
                    <video
                      src={t.portada.url}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.portada.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                    sin portada
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold">
                    {t.titulo}
                  </h2>
                  {t.destacado ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                      Destacado
                    </span>
                  ) : null}
                  {t.publicado ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                      Publicado
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      Borrador
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
                  {t.cliente ? `${t.cliente} · ` : ""}
                  {t.tipo}
                  {t.orden !== 0 ? ` · orden ${t.orden}` : ""}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-500">
                  /{t.slug}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/admin/trabajos/${t.id}/editar`}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                >
                  Editar
                </Link>
                {confirming ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      disabled={isPending}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-3 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                    >
                      {isPending ? "Borrando…" : "Confirmar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      disabled={isPending}
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setConfirmId(t.id);
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-900/50 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    Borrar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
