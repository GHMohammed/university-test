import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').order('code');
      if (error) throw error;
      return data;
    },
  });
}

export function useCoursesWithInstructor() {
  return useQuery({
    queryKey: ['courses-with-instructor'],
    queryFn: async () => {
      const { data: courses, error } = await supabase.from('courses').select('*').order('code');
      if (error) throw error;
      // Fetch instructor names
      const instructorIds = [...new Set(courses.filter(c => c.instructor_id).map(c => c.instructor_id!))];
      let instructorMap: Record<string, string> = {};
      if (instructorIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', instructorIds);
        if (profiles) {
          instructorMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name]));
        }
      }
      return courses.map(c => ({ ...c, instructor_name: c.instructor_id ? instructorMap[c.instructor_id] || '-' : '-' }));
    },
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { name: string; code: string; department?: string | null; description?: string | null; instructor_id?: string | null }) => {
      const { data, error } = await supabase.from('courses').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); qc.invalidateQueries({ queryKey: ['courses-with-instructor'] }); },
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; name: string; code: string; department?: string | null; description?: string | null; instructor_id?: string | null }) => {
      const { data, error } = await supabase.from('courses').update(values).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); qc.invalidateQueries({ queryKey: ['courses-with-instructor'] }); },
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); qc.invalidateQueries({ queryKey: ['courses-with-instructor'] }); },
  });
}
