import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../api/supabase';
import { useAuthStore } from '../../store/useAuthStore';

export function useStaff() {
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);

  // Search members to appoint
  const searchMembers = (query: string) => useQuery({
    queryKey: ['staff_search', query],
    enabled: query.length > 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'MEMBER')
        .ilike('full_name', `%${query}%`)
        .limit(5);
      if (error) throw error;
      return data || [];
    }
  });

  // Appoint as Assistant (ADMIN)
  const appointAssistant = useMutation({
    mutationFn: async (memberId: string) => {
      const { data, error } = await supabase.rpc('appoint_assistant', {
        p_member_id: memberId
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff_search'] });
    }
  });

  return { searchMembers, appointAssistant };
}
