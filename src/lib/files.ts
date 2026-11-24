// Check magic bytes, ignore the browser's MIME type and the file name.
export type AllowedMime = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export function sniffMime(bytes: Uint8Array): AllowedMime | null {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (bytes.length >= 3 && starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (bytes.length >= 8 && starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (
    bytes.length >= 12 &&
    starts(0x52, 0x49, 0x46, 0x46) && // RIFF
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 // WEBP
  )
    return "image/webp";
  if (bytes.length >= 5 && starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf"; // %PDF-
  return null;
}

const EXT: Record<AllowedMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function safeFileName(kind: string, mime: AllowedMime): string {
  return `${kind.replace(/[^a-z_]/g, "")}.${EXT[mime]}`;
}
