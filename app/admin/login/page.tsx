"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFallback() {
  // Placeholder mientras Next hidrata useSearchParams en el server-render.
  return (
    <main className="min-h-dvh w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });
      if (!res.ok) {
        // Mensaje genérico del servidor, no filtramos si fue user o pass.
        setError("Usuario o contraseña incorrectos");
        setLoading(false);
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor. Probá de nuevo.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh w-full flex items-center justify-center bg-zinc-50 px-4 py-8 dark:bg-zinc-950">
      <div className="w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 sm:p-8 dark:bg-zinc-900 dark:ring-zinc-800">
        <header className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Productora
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Panel admin
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Iniciá sesión para continuar.
          </p>
        </header>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="usuario"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Usuario
            </label>
            <input
              id="usuario"
              name="usuario"
              type="text"
              autoComplete="username"
              inputMode="text"
              enterKeyHint="next"
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              disabled={loading}
              // text-base (16px) para que iOS no haga zoom al enfocar.
              // h-11 = 44px, mínimo recomendado para touch.
              className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/10"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                inputMode="text"
                enterKeyHint="go"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                // Padding derecho extra para que el texto no choque con el botón de toggle.
                className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 pr-12 text-base text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                disabled={loading}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex h-full w-11 items-center justify-center text-sm font-medium text-zinc-600 transition hover:text-zinc-900 disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !usuario || !password}
            className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-base font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? (
              <>
                <span
                  aria-hidden
                  className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-50 border-t-transparent dark:border-zinc-900 dark:border-t-transparent"
                />
                <span>Ingresando…</span>
              </>
            ) : (
              <span>Ingresar</span>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
