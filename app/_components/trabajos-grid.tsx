"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface TrabajoCardData {
  id: string;
  slug: string;
  titulo: string;
  cliente: string | null;
  tipo: string;
  portada: { url: string; tipo: "imagen" | "video" } | null;
}

interface Props {
  trabajos: TrabajoCardData[];
}

/**
 * Grid de Trabajos con filtros por cliente y tipo (client-side).
 *
 * Los valores de los selects se derivan de la lista ya cargada, no se
 * traen en otro fetch. Cuando cambia un filtro, se re-renderiza la grilla
 * sin pegarle a la API.
 */
export function TrabajosGrid({ trabajos }: Props) {
  const [cliente, setCliente] = useState<string>("");
  const [tipo, setTipo] = useState<string>("");

  const clientes = useMemo(() => {
    const set = new Set<string>();
    for (const t of trabajos) {
      if (t.cliente) set.add(t.cliente);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [trabajos]);

  const tipos = useMemo(() => {
    const set = new Set<string>();
    for (const t of trabajos) set.add(t.tipo);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [trabajos]);

  const filtered = useMemo(() => {
    return trabajos.filter((t) => {
      if (cliente && t.cliente !== cliente) return false;
      if (tipo && t.tipo !== tipo) return false;
      return true;
    });
  }, [trabajos, cliente, tipo]);

  const hayFiltros = cliente || tipo;

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Cliente
          </span>
          <select
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/10"
          >
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Tipo
          </span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/10"
          >
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {hayFiltros ? (
          <button
            type="button"
            onClick={() => {
              setCliente("");
              setTipo("");
            }}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Limpiar
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          No hay Trabajos con esos filtros.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <li key={t.id}>
              <Link
                href={`/trabajos/${t.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:border-zinc-900 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-200"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  {t.portada ? (
                    t.portada.tipo === "video" ? (
                      <video
                        src={t.portada.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.portada.url}
                        alt={t.titulo}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
                      sin portada
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 p-4">
                  <h2 className="truncate text-base font-semibold">
                    {t.titulo}
                  </h2>
                  <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                    {t.cliente ? `${t.cliente} · ` : ""}
                    {t.tipo}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
