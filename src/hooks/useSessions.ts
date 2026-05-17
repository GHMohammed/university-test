import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

/**
 * Start an attendance session from an admin-created schedule entry.
 * Creates a lecture_session linked to the schedule for today's date.
 */
export function useStartAttendanceFromSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: {
      id: string;
      course_id: string;
      classroom_id: string;
      start_time: string;
      end_time: string;
      term_id?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];

      // Resolve term_id from the schedule row if not provided
      let termId = schedule.term_id ?? null;
      if (termId === null) {
        const { data: schedRow } = await supabase
          .from('schedules')
          .select('term_id')
          .eq('id', schedule.id)
          .maybeSingle();
        termId = schedRow?.term_id ?? null;
      }

      // Check if a session already exists for this schedule today (any status)
      const { data: existing } = await supabase
        .from('lecture_sessions')
        .select('id, status')
        .eq('schedule_id', schedule.id)
        .eq('session_date', today);

      if (existing && existing.length > 0) {
        const session = existing[0];
        if (session.status === 'active') {
          throw new Error('An active session already exists for this lecture today');
        }
        // Reactivate scheduled or closed session
        const qr_expires_at = new Date(Date.now() + 30 * 60000).toISOString();
        const { data, error } = await supabase
          .from('lecture_sessions')
          .update({ status: 'active', qr_expires_at })
          .eq('id', session.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      // Create a new lecture_session linked to the schedule
      const startDateTime = new Date(`${today}T${schedule.start_time}`).toISOString();
      const endDateTime = new Date(`${today}T${schedule.end_time}`).toISOString();
      const qr_expires_at = new Date(Date.now() + 30 * 60000).toISOString();

      const { data, error } = await supabase
        .from('lecture_sessions')
        .insert({
          course_id: schedule.course_id,
          classroom_id: schedule.classroom_id,
          instructor_id: user.id,
          schedule_id: schedule.id,
          session_date: today,
          start_time: startDateTime,
          end_time: endDateTime,
          status: 'active',
          qr_expires_at,
          term_id: termId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['instructor-sessions-all'] });
      toast.success('Attendance started');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start attendance');
    },
  });
}

export interface Session {
  id: string;
  course_id: string;
  instructor_id: string;
  classroom_id: string;
  schedule_id: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  qr_token: string;
  qr_expires_at: string | null;
  status: 'scheduled' | 'active' | 'closed';
}

export interface SessionWithDetails extends Session {
  courses: {
    id: string;
    name: string;
    code: string;
  } | null;
  classrooms: {
    id: string;
    name: string;
    building: string;
  } | null;
}

export function useSessions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sessions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lecture_sessions')
        .select('*, courses(id, name, code), classrooms(id, name, building)')
        .order('session_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data as SessionWithDetails[];
    },
    enabled: !!user,
  });
}

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID required');

      const { data, error } = await supabase
        .from('lecture_sessions')
        .select('*, courses(id, name, code), classrooms(id, name, building)')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data as SessionWithDetails;
    },
    enabled: !!sessionId,
  });
}

export function useInstructorCourses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['instructor-courses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', user?.id)
        .order('code');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: {
      course_id: string;
      classroom_id: string;
      schedule_id?: string | null;
      session_date: string;
      start_time: string;
      end_time: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate QR expiry (30 minutes from start time)
      const startTime = new Date(`${values.session_date}T${values.start_time}`);
      const qr_expires_at = new Date(startTime.getTime() + 30 * 60000).toISOString();

      const { data, error } = await supabase
        .from('lecture_sessions')
        .insert({
          ...values,
          instructor_id: user.id,
          qr_expires_at,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create session');
    },
  });
}

export function useUpdateSessionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'scheduled' | 'active' | 'closed' }) => {
      // If activating, check for other active sessions for the same course
      if (status === 'active') {
        const { data: session } = await supabase
          .from('lecture_sessions')
          .select('course_id')
          .eq('id', id)
          .single();

        if (session) {
          const { data: activeSessions } = await supabase
            .from('lecture_sessions')
            .select('id')
            .eq('course_id', session.course_id)
            .eq('status', 'active')
            .neq('id', id);

          if (activeSessions && activeSessions.length > 0) {
            throw new Error('Another session for this course is already active');
          }
        }

        // Set QR expiry when activating
        const qr_expires_at = new Date(Date.now() + 30 * 60000).toISOString();
        const { data, error } = await supabase
          .from('lecture_sessions')
          .update({ status, qr_expires_at })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('lecture_sessions')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['instructor-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['instructor-sessions-all'] });
      toast.success(`Session ${variables.status}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update session status');
    },
  });
}


export function useRegenerateQR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      // Generate new QR token and expiry
      const qr_token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      const qr_expires_at = new Date(Date.now() + 30 * 60000).toISOString();

      const { data, error } = await supabase
        .from('lecture_sessions')
        .update({ qr_token, qr_expires_at })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      toast.success('QR code refreshed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to refresh QR code');
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lecture_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete session');
    },
  });
}
