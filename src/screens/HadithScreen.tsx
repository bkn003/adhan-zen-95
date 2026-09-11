import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, BookOpen, Bookmark, BookmarkCheck, Search, Share2,
  Volume2, Square, Loader2, ChevronRight,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from '@/hooks/use-toast';
import {
  HADITH_BOOKS, HADITH_LANGUAGES, resolveHadithLang, isRtlHadithLang,
  fetchHadithEdition, hadithsInSection, searchHadiths,
  type HadithBook, type HadithEdition, type HadithItem,
} from '@/utils/hadithSources';
import {
  saveEdition, loadEdition, loadHadithBookmarks, toggleHadithBookmark,
  type HadithBookmark,
} from '@/storage/hadithStore';
import { speakTranslation, hasNaturalVoiceFor } from '@/utils/quranEditions';

interface HadithScreenProps {
  onBack: () => void;
}

/** dataset lang -> speech-synthesis locale */
const LANG_TTS: Record<string, string> = {
  eng: 'en-IN',
  ara: 'ar-SA',
  urd: 'ur-PK',
  tam: 'ta-IN',
  ben: 'bn-IN',
  ind: 'id-ID',
  tur: 'tr-TR',
  fra: 'fr-FR',
  rus: 'ru-RU',
};

const RATE_KEY = 'hadithSpeechRate';

