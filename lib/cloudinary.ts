/**
 * Configuración server-side del SDK de Cloudinary.
 *
 * NUNCA importes este archivo desde un componente cliente: el `api_secret` se
 * loggea o se envía a Cloudinary en cada llamada, y si termina en un bundle
 * del navegador queda expuesto.
 *
 * Las tres variables (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
 * `CLOUDINARY_API_SECRET`) viven en el entorno del servidor (Vercel
 * Preview/Production) y NO llevan prefijo `NEXT_PUBLIC_`.
 *
 * Singleton para evitar reinstanciar el SDK en cada request de Next (HMR
 * de dev incluido).
 */

import { v2 as cloudinary, type ConfigOptions } from "cloudinary";

const globalForCloudinary = globalThis as unknown as {
  __cloudinaryConfigured: boolean | undefined;
};

function configure(): void {
  if (globalForCloudinary.__cloudinaryConfigured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Faltan variables de entorno de Cloudinary (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)",
    );
  }

  const config: ConfigOptions = {
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  };

  cloudinary.config(config);
  globalForCloudinary.__cloudinaryConfigured = true;
}

configure();

/** SDK de Cloudinary listo para usar (`uploader`, `utils`, etc.). */
export { cloudinary };

/** Cloud name público — seguro de exponer al cliente. */
export function getCloudName(): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error("CLOUDINARY_CLOUD_NAME no está definida");
  }
  return cloudName;
}

/** API key pública — se la pasamos al Upload Widget para que arme la firma. */
export function getApiKey(): string {
  const apiKey = process.env.CLOUDINARY_API_KEY;
  if (!apiKey) {
    throw new Error("CLOUDINARY_API_KEY no está definida");
  }
  return apiKey;
}
