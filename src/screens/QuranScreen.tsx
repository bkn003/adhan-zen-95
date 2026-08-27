import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Play, Pause, Bookmark, BookmarkCheck, Search, Loader2,
  SkipBack, SkipForward, Repeat, X, CheckCircle2,
} from 'lucide-react';
import { useQuranBookmarks } from '@/hooks/useQuranBookmarks';

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

const LAST_READ_KEY = 'quran_last_read_v1';
const TRANSLATION_KEY = 'quran_translation_edition_v1';
const AUDIO_BASE = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy';

const TRANSLATION_EDITIONS: { id: string; label: string; rtl?: boolean }[] = [
  { id: 'en.sahih', label: 'English' },
  { id: 'ta.tamil', label: 'தமிழ்' },
  { id: 'hi.hindi', label: 'हिन्दी' },
  { id: 'ml.abdulhameed', label: 'മലയാളം' },
  { id: 'bn.bengali', label: 'বাংলা' },
  { id: 'ur.jalandhry', label: 'اردو', rtl: true },
];


const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

export const QuranScreen: React.FC<QuranScreenProps> = ({ onBack }) => {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [query, setQuery] = useState('');
  const [openSurah, setOpenSurah] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(LAST_READ_KEY);
      return raw ? (JSON.parse(raw).surah as number) : null;
    } catch {
      return null;
    }
  });
  const [arabic, setArabic] = useState<Ayah[]>([]);
  const [translation, setTranslation] = useState<Ayah[]>([]);
  const [edition, setEdition] = useState<string>(() => {
    try {
      return localStorage.getItem(TRANSLATION_KEY) || 'en.sahih';
    } catch {
      return 'en.sahih';
    }
  });

  const [loadingList, setLoadingList] = useState(true);
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBookmarks, setShowBookmarks] = useState(false);

  const { bookmarks, isBookmarked, toggleBookmark, removeBookmark, synced } = useQuranBookmarks();

  // ---- audio player state ----
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null); // index in `arabic`
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeatVerse, setRepeatVerse] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

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
        const [ar, tr] = await Promise.all([
          fetch(`https://api.alquran.cloud/v1/surah/${openSurah}/quran-uthmani`, { cache: 'force-cache' }).then((r) => r.json()),
          fetch(`https://api.alquran.cloud/v1/surah/${openSurah}/${edition}`, { cache: 'force-cache' }).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setArabic(ar.data?.ayahs || []);
        setTranslation(tr.data?.ayahs || []);
        localStorage.setItem(LAST_READ_KEY, JSON.stringify({ surah: openSurah }));
      } catch {
        if (!cancelled) setError('Could not load this surah. Check your connection.');
      } finally {
        if (!cancelled) setLoadingSurah(false);
      }
    })();
    return () => { cancelled = true; };
  }, [openSurah, edition]);

  const changeEdition = (id: string) => {
    setEdition(id);
    try { localStorage.setItem(TRANSLATION_KEY, id); } catch { /* ignore */ }
  };

  const editionMeta = TRANSLATION_EDITIONS.find((e) => e.id === edition);


  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setIsPlaying(false);
    setActiveIdx(null);
    setPosition(0);
    setDuration(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const currentSurah = surahs.find((s) => s.number === openSurah);

  const playIndex = useCallback((idx: number, startAt = 0) => {
    const ayah = arabic[idx];
    if (!ayah) { stopAudio(); return; }

    audioRef.current?.pause();
    const audio = new Audio(`${AUDIO_BASE}/${ayah.number}.mp3`);
    audioRef.current = audio;
    setActiveIdx(idx);
    setPosition(startAt);
    setDuration(0);

    audio.onloadedmetadata = () => {
      setDuration(audio.duration || 0);
      if (startAt > 0) audio.currentTime = startAt;
    };
    audio.ontimeupdate = () => setPosition(audio.currentTime);
    audio.onended = () => {
      if (repeatVerse) { playIndex(idx); return; }
      if (idx + 1 < arabic.length) playIndex(idx + 1);
      else { setIsPlaying(false); setPosition(0); }
    };
    audio.onerror = () => {
      setError('Audio playback failed. Check your connection.');
      setIsPlaying(false);
    };

    audio.play()
      .then(() => setIsPlaying(true))
      .catch(() => { setError('Audio playback failed. Check your connection.'); setIsPlaying(false); });

    if (autoScroll) {
      setTimeout(() => {
        document.getElementById(`ayah-${ayah.numberInSurah}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    }
  }, [arabic, repeatVerse, autoScroll, stopAudio]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (activeIdx === null || !audio) { playIndex(0); return; }
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [activeIdx, playIndex]);

  const playAyahIndex = (idx: number) => {
    if (activeIdx === idx && audioRef.current) { togglePlayPause(); return; }
    playIndex(idx);
  };

  const seekTo = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setPosition(value);
  };

  const stepVerse = (delta: number) => {
    const base = activeIdx ?? 0;
    const next = Math.min(arabic.length - 1, Math.max(0, base + delta));
    playIndex(next);
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

  const activeAyah = activeIdx !== null ? arabic[activeIdx] : null;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-white ${activeAyah ? 'pb-44' : 'pb-24'}`}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-emerald-700 to-teal-700 text-primary-foreground px-4 py-3 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (openSurah) { stopAudio(); setOpenSurah(null); } else { onBack(); }
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
            className="p-2 rounded-xl active:scale-95 relative"
            aria-label="Bookmarks"
          >
            <Bookmark className={`w-5 h-5 ${showBookmarks ? 'fill-current' : ''}`} />
            {bookmarks.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-amber-400 text-[9px] font-bold text-emerald-900 flex items-center justify-center">
                {bookmarks.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {error && (
          <div className="rounded-xl bg-destructive/10 text-destructive text-xs p-3 flex items-start justify-between gap-2">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Bookmarks panel */}
        {showBookmarks && (
          <div className="rounded-2xl bg-card border border-border p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold">Bookmarks</h2>
              {synced && (
                <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Saved
                </span>
              )}
            </div>
            {bookmarks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No bookmarks yet. Tap the bookmark icon on any ayah.</p>
            ) : (
              <div className="space-y-1.5">
                {bookmarks.map((b) => (
                  <div
                    key={`${b.surah}-${b.ayah}`}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-muted"
                  >
                    <button
                      onClick={() => {
                        setShowBookmarks(false);
                        setOpenSurah(b.surah);
                        setTimeout(() => {
                          document.getElementById(`ayah-${b.ayah}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 700);
                      }}
                      className="flex-1 text-left text-xs font-medium active:scale-[0.99]"
                    >
                      {b.surahName} · Ayah {b.ayah}
                    </button>
                    <button onClick={() => removeBookmark(b.surah, b.ayah)} aria-label="Remove bookmark" className="p-1">
                      <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>
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
                  onClick={() => { stopAudio(); setOpenSurah(Math.max(1, openSurah - 1)); }}
                  disabled={openSurah <= 1}
                  className="p-2 rounded-xl bg-card border border-border disabled:opacity-40"
                  aria-label="Previous surah"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={() => (activeIdx === null ? playIndex(0) : togglePlayPause())}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Pause recitation' : activeIdx !== null ? 'Resume recitation' : 'Play full surah'}
                </button>
                <button
                  onClick={() => { stopAudio(); setOpenSurah(Math.min(114, openSurah + 1)); }}
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
                    className={`rounded-2xl bg-card border p-3 shadow-sm transition ${
                      activeIdx === i ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-emerald-700">
                        {openSurah}:{a.numberInSurah}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => playAyahIndex(i)}
                          className="p-1.5 rounded-lg bg-muted active:scale-95"
                          aria-label={activeIdx === i && isPlaying ? 'Pause ayah' : 'Play ayah'}
                        >
                          {activeIdx === i && isPlaying
                            ? <Pause className="w-3.5 h-3.5" />
                            : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => toggleBookmark(openSurah, currentSurah?.englishName || `Surah ${openSurah}`, a.numberInSurah)}
                          className="p-1.5 rounded-lg bg-muted active:scale-95"
                          aria-label="Bookmark ayah"
                        >
                          {isBookmarked(openSurah, a.numberInSurah) ? (
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

      {/* Sticky audio player */}
      {activeAyah && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-emerald-900/10 bg-card/95 backdrop-blur px-4 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-semibold text-emerald-700 truncate">
                {currentSurah?.englishName} · Ayah {activeAyah.numberInSurah} of {arabic.length}
              </p>
              <button onClick={stopAudio} className="p-1 rounded-lg active:scale-95" aria-label="Close player">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(duration, 0.1)}
              step={0.1}
              value={Math.min(position, duration || position)}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label="Seek within ayah"
              className="w-full h-1.5 accent-emerald-600"
            />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
              <span>{fmt(position)}</span>
              <span>{duration ? fmt(duration) : '--:--'}</span>
            </div>

            <div className="flex items-center justify-center gap-3 mt-1.5">
              <button
                onClick={() => setRepeatVerse((v) => !v)}
                className={`p-2 rounded-xl active:scale-95 ${repeatVerse ? 'bg-emerald-600 text-primary-foreground' : 'bg-muted'}`}
                aria-label="Repeat verse"
              >
                <Repeat className="w-4 h-4" />
              </button>
              <button
                onClick={() => stepVerse(-1)}
                disabled={(activeIdx ?? 0) <= 0}
                className="p-2 rounded-xl bg-muted disabled:opacity-40 active:scale-95"
                aria-label="Previous ayah"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlayPause}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-primary-foreground flex items-center justify-center shadow-lg active:scale-95"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button
                onClick={() => stepVerse(1)}
                disabled={(activeIdx ?? 0) >= arabic.length - 1}
                className="p-2 rounded-xl bg-muted disabled:opacity-40 active:scale-95"
                aria-label="Next ayah"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAutoScroll((v) => !v)}
                className={`px-2.5 py-2 rounded-xl text-[10px] font-bold active:scale-95 ${autoScroll ? 'bg-emerald-600 text-primary-foreground' : 'bg-muted'}`}
                aria-label="Auto scroll"
              >
                AUTO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
