import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useTimeSlots() {
  return useQuery({
    queryKey: ['time-slots'],
    queryFn: async () => {
      const { data, error } = await supabase.from('time_slots').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTimeSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { label: string; start_time: string; end_time: string; sort_order: number }) => {
      const { data, error } = await supabase.from('time_slots').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['time-slots'] }); },
  });
}

export function useUpdateTimeSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; label: string; start_time: string; end_time: string; sort_order: number }) => {
      const { data, error } = await supabase.from('time_slots').update(values).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['time-slots'] }); },
  });
}

export function useDeleteTimeSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_slots').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['time-slots'] }); },
  });
}
