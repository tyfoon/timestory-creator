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
    const referrer = document.referrer;
    
    // If visiting from seemyyear.com domain, default to English
    if (hostname.includes('seemyyear.com')) {
      return 'en';
    }
    
    // If referred from seemyyear.com, default to English
    if (referrer && referrer.includes('seemyyear.com')) {
      return 'en';
    }
    
    // Check URL parameter for language override (e.g., ?lang=en)
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    if (langParam === 'en') {
      return 'en';
    }
  }
  // Default to Dutch for other cases
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
