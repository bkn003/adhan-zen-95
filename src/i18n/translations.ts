export type Language = 'en' | 'hi' | 'ur' | 'ta' | 'ml' | 'te' | 'kn' | 'bn' | 'gu' | 'mr';

export const LANGUAGE_LABELS: Record<Language, string> = {
    en: 'English',
    hi: 'हिन्दी',
    ur: 'اردو',
    ta: 'தமிழ்',
    ml: 'മലയാളം',
    te: 'తెలుగు',
    kn: 'ಕನ್ನಡ',
    bn: 'বাংলা',
    gu: 'ગુજરાતી',
    mr: 'मराठी',
};

// Keys used throughout the app
type TranslationKeys = {
    // Nav
    home: string; nearby: string; qibla: string; tracker: string; settings: string;
    // Prayer labels
    nextPrayer: string; adhan: string; iqamah: string; khutbah: string;
    // General
    islamicCalendar: string; nearbyMosques: string; qiblaDirection: string;
    left: string; salah: string; forbiddenTimes: string;
    sunrise: string; midNoon: string; sunset: string;
    // Settings
    location: string; notifications: string; volume: string; language: string;
    darkMode: string; dndMode: string; beforePrayer: string; afterPrayer: string;
    selectLanguage: string; minutes: string;
    // Offline
    offline: string; lastSynced: string; online: string;
    // Admin
    login: string; logout: string; save: string; cancel: string; edit: string;
    mosqueInfo: string; prayerTimes: string; photos: string;
    // Nearby
    searchMosques: string; sortByTime: string; saharFood: string; womenHall: string;
    parking: string; ac: string; directions: string; loadMore: string;
    mosquesFound: string; noMosquesFound: string; noMosquesMatch: string;
    locationRequired: string; enableLocation: string;
    // Mosque details
    selectForPrayer: string; share: string; facilities: string; distance: string;
};

const en: TranslationKeys = {
    home: 'Home', nearby: 'Mosques', qibla: 'Qibla', tracker: 'Tracker', settings: 'Settings',
    nextPrayer: 'Next Prayer', adhan: 'Azaan', iqamah: 'Iqamath', khutbah: 'Khutbah',
    islamicCalendar: 'Islamic Calendar', nearbyMosques: 'Mosques', qiblaDirection: 'Qibla Direction',
    left: 'left', salah: 'Salah', forbiddenTimes: 'Forbidden Prayer Times',
    sunrise: 'Sunrise', midNoon: 'Mid Noon', sunset: 'Sunset',
    location: 'Location', notifications: 'Notifications', volume: 'Volume', language: 'Language',
    darkMode: 'Dark Mode', dndMode: 'DND Mode', beforePrayer: 'Before Prayer', afterPrayer: 'After Prayer',
    selectLanguage: 'Select Language', minutes: 'minutes',
    offline: 'Offline', lastSynced: 'Last synced', online: 'Online',
    login: 'Login', logout: 'Logout', save: 'Save', cancel: 'Cancel', edit: 'Edit',
    mosqueInfo: 'Mosque Info', prayerTimes: 'Prayer Times', photos: 'Photos',
    searchMosques: 'Search mosques by name or district...', sortByTime: 'Sort by Time',
    saharFood: 'Sahar Food', womenHall: 'Women Hall', parking: 'Parking', ac: 'AC',
    directions: 'Directions', loadMore: 'Load More Mosques',
    mosquesFound: 'mosques found near you', noMosquesFound: 'No mosques found nearby',
    noMosquesMatch: 'No mosques match your filters',
    locationRequired: 'Location Access Required', enableLocation: 'Enable in browser settings',
    selectForPrayer: 'Select for Prayer', share: 'Share', facilities: 'Facilities', distance: 'km',
};

const hi: TranslationKeys = {
    home: 'होम', nearby: 'मस्जिदें', qibla: 'क़िबला', tracker: 'ट्रैकर', settings: 'सेटिंग्स',
    nextPrayer: 'अगली नमाज़', adhan: 'अज़ान', iqamah: 'इक़ामत', khutbah: 'ख़ुतबा',
    islamicCalendar: 'इस्लामी कैलेंडर', nearbyMosques: 'मस्जिदें', qiblaDirection: 'क़िबला दिशा',
    left: 'बाक़ी', salah: 'सलाह', forbiddenTimes: 'नमाज़ का मना समय',
    sunrise: 'सूर्योदय', midNoon: 'दोपहर', sunset: 'सूर्यास्त',
    location: 'स्थान', notifications: 'सूचनाएँ', volume: 'आवाज़', language: 'भाषा',
    darkMode: 'डार्क मोड', dndMode: 'डीएनडी मोड', beforePrayer: 'नमाज़ से पहले', afterPrayer: 'नमाज़ के बाद',
    selectLanguage: 'भाषा चुनें', minutes: 'मिनट',
    offline: 'ऑफ़लाइन', lastSynced: 'अंतिम सिंक', online: 'ऑनलाइन',
    login: 'लॉगिन', logout: 'लॉगआउट', save: 'सहेजें', cancel: 'रद्द करें', edit: 'संपादित करें',
    mosqueInfo: 'मस्जिद जानकारी', prayerTimes: 'नमाज़ के समय', photos: 'फ़ोटो',
    searchMosques: 'नाम या जिले से मस्जिद खोजें...', sortByTime: 'समय अनुसार',
    saharFood: 'सहरी भोजन', womenHall: 'महिला हॉल', parking: 'पार्किंग', ac: 'एसी',
    directions: 'दिशा-निर्देश', loadMore: 'और मस्जिदें लोड करें',
    mosquesFound: 'मस्जिदें आपके पास मिलीं', noMosquesFound: 'पास में कोई मस्जिद नहीं मिली',
    noMosquesMatch: 'कोई मस्जिद आपके फ़िल्टर से मेल नहीं खाती',
    locationRequired: 'स्थान अनुमति आवश्यक', enableLocation: 'ब्राउज़र सेटिंग्स में सक्षम करें',
    selectForPrayer: 'नमाज़ के लिए चुनें', share: 'शेयर', facilities: 'सुविधाएँ', distance: 'कि.मी.',
};

