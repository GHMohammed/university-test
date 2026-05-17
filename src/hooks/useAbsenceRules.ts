import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AbsenceStatus = 'safe' | 'warning' | 'critical';

export interface AbsenceRule {
  id: string;
  course_id: string | null;
  max_absence_count: number;
  warning_threshold_percent: number;
}

export interface CourseAbsenceStatus {
  courseId: string;
  courseName: string;
  courseCode: string;
  totalSessions: number;
  absences: number;
  maxAbsenceCount: number;
  warningThresholdPercent: number;
  absencePercent: number;
  status: AbsenceStatus;
}

// ─── Default fallback rule ───────────────────────────────────────────────────

const DEFAULT_RULE: Omit<AbsenceRule, 'id' | 'course_id'> = {
  max_absence_count: 5,
  warning_threshold_percent: 70,
};

// ─── useAbsenceRules ─────────────────────────────────────────────────────────

export function useAbsenceRules() {
  return useQuery<AbsenceRule[]>({
    queryKey: ['absence-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('absence_rules')
        .select('*');
      if (error) throw error;
      return (data || []) as AbsenceRule[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Resolve applicable rule ─────────────────────────────────────────────────

function resolveRule(rules: AbsenceRule[], courseId: string): Omit<AbsenceRule, 'id' | 'course_id'> {
  // Course-specific rule first
  const specific = rules.find(r => r.course_id === courseId);
  if (specific) return { max_absence_count: specific.max_absence_count, warning_threshold_percent: specific.warning_threshold_percent };

  // Global rule (course_id is null)
  const global = rules.find(r => r.course_id === null);
  if (global) return { max_absence_count: global.max_absence_count, warning_threshold_percent: global.warning_threshold_percent };

  return DEFAULT_RULE;
}

// ─── Calculate absence status ────────────────────────────────────────────────

function calcStatus(absences: number, maxCount: number, thresholdPercent: number): AbsenceStatus {
  if (absences >= maxCount) return 'critical';
  // Warning when absence count reaches threshold% of max
  const warningCount = Math.ceil((thresholdPercent / 100) * maxCount);
  if (absences >= warningCount) return 'warning';
  return 'safe';
}

// ─── useStudentAbsenceStatuses ───────────────────────────────────────────────
// Returns per-course absence status for a student, including alert generation

export function useStudentAbsenceStatuses(studentId: string | undefined) {
  return useQuery<CourseAbsenceStatus[]>({
    queryKey: ['student-absence-statuses', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      // Fetch enrollments, rules, sessions, attendance in parallel
      const [
        { data: enrollments },
        { data: rules },
      ] = await Promise.all([
        supabase.from('enrollments').select('course_id').eq('student_id', studentId!),
        supabase.from('absence_rules').select('*'),
      ]);

      const courseIds = (enrollments || []).map(e => e.course_id);
      if (courseIds.length === 0) return [];

      const [{ data: sessions }, { data: records }, { data: courses }] = await Promise.all([
        supabase.from('lecture_sessions').select('id, course_id').in('course_id', courseIds).limit(1000),
        supabase.from('attendance_records').select('attendance_status, session_id').eq('student_id', studentId!).limit(1000),
        supabase.from('courses').select('id, name, code').in('id', courseIds),
      ]);

      const sessionList = sessions || [];
      const recordList = records || [];
      const courseList = courses || [];
      const ruleList = (rules || []) as AbsenceRule[];

      // Sessions per course
      const sessionsByCourse = new Map<string, number>();
      const sessionCourseMap = new Map<string, string>();
      sessionList.forEach(s => {
        sessionCourseMap.set(s.id, s.course_id);
        sessionsByCourse.set(s.course_id, (sessionsByCourse.get(s.course_id) || 0) + 1);
      });

      // Absences per course
      const absencesByCourse = new Map<string, number>();
      recordList.forEach(r => {
        if (r.attendance_status === 'absent') {
          const cid = sessionCourseMap.get(r.session_id);
          if (cid) absencesByCourse.set(cid, (absencesByCourse.get(cid) || 0) + 1);
        }
      });

      return courseList.map(c => {
        const rule = resolveRule(ruleList, c.id);
        const absences = absencesByCourse.get(c.id) || 0;
        const totalSessions = sessionsByCourse.get(c.id) || 0;
        const absencePercent = totalSessions > 0 ? Math.round((absences / totalSessions) * 100) : 0;
        const status = calcStatus(absences, rule.max_absence_count, rule.warning_threshold_percent);

        return {
          courseId: c.id,
          courseName: c.name,
          courseCode: c.code,
          totalSessions,
          absences,
          maxAbsenceCount: rule.max_absence_count,
          warningThresholdPercent: rule.warning_threshold_percent,
          absencePercent,
          status,
        };
      });
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ─── useGenerateAbsenceAlerts ────────────────────────────────────────────────
// Mutation that checks absence statuses and creates/deduplicates alerts

export function useGenerateAbsenceAlerts() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (statuses: CourseAbsenceStatus[]) => {
      if (!user) return;

      const alertCourses = statuses.filter(s => s.status === 'warning' || s.status === 'critical');
      if (alertCourses.length === 0) return;

      // Fetch existing unread absence_warning alerts for this user
      const { data: existingAlerts } = await supabase
        .from('alerts')
        .select('id, title, message, read_status')
        .eq('user_id', user.id)
        .eq('type', 'absence_warning')
        .eq('read_status', false);

      const existing = existingAlerts || [];

      for (const course of alertCourses) {
        // Deduplication key: check if an unread alert for this course already exists
        // We encode courseId in the title for matching
        const dedupMarker = `[${course.courseId}]`;
        const existingAlert = existing.find(a => a.title.includes(dedupMarker));

        const title = course.status === 'critical'
          ? `⛔ ${course.courseName} ${dedupMarker}`
          : `⚠️ ${course.courseName} ${dedupMarker}`;

        const message = course.status === 'critical'
          ? `You have reached the maximum absences (${course.absences}/${course.maxAbsenceCount}) in ${course.courseName} (${course.courseCode}).`
          : `Absence warning: ${course.absences}/${course.maxAbsenceCount} absences in ${course.courseName} (${course.courseCode}).`;

        if (existingAlert) {
          // Update existing alert if status/message changed
          if (existingAlert.title !== title || existingAlert.message !== message) {
            await supabase
              .from('alerts')
              .update({ title, message })
              .eq('id', existingAlert.id);
          }
          // Otherwise skip — already exists with same content
        } else {
          // Create new alert
          await supabase
            .from('alerts')
            .insert({
              user_id: user.id,
              role_target: 'student' as const,
              type: 'absence_warning' as const,
              title,
              message,
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-unread-count'] });
    },
  });
}
