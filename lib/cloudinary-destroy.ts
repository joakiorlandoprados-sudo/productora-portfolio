/**
 * Borra un asset de Cloudinary.
 *
 * Hay que pasar el `resource_type` correcto: si no se especifica, Cloudinary
 * asume `image` y falla el destroy de los videos (devuelve
 * `Resource not found` aunque el asset exista, porque lo busca en el folder
 * de imagenes).
 *
 * Si el asset ya no existe en Cloudinary (porque alguien lo borró a mano,
 * por ejemplo), `destroy` igual responde 200 con `result: "not found"` —
 * no es un error fatal para nuestro flujo. Loggeamos y seguimos.
 */

import { cloudinary } from "@/lib/cloudinary";

export type CloudinaryResourceType = "image" | "video";

export async function destroyCloudinaryAsset(
  publicId: string,
  resourceType: CloudinaryResourceType,
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch (err) {
    // No reventamos el flujo: el activo puede no existir (ya borrado) o haber
    // un blip de red. El cascade de la DB se ocupa del registro; el admin
    // puede limpiar huérfanos desde el panel de Cloudinary.
    console.error(
      `[cloudinary] No se pudo destruir ${publicId} (${resourceType}):`,
      err,
    );
  }
}

/** Mapea el `tipo` interno de `Media` al `resource_type` de Cloudinary. */
export function mediaTipoToResourceType(
  tipo: string,
): CloudinaryResourceType {
  return tipo === "video" ? "video" : "image";
}
