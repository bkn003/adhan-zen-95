import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface QuranBookmark {
  surah: number;
  surahName: string;
  ayah: number;
  savedAt: number;
}

const BOOKMARKS_KEY = 'quran_bookmarks_v1';

const readLocal = (): QuranBookmark[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

const writeLocal = (list: QuranBookmark[]) => {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
};

const dedupe = (list: QuranBookmark[]) => {
  const map = new Map<string, QuranBookmark>();
  for (const b of list) {
    if (!b || typeof b.surah !== 'number' || typeof b.ayah !== 'number') continue;
    const key = `${b.surah}-${b.ayah}`;
    const existing = map.get(key);
    if (!existing || (b.savedAt || 0) > (existing.savedAt || 0)) map.set(key, b);
  }
  return [...map.values()].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
};

/**
 * Bookmarks are kept in localStorage (works offline / signed out) and mirrored
 * into user_preferences.quran_bookmarks so they survive a refresh and follow
 * the user across sign-ins on any device.
 */
export const useQuranBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>(readLocal);
  const [synced, setSynced] = useState(false);
  const userIdRef = useRef<string | null>(null);

  const pushRemote = useCallback(async (list: QuranBookmark[]) => {
    const userId = userIdRef.current;
    if (!userId) return;
    try {
      await (supabase as any)
        .from('user_preferences')
        .upsert(
          { user_id: userId, quran_bookmarks: list as any },
          { onConflict: 'user_id' }
        );
    } catch {
      /* offline — localStorage keeps the source of truth */
    }
  }, []);

  // Initial merge with the remote copy
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id ?? null;
        userIdRef.current = userId;
        if (!userId) {
          if (!cancelled) setSynced(true);
          return;
        }
        const { data } = await (supabase as any)
          .from('user_preferences')
          .select('quran_bookmarks')
          .eq('user_id', userId)
          .maybeSingle();

        const remote: QuranBookmark[] = Array.isArray(data?.quran_bookmarks)
          ? data.quran_bookmarks
          : [];
        const merged = dedupe([...readLocal(), ...remote]);
        if (cancelled) return;
        writeLocal(merged);
        setBookmarks(merged);
        setSynced(true);
        if (merged.length !== remote.length) pushRemote(merged);
      } catch {
        if (!cancelled) setSynced(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pushRemote]);

  const persist = useCallback(
    (list: QuranBookmark[]) => {
      const next = dedupe(list);
      setBookmarks(next);
      writeLocal(next);
      pushRemote(next);
    },
    [pushRemote]
  );

  const isBookmarked = useCallback(
    (surah: number, ayah: number) => bookmarks.some((b) => b.surah === surah && b.ayah === ayah),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    (surah: number, surahName: string, ayah: number) => {
      if (isBookmarked(surah, ayah)) {
        persist(bookmarks.filter((b) => !(b.surah === surah && b.ayah === ayah)));
        return false;
      }
      persist([{ surah, surahName, ayah, savedAt: Date.now() }, ...bookmarks]);
      return true;
    },
    [bookmarks, isBookmarked, persist]
  );

  const removeBookmark = useCallback(
    (surah: number, ayah: number) => {
      persist(bookmarks.filter((b) => !(b.surah === surah && b.ayah === ayah)));
    },
    [bookmarks, persist]
  );

  return { bookmarks, isBookmarked, toggleBookmark, removeBookmark, synced };
};
