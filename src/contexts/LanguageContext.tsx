import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Language, translations, TranslationKey, TranslationValue } from '@/lib/i18n';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => TranslationValue;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANG_STORAGE_KEY = 'app_language';
const supportedLanguages: Language[] = ['nl', 'en', 'de', 'fr'];

// Priority: URL ?lang= > localStorage > domain default > 'nl'
const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'nl';
  const hostname = window.location.hostname;
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang') as Language;

  if (langParam && supportedLanguages.includes(langParam)) {
    return langParam;
  }

  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY) as Language | null;
    if (stored && supportedLanguages.includes(stored)) return stored;
  } catch { /* ignore */ }

  if (hostname.includes('seemyyear.com') || hostname.includes('rewindmyera.com')) {
    return 'en';
  }
  return 'nl';
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch { /* ignore */ }
  };

  // If URL ?lang= changes, sync it to storage too
  useEffect(() => {
    try { localStorage.setItem(LANG_STORAGE_KEY, language); } catch { /* ignore */ }
  }, [language]);

  const t = (key: TranslationKey): TranslationValue => {
    return translations[language][key] || translations.nl[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
