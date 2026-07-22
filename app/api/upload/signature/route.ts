/**
 * POST /api/upload/signature
 *
 * Genera una firma para que el cliente pueda subir archivos DIRECTO a
 * Cloudinary (nunca proxysamos los bytes por una API route de Next —
 * Vercel corta cualquier serverless function a 4.5 MB).
 *
 * IMPORTANTE: el Upload Widget agrega parámetros propios (como `source: "uw"`)
 * al momento de subir, que nosotros no controlamos desde acá. Por eso este
 * endpoint no arma su propio set fijo de parámetros — recibe exactamente los
 * `paramsToSign` que el widget está por enviar (vía su callback `uploadSignature`)
 * y firma esos mismos, tal cual. Cualquier otro enfoque (firmar de antemano un
 * set fijo) se rompe apenas el widget agregue o cambie un parámetro.
 *
 * Protegido con `getSessionUser()` — solo usuarios logueados pueden pedir firmas.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { cloudinary, getApiKey, getCloudName } from "@/lib/cloudinary";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let paramsToSign: Record<string, unknown> = {};
  try {
    const body = await request.json();
    paramsToSign = body?.paramsToSign ?? {};
  } catch {
    // Sin body: es el pedido inicial (solo se necesitan apiKey/cloudName
    // antes de abrir el widget). Se firma un objeto vacío y se ignora.
  }

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET as string,
  );

  return NextResponse.json({
    signature,
    apiKey: getApiKey(),
    cloudName: getCloudName(),
  });
}