import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useEffect } from 'react';

async function extractFunctionErrorMessage(error: unknown) {
  const context = error && typeof error === 'object' ? (error as { context?: unknown }).context : undefined;

  if (context instanceof Response) {
    try {
      const payload = await context.clone().json();
      if (
        payload &&
        typeof payload === 'object' &&
        'error' in payload &&
        typeof payload.error === 'string'
      ) {
        return payload.error;
      }
    } catch {
      // Fall back to plain text below.
    }

    try {
      const text = await context.clone().text();
      if (text) return text;
    } catch {
      // Fall back to generic error below.
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to submit attendance';
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  scanned_at: string;
  attendance_status: 'present' | 'absent' | 'late' | 'rejected';
  attendance_source: string;
  duplicate_blocked: boolean;
  notes: string | null;
}

export interface AttendanceWithStudent extends AttendanceRecord {
  profiles: {
    id: string;
    full_name: string;
    student_code: string | null;
  } | null;
}

export function useSessionAttendance(sessionId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['session-attendance', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID required');

      const { data: records, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('session_id', sessionId)
        .order('scanned_at', { ascending: false });

      if (error) throw error;

      // Fetch student profiles separately
      if (!records || records.length === 0) return [];

      const studentIds = [...new Set(records.map(r => r.student_id))];
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, student_code')
        .in('id', studentIds);

      if (profileError) throw profileError;

      // Merge profiles with attendance records
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      return records.map(record => ({
        ...record,
        profiles: profileMap.get(record.student_id) || null,
      })) as AttendanceWithStudent[];
    },
    enabled: !!sessionId,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`attendance-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['session-attendance', sessionId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient]);

  return query;
}

export function useEnrolledCount(courseId: string | undefined) {
  return useQuery({
    queryKey: ['enrolled-count', courseId],
    queryFn: async () => {
      if (!courseId) return 0;

      const { count, error } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!courseId,
  });
}

export function useStudentAttendanceHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-attendance', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          lecture_sessions(
            id,
            session_date,
            start_time,
            end_time,
            courses(id, name, code),
            classrooms(id, name, building)
          )
        `)
        .eq('student_id', user?.id)
        .order('scanned_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSubmitAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ qr_token }: { qr_token: string }) => {
      const { data, error } = await supabase.functions.invoke('submit-attendance', {
        body: { qr_token },
      });

      if (error) {
        throw new Error(await extractFunctionErrorMessage(error));
      }
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-attendance'] });
      toast.success(`Attendance recorded for ${data.session.course_name}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit attendance');
    },
  });
}

export function useManualAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      session_id,
      student_id,
      attendance_status,
    }: {
      session_id: string;
      student_id: string;
      attendance_status: 'present' | 'absent';
    }) => {
      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          session_id,
          student_id,
          attendance_status,
          attendance_source: 'manual',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('ALREADY_RECORDED');
        }
        throw error;
      }
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['session-attendance', vars.session_id] });
    },
  });
}

export function useDeleteAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, session_id: _session_id }: { id: string; session_id: string }) => {
      const { data, error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Delete failed: record not removed (permission denied or already deleted)');
      }
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['session-attendance', vars.session_id] });
      toast.success('Attendance record removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove attendance');
    },
  });
}
