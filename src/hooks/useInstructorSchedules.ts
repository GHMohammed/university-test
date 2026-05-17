import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface InstructorSchedule {
  id: string;
  course_id: string;
  classroom_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  course: { id: string; name: string; code: string } | null;
  classroom: { id: string; name: string; building: string } | null;
}

export interface ScheduleWithSession extends InstructorSchedule {
  /** The active or most recent lecture_session linked to this schedule for today */
  activeSession: {
    id: string;
    status: 'scheduled' | 'active' | 'closed';
    session_date: string;
    qr_token: string;
    qr_expires_at: string | null;
  } | null;
}

export function useInstructorSchedules() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['instructor-schedules', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // 1. Get courses assigned to this instructor
      const { data: courses, error: coursesErr } = await supabase
        .from('courses')
        .select('id, name, code')
        .eq('instructor_id', user.id);
      if (coursesErr) throw coursesErr;
      if (!courses || courses.length === 0) return [];

      const courseIds = courses.map(c => c.id);
      const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));

      // 2. Get schedules for those courses
      const { data: schedules, error: schedErr } = await supabase
        .from('schedules')
        .select('*')
        .in('course_id', courseIds)
        .order('day_of_week')
        .order('start_time');
      if (schedErr) throw schedErr;

      // 3. Get classrooms
      const classroomIds = [...new Set(schedules.map(s => s.classroom_id))];
      const { data: classrooms } = classroomIds.length > 0
        ? await supabase.from('classrooms').select('id, name, building').in('id', classroomIds)
        : { data: [] };
      const classroomMap = Object.fromEntries((classrooms || []).map(c => [c.id, c]));

      // 4. Get today's lecture_sessions linked to these schedules
      const today = new Date().toISOString().split('T')[0];
      const scheduleIds = schedules.map(s => s.id);
      let sessionMap: Record<string, ScheduleWithSession['activeSession']> = {};

      if (scheduleIds.length > 0) {
        const { data: sessions } = await supabase
          .from('lecture_sessions')
          .select('id, status, session_date, qr_token, qr_expires_at, schedule_id')
          .in('schedule_id', scheduleIds)
          .eq('session_date', today);

        (sessions || []).forEach(s => {
          if (s.schedule_id) {
            // Prefer active > scheduled > closed
            const existing = sessionMap[s.schedule_id];
            if (!existing || s.status === 'active' || (s.status === 'scheduled' && existing.status === 'closed')) {
              sessionMap[s.schedule_id] = {
                id: s.id,
                status: s.status as 'scheduled' | 'active' | 'closed',
                session_date: s.session_date,
                qr_token: s.qr_token,
                qr_expires_at: s.qr_expires_at,
              };
            }
          }
        });
      }

      return schedules.map(s => ({
        ...s,
        course: courseMap[s.course_id] || null,
        classroom: classroomMap[s.classroom_id] || null,
        activeSession: sessionMap[s.id] || null,
      })) as ScheduleWithSession[];
    },
    enabled: !!user,
  });
}

/**
 * Fetch all lecture_sessions for the current instructor (for history / past sessions view).
 */
export function useInstructorSessions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['instructor-sessions-all', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('lecture_sessions')
        .select('*, courses(id, name, code), classrooms(id, name, building)')
        .eq('instructor_id', user.id)
        .order('session_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
