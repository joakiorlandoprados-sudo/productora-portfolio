"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Cabecera derecha del panel admin: muestra el usuario logueado y el botón
 * de cerrar sesión. La página /admin/login no usa este layout (no hereda
 * este componente, está bajo /admin/login que no matchea el layout).
 *
 * - Mientras carga: muestra "…" para no layout-shift.
 * - Si /api/auth/me responde 401: lo mandamos a /admin/login.
 *   (En condiciones normales no debería pasar porque `proxy.ts` ya
 *   bloquea el acceso sin cookie; este es un fallback por si la cookie
 *   se venció durante la sesión.)
 */
export function AdminHeader() {
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
          if (!cancelled) router.replace("/admin/login");
          return;
        }
        const data = (await res.json()) as { usuario?: string };
        if (!cancelled) setUsuario(data.usuario ?? null);
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
      <span className="text-sm text-zinc-400" aria-hidden>
        …
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-zinc-600 sm:inline dark:text-zinc-300">
        Hola, <strong>{usuario}</strong>
      </span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-60 sm:px-4 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
      >
        {loggingOut ? "Saliendo…" : "Cerrar sesión"}
      </button>
    </div>
  );
}
