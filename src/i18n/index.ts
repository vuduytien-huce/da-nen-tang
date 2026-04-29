import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore
import vi from './locales/vi.json';
// @ts-ignore
import en from './locales/en.json';

const LANGUAGE_KEY = 'user-language';

const languageDetector: any = {
  type: 'languageDetector',
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        return callback(savedLanguage);
      }
      
      const locales = Localization.getLocales();
      const deviceLanguage = (locales && locales.length > 0) ? locales[0].languageCode : 'en';
      return callback(deviceLanguage === 'vi' ? 'vi' : 'en');
    } catch (error) {
      console.warn('Error detecting language:', error);
      return callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      console.warn('Error saving language:', error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
