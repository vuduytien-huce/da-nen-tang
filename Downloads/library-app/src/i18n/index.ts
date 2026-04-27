import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import vi from './locales/vi.json';
import en from './locales/en.json';

// Detect device language safely
const locales = Localization.getLocales();
const deviceLanguage = (locales && locales.length > 0) ? locales[0].languageCode : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    lng: deviceLanguage === 'vi' ? 'vi' : 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
