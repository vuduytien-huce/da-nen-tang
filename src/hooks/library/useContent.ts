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

  const getAudiobookById = (id: string) => useQuery({
    queryKey: ['audiobook', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('audiobook_metadata').select('*').eq('id', id).single();
      if (error) throw error;
      const enriched = await booksService.enrichWithBookMetadata([data]);
      return enriched[0];
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
    queryKey: ['similar_books', isbn],
    enabled: !!embedding && !!isbn,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('match_books', {
        query_embedding: embedding,
        match_threshold: 0.4,
        match_count: limit + 5
      });
      if (error) throw error;
      return (data || []).filter((b: any) => b.isbn !== isbn).slice(0, limit);
    }
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
    audiobooks: { list: getAudiobooks, search: searchAudiobooks, getById: getAudiobookById },
    recommendations: { get: getRecommendations },
    reviews: { list: getReviews, add: addReview }
  };
}
