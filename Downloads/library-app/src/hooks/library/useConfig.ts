import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../api/supabase';

export function useConfig() {
  const queryClient = useQueryClient();

  const getConfig = () => useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('*');
      if (error) throw error;
      
      // Convert array to object key-value
      return (data || []).reduce((acc: any, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {
        fine_rate: '2000',
        member_due_days: '14',
        admin_due_days: '30',
        max_books: '5'
      });
    },
  });

  const updateConfig = useMutation({
    mutationFn: async ({ key, value }: { key: string, value: string }) => {
      const { error } = await supabase
        .from('system_config')
        .upsert({ key, value });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
    }
  });

  return { getConfig, updateConfig };
}
