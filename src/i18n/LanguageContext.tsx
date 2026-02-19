import React, { createContext, useContext, useState, useCallback } from 'react';
import { translations, LANGUAGE_LABELS, type Language } from '@/i18n/translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
    languages: typeof LANGUAGE_LABELS;
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'en',
    setLanguage: () => { },
    t: (key: string) => key,
    languages: LANGUAGE_LABELS,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        const saved = localStorage.getItem('appLanguage');
        return (saved as Language) || 'en';
    });

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('appLanguage', lang);
    }, []);

    const t = useCallback((key: string): string => {
        const trans = translations[language];
        return (trans as any)?.[key] ?? (translations.en as any)?.[key] ?? key;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGE_LABELS }}>
            {children}
        </LanguageContext.Provider>
    );
};
