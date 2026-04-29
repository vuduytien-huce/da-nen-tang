import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../api/supabase';
import { booksService } from '../../features/books/books.service';
import { useAuthStore } from '../../store/useAuthStore';
import { Book } from '../../features/books/books.types';

export function useContent() {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();
  const userId = session?.user.id;

  // --- Books ---
  const getBooks = () => useQuery<Book[]>({
    queryKey: ['books'],
    queryFn: async () => {
      const { data, error } = await supabase.from('books').select('*').order('title');
      if (error) throw error;
      return data || [];
    }
  });

  const getBookByIsbn = (isbn: string) => useQuery<Book>({
    queryKey: ['book', isbn],
    queryFn: async () => {
      const { data, error } = await supabase.from('books').select('*, branch_inventory(*)').eq('isbn', isbn).single();
      if (error) throw error;
      return data;
    },
    enabled: !!isbn
  });

  const semanticSearch = (query: string) => useQuery({
    queryKey: ['semantic_search', query],
    enabled: query.length > 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('match_books', {
        query_text: query,
        match_threshold: 0.3,
        match_count: 10
      });
      if (error) throw error;
      return data;
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
      return data;
    }
  });

  // --- Audiobooks ---
  const getAudiobooks = (limit = 20) => useQuery({
    queryKey: ['audiobooks', limit],
    queryFn: () => booksService.browseAudiobooks(limit),
  });

  const searchAudiobooks = (query: string) => useQuery({
    queryKey: ['audiobooks_search', query],
    enabled: query.length > 2,
    queryFn: () => booksService.searchAudiobooks(query),
  });

  // --- Recommendations ---
  const getRecommendations = (limit = 5) => useQuery({
    queryKey: ['recommendations', userId, limit],
    enabled: !!userId,
    queryFn: () => booksService.getSemanticRecommendations(userId!, limit),
    staleTime: 1000 * 60 * 30,
  });

  // --- Reviews ---
  const getReviews = (isbn: string) => useQuery({
    queryKey: ['reviews', isbn],
    queryFn: async () => {
      const { data, error } = await supabase.from('reviews').select('*, profiles(full_name, avatar_url)').eq('book_isbn', isbn).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!isbn
  });

  const addReview = useMutation({
    mutationFn: (review: { book_isbn: string, rating: number, comment: string }) => 
      supabase.from('reviews').upsert([{ ...review, user_id: userId }]),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.book_isbn] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    }
  });

  return {
    books: { list: getBooks, getByIsbn: getBookByIsbn, semanticSearch, semanticSearchMutation },
    audiobooks: { list: getAudiobooks, search: searchAudiobooks },
    recommendations: { get: getRecommendations },
    reviews: { list: getReviews, add: addReview }
  };
}