const ur: TranslationKeys = {
    home: 'ہوم', nearby: 'مسجدیں', qibla: 'قبلہ', tracker: 'ٹریکر', settings: 'ترتیبات',
    nextPrayer: 'اگلی نماز', adhan: 'اذان', iqamah: 'اقامت', khutbah: 'خطبہ',
    islamicCalendar: 'اسلامی تقویم', nearbyMosques: 'مسجدیں', qiblaDirection: 'قبلہ کی سمت',
    left: 'باقی', salah: 'صلاۃ', forbiddenTimes: 'ممنوع نماز اوقات',
    sunrise: 'طلوع آفتاب', midNoon: 'زوال', sunset: 'غروب آفتاب',
    location: 'مقام', notifications: 'اطلاعات', volume: 'آواز', language: 'زبان',
    darkMode: 'ڈارک موڈ', dndMode: 'ڈی این ڈی', beforePrayer: 'نماز سے پہلے', afterPrayer: 'نماز کے بعد',
    selectLanguage: 'زبان منتخب کریں', minutes: 'منٹ',
    offline: 'آف لائن', lastSynced: 'آخری مطابقت', online: 'آن لائن',
    login: 'لاگ ان', logout: 'لاگ آؤٹ', save: 'محفوظ', cancel: 'منسوخ', edit: 'ترمیم',
    mosqueInfo: 'مسجد معلومات', prayerTimes: 'نماز اوقات', photos: 'تصاویر',
    searchMosques: 'نام یا ضلع سے مسجد تلاش...', sortByTime: 'وقت کے مطابق',
    saharFood: 'سحری کا کھانا', womenHall: 'خواتین ہال', parking: 'پارکنگ', ac: 'اے سی',
    directions: 'ہدایات', loadMore: 'مزید مسجدیں',
    mosquesFound: 'مسجدیں آپ کے قریب ملیں', noMosquesFound: 'قریب کوئی مسجد نہیں',
    noMosquesMatch: 'فلٹر سے مماثل نہیں',
    locationRequired: 'مقام رسائی ضروری', enableLocation: 'براؤزر سیٹنگز میں فعال کریں',
    selectForPrayer: 'نماز کے لیے منتخب', share: 'شیئر', facilities: 'سہولیات', distance: 'کلومیٹر',
};

const ta: TranslationKeys = {
    home: 'முகப்பு', nearby: 'மஸ்ஜித்கள்', qibla: 'கிப்லா', tracker: 'கண்காணிப்பு', settings: 'அமைப்புகள்',
    nextPrayer: 'அடுத்த தொழுகை', adhan: 'பாங்கு', iqamah: 'இகாமத்', khutbah: 'குத்பா',
    islamicCalendar: 'இஸ்லாமிய நாட்காட்டி', nearbyMosques: 'மஸ்ஜித்கள்', qiblaDirection: 'கிப்லா திசை',
    left: 'மீதம்', salah: 'தொழுகை', forbiddenTimes: 'தொழக்கூடாத நேரங்கள்',
    sunrise: 'உதயம்', midNoon: 'உச்சம்', sunset: 'அஸ்தமனம்',
    location: 'இடம்', notifications: 'அறிவிப்புகள்', volume: 'ஒலி', language: 'மொழி',
    darkMode: 'இருள் பயன்முறை', dndMode: 'தொந்தரவு செய்யாதே', beforePrayer: 'தொழுகைக்கு முன்', afterPrayer: 'தொழுகைக்கு பின்',
    selectLanguage: 'மொழியை தேர்ந்தெடு', minutes: 'நிமிடங்கள்',
    offline: 'ஆஃப்லைன்', lastSynced: 'கடைசி ஒத்திசைவு', online: 'ஆன்லைன்',
    login: 'உள்நுழை', logout: 'வெளியேறு', save: 'சேமி', cancel: 'ரத்து', edit: 'திருத்து',
    mosqueInfo: 'மஸ்ஜித் தகவல்', prayerTimes: 'தொழுகை நேரம்', photos: 'புகைப்படங்கள்',
    searchMosques: 'பெயர் அல்லது மாவட்டம்...', sortByTime: 'நேரப்படி',
    saharFood: 'சஹர் உணவு', womenHall: 'பெண்கள் ஹால்', parking: 'பார்க்கிங்', ac: 'ஏசி',
    directions: 'வழிகாட்டி', loadMore: 'மேலும் ஏற்று',
    mosquesFound: 'மஸ்ஜித்கள் கண்டறியப்பட்டன', noMosquesFound: 'அருகில் மஸ்ஜித் இல்லை',
    noMosquesMatch: 'வடிப்பானுக்கு பொருந்தவில்லை',
    locationRequired: 'இட அணுகல் தேவை', enableLocation: 'அமைப்புகளில் இயக்கவும்',
    selectForPrayer: 'தொழுகைக்கு தேர்வு', share: 'பகிர்', facilities: 'வசதிகள்', distance: 'கி.மீ',
};

