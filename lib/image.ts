/**
 * Zdjęcie z aparatu w telefonie waży kilka megabajtów, a Gemini i tak nie czyta
 * faktury dokładniej z 4000 px niż z 1600. Skalujemy je przed wysyłką, żeby
 * upload w słabym zasięgu nie trwał minutami.
 */

/** Dłuższy bok po skalowaniu. Tekst faktury zostaje czytelny, plik schodzi poniżej megabajta. */
const MAX_EDGE = 1600;

const QUALITY = 0.82;

const OUTPUT_TYPE = "image/jpeg";

/**
 * Zwraca plik gotowy do wysłania. Gdy przeglądarka nie potrafi zdekodować
 * zdjęcia (tak bywa z HEIC z iPhone'a), oddajemy oryginał — serwer przyjmuje
 * też duże pliki, więc lepiej wysłać wolniej niż nie wysłać wcale.
 */
export async function compressImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    // `from-image` obraca zdjęcie zgodnie z EXIF-em, inaczej fotki z telefonu
    // trzymanego pionowo trafiają na płótno położone na boku.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d");
    if (context === null) return file;

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, OUTPUT_TYPE, QUALITY);
    });

    if (blob === null || blob.size === 0) return file;
    // Przy małym zdjęciu ponowna kompresja JPEG-a potrafi go powiększyć.
    if (blob.size >= file.size && scale === 1) return file;

    return new File([blob], jpegName(file.name), {
      type: OUTPUT_TYPE,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

function jpegName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim();
  return `${base.length > 0 ? base : "faktura"}.jpg`;
}
