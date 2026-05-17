import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Shared types ────────────────────────────────────────────────────────────

export interface CourseAttendanceStat {
  courseId: string;
  courseName: string;
  courseCode: string;
  totalSessions: number;
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;
}

export interface InstructorAttendanceStat {
  instructorId: string;
  instructorName: string;
  totalSessions: number;
  totalRecords: number;
  presentCount: number;
  attendanceRate: number;
}

export interface TrendDataPoint {
  date: string;
  attendanceRate: number;
  present: number;
  total: number;
}

// ─── Admin Analytics ─────────────────────────────────────────────────────────

export interface AdminAnalytics {
  totalStudents: number;
  totalInstructors: number;
  totalCourses: number;
  totalSessions: number;
  activeSessions: number;
  overallAttendanceRate: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  courseStats: CourseAttendanceStat[];
  instructorStats: InstructorAttendanceStat[];
}

export function useAdminAnalytics() {
  return useQuery<AdminAnalytics>({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const [
        { count: studentCount },
        { count: instructorCount },
        { count: courseCount },
        { count: sessionCount },
        { count: activeSessionCount },
        { data: records },
        { data: sessions },
        { data: courses },
      ] = await Promise.all([
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'instructor'),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('lecture_sessions').select('*', { count: 'exact', head: true }),
        supabase.from('lecture_sessions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('attendance_records').select('attendance_status, session_id').limit(1000),
        supabase.from('lecture_sessions').select('id, course_id, instructor_id').limit(1000),
        supabase.from('courses').select('id, name, code').limit(200),
      ]);

      const recordList = records || [];
      const sessionList = sessions || [];
      const courseList = courses || [];

      const totalPresent = recordList.filter(r => r.attendance_status === 'present').length;
      const totalLate = recordList.filter(r => r.attendance_status === 'late').length;
      const totalAbsent = recordList.filter(r => r.attendance_status === 'absent').length;
      const totalRecords = recordList.length;
      const overallAttendanceRate = totalRecords > 0
        ? Math.round(((totalPresent + totalLate) / totalRecords) * 100)
        : 0;

      // Build session → course + instructor maps
      const sessionCourseMap = new Map<string, string>();
      const sessionInstructorMap = new Map<string, string>();
      const sessionsByCourse = new Map<string, number>();
      const sessionsByInstructor = new Map<string, number>();

      sessionList.forEach(s => {
        sessionCourseMap.set(s.id, s.course_id);
        sessionInstructorMap.set(s.id, s.instructor_id);
        sessionsByCourse.set(s.course_id, (sessionsByCourse.get(s.course_id) || 0) + 1);
        if (s.instructor_id) {
          sessionsByInstructor.set(s.instructor_id, (sessionsByInstructor.get(s.instructor_id) || 0) + 1);
        }
      });

      // Aggregate records by course
      type Counts = { present: number; absent: number; late: number; total: number };
      const recordsByCourse = new Map<string, Counts>();
      const recordsByInstructor = new Map<string, Counts>();

      recordList.forEach(r => {
        const courseId = sessionCourseMap.get(r.session_id);
        const instructorId = sessionInstructorMap.get(r.session_id);

        const updateCounts = (map: Map<string, Counts>, key: string) => {
          const e = map.get(key) || { present: 0, absent: 0, late: 0, total: 0 };
          e.total++;
          if (r.attendance_status === 'present') e.present++;
          else if (r.attendance_status === 'absent') e.absent++;
          else if (r.attendance_status === 'late') e.late++;
          map.set(key, e);
        };

        if (courseId) updateCounts(recordsByCourse, courseId);
        if (instructorId) updateCounts(recordsByInstructor, instructorId);
      });

      const courseStats: CourseAttendanceStat[] = courseList.map(c => {
        const s = recordsByCourse.get(c.id) || { present: 0, absent: 0, late: 0, total: 0 };
        const rate = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
        return {
          courseId: c.id,
          courseName: c.name,
          courseCode: c.code,
          totalSessions: sessionsByCourse.get(c.id) || 0,
          totalRecords: s.total,
          presentCount: s.present,
          absentCount: s.absent,
          lateCount: s.late,
          attendanceRate: rate,
        };
      });

      // Instructor stats – need names from profiles
      const instructorIds = [...new Set(sessionList.map(s => s.instructor_id).filter(Boolean))];
      let instructorStats: InstructorAttendanceStat[] = [];

      if (instructorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', instructorIds);

        const nameMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

        instructorStats = instructorIds.map(id => {
          const s = recordsByInstructor.get(id) || { present: 0, absent: 0, late: 0, total: 0 };
          const rate = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
          return {
            instructorId: id,
            instructorName: nameMap.get(id) || id,
            totalSessions: sessionsByInstructor.get(id) || 0,
            totalRecords: s.total,
            presentCount: s.present,
            attendanceRate: rate,
          };
        });
      }

      return {
        totalStudents: studentCount || 0,
        totalInstructors: instructorCount || 0,
        totalCourses: courseCount || 0,
        totalSessions: sessionCount || 0,
        activeSessions: activeSessionCount || 0,
        overallAttendanceRate,
        totalPresent,
        totalAbsent,
        totalLate,
        courseStats,
        instructorStats,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Instructor Analytics ────────────────────────────────────────────────────

export interface InstructorAnalytics {
  totalCourses: number;
  totalSessions: number;
  activeSessions: number;
  totalStudents: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  overallAttendanceRate: number;
  courseStats: CourseAttendanceStat[];
}

export function useInstructorAnalytics(instructorId: string | undefined) {
  return useQuery<InstructorAnalytics>({
    queryKey: ['instructor-analytics', instructorId],
    enabled: !!instructorId,
    queryFn: async () => {
      const { data: sessions } = await supabase
        .from('lecture_sessions')
        .select('id, course_id, status')
        .eq('instructor_id', instructorId!)
        .limit(500);

      const sessionList = sessions || [];
      const sessionIds = sessionList.map(s => s.id);
      const courseIds = [...new Set(sessionList.map(s => s.course_id))];
      const activeSessions = sessionList.filter(s => s.status === 'active').length;

      if (sessionIds.length === 0) {
        return {
          totalCourses: 0,
          totalSessions: 0,
          activeSessions: 0,
          totalStudents: 0,
          totalPresent: 0,
          totalAbsent: 0,
          totalLate: 0,
          overallAttendanceRate: 0,
          courseStats: [],
        };
      }

      const [{ data: records }, { data: courses }, { data: enrollments }] = await Promise.all([
        supabase.from('attendance_records').select('attendance_status, session_id').in('session_id', sessionIds).limit(1000),
        supabase.from('courses').select('id, name, code').in('id', courseIds),
        supabase.from('enrollments').select('student_id').in('course_id', courseIds),
      ]);

      const recordList = records || [];
      const courseList = courses || [];
      const totalStudents = new Set((enrollments || []).map(e => e.student_id)).size;

      const totalPresent = recordList.filter(r => r.attendance_status === 'present').length;
      const totalLate = recordList.filter(r => r.attendance_status === 'late').length;
      const totalAbsent = recordList.filter(r => r.attendance_status === 'absent').length;
      const totalRecords = recordList.length;
      const overallAttendanceRate = totalRecords > 0
        ? Math.round(((totalPresent + totalLate) / totalRecords) * 100)
        : 0;

      const sessionCourseMap = new Map(sessionList.map(s => [s.id, s.course_id]));
      const sessionsByCourse = new Map<string, number>();
      sessionList.forEach(s => sessionsByCourse.set(s.course_id, (sessionsByCourse.get(s.course_id) || 0) + 1));

      type Counts = { present: number; absent: number; late: number; total: number };
      const recordsByCourse = new Map<string, Counts>();
      recordList.forEach(r => {
        const cid = sessionCourseMap.get(r.session_id);
        if (!cid) return;
        const e = recordsByCourse.get(cid) || { present: 0, absent: 0, late: 0, total: 0 };
        e.total++;
        if (r.attendance_status === 'present') e.present++;
        else if (r.attendance_status === 'absent') e.absent++;
        else if (r.attendance_status === 'late') e.late++;
        recordsByCourse.set(cid, e);
      });

      const courseStats: CourseAttendanceStat[] = courseList.map(c => {
        const s = recordsByCourse.get(c.id) || { present: 0, absent: 0, late: 0, total: 0 };
        const rate = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
        return {
          courseId: c.id,
          courseName: c.name,
          courseCode: c.code,
          totalSessions: sessionsByCourse.get(c.id) || 0,
          totalRecords: s.total,
          presentCount: s.present,
          absentCount: s.absent,
          lateCount: s.late,
          attendanceRate: rate,
        };
      });

      return {
        totalCourses: courseIds.length,
        totalSessions: sessionList.length,
        activeSessions,
        totalStudents,
        totalPresent,
        totalAbsent,
        totalLate,
        overallAttendanceRate,
        courseStats,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Student Analytics ───────────────────────────────────────────────────────

export interface StudentCourseAttendance {
  courseId: string;
  courseName: string;
  courseCode: string;
  totalSessions: number;
  attended: number;
  absent: number;
  late: number;
  attendanceRate: number;
}

export interface StudentAnalytics {
  totalEnrolled: number;
  totalSessions: number;
  totalAttended: number;
  totalAbsent: number;
  overallRate: number;
  courseAttendance: StudentCourseAttendance[];
}

export function useStudentAnalytics(studentId: string | undefined) {
  return useQuery<StudentAnalytics>({
    queryKey: ['student-analytics', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', studentId!);

      const courseIds = (enrollments || []).map(e => e.course_id);

      if (courseIds.length === 0) {
        return { totalEnrolled: 0, totalSessions: 0, totalAttended: 0, totalAbsent: 0, overallRate: 0, courseAttendance: [] };
      }

      const [{ data: sessions }, { data: myRecords }, { data: courses }] = await Promise.all([
        supabase.from('lecture_sessions').select('id, course_id').in('course_id', courseIds).limit(500),
        supabase.from('attendance_records').select('attendance_status, session_id').eq('student_id', studentId!).limit(500),
        supabase.from('courses').select('id, name, code').in('id', courseIds),
      ]);

      const sessionList = sessions || [];
      const recordList = myRecords || [];
      const courseList = courses || [];

      const sessionCourseMap = new Map(sessionList.map(s => [s.id, s.course_id]));
      const sessionsByCourse = new Map<string, number>();
      sessionList.forEach(s => sessionsByCourse.set(s.course_id, (sessionsByCourse.get(s.course_id) || 0) + 1));

      type Counts = { attended: number; absent: number; late: number };
      const recordsByCourse = new Map<string, Counts>();
      recordList.forEach(r => {
        const cid = sessionCourseMap.get(r.session_id);
        if (!cid) return;
        const e = recordsByCourse.get(cid) || { attended: 0, absent: 0, late: 0 };
        if (r.attendance_status === 'present') e.attended++;
        else if (r.attendance_status === 'late') e.late++;
        else if (r.attendance_status === 'absent') e.absent++;
        recordsByCourse.set(cid, e);
      });

      const courseAttendance: StudentCourseAttendance[] = courseList.map(c => {
        const totalSessions = sessionsByCourse.get(c.id) || 0;
        const s = recordsByCourse.get(c.id) || { attended: 0, absent: 0, late: 0 };
        const attended = s.attended + s.late;
        const rate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;
        return {
          courseId: c.id,
          courseName: c.name,
          courseCode: c.code,
          totalSessions,
          attended: s.attended,
          absent: s.absent,
          late: s.late,
          attendanceRate: rate,
        };
      });

      const totalAttended = recordList.filter(r => r.attendance_status === 'present' || r.attendance_status === 'late').length;
      const totalAbsent = recordList.filter(r => r.attendance_status === 'absent').length;
      const overallRate = sessionList.length > 0
        ? Math.round((totalAttended / sessionList.length) * 100)
        : 0;

      return {
        totalEnrolled: courseIds.length,
        totalSessions: sessionList.length,
        totalAttended,
        totalAbsent,
        overallRate,
        courseAttendance,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Course Attendance Trend ─────────────────────────────────────────────────

export function useCourseAttendanceTrend(courseId: string | undefined) {
  return useQuery<TrendDataPoint[]>({
    queryKey: ['course-attendance-trend', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data: sessions } = await supabase
        .from('lecture_sessions')
        .select('id, session_date')
        .eq('course_id', courseId!)
        .eq('status', 'closed')
        .order('session_date', { ascending: true })
        .limit(30);

      const sessionList = sessions || [];
      if (sessionList.length === 0) return [];

      const sessionIds = sessionList.map(s => s.id);
      const { data: records } = await supabase
        .from('attendance_records')
        .select('attendance_status, session_id')
        .in('session_id', sessionIds);

      const bySession = new Map<string, { present: number; total: number }>();
      (records || []).forEach(r => {
        const e = bySession.get(r.session_id) || { present: 0, total: 0 };
        e.total++;
        if (r.attendance_status === 'present' || r.attendance_status === 'late') e.present++;
        bySession.set(r.session_id, e);
      });

      return sessionList.map(s => {
        const e = bySession.get(s.id) || { present: 0, total: 0 };
        return {
          date: s.session_date,
          attendanceRate: e.total > 0 ? Math.round((e.present / e.total) * 100) : 0,
          present: e.present,
          total: e.total,
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });
}
