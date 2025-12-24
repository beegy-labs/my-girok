import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import hi from './locales/hi.json';

// Detect browser language
const getBrowserLanguage = (): string => {
  const browserLang = navigator.language.split('-')[0];
  const supportedLangs = ['en', 'ko', 'ja', 'hi'];
  return supportedLangs.includes(browserLang) ? browserLang : 'en';
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ko: { translation: ko },
    ja: { translation: ja },
    hi: { translation: hi },
  },
  lng: getBrowserLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
