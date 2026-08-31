// app/context/I18nContext.tsx
import React, { createContext, useContext, useState } from 'react';

type Language = 'hi' | 'en';

const translations = {
  hi: {
    greeting: (name: string) => `नमस्ते, ${name}`,
    village: (place: string) => `गांव: ${place}`,
    todayWeather: 'आज का मौसम',
    rainChance: 'आज बारिश की संभावना: 40%',
    wind: 'हवा: 15 किमी/घंटा',
    forFarm: 'आपके खेत के लिए',
    mandiTitle: 'मंडी भाव',
    mandiSub: 'गेहूँ: ₹2200 / क्विंटल',
    soilTitle: 'मिट्टी जाँच',
    soilSub: 'फोटो खींचकर डाल दें',
    bookTitle: 'बुक करें',
    bookSub: 'मज़दूर / उपकरण',
    docTitle: 'डॉक्टर से संपर्क',
    docSub: 'सीधे कृषि डॉक्टर से जुड़ें',
    shopTitle: 'इनपुट दुकान',
    shopSub: 'बीज, खाद, दवा',
    trainTitle: 'प्रशिक्षण वीडियो',
    trainSub: 'वीडियो से सीखें',
    sidebarHome: 'होम',
    sidebarPosts: 'मेरी पोस्ट',
    sidebarServices: 'सेवाएँ',
    sidebarHelp: 'सहायता',
  },
  en: {
    greeting: (name: string) => `Hello, ${name}`,
    village: (place: string) => `Village: ${place}`,
    todayWeather: 'Today\'s weather',
    rainChance: 'Rain chance today: 40%',
    wind: 'Wind: 15 km/h',
    forFarm: 'For your farm',
    mandiTitle: 'Mandi Bhav',
    mandiSub: 'Wheat: ₹2200 / quintal',
    soilTitle: 'Soil Test',
    soilSub: 'Upload field photo',
    bookTitle: 'Book',
    bookSub: 'Labour / Equipment',
    docTitle: 'Connect with Doctor',
    docSub: 'Call or WhatsApp expert',
    shopTitle: 'Inputs Shop',
    shopSub: 'Seed, fertiliser',
    trainTitle: 'Training',
    trainSub: 'Learn with video',
    sidebarHome: 'Home',
    sidebarPosts: 'My Posts',
    sidebarServices: 'Services',
    sidebarHelp: 'Help & Support',
  },
};

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations['hi'];
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('hi'); // default Hindi

  const value: I18nContextType = {
    language,
    setLanguage,
    t: translations[language],
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return ctx;
}
