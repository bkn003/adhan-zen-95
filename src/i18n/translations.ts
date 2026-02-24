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
    // Prayer names (for QazaScreen, DND toggles etc.)
    fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string; witr: string;
    // General
    islamicCalendar: string; nearbyMosques: string; qiblaDirection: string;
    left: string; salah: string; forbiddenTimes: string;
    sunrise: string; midNoon: string; sunset: string;
    // Settings section titles
    location: string; notifications: string; volume: string; language: string;
    darkMode: string; dndMode: string; beforePrayer: string; afterPrayer: string;
    selectLanguage: string; minutes: string;
    myMohalla: string; dateSelection: string; prayerSettings: string;
    ramadanMode: string; saharEndTime: string; today: string; tomorrow: string;
    hijriAdjust: string; mosqueAdmin: string; adhanNotifications: string;
    enableNotifications: string; fullScreenAlarm: string;
    enableAutoDnd: string; activateDndBefore: string; deactivateDndAfter: string;
    enableDndPerPrayer: string; resetAutoDetect: string;
    setHomeMosque: string; openAdminPanel: string; superAdmin: string;
    adjustMoonSighting: string; selectDate: string;
    // Special prayers
    specialPrayers: string; tahajjud: string; ishraq: string;
    // Ramadan
    saharEnd: string; iftar: string; tharaweeh: string;
    specialTimingsActive: string; tapEnableRamadan: string;
    showSaharTime: string; saharTimeEnabled: string; saharTimeVisible: string; tapShowSahar: string;
    // Qaza
    totalMissed: string; prayers: string; missedQaza: string; history: string;
    markPerformedPrayers: string; selectDateHistory: string;
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
    fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', witr: 'Witr',
    islamicCalendar: 'Islamic Calendar', nearbyMosques: 'Mosques', qiblaDirection: 'Qibla Direction',
    left: 'left', salah: 'Salah', forbiddenTimes: 'Forbidden Prayer Times',
    sunrise: 'Sunrise', midNoon: 'Mid Noon', sunset: 'Sunset',
    location: 'Location', notifications: 'Notifications', volume: 'Volume', language: 'Language',
    darkMode: 'Dark Mode', dndMode: 'DND Mode', beforePrayer: 'Before Prayer', afterPrayer: 'After Prayer',
    selectLanguage: 'Select Language', minutes: 'minutes',
    myMohalla: 'My Mohalla', dateSelection: 'Date Selection', prayerSettings: 'Prayer Settings',
    ramadanMode: 'Ramadan Mode', saharEndTime: 'Sahar End Time', today: 'Today', tomorrow: 'Tomorrow',
    hijriAdjust: 'Hijri Date Adjustment', mosqueAdmin: 'Mosque Admin', adhanNotifications: 'Adhan Notifications',
    enableNotifications: 'Enable Notifications', fullScreenAlarm: 'Full-screen Prayer Alarm',
    enableAutoDnd: 'Enable Auto DND', activateDndBefore: 'Activate DND before Iqamah',
    deactivateDndAfter: 'Deactivate DND after Iqamah', enableDndPerPrayer: 'Enable DND for each prayer:',
    resetAutoDetect: 'Reset to Auto-detect', setHomeMosque: 'Set your home mosque to get notified when prayer times change.',
    openAdminPanel: 'Open Admin Panel', superAdmin: 'Super Admin',
    adjustMoonSighting: 'Adjust to match local moon sighting', selectDate: 'Select date',
    specialPrayers: 'Special Prayers', tahajjud: 'Tahajjud', ishraq: 'Ishraq',
    saharEnd: 'Sahar End', iftar: 'Iftar', tharaweeh: 'Tharaweeh',
    specialTimingsActive: 'Special timings active', tapEnableRamadan: 'Tap to enable Ramadan mode',
    showSaharTime: 'Show Sahar Time', saharTimeEnabled: 'Sahar Time Enabled',
    saharTimeVisible: 'Sahar end time is visible', tapShowSahar: 'Tap to show Sahar end time',
    totalMissed: 'Total Missed', prayers: 'prayers', missedQaza: 'Missed (Qaza)', history: 'History',
    markPerformedPrayers: 'Mark performed prayers', selectDateHistory: 'Select a date to view history',
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
    fajr: 'फज्र', dhuhr: 'ज़ुहर', asr: 'अस्र', maghrib: 'मग़रिब', isha: 'ईशा', witr: 'वित्र',
    islamicCalendar: 'इस्लामी कैलेंडर', nearbyMosques: 'मस्जिदें', qiblaDirection: 'क़िबला दिशा',
    left: 'बाक़ी', salah: 'सलाह', forbiddenTimes: 'नमाज़ का मना समय',
    sunrise: 'सूर्योदय', midNoon: 'दोपहर', sunset: 'सूर्यास्त',
    location: 'स्थान', notifications: 'सूचनाएँ', volume: 'आवाज़', language: 'भाषा',
    darkMode: 'डार्क मोड', dndMode: 'डीएनडी मोड', beforePrayer: 'नमाज़ से पहले', afterPrayer: 'नमाज़ के बाद',
    selectLanguage: 'भाषा चुनें', minutes: 'मिनट',
    myMohalla: 'मेरा मोहल्ला', dateSelection: 'तिथि चयन', prayerSettings: 'नमाज़ सेटिंग्स',
    ramadanMode: 'रमज़ान मोड', saharEndTime: 'सहरी समाप्ति', today: 'आज', tomorrow: 'कल',
    hijriAdjust: 'हिज्री तिथि समायोजन', mosqueAdmin: 'मस्जिद एडमिन', adhanNotifications: 'अज़ान सूचनाएँ',
    enableNotifications: 'सूचनाएँ सक्षम करें', fullScreenAlarm: 'फ़ुल-स्क्रीन अलार्म',
    enableAutoDnd: 'ऑटो DND सक्षम करें', activateDndBefore: 'इक़ामत से पहले DND',
    deactivateDndAfter: 'इक़ामत के बाद DND बंद', enableDndPerPrayer: 'हर नमाज़ के लिए DND:',
    resetAutoDetect: 'ऑटो-डिटेक्ट रीसेट', setHomeMosque: 'नमाज़ के समय बदलने पर सूचना के लिए मस्जिद सेट करें।',
    openAdminPanel: 'एडमिन पैनल खोलें', superAdmin: 'सुपर एडमिन',
    adjustMoonSighting: 'चाँद देखने के अनुसार समायोजित करें', selectDate: 'तिथि चुनें',
    specialPrayers: 'विशेष नमाज़ें', tahajjud: 'तहज्जुद', ishraq: 'इशराक़',
    saharEnd: 'सहरी समाप्ति', iftar: 'इफ़्तार', tharaweeh: 'तरावीह',
    specialTimingsActive: 'विशेष समय सक्रिय', tapEnableRamadan: 'रमज़ान मोड सक्षम करें',
    showSaharTime: 'सहरी समय दिखाएँ', saharTimeEnabled: 'सहरी समय सक्षम',
    saharTimeVisible: 'सहरी समाप्ति दिख रहा है', tapShowSahar: 'सहरी समय दिखाने के लिए टैप करें',
    totalMissed: 'कुल छूटी', prayers: 'नमाज़ें', missedQaza: 'छूटी (क़ज़ा)', history: 'इतिहास',
    markPerformedPrayers: 'अदा की गई नमाज़ें चिह्नित करें', selectDateHistory: 'इतिहास देखने के लिए तिथि चुनें',
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
    fajr: 'فجر', dhuhr: 'ظہر', asr: 'عصر', maghrib: 'مغرب', isha: 'عشاء', witr: 'وتر',
    islamicCalendar: 'اسلامی تقویم', nearbyMosques: 'مسجدیں', qiblaDirection: 'قبلہ کی سمت',
    left: 'باقی', salah: 'صلاۃ', forbiddenTimes: 'ممنوع نماز اوقات',
    sunrise: 'طلوع آفتاب', midNoon: 'زوال', sunset: 'غروب آفتاب',
    location: 'مقام', notifications: 'اطلاعات', volume: 'آواز', language: 'زبان',
    darkMode: 'ڈارک موڈ', dndMode: 'ڈی این ڈی', beforePrayer: 'نماز سے پہلے', afterPrayer: 'نماز کے بعد',
    selectLanguage: 'زبان منتخب کریں', minutes: 'منٹ',
    myMohalla: 'میرا محلہ', dateSelection: 'تاریخ کا انتخاب', prayerSettings: 'نماز ترتیبات',
    ramadanMode: 'رمضان موڈ', saharEndTime: 'سحری اختتام', today: 'آج', tomorrow: 'کل',
    hijriAdjust: 'ہجری تاریخ ایڈجسٹمنٹ', mosqueAdmin: 'مسجد ایڈمن', adhanNotifications: 'اذان اطلاعات',
    enableNotifications: 'اطلاعات فعال کریں', fullScreenAlarm: 'فل سکرین الارم',
    enableAutoDnd: 'آٹو DND فعال', activateDndBefore: 'اقامت سے پہلے DND',
    deactivateDndAfter: 'اقامت کے بعد DND بند', enableDndPerPrayer: 'ہر نماز کے لیے DND:',
    resetAutoDetect: 'آٹو ڈیٹیکٹ ری سیٹ', setHomeMosque: 'نماز اوقات تبدیل ہونے پر اطلاع کے لیے مسجد مقرر کریں۔',
    openAdminPanel: 'ایڈمن پینل کھولیں', superAdmin: 'سپر ایڈمن',
    adjustMoonSighting: 'چاند دیکھنے کے مطابق ایڈجسٹ کریں', selectDate: 'تاریخ منتخب کریں',
    specialPrayers: 'خصوصی نمازیں', tahajjud: 'تہجد', ishraq: 'اشراق',
    saharEnd: 'سحری اختتام', iftar: 'افطار', tharaweeh: 'تراویح',
    specialTimingsActive: 'خصوصی اوقات فعال', tapEnableRamadan: 'رمضان موڈ فعال کریں',
    showSaharTime: 'سحری وقت دکھائیں', saharTimeEnabled: 'سحری وقت فعال',
    saharTimeVisible: 'سحری اختتام وقت نظر آ رہا ہے', tapShowSahar: 'سحری وقت دکھانے کے لیے ٹیپ کریں',
    totalMissed: 'کل چھوٹی', prayers: 'نمازیں', missedQaza: 'چھوٹی (قضا)', history: 'تاریخ',
    markPerformedPrayers: 'ادا شدہ نمازیں نشان زد کریں', selectDateHistory: 'تاریخ منتخب کریں',
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
    fajr: 'ஃபஜ்ர்', dhuhr: 'லுஹர்', asr: 'அஸர்', maghrib: 'மஃரிப்', isha: 'இஷா', witr: 'வித்ர்',
    islamicCalendar: 'இஸ்லாமிய நாட்காட்டி', nearbyMosques: 'மஸ்ஜித்கள்', qiblaDirection: 'கிப்லா திசை',
    left: 'மீதம்', salah: 'தொழுகை', forbiddenTimes: 'தொழக்கூடாத நேரங்கள்',
    sunrise: 'உதயம்', midNoon: 'உச்சம்', sunset: 'அஸ்தமனம்',
    location: 'இடம்', notifications: 'அறிவிப்புகள்', volume: 'ஒலி', language: 'மொழி',
    darkMode: 'இருள் பயன்முறை', dndMode: 'தொந்தரவு செய்யாதே', beforePrayer: 'தொழுகைக்கு முன்', afterPrayer: 'தொழுகைக்கு பின்',
    selectLanguage: 'மொழியை தேர்ந்தெடு', minutes: 'நிமிடங்கள்',
    myMohalla: 'என் மஹல்லா', dateSelection: 'தேதி தேர்வு', prayerSettings: 'தொழுகை அமைப்புகள்',
    ramadanMode: 'ரமலான் பயன்முறை', saharEndTime: 'சஹர் முடிவு நேரம்', today: 'இன்று', tomorrow: 'நாளை',
    hijriAdjust: 'ஹிஜ்ரி தேதி சரிசெய்தல்', mosqueAdmin: 'மஸ்ஜித் நிர்வாகி', adhanNotifications: 'பாங்கு அறிவிப்புகள்',
    enableNotifications: 'அறிவிப்புகள் இயக்கு', fullScreenAlarm: 'முழு திரை அலாரம்',
    enableAutoDnd: 'தானியங்கி DND இயக்கு', activateDndBefore: 'இகாமத்திற்கு முன் DND',
    deactivateDndAfter: 'இகாமத்திற்கு பின் DND நிறுத்து', enableDndPerPrayer: 'ஒவ்வொரு தொழுகைக்கும் DND:',
    resetAutoDetect: 'தானியங்கி கண்டறிதல் மீட்டமை', setHomeMosque: 'தொழுகை நேரம் மாறும்போது அறிவிப்பு பெற உங்கள் மஸ்ஜித்தை அமைக்கவும்.',
    openAdminPanel: 'நிர்வாக பேனல் திற', superAdmin: 'சூப்பர் நிர்வாகி',
    adjustMoonSighting: 'பிறை பார்வைக்கு ஏற்ப சரிசெய்', selectDate: 'தேதி தேர்ந்தெடு',
    specialPrayers: 'சிறப்பு தொழுகைகள்', tahajjud: 'தஹஜ்ஜுத்', ishraq: 'இஷ்ராக்',
    saharEnd: 'ஸஹர் முடிவு', iftar: 'இஃப்தார்', tharaweeh: 'தராவீஹ்',
    specialTimingsActive: 'சிறப்பு நேரங்கள் செயலில்', tapEnableRamadan: 'ரமலான் பயன்முறை இயக்க தட்டவும்',
    showSaharTime: 'சஹர் நேரம் காட்டு', saharTimeEnabled: 'சஹர் நேரம் இயக்கப்பட்டது',
    saharTimeVisible: 'சஹர் முடிவு நேரம் தெரிகிறது', tapShowSahar: 'சஹர் நேரம் காட்ட தட்டவும்',
    totalMissed: 'மொத்தம் தவறியவை', prayers: 'தொழுகைகள்', missedQaza: 'தவறியவை (கழா)', history: 'வரலாறு',
    markPerformedPrayers: 'நிறைவேற்றிய தொழுகைகளை குறிக்கவும்', selectDateHistory: 'வரலாறு காண தேதி தேர்ந்தெடு',
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
const ml: TranslationKeys = { ...en, home: 'ഹോം', nearby: 'മസ്ജിദുകൾ', qibla: 'ഖിബ്ല', tracker: 'ട്രാക്കർ', settings: 'ക്രമീകരണം', nextPrayer: 'അടുത്ത നമസ്കാരം', language: 'ഭാഷ', selectLanguage: 'ഭാഷ തിരഞ്ഞെടുക്കുക', prayerTimes: 'നമസ്കാര സമയം', offline: 'ഓഫ്‌ലൈൻ', online: 'ഓൺലൈൻ', searchMosques: 'മസ്ജിദ് തിരയുക...', fajr: 'ഫജ്ര്', dhuhr: 'ദുഹ്ര്', asr: 'അസ്ര്', maghrib: 'മഗ്‌രിബ്', isha: 'ഇശാ', witr: 'വിത്ര്', myMohalla: 'എന്റെ മഹല്ല', ramadanMode: 'റമദാൻ മോഡ്', tahajjud: 'തഹജ്ജുദ്', ishraq: 'ഇശ്‌റാഖ്', saharEnd: 'സഹർ അവസാനം', iftar: 'ഇഫ്താർ', tharaweeh: 'തറാവീഹ്', saharEndTime: 'സഹർ സമയം', specialTimingsActive: 'പ്രത്യേക സമയം സജീവം', tapEnableRamadan: 'റമദാൻ മോഡ് ഓൺ ചെയ്യുക', showSaharTime: 'സഹർ സമയം കാണിക്കുക', saharTimeEnabled: 'സഹർ സമയം ഓൺ', saharTimeVisible: 'സഹർ സമയം ദൃശ്യമാണ്', tapShowSahar: 'സഹർ സമയം കാണാൻ ടാപ്പ് ചെയ്യുക', specialPrayers: 'പ്രത്യേക നമസ്കാരം', sunrise: 'സൂര്യോദയം', midNoon: 'ഉച്ച', sunset: 'സൂര്യാസ്തമയം', forbiddenTimes: 'നിഷിദ്ധ സമയം' };
const te: TranslationKeys = { ...en, home: 'హోమ్', nearby: 'మస్జిద్‌లు', qibla: 'ఖిబ్లా', tracker: 'ట్రాకర్', settings: 'సెట్టింగ్‌లు', nextPrayer: 'తదుపరి నమాజ్', language: 'భాష', selectLanguage: 'భాషను ఎంచుకోండి', prayerTimes: 'నమాజ్ సమయాలు', offline: 'ఆఫ్‌లైన్', online: 'ఆన్‌లైన్', searchMosques: 'మస్జిద్ శోధించండి...', fajr: 'ఫజ్ర్', dhuhr: 'జుహర్', asr: 'అస్ర్', maghrib: 'మగ్రిబ్', isha: 'ఇషా', witr: 'విత్ర్', myMohalla: 'నా మొహల్లా', ramadanMode: 'రంజాన్ మోడ్', tahajjud: 'తహజ్జుద్', ishraq: 'ఇష్‌రాక్', saharEnd: 'సహరీ ముగింపు', iftar: 'ఇఫ్తార్', tharaweeh: 'తరావీహ్', saharEndTime: 'సహరీ సమయం', specialTimingsActive: 'ప్రత్యేక సమయాలు సక్రియం', tapEnableRamadan: 'రంజాన్ మోడ్ ఆన్ చేయండి', showSaharTime: 'సహరీ సమయం చూపించు', saharTimeEnabled: 'సహరీ సమయం ఆన్', saharTimeVisible: 'సహరీ సమయం కనిపిస్తోంది', tapShowSahar: 'సహరీ సమయం చూడటానికి ట్యాప్ చేయండి', specialPrayers: 'ప్రత్యేక నమాజ్', sunrise: 'సూర్యోదయం', midNoon: 'మధ్యాహ్నం', sunset: 'సూర్యాస్తమయం', forbiddenTimes: 'నిషిద్ధ సమయాలు' };
const kn: TranslationKeys = { ...en, home: 'ಹೋಮ್', nearby: 'ಮಸ್ಜಿದ್‌ಗಳು', qibla: 'ಕಿಬ್ಲಾ', tracker: 'ಟ್ರ್ಯಾಕರ್', settings: 'ಸೆಟ್ಟಿಂಗ್ಸ್', nextPrayer: 'ಮುಂದಿನ ನಮಾಜ್', language: 'ಭಾಷೆ', selectLanguage: 'ಭಾಷೆ ಆಯ್ಕೆ', prayerTimes: 'ನಮಾಜ್ ಸಮಯ', offline: 'ಆಫ್‌ಲೈನ್', online: 'ಆನ್‌ಲೈನ್', searchMosques: 'ಮಸ್ಜಿದ್ ಹುಡುಕಿ...', fajr: 'ಫಜ್ರ್', dhuhr: 'ಜುಹ್ರ್', asr: 'ಅಸ್ರ್', maghrib: 'ಮಗ್ರಿಬ್', isha: 'ಇಶಾ', witr: 'ವಿತ್ರ್', myMohalla: 'ನನ್ನ ಮೊಹಲ್ಲಾ', ramadanMode: 'ರಂಜಾನ್ ಮೋಡ್', tahajjud: 'ತಹಜ್ಜುದ್', ishraq: 'ಇಶ್ರಾಕ್', saharEnd: 'ಸಹರಿ ಮುಕ್ತಾಯ', iftar: 'ಇಫ್ತಾರ್', tharaweeh: 'ತರಾವೀಹ್', saharEndTime: 'ಸಹರಿ ಸಮಯ', specialTimingsActive: 'ವಿಶೇಷ ಸಮಯ ಸಕ್ರಿಯ', tapEnableRamadan: 'ರಂಜಾನ್ ಮೋಡ್ ಆನ್ ಮಾಡಿ', showSaharTime: 'ಸಹರಿ ಸಮಯ ತೋರಿಸಿ', saharTimeEnabled: 'ಸಹರಿ ಸಮಯ ಆನ್', saharTimeVisible: 'ಸಹರಿ ಸಮಯ ಕಾಣಿಸುತ್ತಿದೆ', tapShowSahar: 'ಸಹರಿ ಸಮಯ ನೋಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ', specialPrayers: 'ವಿಶೇಷ ನಮಾಜ್', sunrise: 'ಸೂರ್ಯೋದಯ', midNoon: 'ಮಧ್ಯಾಹ್ನ', sunset: 'ಸೂರ್ಯಾಸ್ತ', forbiddenTimes: 'ನಿಷಿದ್ಧ ಸಮಯ' };
const bn: TranslationKeys = { ...en, home: 'হোম', nearby: 'মসজিদসমূহ', qibla: 'কিবলা', tracker: 'ট্র্যাকার', settings: 'সেটিংস', nextPrayer: 'পরবর্তী নামাজ', language: 'ভাষা', selectLanguage: 'ভাষা নির্বাচন', prayerTimes: 'নামাজের সময়', offline: 'অফলাইন', online: 'অনলাইন', searchMosques: 'মসজিদ খুঁজুন...', fajr: 'ফজর', dhuhr: 'জোহর', asr: 'আসর', maghrib: 'মাগরিব', isha: 'ইশা', witr: 'বিতর', myMohalla: 'আমার মহল্লা', ramadanMode: 'রমজান মোড', tahajjud: 'তাহাজ্জুদ', ishraq: 'ইশরাক', saharEnd: 'সেহরি শেষ', iftar: 'ইফতার', tharaweeh: 'তারাবীহ', saharEndTime: 'সেহরি সময়', specialTimingsActive: 'বিশেষ সময় সক্রিয়', tapEnableRamadan: 'রমজান মোড চালু করুন', showSaharTime: 'সেহরি সময় দেখান', saharTimeEnabled: 'সেহরি সময় চালু', saharTimeVisible: 'সেহরি সময় দেখা যাচ্ছে', tapShowSahar: 'সেহরি সময় দেখতে ট্যাপ করুন', specialPrayers: 'বিশেষ নামাজ', sunrise: 'সূর্যোদয়', midNoon: 'দুপুর', sunset: 'সূর্যাস্ত', forbiddenTimes: 'নিষিদ্ধ সময়' };
const gu: TranslationKeys = { ...en, home: 'હોમ', nearby: 'મસ્જિદો', qibla: 'કિબલા', tracker: 'ટ્રેકર', settings: 'સેટિંગ્સ', nextPrayer: 'આગામી નમાઝ', language: 'ભાષા', selectLanguage: 'ભાષા પસંદ કરો', prayerTimes: 'નમાઝ સમય', offline: 'ઑફલાઇન', online: 'ઑનલાઇન', searchMosques: 'મસ્જિદ શોધો...', fajr: 'ફજર', dhuhr: 'ઝોહર', asr: 'અસર', maghrib: 'મગરિબ', isha: 'ઈશા', witr: 'વિત્ર', myMohalla: 'મારું મોહલ્લો', ramadanMode: 'રમઝાન મોડ', tahajjud: 'તહજ્જુદ', ishraq: 'ઇશરાક', saharEnd: 'સહરી સમાપ્ત', iftar: 'ઈફ્તાર', tharaweeh: 'તરાવીહ', saharEndTime: 'સહરી સમય', specialTimingsActive: 'વિશેષ સમય સક્રિય', tapEnableRamadan: 'રમઝાન મોડ ચાલુ કરો', showSaharTime: 'સહરી સમય બતાવો', saharTimeEnabled: 'સહરી સમય ચાલુ', saharTimeVisible: 'સહરી સમય દેખાય છે', tapShowSahar: 'સહરી સમય જોવા ટૅપ કરો', specialPrayers: 'વિશેષ નમાઝ', sunrise: 'સૂર્યોદય', midNoon: 'બપોર', sunset: 'સૂર્યાસ્ત', forbiddenTimes: 'નિષિદ્ધ સમય' };
const mr: TranslationKeys = { ...en, home: 'मुख्यपृष्ठ', nearby: 'मशिदी', qibla: 'किबला', tracker: 'ट्रॅकर', settings: 'सेटिंग्ज', nextPrayer: 'पुढील नमाज', language: 'भाषा', selectLanguage: 'भाषा निवडा', prayerTimes: 'नमाज वेळा', offline: 'ऑफलाइन', online: 'ऑनलाइन', searchMosques: 'मशीद शोधा...', fajr: 'फज्र', dhuhr: 'झोहर', asr: 'अस्र', maghrib: 'मगरिब', isha: 'इशा', witr: 'वित्र', myMohalla: 'माझे मोहल्ला', ramadanMode: 'रमजान मोड', tahajjud: 'तहज्जुद', ishraq: 'इश्राक', saharEnd: 'सहरी संपली', iftar: 'इफ्तार', tharaweeh: 'तरावीह', saharEndTime: 'सहरी वेळ', specialTimingsActive: 'विशेष वेळा सक्रिय', tapEnableRamadan: 'रमजान मोड चालू करा', showSaharTime: 'सहरी वेळ दाखवा', saharTimeEnabled: 'सहरी वेळ चालू', saharTimeVisible: 'सहरी वेळ दिसत आहे', tapShowSahar: 'सहरी वेळ पाहण्यासाठी टॅप करा', specialPrayers: 'विशेष नमाज', sunrise: 'सूर्योदय', midNoon: 'दुपार', sunset: 'सूर्यास्त', forbiddenTimes: 'निषिद्ध वेळा' };

export const translations: Record<Language, TranslationKeys> = { en, hi, ur, ta, ml, te, kn, bn, gu, mr };
