"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminHomePage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          router.replace("/admin/login");
          return;
        }
        const data = (await res.json()) as { usuario?: string };
        if (cancelled) return;
        setUsuario(data.usuario ?? null);
      } catch {
        if (!cancelled) router.replace("/admin/login");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadMe();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // aunque falle, redirigimos: el cliente no debería quedar con sesión viva.
    }
    router.replace("/admin/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-dvh w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh w-full bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Productora
            </span>
            <span className="text-sm text-zinc-700 dark:text-zinc-200">
              Hola, <strong>{usuario}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            {loggingOut ? "Saliendo…" : "Cerrar sesión"}
          </button>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Panel admin
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Acá van a vivir los Trabajos, Medios, etc. Por ahora es un placeholder
          para que el flujo de login/logout se pueda probar end-to-end.
        </p>
      </section>
    </main>
  );
}
