import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useMetadataSettings = () => {
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({
    isbn: true,
    published_date: true,
    category: true,
    description: true,
    appendix: true,
    page_count: true,
    language: true,
    average_rating: true,
    edition: true,
  });

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem('metadata_display_settings');
        if (isMounted && saved) {
          setVisibleFields(JSON.parse(saved));
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadSettings();
    return () => { isMounted = false; };
  }, []);

  const isVisible = (fieldId: string) => {
    return visibleFields[fieldId] ?? true;
  };

  return { visibleFields, isVisible, reload: loadSettings };
};
