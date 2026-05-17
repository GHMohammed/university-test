import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSchedules(termId?: string | null) {
  return useQuery({
    queryKey: ['schedules', termId ?? 'all'],
    queryFn: async () => {
      let query = supabase.from('schedules').select('*').order('day_of_week').order('start_time');
      if (termId) query = query.eq('term_id', termId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useSchedulesWithDetails(termId?: string | null) {
  return useQuery({
    queryKey: ['schedules-details', termId ?? 'all'],
    queryFn: async () => {
      let query = supabase.from('schedules').select('*').order('day_of_week').order('start_time');
      if (termId) query = query.eq('term_id', termId);
      const { data: schedules, error } = await query;
      if (error) throw error;

      const courseIds = [...new Set(schedules.map(s => s.course_id))];
      const classroomIds = [...new Set(schedules.map(s => s.classroom_id))];

      const [coursesRes, classroomsRes] = await Promise.all([
        courseIds.length > 0 ? supabase.from('courses').select('id, name, code').in('id', courseIds) : { data: [] },
        classroomIds.length > 0 ? supabase.from('classrooms').select('id, name, building').in('id', classroomIds) : { data: [] },
      ]);

      const courseMap = Object.fromEntries((coursesRes.data || []).map(c => [c.id, c]));
      const classroomMap = Object.fromEntries((classroomsRes.data || []).map(c => [c.id, c]));

      return schedules.map(s => ({
        ...s,
        course: courseMap[s.course_id] || null,
        classroom: classroomMap[s.classroom_id] || null,
      }));
    },
  });
}

type ScheduleInput = {
  course_id: string;
  classroom_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  term_id?: string | null;
};

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: ScheduleInput) => {
      const { data, error } = await supabase.from('schedules').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedules'] }); qc.invalidateQueries({ queryKey: ['schedules-details'] }); },
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & ScheduleInput) => {
      const { data, error } = await supabase.from('schedules').update(values).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedules'] }); qc.invalidateQueries({ queryKey: ['schedules-details'] }); },
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedules'] }); qc.invalidateQueries({ queryKey: ['schedules-details'] }); },
  });
}
