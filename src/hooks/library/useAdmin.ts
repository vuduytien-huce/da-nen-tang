import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../api/supabase';
import { adminService } from '../../features/admin/admin.service';
import { useAuthStore } from '../../store/useAuthStore';

export function useAdmin() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  // --- Borrows Management ---
  const getAllBorrows = () => useQuery({
    queryKey: ['all-borrows'],
    queryFn: () => adminService.getAllBorrows(),
  });

  const approveBorrow = useMutation({
    mutationFn: (recordId: string) => adminService.approveBorrow(recordId, profile!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-borrows'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    }
  });

  const rejectBorrow = useMutation({
    mutationFn: ({ recordId, reason }: { recordId: string, reason: string }) => 
      adminService.rejectBorrow(recordId, profile!.id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-borrows'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    }
  });

  // --- Staff & Members ---
  const searchMembers = (query: string) => useQuery({
    queryKey: ['search_members', query],
    enabled: query.length > 2,
    queryFn: () => adminService.searchMembers(query),
  });

  // --- Reports & Analytics ---
  const getAnalytics = (range: string) => useQuery({
    queryKey: ['analytics', range],
    queryFn: () => adminService.getAnalytics(range),
  });

  const getMonthlyStats = (month: string) => useQuery({
    queryKey: ['monthly_stats', month],
    queryFn: () => adminService.getMonthlyStats(month),
  });

  // --- Logistics ---
  const getLogisticsSuggestions = () => useQuery({
    queryKey: ['logistics_suggestions'],
    queryFn: () => adminService.getAIRedistributionSuggestions(),
  });

  const executeTransfer = useMutation({
    mutationFn: (params: { isbn: string, fromBranchId: string, toBranchId: string, quantity: number }) => 
      adminService.executeTransfer(params.isbn, params.fromBranchId, params.toBranchId, params.quantity, profile!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['logistics_suggestions'] });
    }
  });

  return {
    borrows: { 
      listAll: getAllBorrows, 
      approve: approveBorrow, 
      reject: rejectBorrow 
    },
    staff: { searchMembers },
    analytics: { getAnalytics, getMonthlyStats },
    logistics: {
      getTransfers: () => useQuery({
        queryKey: ['inventory_transfers'],
        queryFn: () => adminService.getAllTransfers(),
      }),
      getAiSuggestions: () => useQuery({
        queryKey: ['logistics_suggestions'],
        queryFn: () => adminService.getAIRedistributionSuggestions(),
      }),
      executeTransfer,
      completeTransfer: useMutation({
        mutationFn: (id: string) => adminService.completeTransfer(id),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['inventory_transfers'] });
          queryClient.invalidateQueries({ queryKey: ['books'] });
        }
      })
    }
  };
}
