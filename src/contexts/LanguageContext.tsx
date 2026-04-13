import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Language, translations, TranslationKey, TranslationValue } from '@/lib/i18n';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => TranslationValue;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Determine initial language based on domain or referrer
const getInitialLanguage = (): Language => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang') as Language;
    const supportedLanguages: Language[] = ['nl', 'en', 'de', 'fr'];

    // 1. Priority: URL Parameter (?lang=en)
    if (langParam && supportedLanguages.includes(langParam)) {
      return langParam;
    }

    // 2. Domain-based default: seemyyear.com and rewindmyera.com default to English
    if (hostname.includes('seemyyear.com') || hostname.includes('rewindmyera.com')) {
      return 'en';
    }

    // 3. Fallback for hetjaarvan.nl or other environments
    return 'nl';
  }
  return 'nl';
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  
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
