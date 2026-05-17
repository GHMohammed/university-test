import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useEnrollmentsByCourse(courseId: string | null, termId?: string | null) {
  return useQuery({
    queryKey: ['enrollments', courseId, termId ?? 'all'],
    enabled: !!courseId,
    queryFn: async () => {
      let query = supabase.from('enrollments').select('*').eq('course_id', courseId!);
      if (termId) query = query.eq('term_id', termId);
      const { data, error } = await query;
      if (error) throw error;
      // Fetch student profiles
      if (data.length === 0) return [];
      const studentIds = data.map(e => e.student_id);
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, student_code, department').in('id', studentIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      return data.map(e => ({ ...e, student: profileMap[e.student_id] || null }));
    },
  });
}

export function useCreateEnrollments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { course_id: string; student_ids: string[]; term_id?: string | null }) => {
      // Defensive duplicate check scoped by (course_id, term_id)
      let existingQuery = supabase
        .from('enrollments')
        .select('student_id')
        .eq('course_id', values.course_id)
        .in('student_id', values.student_ids);
      existingQuery = values.term_id
        ? existingQuery.eq('term_id', values.term_id)
        : existingQuery.is('term_id', null);
      const { data: existing, error: checkError } = await existingQuery;
      if (checkError) throw checkError;
      const alreadyEnrolled = new Set((existing || []).map(e => e.student_id));
      const toInsert = values.student_ids.filter(sid => !alreadyEnrolled.has(sid));
      if (toInsert.length === 0) {
        throw new Error('All selected students are already enrolled in this course for the selected term.');
      }
      const rows = toInsert.map(sid => ({
        course_id: values.course_id,
        student_id: sid,
        term_id: values.term_id ?? null,
      }));
      const { error } = await supabase.from('enrollments').insert(rows);
      if (error) throw error;
      return { inserted: toInsert.length, skipped: values.student_ids.length - toInsert.length };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enrollments'] }); },
  });
}

export function useDeleteEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('enrollments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enrollments'] }); },
  });
}
