const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4002/api').replace(
  /\/api\/?$/,
  '',
);

/** Normalise une URL média renvoyée par l'API (uploads locaux, R2, chemins relatifs). */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';

  // Anciennes URLs dev avec mauvais port/host → chemin relatif (rewrite Next.js)
  const localhostUpload = url.match(/^https?:\/\/localhost:\d+(\/uploads\/.*)$/);
  if (localhostUpload) return localhostUpload[1];

  // URL absolue backend → chemin relatif pour passer par le rewrite Next.js
  if (url.startsWith(`${API_ORIGIN}/uploads/`)) {
    return url.slice(API_ORIGIN.length);
  }

  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return url;
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url}`;
}

const MEDIA_URL_FIELDS = new Set(['url', 'avatarUrl', 'imageUrl', 'preuveUrl']);

export function rewriteMediaUrls<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map((item) => rewriteMediaUrls(item)) as T;
  }
  if (data && typeof data === 'object') {
    const result = { ...data } as Record<string, unknown>;
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === 'string' && MEDIA_URL_FIELDS.has(key)) {
        result[key] = resolveMediaUrl(value);
      } else if (value && typeof value === 'object') {
        result[key] = rewriteMediaUrls(value);
      }
    }
    return result as T;
  }
  return data;
}
