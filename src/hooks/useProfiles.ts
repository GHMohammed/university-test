import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/types';

export function useProfilesByRole(role: AppRole) {
  return useQuery({
    queryKey: ['profiles', role],
    queryFn: async () => {
      // Get user_ids with this role
      const { data: roles, error: rolesError } = await supabase.from('user_roles').select('user_id').eq('role', role);
      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];
      const ids = roles.map(r => r.user_id);
      const { data, error } = await supabase.from('profiles').select('*').in('id', ids).order('full_name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      email: string; password: string; full_name: string; phone?: string;
      department?: string; role: AppRole; student_code?: string; instructor_code?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const res = await supabase.functions.invoke('admin-create-user', {
        body: values,
      });
      if (res.error) throw new Error(res.error.message || 'Failed to create user');
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['profiles', vars.role] });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; full_name?: string; phone?: string | null; department?: string | null; student_code?: string | null; instructor_code?: string | null; status?: string }) => {
      const { data, error } = await supabase.from('profiles').update(values).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}
