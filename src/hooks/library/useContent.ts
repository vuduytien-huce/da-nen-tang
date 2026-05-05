import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../api/supabase';
import { booksService } from '../../features/books/books.service';
import { useAuthStore } from '../../store/useAuthStore';
import { ai } from '../../core/ai';
import { Book } from '../../features/books/books.types';

export function useContent() {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();
  const userId = session?.user.id;
  const { i18n } = useTranslation();
  const lang = i18n.language || 'vi';

  const localizeItem = async (item: any, id: string) => {
    if (!item) return item;

    // 1. Check if already localized in DB fields
    const hasLocalizedFields = (item.title_en && item.title_vi);
    
    let trans = {
      title_en: item.title_en,
      title_vi: item.title_vi,
      description_en: item.description_en,
      description_vi: item.description_vi,
      author_en: item.author_en,
      author_vi: item.author_vi,
      narrator_en: item.narrator_en,
      narrator_vi: item.narrator_vi
    };

    if (!hasLocalizedFields) {
      try {
        // 2. Check local AsyncStorage cache
        const cached = await AsyncStorage.getItem(`localized_meta_${id}`);
        if (cached) {
          trans = { ...trans, ...JSON.parse(cached) };
        } else {
          // 3. Fallback to AI translation for core fields if missing
          const aiTrans = await ai.translateMetadata(
            item.title, 
            item.description || "",
            item.author,
            item.narrator
          );
          trans = { ...trans, ...aiTrans };
          await AsyncStorage.setItem(`localized_meta_${id}`, JSON.stringify(trans));
        }
      } catch (error) {
        console.warn(`Localization failed for ${id}:`, error);
      }
    }

    const currentLang = i18n.language || 'vi';
    const isEn = currentLang.startsWith('en');
    
    return {
      ...item,
      title_en: trans.title_en || item.title,
      title_vi: trans.title_vi || item.title,
      description_en: trans.description_en || item.description,
      description_vi: trans.description_vi || item.description,
      author_en: trans.author_en || item.author,
      author_vi: trans.author_vi || item.author,
      narrator_en: trans.narrator_en || item.narrator,
      narrator_vi: trans.narrator_vi || item.narrator,
      
      title: isEn ? (trans.title_en || item.title) : (trans.title_vi || item.title),
      description: isEn ? (trans.description_en || item.description) : (trans.description_vi || item.description),
      author: isEn ? (trans.author_en || item.author) : (trans.author_vi || item.author),
      narrator: isEn ? (trans.narrator_en || item.narrator) : (trans.narrator_vi || item.narrator),
    };
  };

  // --- Books ---
  const getBooks = () => useQuery<Book[]>({
    queryKey: ['books', lang],
    queryFn: async () => {
      const { data, error } = await supabase.from('books').select('*').order('title');
      if (error) throw error;
      if (!data) return [];
      return Promise.all(data.map(book => localizeItem(book, book.isbn)));
    }
  });

  const getBookByIsbn = (isbn: string) => useQuery<Book>({
    queryKey: ['book', isbn, lang],
    queryFn: async () => {
      const { data, error } = await supabase.from('books').select('*, branch_inventory(*)').eq('isbn', isbn).single();
      if (error) throw error;
      return localizeItem(data, data.isbn);
    },
    enabled: !!isbn
  });

  const semanticSearch = (query: string) => useQuery({
    queryKey: ['semantic_search', query, lang],
    enabled: query.length > 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('match_books', {
        query_text: query,
        match_threshold: 0.3,
        match_count: 10
      });
      if (error) throw error;
      if (!data) return [];
      return Promise.all(data.map((book: any) => localizeItem(book, book.isbn)));
    }
  });

  const semanticSearchMutation = useMutation({
    mutationFn: async ({ query, limit = 10 }: { query: string, limit?: number }) => {
      const { data, error } = await supabase.rpc('match_books', {
        query_text: query,
        match_threshold: 0.3,
        match_count: limit
      });
      if (error) throw error;
      if (!data) return [];
      return Promise.all(data.map((book: any) => localizeItem(book, book.isbn)));
    }
  });

  // --- Audiobooks ---
  const getAudiobooks = (limit = 20) => useQuery({
    queryKey: ['audiobooks', limit, lang],
    queryFn: async () => {
      const list = await booksService.browseAudiobooks(limit);
      return Promise.all(list.map(ab => localizeItem(ab, ab.id)));
    },
  });

  const searchAudiobooks = (query: string) => useQuery({
    queryKey: ['audiobooks_search', query, lang],
    enabled: query.length > 2,
    queryFn: async () => {
      const list = await booksService.searchAudiobooks(query);
      return Promise.all(list.map(ab => localizeItem(ab, ab.id)));
    },
  });

  const addAudiobook = useMutation({
    mutationFn: async (audiobook: any) => {
      if (!audiobook.title_en || !audiobook.title_vi) {
        try {
          const trans = await ai.translateMetadata(
            audiobook.title,
            audiobook.description || "",
            audiobook.author,
            audiobook.narrator
          );
          audiobook = { ...audiobook, ...trans };
        } catch(e) {
          console.warn("Auto-translate failed during add:", e);
        }
      }

      // Try to link ISBN from existing books
      if (!audiobook.isbn) {
        const { data: matchedBooks } = await supabase
          .from("books")
          .select("isbn, cover_url")
          .ilike("title", `%${booksService.normalizeTitle(audiobook.title)}%`)
          .limit(1);
        
        if (matchedBooks && matchedBooks.length > 0) {
          audiobook.isbn = matchedBooks[0].isbn;
          if (!audiobook.cover_url) audiobook.cover_url = matchedBooks[0].cover_url;
        }
      }

      // If still no cover, fetch from external sources
      if (!audiobook.cover_url) {
        try {
          const external = await booksService.fetchMetadataBySearch(audiobook.title, audiobook.author || "", audiobook.title_en);
          if (external) {
            if (external.thumbnail) audiobook.cover_url = external.thumbnail;
            if (external.description && !audiobook.description) audiobook.description = external.description;
          }
        } catch (e) {
          console.warn("External fetch failed during add:", e);
        }
      }

      const { data, error } = await supabase.from('audiobook_metadata').insert([audiobook]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audiobooks'] });
      queryClient.invalidateQueries({ queryKey: ['audiobooks_search'] });
    }
  });

  const updateAudiobook = useMutation({
    mutationFn: async ({ id, ...audiobook }: any) => {
      if (audiobook.title && (!audiobook.title_en || !audiobook.title_vi)) {
        try {
          const trans = await ai.translateMetadata(
            audiobook.title,
            audiobook.description || "",
            audiobook.author,
            audiobook.narrator
          );
          audiobook = { ...audiobook, ...trans };
        } catch(e) {
          console.warn("Auto-translate failed during update:", e);
        }
      }
      // Try to link ISBN from existing books if it doesn't have one and title is provided
      if (!audiobook.isbn && audiobook.title) {
        const { data: matchedBooks } = await supabase
          .from("books")
          .select("isbn, cover_url")
          .ilike("title", `%${booksService.normalizeTitle(audiobook.title)}%`)
          .limit(1);
        
        if (matchedBooks && matchedBooks.length > 0) {
          audiobook.isbn = matchedBooks[0].isbn;
          if (!audiobook.cover_url) audiobook.cover_url = matchedBooks[0].cover_url;
        }
      }

      // If still no cover, fetch from external sources
      if (audiobook.title && !audiobook.cover_url) {
        try {
          const external = await booksService.fetchMetadataBySearch(audiobook.title, audiobook.author || "", audiobook.title_en);
          if (external) {
            if (external.thumbnail) audiobook.cover_url = external.thumbnail;
            if (external.description && !audiobook.description) audiobook.description = external.description;
          }
        } catch (e) {
          console.warn("External fetch failed during update:", e);
        }
      }

      const { data, error } = await supabase.from('audiobook_metadata').update(audiobook).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audiobooks'] });
      queryClient.invalidateQueries({ queryKey: ['audiobook', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['audiobooks_search'] });
    }
  });

  const deleteAudiobook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('audiobook_metadata').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audiobooks'] });
      queryClient.invalidateQueries({ queryKey: ['audiobooks_search'] });
    }
  });

  const getAudiobookById = (id: string) => useQuery({
    queryKey: ['audiobook', id, lang],
    queryFn: async () => {
      const { data, error } = await supabase.from('audiobook_metadata').select('*, book:books(title, author, description, cover_url)').eq('id', id).single();
      if (error) throw error;
      const enriched = await booksService.enrichWithBookMetadata([data]);
      return localizeItem(enriched[0], enriched[0].id);
    },
    enabled: !!id
  });

  const getInventory = (isbn: string) => useQuery({
    queryKey: ['branch_inventory', isbn],
    queryFn: async () => {
      const { data, error } = await supabase.from('branch_inventory').select('*, branches(*)').eq('isbn', isbn);
      if (error) throw error;
      return data || [];
    },
    enabled: !!isbn
  });

  const getSimilar = (embedding: any, isbn: string, limit = 5) => useQuery({
    queryKey: ['similar_books', isbn, lang],
    enabled: !!embedding && !!isbn,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('match_books', {
        query_embedding: embedding,
        match_threshold: 0.4,
        match_count: limit + 5
      });
      if (error) throw error;
      const filtered = (data || []).filter((b: any) => b.isbn !== isbn).slice(0, limit);
      return Promise.all(filtered.map((b: any) => localizeItem(b, b.isbn)));
    }
  });

  // --- Recommendations ---
  const getRecommendations = (limit = 5) => useQuery({
    queryKey: ['recommendations', userId, limit, lang],
    enabled: !!userId,
    queryFn: async () => {
      const list = await booksService.getSemanticRecommendations(userId!, limit);
      return Promise.all(list.map(book => localizeItem(book, book.isbn)));
    },
    staleTime: 1000 * 60 * 30,
  });

  // --- Reviews ---
  const getReviews = (isbn: string) => useQuery({
    queryKey: ['reviews', isbn],
    queryFn: async () => {
      const { data, error } = await supabase.from('reviews').select('*, profiles(fullName:full_name, avatarUrl:avatar_url)').eq('book_isbn', isbn).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!isbn
  });

  const addReview = useMutation({
    mutationFn: async (review: { book_isbn: string, rating: number, comment: string }) => {
      const { data, error } = await supabase.from('reviews').upsert([{ ...review, user_id: userId }]);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.book_isbn] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    }
  });

  const syncBook = useMutation({
    mutationFn: (isbn: string) => booksService.syncBookMetadata(isbn),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    }
  });

  return {
    books: { list: getBooks, getByIsbn: getBookByIsbn, semanticSearch, semanticSearchMutation, getInventory, getSimilar, sync: syncBook },
    audiobooks: { list: getAudiobooks, search: searchAudiobooks, getById: getAudiobookById, add: addAudiobook, update: updateAudiobook, delete: deleteAudiobook },
    recommendations: { get: getRecommendations },
    reviews: { list: getReviews, add: addReview }
  };
}