// For languages where we have minimal translations, fallback to English
const ml: TranslationKeys = { ...en, home: 'ഹോം', nearby: 'മസ്ജിദുകൾ', qibla: 'ഖിബ്ല', tracker: 'ട്രാക്കർ', settings: 'ക്രമീകരണം', nextPrayer: 'അടുത്ത നമസ്കാരം', language: 'ഭാഷ', selectLanguage: 'ഭാഷ തിരഞ്ഞെടുക്കുക', prayerTimes: 'നമസ്കാര സമയം', offline: 'ഓഫ്‌ലൈൻ', online: 'ഓൺലൈൻ', searchMosques: 'മസ്ജിദ് തിരയുക...' };
const te: TranslationKeys = { ...en, home: 'హోమ్', nearby: 'మస్జిద్‌లు', qibla: 'ఖిబ్లా', tracker: 'ట్రాకర్', settings: 'సెట్టింగ్‌లు', nextPrayer: 'తదుపరి నమాజ్', language: 'భాష', selectLanguage: 'భాషను ఎంచుకోండి', prayerTimes: 'నమాజ్ సమయాలు', offline: 'ఆఫ్‌లైన్', online: 'ఆన్‌లైన్', searchMosques: 'మస్జిద్ శోధించండి...' };
const kn: TranslationKeys = { ...en, home: 'ಹೋಮ್', nearby: 'ಮಸ್ಜಿದ್‌ಗಳು', qibla: 'ಕಿಬ್ಲಾ', tracker: 'ಟ್ರ್ಯಾಕರ್', settings: 'ಸೆಟ್ಟಿಂಗ್ಸ್', nextPrayer: 'ಮುಂದಿನ ನಮಾಜ್', language: 'ಭಾಷೆ', selectLanguage: 'ಭಾಷೆ ಆಯ್ಕೆ', prayerTimes: 'ನಮಾಜ್ ಸಮಯ', offline: 'ಆಫ್‌ಲೈನ್', online: 'ಆನ್‌ಲೈನ್', searchMosques: 'ಮಸ್ಜಿದ್ ಹುಡುಕಿ...' };
const bn: TranslationKeys = { ...en, home: 'হোম', nearby: 'মসজিদসমূহ', qibla: 'কিবলা', tracker: 'ট্র্যাকার', settings: 'সেটিংস', nextPrayer: 'পরবর্তী নামাজ', language: 'ভাষা', selectLanguage: 'ভাষা নির্বাচন', prayerTimes: 'নামাজের সময়', offline: 'অফলাইন', online: 'অনলাইন', searchMosques: 'মসজিদ খুঁজুন...' };
const gu: TranslationKeys = { ...en, home: 'હોમ', nearby: 'મસ્જિદો', qibla: 'કિબલા', tracker: 'ટ્રેકર', settings: 'સેટિંગ્સ', nextPrayer: 'આગામી નમાઝ', language: 'ભાષા', selectLanguage: 'ભાષા પસંદ કરો', prayerTimes: 'નમાઝ સમય', offline: 'ઑફલાઇન', online: 'ઑનલાઇન', searchMosques: 'મસ્જિદ શોધો...' };
const mr: TranslationKeys = { ...en, home: 'मुख्यपृष्ठ', nearby: 'मशिदी', qibla: 'किबला', tracker: 'ट्रॅकर', settings: 'सेटिंग्ज', nextPrayer: 'पुढील नमाज', language: 'भाषा', selectLanguage: 'भाषा निवडा', prayerTimes: 'नमाज वेळा', offline: 'ऑफलाइन', online: 'ऑनलाइन', searchMosques: 'मशीद शोधा...' };

export const translations: Record<Language, TranslationKeys> = { en, hi, ur, ta, ml, te, kn, bn, gu, mr };
