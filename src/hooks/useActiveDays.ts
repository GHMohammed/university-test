import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useActiveDays() {
  return useQuery({
    queryKey: ['active-days'],
    queryFn: async () => {
      const { data, error } = await supabase.from('active_days').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useToggleActiveDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase.from('active_days').update({ is_active }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['active-days'] }); },
  });
}
