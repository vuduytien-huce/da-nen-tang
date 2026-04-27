import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../api/supabase';
import { Book } from './types';

export function useBooks() {
  const queryClient = useQueryClient();

  const getBooks = () => useQuery<Book[]>({
    queryKey: ['books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('title');
      if (error) throw error;
      return data || [];
    },
  });

  const addBook = useMutation({
    mutationFn: async (book: Omit<Book, 'available_copies'>) => {
      const { data, error } = await supabase
        .from('books')
        .insert([{ ...book, available_copies: book.total_copies }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    }
  });

  const syncBook = useMutation({
    mutationFn: async (isbn: string) => {
      const { data, error } = await supabase.functions.invoke('sync-book', {
        body: { isbn }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    }
  });

  return { getBooks, addBook, syncBook };
}
