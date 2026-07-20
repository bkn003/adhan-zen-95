// Client-side signed URL cache for mosque photos.
// Fetches short-lived signed URLs from the `mosque-photos` edge function,
// batches requests, and caches per-id until near expiry so gallery/carousels
// don't refetch on every render.
import { useEffect, useState } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const FN_URL = `${SUPABASE_URL}/functions/v1/mosque-photos`;

// Refresh a bit before the server-side 1h TTL.
const CACHE_TTL_MS = 55 * 60 * 1000;

type CacheEntry = { url: string; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

async function fetchSignedUrls(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ action: "get_signed_urls", photo_ids: ids }),
  });
  if (!res.ok) return {};
  const data = await res.json().catch(() => ({}));
  return (data?.urls || {}) as Record<string, string>;
}

export async function getSignedPhotoUrls(ids: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const out: Record<string, string> = {};
  const missing: string[] = [];

  for (const id of ids) {
    const hit = cache.get(id);
    if (hit && hit.expiresAt > now) {
      out[id] = hit.url;
    } else {
      missing.push(id);
    }
  }
  if (missing.length === 0) return out;

  // De-dupe concurrent requests per-id.
  const toFetch = missing.filter((id) => !inflight.has(id));
  if (toFetch.length > 0) {
    const p = fetchSignedUrls(toFetch).then((urls) => {
      const exp = Date.now() + CACHE_TTL_MS;
      for (const id of toFetch) {
        const url = urls[id];
        if (url) cache.set(id, { url, expiresAt: exp });
      }
      return urls;
    });
    toFetch.forEach((id) =>
      inflight.set(
        id,
        p.then((urls) => urls[id] ?? null).finally(() => inflight.delete(id))
      )
    );
  }

  await Promise.all(missing.map((id) => inflight.get(id)).filter(Boolean));
  for (const id of missing) {
    const hit = cache.get(id);
    if (hit) out[id] = hit.url;
  }
  return out;
}

export function invalidateSignedPhotoUrl(id: string) {
  cache.delete(id);
}

/**
 * React hook returning a map of photo id -> signed URL, cached across renders.
 */
export function useSignedPhotoUrls(ids: string[]): Record<string, string> {
  const key = ids.join(",");
  const [urls, setUrls] = useState<Record<string, string>>(() => {
    const now = Date.now();
    const initial: Record<string, string> = {};
    for (const id of ids) {
      const hit = cache.get(id);
      if (hit && hit.expiresAt > now) initial[id] = hit.url;
    }
    return initial;
  });

  useEffect(() => {
    let cancelled = false;
    if (ids.length === 0) {
      setUrls({});
      return;
    }
    getSignedPhotoUrls(ids).then((next) => {
      if (!cancelled) setUrls((prev) => ({ ...prev, ...next }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return urls;
}
