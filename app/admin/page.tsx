"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Hub del panel admin. En esta versión solo expone Trabajos, pero queda
 * estructurado para que agregar otras secciones (Clientes, Tipos, etc.)
 * sea solo sumar una card.
 */
export default function AdminHomePage() {
  const [usuario, setUsuario] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { usuario?: string };
        if (!cancelled) setUsuario(data.usuario ?? null);
      } catch {
        // no-op
      }
    }
    void loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Panel admin
        </h1>
        {usuario ? (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Sesión iniciada como <strong>{usuario}</strong>.
          </p>
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/trabajos"
          className="group flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-900 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-200"
        >
          <span className="text-base font-semibold">Trabajos</span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Crear, editar, publicar y subir fotos / videos.
          </span>
        </Link>
      </div>
    </section>
  );
}
