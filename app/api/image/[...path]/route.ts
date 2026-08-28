import { get } from "@vercel/blob";

import { isInvoiceBlobPathname } from "@/lib/blob";
import { hasValidSession } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/image/[...path]">,
) {
  if (!(await hasValidSession())) {
    return new Response("Brak aktywnej sesji.", { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new Response("Magazyn zdjęć nie jest podłączony.", { status: 503 });
  }

  const { path } = await params;
  const pathname = path.map(decodeURIComponent).join("/");

  if (!isInvoiceBlobPathname(pathname)) {
    return new Response("Nie znaleziono zdjęcia.", { status: 404 });
  }

  const result = await get(pathname, { access: "private" });

  if (result === null) {
    return new Response("Nie znaleziono zdjęcia.", { status: 404 });
  }

  if (result.statusCode === 304) {
    return new Response(null, { status: 304 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Content-Length": String(result.blob.size),
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
