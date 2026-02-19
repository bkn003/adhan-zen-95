import type { Language } from '@/i18n/translations';

interface BilingualText {
  english: string;
  local: string;
}

type TamilTextStructure = {
  prayers: Record<string, BilingualText>;
  times: Record<string, BilingualText>;
  general: Record<string, BilingualText>;
};

const textByLanguage: Record<Language, TamilTextStructure> = {
  ta: {
    prayers: {
      fajr: { english: 'Fajr', local: 'பஜ்ர்' },
      dhuhr: { english: 'Zuhr', local: 'லுஹர்' },
      asr: { english: 'Asr', local: 'அஸர்' },
      maghrib: { english: 'Maghrib', local: 'மஃரிப்' },
      isha: { english: 'Isha', local: 'இஷா' },
      jummah: { english: 'Jummah', local: 'ஜும்ஆ' }
    },
    times: {
      adhan: { english: 'Azaan', local: 'பாங்கு' },
      iqamah: { english: 'Iqamath', local: 'இகாமத்' },
      khutbah: { english: 'Khutbah', local: 'குத்பா' }
    },
    general: {
      nextPrayer: { english: 'Next Prayer', local: 'அடுத்த தொழுகை' },
      left: { english: 'left', local: 'மீதம்' },
      islamicDate: { english: 'Islamic Calendar', local: 'இஸ்லாமிய நாட்காட்டி' },
      nearbyMosques: { english: 'Mosques', local: 'மஸ்ஜித்கள்' },
      qiblaDirection: { english: 'Qibla Direction', local: 'கிப்லா திசை' },
      settings: { english: 'Settings', local: 'அமைப்புகள்' },
      home: { english: 'Home', local: 'முகப்பு' },
      nearby: { english: 'Mosques', local: 'மஸ்ஜித்கள்' },
      qibla: { english: 'Qibla', local: 'கிப்லா' },
      prayer: { english: 'Salah', local: 'தொழுகை' },
      forbiddenTimes: { english: 'Forbidden Prayer Times', local: 'தொழக்கூடாத நேரங்கள்' },
      sunrise: { english: 'Sunrise', local: 'உதயம்' },
      midNoon: { english: 'Mid Noon', local: 'உச்சம்' },
      sunset: { english: 'Sunset', local: 'அஸ்தமனம்' },
      saharEnd: { english: 'Sahar End', local: 'ஸஹர் முடிவு' },
      iftar: { english: 'Iftar', local: 'இஃப்தார்' },
      tharaweeh: { english: 'Tharaweeh', local: 'தராவீஹ்' },
      specialPrayers: { english: 'Special Prayers', local: 'சிறப்பு தொழுகைகள்' },
    }
  },
  hi: {
    prayers: {
      fajr: { english: 'Fajr', local: 'फ़ज्र' },
      dhuhr: { english: 'Zuhr', local: 'ज़ुहर' },
      asr: { english: 'Asr', local: 'अस्र' },
      maghrib: { english: 'Maghrib', local: 'मग़रिब' },
      isha: { english: 'Isha', local: 'इशा' },
      jummah: { english: 'Jummah', local: 'जुमा' }
    },
    times: {
      adhan: { english: 'Azaan', local: 'अज़ान' },
      iqamah: { english: 'Iqamath', local: 'इक़ामत' },
      khutbah: { english: 'Khutbah', local: 'ख़ुतबा' }
    },
    general: {
      nextPrayer: { english: 'Next Prayer', local: 'अगली नमाज़' },
      left: { english: 'left', local: 'बाक़ी' },
      islamicDate: { english: 'Islamic Calendar', local: 'इस्लामी कैलेंडर' },
      nearbyMosques: { english: 'Mosques', local: 'मस्जिदें' },
      qiblaDirection: { english: 'Qibla Direction', local: 'क़िबला दिशा' },
      settings: { english: 'Settings', local: 'सेटिंग्स' },
      home: { english: 'Home', local: 'होम' },
      nearby: { english: 'Mosques', local: 'मस्जिदें' },
      qibla: { english: 'Qibla', local: 'क़िबला' },
      prayer: { english: 'Salah', local: 'सलाह' },
      forbiddenTimes: { english: 'Forbidden Prayer Times', local: 'नमाज़ का मना समय' },
      sunrise: { english: 'Sunrise', local: 'सूर्योदय' },
      midNoon: { english: 'Mid Noon', local: 'दोपहर' },
      sunset: { english: 'Sunset', local: 'सूर्यास्त' },
      saharEnd: { english: 'Sahar End', local: 'सहरी समाप्त' },
      iftar: { english: 'Iftar', local: 'इफ़्तार' },
      tharaweeh: { english: 'Tharaweeh', local: 'तरावीह' },
      specialPrayers: { english: 'Special Prayers', local: 'विशेष नमाज़' },
    }
  },
  ur: {
    prayers: {
      fajr: { english: 'Fajr', local: 'فجر' },
      dhuhr: { english: 'Zuhr', local: 'ظہر' },
      asr: { english: 'Asr', local: 'عصر' },
      maghrib: { english: 'Maghrib', local: 'مغرب' },
      isha: { english: 'Isha', local: 'عشاء' },
      jummah: { english: 'Jummah', local: 'جمعہ' }
    },
    times: {
      adhan: { english: 'Azaan', local: 'اذان' },
      iqamah: { english: 'Iqamath', local: 'اقامت' },
      khutbah: { english: 'Khutbah', local: 'خطبہ' }
    },
    general: {
      nextPrayer: { english: 'Next Prayer', local: 'اگلی نماز' },
      left: { english: 'left', local: 'باقی' },
      islamicDate: { english: 'Islamic Calendar', local: 'اسلامی تقویم' },
      nearbyMosques: { english: 'Mosques', local: 'مسجدیں' },
      qiblaDirection: { english: 'Qibla Direction', local: 'قبلہ کی سمت' },
      settings: { english: 'Settings', local: 'ترتیبات' },
      home: { english: 'Home', local: 'ہوم' },
      nearby: { english: 'Mosques', local: 'مسجدیں' },
      qibla: { english: 'Qibla', local: 'قبلہ' },
      prayer: { english: 'Salah', local: 'صلاۃ' },
      forbiddenTimes: { english: 'Forbidden Prayer Times', local: 'ممنوع اوقات' },
      sunrise: { english: 'Sunrise', local: 'طلوع آفتاب' },
      midNoon: { english: 'Mid Noon', local: 'زوال' },
      sunset: { english: 'Sunset', local: 'غروب آفتاب' },
      saharEnd: { english: 'Sahar End', local: 'سحری ختم' },
      iftar: { english: 'Iftar', local: 'افطار' },
      tharaweeh: { english: 'Tharaweeh', local: 'تراویح' },
      specialPrayers: { english: 'Special Prayers', local: 'خصوصی نمازیں' },
    }
  },
  en: {
    prayers: {
      fajr: { english: 'Fajr', local: '' },
      dhuhr: { english: 'Zuhr', local: '' },
      asr: { english: 'Asr', local: '' },
      maghrib: { english: 'Maghrib', local: '' },
      isha: { english: 'Isha', local: '' },
      jummah: { english: 'Jummah', local: '' }
    },
    times: {
      adhan: { english: 'Azaan', local: '' },
      iqamah: { english: 'Iqamath', local: '' },
      khutbah: { english: 'Khutbah', local: '' }
    },
    general: {
      nextPrayer: { english: 'Next Prayer', local: '' },
      left: { english: 'left', local: '' },
      islamicDate: { english: 'Islamic Calendar', local: '' },
      nearbyMosques: { english: 'Mosques', local: '' },
      qiblaDirection: { english: 'Qibla Direction', local: '' },
      settings: { english: 'Settings', local: '' },
      home: { english: 'Home', local: '' },
      nearby: { english: 'Mosques', local: '' },
      qibla: { english: 'Qibla', local: '' },
      prayer: { english: 'Salah', local: '' },
      forbiddenTimes: { english: 'Forbidden Prayer Times', local: '' },
      sunrise: { english: 'Sunrise', local: '' },
      midNoon: { english: 'Mid Noon', local: '' },
      sunset: { english: 'Sunset', local: '' },
      saharEnd: { english: 'Sahar End', local: '' },
      iftar: { english: 'Iftar', local: '' },
      tharaweeh: { english: 'Tharaweeh', local: '' },
      specialPrayers: { english: 'Special Prayers', local: '' },
    }
  },
  ml: {
    prayers: {
      fajr: { english: 'Fajr', local: 'ഫജ്ർ' },
      dhuhr: { english: 'Zuhr', local: 'ളുഹ്ർ' },
      asr: { english: 'Asr', local: 'അസ്ർ' },
      maghrib: { english: 'Maghrib', local: 'മഗ്‌രിബ്' },
      isha: { english: 'Isha', local: 'ഇശാ' },
      jummah: { english: 'Jummah', local: 'ജുമുഅ' }
    },
    times: {
      adhan: { english: 'Azaan', local: 'ബാങ്ക്' },
      iqamah: { english: 'Iqamath', local: 'ഇഖാമത്ത്' },
      khutbah: { english: 'Khutbah', local: 'ഖുത്ബ' }
    },
    general: {
      nextPrayer: { english: 'Next Prayer', local: 'അടുത്ത നമസ്കാരം' },
      left: { english: 'left', local: 'ബാക്കി' },
      islamicDate: { english: 'Islamic Calendar', local: 'ഇസ്ലാമിക കലണ്ടർ' },
      nearbyMosques: { english: 'Mosques', local: 'മസ്ജിദുകൾ' },
      qiblaDirection: { english: 'Qibla Direction', local: 'ഖിബ്ല ദിശ' },
      settings: { english: 'Settings', local: 'ക്രമീകരണം' },
      home: { english: 'Home', local: 'ഹോം' },
      nearby: { english: 'Mosques', local: 'മസ്ജിദുകൾ' },
      qibla: { english: 'Qibla', local: 'ഖിബ്ല' },
      prayer: { english: 'Salah', local: 'നമസ്കാരം' },
      forbiddenTimes: { english: 'Forbidden Prayer Times', local: 'നിഷിദ്ധ സമയം' },
      sunrise: { english: 'Sunrise', local: 'സൂര്യോദയം' },
      midNoon: { english: 'Mid Noon', local: 'ഉച്ച' },
      sunset: { english: 'Sunset', local: 'സൂര്യാസ്തമയം' },
      saharEnd: { english: 'Sahar End', local: 'സഹർ അവസാനം' },
      iftar: { english: 'Iftar', local: 'ഇഫ്താർ' },
      tharaweeh: { english: 'Tharaweeh', local: 'തറാവീഹ്' },
      specialPrayers: { english: 'Special Prayers', local: 'പ്രത്യേക നമസ്കാരം' },
    }
  },
  te: {
    prayers: {
      fajr: { english: 'Fajr', local: 'ఫజ్ర్' },
      dhuhr: { english: 'Zuhr', local: 'జుహ్ర్' },
      asr: { english: 'Asr', local: 'అస్ర్' },
      maghrib: { english: 'Maghrib', local: 'మగ్రిబ్' },
      isha: { english: 'Isha', local: 'ఇషా' },
      jummah: { english: 'Jummah', local: 'జుమా' }
    },
    times: {
      adhan: { english: 'Azaan', local: 'అజాన్' },
      iqamah: { english: 'Iqamath', local: 'ఇఖామత్' },
      khutbah: { english: 'Khutbah', local: 'ఖుత్బా' }
    },
    general: {
      nextPrayer: { english: 'Next Prayer', local: 'తదుపరి నమాజ్' },
      left: { english: 'left', local: 'మిగిలింది' },
      islamicDate: { english: 'Islamic Calendar', local: 'ఇస్లామిక్ క్యాలెండర్' },
      nearbyMosques: { english: 'Mosques', local: 'మస్జిద్‌లు' },
      qiblaDirection: { english: 'Qibla Direction', local: 'ఖిబ్లా దిశ' },
      settings: { english: 'Settings', local: 'సెట్టింగ్‌లు' },
      home: { english: 'Home', local: 'హోమ్' },
      nearby: { english: 'Mosques', local: 'మస్జిద్‌లు' },
      qibla: { english: 'Qibla', local: 'ఖిబ్లా' },
      prayer: { english: 'Salah', local: 'నమాజ్' },
      forbiddenTimes: { english: 'Forbidden Prayer Times', local: 'నిషిద్ధ సమయాలు' },
      sunrise: { english: 'Sunrise', local: 'సూర్యోదయం' },
      midNoon: { english: 'Mid Noon', local: 'మధ్యాహ్నం' },
      sunset: { english: 'Sunset', local: 'సూర్యాస్తమయం' },
      saharEnd: { english: 'Sahar End', local: 'సహరీ ముగింపు' },
      iftar: { english: 'Iftar', local: 'ఇఫ్తార్' },
      tharaweeh: { english: 'Tharaweeh', local: 'తరావీహ్' },
      specialPrayers: { english: 'Special Prayers', local: 'ప్రత్యేక నమాజ్' },
    }
  },
  kn: {
    prayers: {
      fajr: { english: 'Fajr', local: 'ಫಜ್ರ್' },
      dhuhr: { english: 'Zuhr', local: 'ಜುಹ್ರ್' },
      asr: { english: 'Asr', local: 'ಅಸ್ರ್' },
      maghrib: { english: 'Maghrib', local: 'ಮಗ್ರಿಬ್' },
      isha: { english: 'Isha', local: 'ಇಶಾ' },
      jummah: { english: 'Jummah', local: 'ಜುಮಾ' }
    },
    times: {
      adhan: { english: 'Azaan', local: 'ಅಜಾನ್' },
      iqamah: { english: 'Iqamath', local: 'ಇಖಾಮತ್' },
      khutbah: { english: 'Khutbah', local: 'ಖುತ್ಬಾ' }
    },
    general: {
      nextPrayer: { english: 'Next Prayer', local: 'ಮುಂದಿನ ನಮಾಜ್' },
      left: { english: 'left', local: 'ಉಳಿದಿದೆ' },
      islamicDate: { english: 'Islamic Calendar', local: 'ಇಸ್ಲಾಮಿಕ್ ಕ್ಯಾಲೆಂಡರ್' },
      nearbyMosques: { english: 'Mosques', local: 'ಮಸ್ಜಿದ್‌ಗಳು' },
      qiblaDirection: { english: 'Qibla Direction', local: 'ಕಿಬ್ಲಾ ದಿಕ್ಕು' },
      settings: { english: 'Settings', local: 'ಸೆಟ್ಟಿಂಗ್ಸ್' },
      home: { english: 'Home', local: 'ಹೋಮ್' },
      nearby: { english: 'Mosques', local: 'ಮಸ್ಜಿದ್‌ಗಳು' },
      qibla: { english: 'Qibla', local: 'ಕಿಬ್ಲಾ' },
      prayer: { english: 'Salah', local: 'ನಮಾಜ್' },
      forbiddenTimes: { english: 'Forbidden Prayer Times', local: 'ನಿಷಿದ್ಧ ಸಮಯ' },
      sunrise: { english: 'Sunrise', local: 'ಸೂರ್ಯೋದಯ' },
      midNoon: { english: 'Mid Noon', local: 'ಮಧ್ಯಾಹ್ನ' },
      sunset: { english: 'Sunset', local: 'ಸೂರ್ಯಾಸ್ತ' },
      saharEnd: { english: 'Sahar End', local: 'ಸಹರಿ ಮುಕ್ತಾಯ' },
      iftar: { english: 'Iftar', local: 'ಇಫ್ತಾರ್' },
      tharaweeh: { english: 'Tharaweeh', local: 'ತರಾವೀಹ್' },
      specialPrayers: { english: 'Special Prayers', local: 'ವಿಶೇಷ ನಮಾಜ್' },
    }
  },
  bn: {
    prayers: {
      fajr: { english: 'Fajr', local: 'ফজর' },
      dhuhr: { english: 'Zuhr', local: 'যোহর' },
      asr: { english: 'Asr', local: 'আসর' },
      maghrib: { english: 'Maghrib', local: 'মাগরিব' },
      isha: { english: 'Isha', local: 'ইশা' },
      jummah: { english: 'Jummah', local: 'জুমা' }
    },
    times: {
      adhan: { english: 'Azaan', local: 'আজান' },
      iqamah: { english: 'Iqamath', local: 'ইকামত' },
      khutbah: { english: 'Khutbah', local: 'খুতবা' }
    },
    general: {
      nextPrayer: { english: 'Next Prayer', local: 'পরবর্তী নামাজ' },
      left: { english: 'left', local: 'বাকি' },
      islamicDate: { english: 'Islamic Calendar', local: 'ইসলামি ক্যালেন্ডার' },
      nearbyMosques: { english: 'Mosques', local: 'মসজিদসমূহ' },
      qiblaDirection: { english: 'Qibla Direction', local: 'কিবলা দিক' },
      settings: { english: 'Settings', local: 'সেটিংস' },
      home: { english: 'Home', local: 'হোম' },
      nearby: { english: 'Mosques', local: 'মসজিদসমূহ' },
      qibla: { english: 'Qibla', local: 'কিবলা' },
      prayer: { english: 'Salah', local: 'নামাজ' },
      forbiddenTimes: { english: 'Forbidden Prayer Times', local: 'নিষিদ্ধ সময়' },
      sunrise: { english: 'Sunrise', local: 'সূর্যোদয়' },
      midNoon: { english: 'Mid Noon', local: 'দুপুর' },
      sunset: { english: 'Sunset', local: 'সূর্যাস্ত' },
      saharEnd: { english: 'Sahar End', local: 'সেহরি শেষ' },
      iftar: { english: 'Iftar', local: 'ইফতার' },
      tharaweeh: { english: 'Tharaweeh', local: 'তারাবীহ' },
      specialPrayers: { english: 'Special Prayers', local: 'বিশেষ নামাজ' },
    }
  },
  gu: {
    prayers: {
      fajr: { english: 'Fajr', local: 'ફજ્ર' },
      dhuhr: { english: 'Zuhr', local: 'ઝોહર' },
      asr: { english: 'Asr', local: 'અસ્ર' },
      maghrib: { english: 'Maghrib', local: 'મગરિબ' },
      isha: { english: 'Isha', local: 'ઇશા' },
      jummah: { english: 'Jummah', local: 'જુમા' }
    },
    times: {
      adhan: { english: 'Azaan', local: 'અઝાન' },
      iqamah: { english: 'Iqamath', local: 'ઈકામત' },
      khutbah: { english: 'Khutbah', local: 'ખુત્બા' }
    },
    general: {
      nextPrayer: { english: 'Next Prayer', local: 'આગામી નમાઝ' },
      left: { english: 'left', local: 'બાકી' },
      islamicDate: { english: 'Islamic Calendar', local: 'ઇસ્લામિક કેલેન્ડર' },
      nearbyMosques: { english: 'Mosques', local: 'મસ્જિદો' },
      qiblaDirection: { english: 'Qibla Direction', local: 'કિબલા દિશા' },
      settings: { english: 'Settings', local: 'સેટિંગ્સ' },
      home: { english: 'Home', local: 'હોમ' },
      nearby: { english: 'Mosques', local: 'મસ્જિદો' },
      qibla: { english: 'Qibla', local: 'કિબલા' },
      prayer: { english: 'Salah', local: 'નમાઝ' },
      forbiddenTimes: { english: 'Forbidden Prayer Times', local: 'નિષિદ્ધ સમય' },
      sunrise: { english: 'Sunrise', local: 'સૂર્યોદય' },
      midNoon: { english: 'Mid Noon', local: 'બપોર' },
      sunset: { english: 'Sunset', local: 'સૂર્યાસ્ત' },
      saharEnd: { english: 'Sahar End', local: 'સહરી સમાપ્ત' },
      iftar: { english: 'Iftar', local: 'ઈફ્તાર' },
      tharaweeh: { english: 'Tharaweeh', local: 'તરાવીહ' },
      specialPrayers: { english: 'Special Prayers', local: 'વિશેષ નમાઝ' },
    }
  },
  mr: {
    prayers: {
      fajr: { english: 'Fajr', local: 'फजर' },
      dhuhr: { english: 'Zuhr', local: 'झोहर' },
      asr: { english: 'Asr', local: 'अस्र' },
      maghrib: { english: 'Maghrib', local: 'मग़रिब' },
      isha: { english: 'Isha', local: 'इशा' },
      jummah: { english: 'Jummah', local: 'जुमा' }
    },
    times: {
      adhan: { english: 'Azaan', local: 'अझान' },
      iqamah: { english: 'Iqamath', local: 'इकामत' },
      khutbah: { english: 'Khutbah', local: 'खुत्बा' }
    },
    general: {
      nextPrayer: { english: 'Next Prayer', local: 'पुढील नमाज' },
      left: { english: 'left', local: 'बाकी' },
      islamicDate: { english: 'Islamic Calendar', local: 'इस्लामी दिनदर्शिका' },
      nearbyMosques: { english: 'Mosques', local: 'मशिदी' },
      qiblaDirection: { english: 'Qibla Direction', local: 'किबला दिशा' },
      settings: { english: 'Settings', local: 'सेटिंग्ज' },
      home: { english: 'Home', local: 'मुख्यपृष्ठ' },
      nearby: { english: 'Mosques', local: 'मशिदी' },
      qibla: { english: 'Qibla', local: 'किबला' },
      prayer: { english: 'Salah', local: 'नमाज' },
      forbiddenTimes: { english: 'Forbidden Prayer Times', local: 'निषिद्ध वेळा' },
      sunrise: { english: 'Sunrise', local: 'सूर्योदय' },
      midNoon: { english: 'Mid Noon', local: 'दुपार' },
      sunset: { english: 'Sunset', local: 'सूर्यास्त' },
      saharEnd: { english: 'Sahar End', local: 'सहरी संपली' },
      iftar: { english: 'Iftar', local: 'इफ्तार' },
      tharaweeh: { english: 'Tharaweeh', local: 'तरावीह' },
      specialPrayers: { english: 'Special Prayers', local: 'विशेष नमाज' },
    }
  },
};