export const HadithScreen = ({ onBack }: HadithScreenProps) => {
  const { language } = useLanguage();

  const [book, setBook] = useState<HadithBook | null>(null);
  const [lang, setLang] = useState<string>('eng');
  const [edition, setEdition] = useState<HadithEdition | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [section, setSection] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [bookmarks, setBookmarks] = useState<HadithBookmark[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [rate, setRate] = useState<number>(() => Number(localStorage.getItem(RATE_KEY)) || 0.85);
  /** Arabic original of the same book, for Arabic recitation of each hadith. */
  const [arabicEdition, setArabicEdition] = useState<HadithEdition | null>(null);
  const [speakingArabicId, setSpeakingArabicId] = useState<number | null>(null);

  useEffect(() => { loadHadithBookmarks().then(setBookmarks); }, []);
  useEffect(() => { localStorage.setItem(RATE_KEY, String(rate)); }, [rate]);
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* noop */ } }, []);

  const openBook = async (b: HadithBook, forcedLang?: string) => {
    const chosen = forcedLang || resolveHadithLang(b, language);
    setBook(b);
    setLang(chosen);
    setSection(null);
    setQuery('');
    setEdition(null);
    setArabicEdition(null);

    // Arabic original in the background — used for Arabic recitation.
    if (b.langs.includes('ara')) {
      (async () => {
        try {
          const cachedAra = await loadEdition(b.id, 'ara');
          if (cachedAra) { setArabicEdition(cachedAra); return; }
          if (chosen === 'ara') return; // the main edition already is Arabic
          const fresh = await fetchHadithEdition(b.id, 'ara');
          setArabicEdition(fresh);
          await saveEdition(fresh);
        } catch { /* Arabic recitation stays unavailable */ }
      })();
    }

    const cached = await loadEdition(b.id, chosen);
    if (cached) { setEdition(cached); return; }

    setLoading(true);
    setProgress(0);
    try {
      const fresh = await fetchHadithEdition(b.id, chosen, setProgress);
      setEdition(fresh);
      await saveEdition(fresh);
    } catch (e: any) {
      toast({
        title: 'Could not open this book',
        description: navigator.onLine ? (e?.message || 'Please try again.') : 'You are offline. Connect once to download it.',
        variant: 'destructive',
      });
      setBook(null);
    } finally {
      setLoading(false);
    }
  };

  const sectionList = useMemo(() => {
    if (!edition) return [] as { key: string; title: string; count: number }[];
    return Object.entries(edition.sections).map(([key, title]) => ({
      key,
      title,
      count: hadithsInSection(edition, key).length,
    })).filter((s) => s.count > 0);
  }, [edition]);

  const visible = useMemo(() => {
    if (!edition) return [] as HadithItem[];
    if (query.trim().length >= 2) return searchHadiths(edition, query);
    if (section) return hadithsInSection(edition, section);
    return [];
  }, [edition, query, section]);

  const isBookmarked = (n: number) =>
    bookmarks.some((b) => b.bookId === book?.id && b.lang === lang && b.hadithnumber === n);

  const onToggleBookmark = async (h: HadithItem) => {
    if (!book) return;
    setBookmarks(await toggleHadithBookmark({
      bookId: book.id, lang, hadithnumber: h.hadithnumber, text: h.text,
    }));
  };

  const onShare = async (h: HadithItem) => {
    const text = `${h.text}\n\n— ${book?.title} #${h.hadithnumber}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast({ title: 'Copied' });
      }
    } catch { /* dismissed */ }
  };

  const onSpeak = async (h: HadithItem) => {
    if (speakingId === h.hadithnumber) {
      window.speechSynthesis?.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis?.cancel();
    const ttsLang = LANG_TTS[lang] || 'en-IN';
    if (!hasNaturalVoiceFor(ttsLang)) {
      toast({
        title: 'Basic voice only',
        description: 'Your phone has no natural voice for this language yet. Install one from Settings › Language & input › Text-to-speech.',
      });
    }
    setSpeakingId(h.hadithnumber);
    try { await speakTranslation(h.text, ttsLang, rate); } finally { setSpeakingId(null); }
  };

  /** Arabic original text of a hadith, when the Arabic edition is available. */
  const arabicTextOf = (n: number): string | null => {
    if (lang === 'ara') return null; // already showing Arabic
    const found = arabicEdition?.hadiths?.find((a) => a.hadithnumber === n);
    return found?.text || null;
  };

  const onSpeakArabic = async (h: HadithItem) => {
    if (speakingArabicId === h.hadithnumber) {
      window.speechSynthesis?.cancel();
      setSpeakingArabicId(null);
      return;
    }
    const text = arabicTextOf(h.hadithnumber);
    if (!text) return;
    window.speechSynthesis?.cancel();
    if (!hasNaturalVoiceFor('ar-SA')) {
      toast({
        title: 'No Arabic voice installed',
        description: 'Add an Arabic voice from Settings › Language & input › Text-to-speech for a clear recitation.',
      });
    }
    setSpeakingArabicId(h.hadithnumber);
    try { await speakTranslation(text, 'ar-SA', rate); } finally { setSpeakingArabicId(null); }
  };

  const rtl = isRtlHadithLang(lang);

  const hadithCard = (h: HadithItem) => (
    <div key={h.hadithnumber} className="bg-white rounded-2xl border border-emerald-100 p-3 shadow-sm">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
          #{h.hadithnumber}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => onSpeak(h)} className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50" aria-label="Read aloud">
            {speakingId === h.hadithnumber ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button onClick={() => onToggleBookmark(h)} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50" aria-label="Bookmark">
            {isBookmarked(h.hadithnumber) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
          <button onClick={() => onShare(h)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Share">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p
        className={`text-sm leading-relaxed text-gray-800 ${rtl ? 'text-right' : ''}`}
        dir={rtl ? 'rtl' : 'ltr'}
        style={rtl ? { fontSize: '1rem', lineHeight: 2 } : undefined}
      >
        {h.text}
      </p>
      {arabicTextOf(h.hadithnumber) && (
        <div className="mt-2 pt-2 border-t border-emerald-50">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-semibold text-emerald-700">العربية</span>
            <button
              onClick={() => onSpeakArabic(h)}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold active:scale-95"
            >
              {speakingArabicId === h.hadithnumber
                ? <><Square className="w-3 h-3" /> Stop</>
                : <><Volume2 className="w-3 h-3" /> Arabic</>}
            </button>
          </div>
          <p className="text-right text-gray-800" dir="rtl" style={{ fontSize: '1rem', lineHeight: 2 }}>
            {arabicTextOf(h.hadithnumber)}
          </p>
        </div>
      )}
      {h.grades?.length ? (
        <p className="mt-2 text-[10px] text-gray-500">
          {h.grades.map((g) => `${g.name}: ${g.grade}`).join(' · ')}
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-20">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3 py-3 sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (showBookmarks) return setShowBookmarks(false);
              if (section) return setSection(null);
              if (book) return setBook(null);
              onBack();
            }}
            className="p-1.5 rounded-lg hover:bg-white/15"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold truncate">
              {showBookmarks ? 'Saved Hadiths' : book ? book.title : 'Hadith Library'}
            </h1>
            <p className="text-[11px] text-emerald-50 truncate">
              {showBookmarks
                ? `${bookmarks.length} saved`
                : book
                  ? (section ? edition?.sections[section] : 'Choose a chapter or search')
                  : 'Bukhari, Muslim and more — offline'}
            </p>
          </div>
          {!showBookmarks && (
            <button onClick={() => setShowBookmarks(true)} className="p-1.5 rounded-lg hover:bg-white/15" aria-label="Saved">
              <Bookmark className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3 max-w-md mx-auto">
        {showBookmarks ? (
          bookmarks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">Nothing saved yet.</p>
          ) : (
            bookmarks.map((b) => (
              <div key={`${b.bookId}-${b.lang}-${b.hadithnumber}`} className="bg-white rounded-2xl border border-amber-100 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-amber-700">
                    {HADITH_BOOKS.find((x) => x.id === b.bookId)?.title} #{b.hadithnumber}
                  </span>
                  <button
                    onClick={async () => setBookmarks(await toggleHadithBookmark(b))}
                    className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50"
                    aria-label="Remove"
                  >
                    <BookmarkCheck className="w-4 h-4" />
                  </button>
                </div>
                <p
                  className={`text-sm text-gray-800 leading-relaxed ${isRtlHadithLang(b.lang) ? 'text-right' : ''}`}
                  dir={isRtlHadithLang(b.lang) ? 'rtl' : 'ltr'}
                >
                  {b.text}
                </p>
              </div>
            ))
          )
        ) : !book ? (
          <>
            {HADITH_BOOKS.map((b) => (
              <button
                key={b.id}
                onClick={() => openBook(b)}
                className="w-full bg-white rounded-2xl border border-emerald-100 p-3 flex items-center gap-3 text-left shadow-sm hover:border-emerald-300"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{b.title}</p>
                  <p className="text-xs text-gray-500 truncate" dir="rtl">{b.arabicTitle}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            ))}
            <p className="text-[11px] text-gray-500 text-center pt-1">
              Each book downloads once, then reads offline.
            </p>
          </>
        ) : (
          <>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {HADITH_LANGUAGES.filter((l) => book.langs.includes(l.code)).map((l) => (
                <button
                  key={l.code}
                  onClick={() => openBook(book, l.code)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap border ${
                    lang === l.code
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="py-16 flex flex-col items-center gap-2 text-emerald-700">
                <Loader2 className="w-6 h-6 animate-spin" />
                <p className="text-xs">Downloading {book.title}… {Math.round(progress * 100)}%</p>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search in this book"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-500">Reading speed</span>
                  {[0.7, 0.85, 1].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRate(r)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        rate === r ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      {r === 0.7 ? 'Slow' : r === 0.85 ? 'Normal' : 'Fast'}
                    </button>
                  ))}
                </div>

                {query.trim().length >= 2 || section ? (
                  visible.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-10">No hadith found.</p>
                  ) : (
                    <div className="space-y-2.5">{visible.map(hadithCard)}</div>
                  )
                ) : (
                  <div className="space-y-2">
                    {sectionList.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setSection(s.key)}
                        className="w-full bg-white rounded-xl border border-gray-100 p-2.5 flex items-center gap-2 text-left hover:border-emerald-300"
                      >
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                          {s.key}
                        </span>
                        <span className="text-sm text-gray-800 flex-1 truncate">{s.title}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">{s.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
