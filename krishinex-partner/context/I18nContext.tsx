// app/context/I18nContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'hi' | 'en';

type I18nContextType = {
  lang: Lang;
  toggleLang: () => void;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>('hi'); // default Hindi

  const toggleLang = () => {
    setLang(prev => (prev === 'hi' ? 'en' : 'hi'));
  };

  return (
    <I18nContext.Provider value={{ lang, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return ctx;
};
