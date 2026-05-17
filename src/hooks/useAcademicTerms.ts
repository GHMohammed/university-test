import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type AcademicTerm = Tables<'academic_terms'>;
export type TermType = 'first' | 'second' | 'summer' | 'custom';

export interface AcademicTermInput {
  name: string;
  academic_year: string;
  term_type: TermType;
  start_date: string;
  end_date: string;
  is_active?: boolean;
}

export function useAcademicTerms() {
  return useQuery({
    queryKey: ['academic-terms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_terms')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data as AcademicTerm[];
    },
  });
}

export function useActiveTerm() {
  return useQuery({
    queryKey: ['academic-terms', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return (data as AcademicTerm | null) ?? null;
    },
  });
}

export function useCreateTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: AcademicTermInput) => {
      const { data, error } = await supabase
        .from('academic_terms')
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-terms'] });
    },
  });
}

export function useUpdateTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Partial<AcademicTermInput>) => {
      const { data, error } = await supabase
        .from('academic_terms')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-terms'] });
    },
  });
}

export function useSetActiveTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('academic_terms')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-terms'] });
    },
  });
}

export function useDeleteTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Check usage first to give a clear error
      const [schedRes, enrollRes, sessRes] = await Promise.all([
        supabase.from('schedules').select('id', { count: 'exact', head: true }).eq('term_id', id),
        supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('term_id', id),
        supabase.from('lecture_sessions').select('id', { count: 'exact', head: true }).eq('term_id', id),
      ]);
      const total = (schedRes.count ?? 0) + (enrollRes.count ?? 0) + (sessRes.count ?? 0);
      if (total > 0) {
        throw new Error(
          `Term is used by ${schedRes.count ?? 0} schedules, ${enrollRes.count ?? 0} enrollments, ${sessRes.count ?? 0} sessions`
        );
      }
      const { error } = await supabase.from('academic_terms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-terms'] });
    },
  });
}
