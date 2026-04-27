import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../api/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { BorrowRecord } from './types';

export function useBorrows() {
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);

  const getMyBorrows = () => useQuery<BorrowRecord[]>({
    queryKey: ['my-borrows', session?.user.id],
    enabled: !!session?.user.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('borrow_records')
        .select('*, book:books(*)')
        .eq('user_id', session?.user.id)
        .order('borrowed_at', { ascending: false });
      if (error) throw error;
      
      // Corrected 2,000 VND fine logic as per borrow_return_upgrade.sql
      return (data || []).map(record => {
        if (record.status === 'BORROWED' && record.due_date && new Date(record.due_date) < new Date()) {
          const daysLate = Math.floor((new Date().getTime() - new Date(record.due_date).getTime()) / (1000 * 3600 * 24));
          return { ...record, estimated_fine: Math.max(0, daysLate * 2000) };
        }
        return { ...record, estimated_fine: 0 };
      });
    },
  });

  const getAllBorrows = () => useQuery<BorrowRecord[]>({
    queryKey: ['all-borrows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('borrow_records')
        .select('*, book:books(*), profiles:user_id(full_name, email)')
        .order('borrowed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const borrowBook = useMutation({
    mutationFn: async (bookId: string) => {
      const { data, error } = await supabase.rpc('borrow_book', {
        p_book_id: bookId,
        p_user_id: session?.user.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['my-borrows'] });
    }
  });

  const returnBook = useMutation({
    mutationFn: async (isbn: string) => {
      const { data, error } = await supabase.rpc('return_book_by_isbn', {
        p_isbn: isbn,
        p_librarian_id: session?.user.id
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['my-borrows'] });
      queryClient.invalidateQueries({ queryKey: ['librarian_active_borrows'] });
    }
  });

  const payFine = useMutation({
    mutationFn: async ({ recordId, method }: { recordId: string, method: string }) => {
      const { data, error } = await supabase.rpc('pay_fine', {
        p_record_id: recordId,
        p_method: method
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-borrows'] });
      queryClient.invalidateQueries({ queryKey: ['librarian_active_borrows'] });
      queryClient.invalidateQueries({ queryKey: ['librarian_unpaid_fines'] });
    }
  });

  const approveBorrow = useMutation({
    mutationFn: async (recordId: string) => {
      const { data, error } = await supabase.rpc('approve_borrow', {
        p_record_id: recordId,
        p_librarian_id: session?.user.id
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-borrows'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    }
  });

  const rejectBorrow = useMutation({
    mutationFn: async ({ recordId, reason }: { recordId: string, reason: string }) => {
      const { data, error } = await supabase.rpc('reject_borrow', {
        p_record_id: recordId,
        p_librarian_id: session?.user.id,
        p_reason: reason
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-borrows'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    }
  });

  return { getMyBorrows, getAllBorrows, borrowBook, returnBook, payFine, approveBorrow, rejectBorrow };
}