// For backward compatibility, keep the old tamilText format with 'tamil' key
// but also support dynamic language
export const tamilText = {
  prayers: {
    fajr: { english: 'Fajr', tamil: 'பஜ்ர்' },
    dhuhr: { english: 'Zuhr', tamil: 'லுஹர்' },
    asr: { english: 'Asr', tamil: 'அஸர்' },
    maghrib: { english: 'Maghrib', tamil: 'மஃரிப்' },
    isha: { english: 'Isha', tamil: 'இஷா' },
    jummah: { english: 'Jummah', tamil: 'ஜும்ஆ' }
  },
  times: {
    adhan: { english: 'Azaan', tamil: 'பாங்கு' },
    iqamah: { english: 'Iqamath', tamil: 'இகாமத்' },
    khutbah: { english: 'Khutbah', tamil: 'குத்பா' }
  },
  general: {
    nextPrayer: { english: 'Next Prayer', tamil: 'அடுத்த தொழுகை' },
    left: { english: 'left', tamil: 'மீதம்' },
    islamicDate: { english: 'Islamic Calendar', tamil: 'இஸ்லாமிய நாட்காட்டி' },
    nearbyMosques: { english: 'Mosques', tamil: 'மஸ்ஜித்கள்' },
    qiblaDirection: { english: 'Qibla Direction', tamil: 'கிப்லா திசை' },
    settings: { english: 'Settings', tamil: 'அமைப்புகள்' },
    home: { english: 'Home', tamil: 'முகப்பு' },
    nearby: { english: 'Mosques', tamil: 'மஸ்ஜித்கள்' },
    qibla: { english: 'Qibla', tamil: 'கிப்லா' },
    prayer: { english: 'Salah', tamil: 'தொழுகை' },
    forbiddenTimes: { english: 'Forbidden Prayer Times', tamil: 'தொழக்கூடாத நேரங்கள்' },
    sunrise: { english: 'Sunrise', tamil: 'உதயம்' },
    midNoon: { english: 'Mid Noon', tamil: 'உச்சம்' },
    sunset: { english: 'Sunset', tamil: 'அஸ்தமனம்' }
  }
};

/**
 * Get localized text based on app language.
 * Returns { english, local } where local is the translation for the current language.
 * For English, local is empty string.
 */
export function getLocalizedText(language: Language): TamilTextStructure {
  return textByLanguage[language] || textByLanguage.en;
}
