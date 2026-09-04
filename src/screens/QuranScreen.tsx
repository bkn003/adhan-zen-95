import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Play, Pause, Bookmark, BookmarkCheck, Search, Loader2,
  SkipBack, SkipForward, Repeat, X, CheckCircle2, Download, Trash2, WifiOff, Volume2,
} from 'lucide-react';
import { useQuranBookmarks } from '@/hooks/useQuranBookmarks';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  QURAN_LANGUAGES, ARABIC_RECITERS, getQuranLanguage,
  fetchArabicSurah, fetchTranslationSurah, fetchAudioUrls,
  speakTranslation, cancelSpeech, hasVoiceFor, hasMaleVoiceFor, pickBestVoice,
  type QuranAyah, type QuranLanguage,
} from '@/utils/quranEditions';
import {
  saveSurahList, loadSurahList, saveText, loadText,
  cachedAudioUrl, downloadSurahAudio, isDownloaded, removeDownload,
  estimateCacheSize, clearQuranCache,
} from '@/storage/quranStore';

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

const LAST_READ_KEY = 'quran_last_read_v1';
const LANG_KEY = 'quran_lang_v1';
const RECITER_KEY = 'quran_reciter_v1';
const MODE_KEY = 'quran_recite_mode_v1';

type ReciteMode = 'arabic' | 'translation';

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const humanSize = (b: number) =>
  b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

