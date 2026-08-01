import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Play, Pause, Bookmark, BookmarkCheck, Search, Loader2, SkipBack, SkipForward } from 'lucide-react';

interface QuranScreenProps {
  onBack: () => void;
}

interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface Ayah {
  number: number; // global ayah number (used for audio)
  numberInSurah: number;
  text: string;
}

interface BookmarkEntry {
  surah: number;
  surahName: string;
  ayah: number;
  savedAt: number;
}

const BOOKMARKS_KEY = 'quran_bookmarks_v1';
const LAST_READ_KEY = 'quran_last_read_v1';
const AUDIO_BASE = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy';

const loadBookmarks = (): BookmarkEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
  } catch {
    return [];
  }
};

export const QuranScreen: React.FC<QuranScreenProps> = ({ onBack }) => {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [query, setQuery] = useState('');
  const [openSurah, setOpenSurah] = useState<number | null>(() => {
    const raw = localStorage.getItem(LAST_READ_KEY);
    return raw ? (JSON.parse(raw).surah as number) : null;
  });
  const [arabic, setArabic] = useState<Ayah[]>([]);
  const [translation, setTranslation] = useState<Ayah[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(loadBookmarks);
  const [playing, setPlaying] = useState<number | null>(null);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Surah list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('https://api.alquran.cloud/v1/surah', { cache: 'force-cache' });
        const json = await res.json();
        if (!cancelled) setSurahs(json.data || []);
      } catch {
        if (!cancelled) setError('Could not load the surah list. Check your connection.');
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Surah content
  useEffect(() => {
    if (!openSurah) return;
    let cancelled = false;
    setLoadingSurah(true);
    setError(null);
    (async () => {
      try {
        const [ar, en] = await Promise.all([
          fetch(`https://api.alquran.cloud/v1/surah/${openSurah}/quran-uthmani`, { cache: 'force-cache' }).then((r) => r.json()),
          fetch(`https://api.alquran.cloud/v1/surah/${openSurah}/en.sahih`, { cache: 'force-cache' }).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setArabic(ar.data?.ayahs || []);
        setTranslation(en.data?.ayahs || []);
        localStorage.setItem(LAST_READ_KEY, JSON.stringify({ surah: openSurah }));
      } catch {
        if (!cancelled) setError('Could not load this surah. Check your connection.');
      } finally {
        if (!cancelled) setLoadingSurah(false);
      }
    })();
    return () => { cancelled = true; };
  }, [openSurah]);

  // Cleanup audio
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const persistBookmarks = (next: BookmarkEntry[]) => {
    setBookmarks(next);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
  };

  const currentSurah = surahs.find((s) => s.number === openSurah);

  const isBookmarked = (ayah: number) =>
    bookmarks.some((b) => b.surah === openSurah && b.ayah === ayah);

  const toggleBookmark = (ayah: number) => {
    if (!openSurah) return;
    if (isBookmarked(ayah)) {
      persistBookmarks(bookmarks.filter((b) => !(b.surah === openSurah && b.ayah === ayah)));
    } else {
      persistBookmarks([
        { surah: openSurah, surahName: currentSurah?.englishName || `Surah ${openSurah}`, ayah, savedAt: Date.now() },
        ...bookmarks,
      ]);
    }
  };

  const playFrom = (globalNumber: number) => {
    audioRef.current?.pause();
    const audio = new Audio(`${AUDIO_BASE}/${globalNumber}.mp3`);
    audioRef.current = audio;
    audio.play().catch(() => setError('Audio playback failed. Check your connection.'));
    setPlaying(globalNumber);
    audio.onended = () => {
      const idx = arabic.findIndex((a) => a.number === globalNumber);
      const next = arabic[idx + 1];
      if (next) playFrom(next.number);
      else setPlaying(null);
    };
  };

  const togglePlay = (globalNumber: number) => {
    if (playing === globalNumber) {
      audioRef.current?.pause();
      setPlaying(null);
    } else {
      playFrom(globalNumber);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return surahs;
    return surahs.filter(
      (s) =>
        s.englishName.toLowerCase().includes(q) ||
        s.englishNameTranslation.toLowerCase().includes(q) ||
        s.name.includes(query) ||
        String(s.number) === q
    );
  }, [surahs, query]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-emerald-700 to-teal-700 text-primary-foreground px-4 py-3 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (openSurah) {
                audioRef.current?.pause();
                setPlaying(null);
                setOpenSurah(null);
              } else {
                onBack();
              }
            }}
            className="p-2 -ml-2 rounded-xl active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold truncate">
              {openSurah ? currentSurah?.englishName || 'Surah' : 'Quran Reader'}
            </h1>
            <p className="text-[11px] opacity-80 truncate">
              {openSurah
                ? `${currentSurah?.englishNameTranslation || ''} · ${currentSurah?.numberOfAyahs || 0} ayahs`
                : 'Read, listen and bookmark'}
            </p>
          </div>
          <button
            onClick={() => setShowBookmarks((v) => !v)}
            className="p-2 rounded-xl active:scale-95"
            aria-label="Bookmarks"
          >
            <Bookmark className={`w-5 h-5 ${showBookmarks ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {error && (
          <div className="rounded-xl bg-destructive/10 text-destructive text-xs p-3">{error}</div>
        )}

        {/* Bookmarks panel */}
        {showBookmarks && (
          <div className="rounded-2xl bg-card border border-border p-3 shadow-sm">
            <h2 className="text-sm font-bold mb-2">Bookmarks</h2>
            {bookmarks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No bookmarks yet. Tap the bookmark icon on any ayah.</p>
            ) : (
              <div className="space-y-1.5">
                {bookmarks.map((b) => (
                  <button
                    key={`${b.surah}-${b.ayah}`}
                    onClick={() => {
                      setShowBookmarks(false);
                      setOpenSurah(b.surah);
                      setTimeout(() => {
                        document.getElementById(`ayah-${b.ayah}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 700);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-muted text-left active:scale-[0.99]"
                  >
                    <span className="text-xs font-medium">{b.surahName} · Ayah {b.ayah}</span>
                    <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Surah list */}
        {!openSurah && (
          <>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search surah…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            {loadingList ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((s) => (
                  <button
                    key={s.number}
                    onClick={() => setOpenSurah(s.number)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl bg-card border border-border shadow-sm active:scale-[0.99]"
                  >
                    <span className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {s.number}
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-sm font-semibold truncate">{s.englishName}</span>
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {s.englishNameTranslation} · {s.numberOfAyahs} ayahs · {s.revelationType}
                      </span>
                    </span>
                    <span className="text-base font-semibold shrink-0" dir="rtl">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Surah reader */}
        {openSurah && (
          loadingSurah ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOpenSurah(Math.max(1, openSurah - 1))}
                  disabled={openSurah <= 1}
                  className="p-2 rounded-xl bg-card border border-border disabled:opacity-40"
                  aria-label="Previous surah"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={() => arabic[0] && togglePlay(arabic[0].number)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {playing ? 'Pause recitation' : 'Play full surah'}
                </button>
                <button
                  onClick={() => setOpenSurah(Math.min(114, openSurah + 1))}
                  disabled={openSurah >= 114}
                  className="p-2 rounded-xl bg-card border border-border disabled:opacity-40"
                  aria-label="Next surah"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {arabic.map((a, i) => (
                  <div
                    key={a.number}
                    id={`ayah-${a.numberInSurah}`}
                    className={`rounded-2xl bg-card border p-3 shadow-sm ${
                      playing === a.number ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-emerald-700">
                        {openSurah}:{a.numberInSurah}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => togglePlay(a.number)}
                          className="p-1.5 rounded-lg bg-muted active:scale-95"
                          aria-label={playing === a.number ? 'Pause ayah' : 'Play ayah'}
                        >
                          {playing === a.number ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => toggleBookmark(a.numberInSurah)}
                          className="p-1.5 rounded-lg bg-muted active:scale-95"
                          aria-label="Bookmark ayah"
                        >
                          {isBookmarked(a.numberInSurah) ? (
                            <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p dir="rtl" className="text-xl leading-[2.2rem] text-right font-medium">
                      {a.text}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      {translation[i]?.text}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
};
