import { ReactNode } from "react";
import Link from "next/link";
import { AdminHeader } from "./_components/admin-header";

/**
 * Layout del backoffice: cabecera sticky con branding, usuario logueado y
 * botón de cerrar sesión. Todas las páginas /admin/* (salvo /admin/login)
 * la heredan.
 *
 * El "Hola, X" + logout lo cargamos en el cliente (necesitamos el fetch
 * a /api/auth/me), pero la estructura de la nav (links a Trabajos) puede
 * ser server-rendered.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Productora
            </span>
            <nav className="flex items-center gap-3 text-sm">
              <Link
                href="/admin"
                className="text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                Inicio
              </Link>
              <Link
                href="/admin/trabajos"
                className="text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                Trabajos
              </Link>
            </nav>
          </div>
          <AdminHeader />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