export const QuranScreen: React.FC<QuranScreenProps> = ({ onBack }) => {
  const { language: appLanguage } = useLanguage();

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
  const [arabic, setArabic] = useState<QuranAyah[]>([]);
  const [translation, setTranslation] = useState<QuranAyah[]>([]);

  const [langCode, setLangCode] = useState<string>(() => {
    try {
      return localStorage.getItem(LANG_KEY) || appLanguage || 'en';
    } catch {
      return 'en';
    }
  });
  const lang: QuranLanguage = useMemo(() => getQuranLanguage(langCode), [langCode]);

  const [mode, setMode] = useState<ReciteMode>(() => {
    try {
      return (localStorage.getItem(MODE_KEY) as ReciteMode) || 'arabic';
    } catch {
      return 'arabic';
    }
  });
  const [reciter, setReciter] = useState<string>(() => {
    try {
      return localStorage.getItem(RECITER_KEY) || ARABIC_RECITERS[0].id;
    } catch {
      return ARABIC_RECITERS[0].id;
    }
  });

  const [loadingList, setLoadingList] = useState(true);
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);

  const { bookmarks, isBookmarked, toggleBookmark, removeBookmark, synced } = useQuranBookmarks();

  // ---- audio ----
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<number, string>>({});
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeatVerse, setRepeatVerse] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // ---- offline ----
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cacheSize, setCacheSize] = useState(0);

  /** Which voiced edition (if any) is used for the current mode. */
  const audioEdition = mode === 'arabic' ? reciter : lang.audioEdition;
  const useSpeech = mode === 'translation' && !lang.audioEdition;

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => { try { localStorage.setItem(LANG_KEY, langCode); } catch { /* ignore */ } }, [langCode]);
  useEffect(() => { try { localStorage.setItem(MODE_KEY, mode); } catch { /* ignore */ } }, [mode]);
  useEffect(() => { try { localStorage.setItem(RECITER_KEY, reciter); } catch { /* ignore */ } }, [reciter]);

  // Surah list (cache-first, offline safe)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await loadSurahList<Surah[]>();
      if (cached?.length && !cancelled) { setSurahs(cached); setLoadingList(false); }
      try {
        const res = await fetch('https://api.alquran.cloud/v1/surah', { cache: 'force-cache' });
        const json = await res.json();
        const list: Surah[] = json?.data || [];
        if (!cancelled && list.length) { setSurahs(list); await saveSurahList(list); }
      } catch {
        if (!cancelled && !cached?.length) setError('Could not load the surah list. Connect once to download it.');
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Surah content (offline-first)
  useEffect(() => {
    if (!openSurah) return;
    let cancelled = false;
    setLoadingSurah(true);
    setError(null);
    (async () => {
      const trKey = lang.cloudEdition || `qc${lang.quranComId}`;
      const [cachedAr, cachedTr] = await Promise.all([
        loadText(openSurah, 'ar.uthmani'),
        loadText(openSurah, trKey),
      ]);
      if (!cancelled && cachedAr?.length) {
        setArabic(cachedAr);
        setTranslation(cachedTr || []);
        setLoadingSurah(false);
      }
      try {
        const [ar, tr] = await Promise.all([
          fetchArabicSurah(openSurah),
          fetchTranslationSurah(openSurah, lang),
        ]);
        if (cancelled) return;
        if (ar.length) { setArabic(ar); await saveText(openSurah, 'ar.uthmani', ar); }
        if (tr.length) { setTranslation(tr); await saveText(openSurah, trKey, tr); }
        localStorage.setItem(LAST_READ_KEY, JSON.stringify({ surah: openSurah }));
      } catch {
        if (!cancelled && !cachedAr?.length) setError('Could not load this surah. Download it once for offline reading.');
      } finally {
        if (!cancelled) setLoadingSurah(false);
      }
    })();
    return () => { cancelled = true; };
  }, [openSurah, lang]);

  // Audio URL map for the active voiced edition
  useEffect(() => {
    if (!openSurah || !audioEdition) { setAudioUrls({}); return; }
    let cancelled = false;
    (async () => {
      try {
        const map = await fetchAudioUrls(openSurah, audioEdition);
        if (!cancelled) setAudioUrls(map);
      } catch {
        if (!cancelled) setAudioUrls({});
      }
    })();
    return () => { cancelled = true; };
  }, [openSurah, audioEdition]);

  // Download state per surah/edition
  useEffect(() => {
    if (!openSurah || !audioEdition) { setDownloaded(false); return; }
    isDownloaded(openSurah, audioEdition).then(setDownloaded);
  }, [openSurah, audioEdition]);

  useEffect(() => { estimateCacheSize().then(setCacheSize); }, [openSurah, downloaded]);

  const releaseObjectUrl = () => {
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
  };

  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    releaseObjectUrl();
    cancelSpeech();
    setIsPlaying(false);
    setActiveIdx(null);
    setPosition(0);
    setDuration(0);
  }, []);

  useEffect(() => () => { audioRef.current?.pause(); releaseObjectUrl(); cancelSpeech(); }, []);

  const currentSurah = surahs.find((s) => s.number === openSurah);

  const playIndexRef = useRef<(idx: number, startAt?: number) => void>(() => {});

  const playIndex = useCallback(async (idx: number, startAt = 0) => {
    const ayah = arabic[idx];
    if (!ayah) { stopAudio(); return; }

    audioRef.current?.pause();
    releaseObjectUrl();
    cancelSpeech();
    setActiveIdx(idx);
    setPosition(startAt);
    setDuration(0);

    // Device-voice recitation of the translation (languages without an audio edition)
    if (useSpeech) {
      const text = translation[idx]?.text;
      if (!text) { stopAudio(); return; }
      setIsPlaying(true);
      if (autoScroll) {
        setTimeout(() => {
          document.getElementById(`ayah-${ayah.numberInSurah}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
      }
      await speakTranslation(text, lang.ttsLang);
      // continue unless something else took over
      setActiveIdx((cur) => {
        if (cur !== idx) return cur;
        if (repeatVerse) { setTimeout(() => playIndexRef.current(idx), 0); return cur; }
        if (idx + 1 < arabic.length) { setTimeout(() => playIndexRef.current(idx + 1), 0); return cur; }
        setIsPlaying(false);
        return cur;
      });
      return;
    }

    if (!audioEdition) { stopAudio(); return; }

    const cached = await cachedAudioUrl(audioEdition, ayah.number);
    const src = cached || audioUrls[ayah.numberInSurah];
    if (!src) {
      setError(offline ? 'This surah is not downloaded for offline recitation yet.' : 'Audio is not available for this ayah.');
      setIsPlaying(false);
      return;
    }
    if (cached) objectUrlRef.current = cached;

    const audio = new Audio(src);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      setDuration(audio.duration || 0);
      if (startAt > 0) audio.currentTime = startAt;
    };
    audio.ontimeupdate = () => setPosition(audio.currentTime);
    audio.onended = () => {
      if (repeatVerse) { playIndexRef.current(idx); return; }
      if (idx + 1 < arabic.length) playIndexRef.current(idx + 1);
      else { setIsPlaying(false); setPosition(0); }
    };
    audio.onerror = () => {
      setError('Audio playback failed. Check your connection or download this surah.');
      setIsPlaying(false);
    };

    audio.play()
      .then(() => setIsPlaying(true))
      .catch(() => { setError('Audio playback failed.'); setIsPlaying(false); });

    if (autoScroll) {
      setTimeout(() => {
        document.getElementById(`ayah-${ayah.numberInSurah}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    }
  }, [arabic, translation, repeatVerse, autoScroll, stopAudio, useSpeech, lang, audioEdition, audioUrls, offline]);

  useEffect(() => { playIndexRef.current = playIndex; }, [playIndex]);

  const togglePlayPause = useCallback(() => {
    if (useSpeech) {
      if (isPlaying) { cancelSpeech(); setIsPlaying(false); }
      else playIndex(activeIdx ?? 0);
      return;
    }
    const audio = audioRef.current;
    if (activeIdx === null || !audio) { playIndex(0); return; }
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [activeIdx, playIndex, useSpeech, isPlaying]);

  const playAyahIndex = (idx: number) => {
    if (activeIdx === idx && (audioRef.current || useSpeech)) { togglePlayPause(); return; }
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

  const startDownload = async () => {
    if (!openSurah) return;
    setDownloading(true);
    setProgress(0);
    try {
      const trKey = lang.cloudEdition || `qc${lang.quranComId}`;
      if (arabic.length) await saveText(openSurah, 'ar.uthmani', arabic);
      if (translation.length) await saveText(openSurah, trKey, translation);
      if (audioEdition) {
        let urls = audioUrls;
        if (!Object.keys(urls).length) urls = await fetchAudioUrls(openSurah, audioEdition);
        await downloadSurahAudio(openSurah, audioEdition, urls, arabic, setProgress);
        setDownloaded(true);
      }
      setNotice('Saved for offline use.');
      setTimeout(() => setNotice(null), 2500);
    } catch {
      setError('Download failed. Try again on a stable connection.');
    } finally {
      setDownloading(false);
      estimateCacheSize().then(setCacheSize);
    }
  };

  const deleteDownload = async () => {
    if (!openSurah || !audioEdition) return;
    await removeDownload(openSurah, audioEdition, arabic);
    setDownloaded(false);
    estimateCacheSize().then(setCacheSize);
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
  const voiceMissing = useSpeech && !hasVoiceFor(lang.ttsLang);
  const chosenVoice = useSpeech ? pickBestVoice(lang.ttsLang) : null;
  const maleVoice = useSpeech && hasMaleVoiceFor(lang.ttsLang);

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
                : 'Read, recite in your language, and bookmark'}
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
        {offline && (
          <div className="rounded-xl bg-amber-500/10 text-amber-700 text-xs p-2.5 flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            Offline — downloaded surahs and saved text are available.
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-destructive/10 text-destructive text-xs p-3 flex items-start justify-between gap-2">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {notice && (
          <div className="rounded-xl bg-emerald-500/10 text-emerald-700 text-xs p-2.5 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" /> {notice}
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

            {cacheSize > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-card border border-border px-3 py-2">
                <span className="text-[11px] text-muted-foreground">Offline library · {humanSize(cacheSize)}</span>
                <button
                  onClick={async () => { await clearQuranCache(); setCacheSize(0); setDownloaded(false); }}
                  className="text-[11px] font-semibold text-destructive flex items-center gap-1 active:scale-95"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
            )}

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
              {/* Language + recitation settings */}
              <div className="rounded-2xl bg-card border border-border p-2.5 shadow-sm space-y-2.5">
                <div>
                  <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Translation language
                  </p>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    {QURAN_LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => { stopAudio(); setLangCode(l.code); }}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition ${
                          langCode === l.code
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-primary-foreground border-transparent'
                            : 'bg-muted text-foreground/70 border-border'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Recite
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { stopAudio(); setMode('arabic'); }}
                      className={`flex-1 px-3 py-1.5 rounded-xl text-[11px] font-semibold border ${
                        mode === 'arabic' ? 'bg-emerald-600 text-primary-foreground border-transparent' : 'bg-muted border-border'
                      }`}
                    >
                      Arabic
                    </button>
                    <button
                      onClick={() => { stopAudio(); setMode('translation'); }}
                      className={`flex-1 px-3 py-1.5 rounded-xl text-[11px] font-semibold border ${
                        mode === 'translation' ? 'bg-emerald-600 text-primary-foreground border-transparent' : 'bg-muted border-border'
                      }`}
                    >
                      {lang.label}
                    </button>
                  </div>

                  {mode === 'arabic' ? (
                    <select
                      value={reciter}
                      onChange={(e) => { stopAudio(); setReciter(e.target.value); }}
                      className="mt-2 w-full px-3 py-2 rounded-xl bg-muted border border-border text-[11px] font-medium outline-none"
                      aria-label="Reciter"
                    >
                      {ARABIC_RECITERS.map((r) => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-2 px-1 text-[10px] text-muted-foreground flex items-center gap-1">
                      <Volume2 className="w-3 h-3 shrink-0" />
                      {lang.audioEdition
                        ? `Human-voice ${lang.englishLabel} recitation`
                        : voiceMissing
                          ? `${lang.englishLabel} voice not installed on this device — add it in your phone's text-to-speech settings.`
                          : maleVoice
                            ? `Recited by ${chosenVoice?.name ?? 'a natural male voice'} on this device`
                            : `Using your device's ${lang.englishLabel} voice${chosenVoice ? ` (${chosenVoice.name})` : ''} — install a male ${lang.englishLabel} voice in your phone's text-to-speech settings for a stronger recitation.`}
                    </p>
                  )}
                </div>

                {/* Offline download */}
                <div className="flex items-center gap-2 pt-0.5">
                  {downloading ? (
                    <div className="flex-1">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-emerald-600 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Downloading… {Math.round(progress * 100)}%</p>
                    </div>
                  ) : downloaded ? (
                    <>
                      <span className="flex-1 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Available offline
                      </span>
                      <button onClick={deleteDownload} className="p-2 rounded-xl bg-muted active:scale-95" aria-label="Remove download">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startDownload}
                      className="flex-1 py-2 rounded-xl bg-muted border border-border text-[11px] font-semibold flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" /> Save this surah offline
                    </button>
                  )}
                </div>
              </div>

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
                    <p
                      dir={lang.rtl ? 'rtl' : 'ltr'}
                      className={`text-xs text-muted-foreground mt-2 leading-relaxed ${lang.rtl ? 'text-right' : ''}`}
                    >
                      {translation[i]?.text}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )
        )}
      </div>

      {/* Sticky player */}
      {activeAyah && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-emerald-900/10 bg-card/95 backdrop-blur px-4 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-semibold text-emerald-700 truncate">
                {currentSurah?.englishName} · Ayah {activeAyah.numberInSurah} of {arabic.length}
                {mode === 'translation' ? ` · ${lang.label}` : ''}
              </p>
              <button onClick={stopAudio} className="p-1 rounded-lg active:scale-95" aria-label="Close player">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {!useSpeech && (
              <>
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
              </>
            )}

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
