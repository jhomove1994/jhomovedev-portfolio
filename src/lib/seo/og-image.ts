/** Share image size. The seed test asserts the uploaded PNGs have exactly these dimensions. */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

/** MIME type from the file extension (query string ignored); undefined when unknown. */
export function ogImageType(path: string): string | undefined {
  const file = path.split(/[?#]/)[0] ?? '';
  const extension = file.includes('.') ? file.split('.').pop()?.toLowerCase() : undefined;
  return extension ? MIME_BY_EXTENSION[extension] : undefined;
}

/** Alt text built from profile content, so no sentence is hardcoded per locale. */
export function ogImageAlt(name: string, headline: string): string {
  return `${name} · ${headline}`;
}
