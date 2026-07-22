"use client";

/**
 * Carga (una sola vez por sesión de página) el script del Upload Widget
 * oficial de Cloudinary desde su CDN.
 *
 * - La URL viene de https://cloudinary.com/documentation/upload_widget
 * - Expone `window.cloudinary.createUploadWidget(...)` para abrir el modal.
 * - Lo cargamos por tag <script> en lugar de un import npm para evitar
 *   problemas de versión y SSR; el widget de Cloudinary está pensado
 *   para usarse así.
 */

let loadingPromise: Promise<NonNullable<Window["cloudinary"]>> | null = null;

const CLOUDINARY_CDN =
  "https://upload-widget.cloudinary.com/latest/global/all.js";

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (
        options: Record<string, unknown>,
        callback: (
          error: { status: string; message: string } | null,
          result: { event: string; info: CloudinaryUploadResult },
        ) => void,
      ) => { open: () => void; close: () => void };
    };
  }
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  resource_type: "image" | "video" | "raw";
  format: string;
  original_filename: string;
}

export function loadCloudinaryWidget(): Promise<
  NonNullable<Window["cloudinary"]>
> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Solo en el navegador"));
  }
  if (window.cloudinary) {
    return Promise.resolve(window.cloudinary);
  }
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${CLOUDINARY_CDN}"]`,
    ) as HTMLScriptElement | null;

    function ready() {
      if (window.cloudinary) {
        resolve(window.cloudinary);
      } else {
        reject(new Error("Cloudinary widget no se cargó"));
      }
    }

    if (existing) {
      if (window.cloudinary) return ready();
      existing.addEventListener("load", ready);
      existing.addEventListener("error", () =>
        reject(new Error("Falló la carga del script de Cloudinary")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = CLOUDINARY_CDN;
    script.async = true;
    script.onload = () => ready();
    script.onerror = () => {
      loadingPromise = null;
      reject(new Error("Falló la carga del script de Cloudinary"));
    };
    document.head.appendChild(script);
  });

  return loadingPromise;
}
