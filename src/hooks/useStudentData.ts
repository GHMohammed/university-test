import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useTermContext } from '@/lib/termContext';

export interface StudentEnrolledCourse {
  courseId: string;
  courseName: string;
  courseCode: string;
  department: string | null;
  instructorId: string | null;
  instructorName: string | null;
  classroomName: string | null;
  scheduleDays: number[];
  scheduleTimeLabel: string | null;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  rejectedCount: number;
  attendanceRate: number;
}

export function useStudentEnrolledCourses() {
  const { user } = useAuth();
  const { selectedTermId, hasTerms } = useTermContext();

  return useQuery<StudentEnrolledCourse[]>({
    queryKey: ['student-enrolled-courses', user?.id, selectedTermId ?? 'all'],
    enabled: !!user,
    queryFn: async () => {
      let enrollQuery = supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user!.id);
      if (hasTerms && selectedTermId) enrollQuery = enrollQuery.eq('term_id', selectedTermId);
      const { data: enrollments } = await enrollQuery;

      const courseIds = (enrollments || []).map(e => e.course_id);
      if (courseIds.length === 0) return [];

      let sessionsQuery = supabase.from('lecture_sessions').select('id, course_id').in('course_id', courseIds);
      if (hasTerms && selectedTermId) sessionsQuery = sessionsQuery.eq('term_id', selectedTermId);

      let schedulesQuery = supabase.from('schedules').select('course_id, classroom_id, day_of_week, start_time, end_time').in('course_id', courseIds);
      if (hasTerms && selectedTermId) schedulesQuery = schedulesQuery.eq('term_id', selectedTermId);

      const [
        { data: courses },
        { data: sessions },
        { data: records },
        { data: schedules },
      ] = await Promise.all([
        supabase.from('courses').select('id, name, code, department, instructor_id').in('id', courseIds),
        sessionsQuery,
        supabase.from('attendance_records').select('attendance_status, session_id').eq('student_id', user!.id),
        schedulesQuery,
      ]);

      const courseList = courses || [];
      const sessionList = sessions || [];
      const recordList = records || [];
      const scheduleList = schedules || [];

      // Instructor names
      const instrIds = [...new Set(courseList.map(c => c.instructor_id).filter(Boolean))] as string[];
      let instrMap: Record<string, string> = {};
      if (instrIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', instrIds);
        instrMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
      }

      // Classroom names
      const classroomIds = [...new Set(scheduleList.map(s => s.classroom_id))];
      let classroomMap: Record<string, string> = {};
      if (classroomIds.length > 0) {
        const { data: classrooms } = await supabase.from('classrooms').select('id, name').in('id', classroomIds);
        classroomMap = Object.fromEntries((classrooms || []).map(c => [c.id, c.name]));
      }

      // Time slots for labels
      const { data: timeSlots } = await supabase.from('time_slots').select('start_time, end_time, label').order('sort_order');
      const slotList = timeSlots || [];

      // Session -> course map
      const sessionCourseMap = new Map(sessionList.map(s => [s.id, s.course_id]));
      const sessionsByCourse = new Map<string, number>();
      sessionList.forEach(s => sessionsByCourse.set(s.course_id, (sessionsByCourse.get(s.course_id) || 0) + 1));

      // Records by course
      type Counts = { present: number; absent: number; late: number; rejected: number };
      const recordsByCourse = new Map<string, Counts>();
      recordList.forEach(r => {
        const cid = sessionCourseMap.get(r.session_id);
        if (!cid) return;
        const e = recordsByCourse.get(cid) || { present: 0, absent: 0, late: 0, rejected: 0 };
        if (r.attendance_status === 'present') e.present++;
        else if (r.attendance_status === 'absent') e.absent++;
        else if (r.attendance_status === 'late') e.late++;
        else if (r.attendance_status === 'rejected') e.rejected++;
        recordsByCourse.set(cid, e);
      });

      // Schedules by course
      const schedulesByCourse = new Map<string, typeof scheduleList>();
      scheduleList.forEach(s => {
        const arr = schedulesByCourse.get(s.course_id) || [];
        arr.push(s);
        schedulesByCourse.set(s.course_id, arr);
      });

      return courseList.map(c => {
        const counts = recordsByCourse.get(c.id) || { present: 0, absent: 0, late: 0, rejected: 0 };
        const total = sessionsByCourse.get(c.id) || 0;
        const attended = counts.present + counts.late;
        const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

        const courseSchedules = schedulesByCourse.get(c.id) || [];
        const days = [...new Set(courseSchedules.map(s => s.day_of_week))].sort();
        const firstSchedule = courseSchedules[0];
        let timeLabel: string | null = null;
        let firstClassroom: string | null = null;
        if (firstSchedule) {
          firstClassroom = classroomMap[firstSchedule.classroom_id] || null;
          const matchedSlot = slotList.find(sl => sl.start_time === firstSchedule.start_time && sl.end_time === firstSchedule.end_time);
          timeLabel = matchedSlot ? matchedSlot.label : `${firstSchedule.start_time?.slice(0,5)} - ${firstSchedule.end_time?.slice(0,5)}`;
        }

        return {
          courseId: c.id,
          courseName: c.name,
          courseCode: c.code,
          department: c.department,
          instructorId: c.instructor_id,
          instructorName: c.instructor_id ? instrMap[c.instructor_id] || null : null,
          classroomName: firstClassroom,
          scheduleDays: days,
          scheduleTimeLabel: timeLabel,
          totalSessions: total,
          presentCount: counts.present,
          absentCount: counts.absent,
          lateCount: counts.late,
          rejectedCount: counts.rejected,
          attendanceRate: rate,
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface StudentCourseDetail {
  courseId: string;
  courseName: string;
  courseCode: string;
  department: string | null;
  instructorName: string | null;
  classroomName: string | null;
  scheduleInfo: string | null;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  rejectedCount: number;
  attendanceRate: number;
  history: {
    sessionDate: string;
    status: string;
    classroomName: string | null;
    scannedAt: string;
    source: string;
  }[];
}

export function useStudentCourseDetail(courseId: string | undefined) {
  const { user } = useAuth();

  return useQuery<StudentCourseDetail | null>({
    queryKey: ['student-course-detail', user?.id, courseId],
    enabled: !!user && !!courseId,
    queryFn: async () => {
      const { data: course } = await supabase
        .from('courses')
        .select('id, name, code, department, instructor_id')
        .eq('id', courseId!)
        .single();
      if (!course) return null;

      // Verify enrollment
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', user!.id)
        .eq('course_id', courseId!)
        .maybeSingle();
      if (!enrollment) return null;

      const [{ data: sessions }, { data: schedules }] = await Promise.all([
        supabase.from('lecture_sessions').select('id, course_id, session_date, classroom_id').eq('course_id', courseId!).order('session_date', { ascending: false }),
        supabase.from('schedules').select('classroom_id, day_of_week, start_time, end_time').eq('course_id', courseId!),
      ]);

      const sessionList = sessions || [];
      const sessionIds = sessionList.map(s => s.id);

      let recordList: any[] = [];
      if (sessionIds.length > 0) {
        const { data } = await supabase
          .from('attendance_records')
          .select('session_id, attendance_status, scanned_at, attendance_source')
          .eq('student_id', user!.id)
          .in('session_id', sessionIds);
        recordList = data || [];
      }

      // Classroom map
      const allClassroomIds = [...new Set([...sessionList.map(s => s.classroom_id), ...(schedules || []).map(s => s.classroom_id)])];
      let classroomMap: Record<string, string> = {};
      if (allClassroomIds.length > 0) {
        const { data: classrooms } = await supabase.from('classrooms').select('id, name').in('id', allClassroomIds);
        classroomMap = Object.fromEntries((classrooms || []).map(c => [c.id, c.name]));
      }

      // Instructor
      let instructorName: string | null = null;
      if (course.instructor_id) {
        const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', course.instructor_id).single();
        instructorName = prof?.full_name || null;
      }

      // Schedule info
      const scheduleList = schedules || [];
      let scheduleInfo: string | null = null;
      if (scheduleList.length > 0) {
        const { data: timeSlots } = await supabase.from('time_slots').select('start_time, end_time, label');
        const parts = scheduleList.map(s => {
          const slot = (timeSlots || []).find(ts => ts.start_time === s.start_time && ts.end_time === s.end_time);
          const classroom = classroomMap[s.classroom_id] || '';
          return `${classroom}${slot ? ` (${slot.label})` : ''}`;
        });
        scheduleInfo = parts.join(', ');
      }

      // Counts
      const recordMap = new Map(recordList.map(r => [r.session_id, r]));
      let presentCount = 0, absentCount = 0, lateCount = 0, rejectedCount = 0;
      recordList.forEach(r => {
        if (r.attendance_status === 'present') presentCount++;
        else if (r.attendance_status === 'absent') absentCount++;
        else if (r.attendance_status === 'late') lateCount++;
        else if (r.attendance_status === 'rejected') rejectedCount++;
      });

      const attended = presentCount + lateCount;
      const rate = sessionList.length > 0 ? Math.round((attended / sessionList.length) * 100) : 0;

      // History
      const history = sessionList.map(s => {
        const rec = recordMap.get(s.id);
        return {
          sessionDate: s.session_date,
          status: rec?.attendance_status || 'absent',
          classroomName: classroomMap[s.classroom_id] || null,
          scannedAt: rec?.scanned_at || '',
          source: rec?.attendance_source || '-',
        };
      });

      return {
        courseId: course.id,
        courseName: course.name,
        courseCode: course.code,
        department: course.department,
        instructorName,
        classroomName: scheduleList.length > 0 ? classroomMap[scheduleList[0].classroom_id] || null : null,
        scheduleInfo,
        totalSessions: sessionList.length,
        presentCount,
        absentCount,
        lateCount,
        rejectedCount,
        attendanceRate: rate,
        history,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentSchedule() {
  const { user } = useAuth();
  const { selectedTermId, hasTerms } = useTermContext();

  return useQuery({
    queryKey: ['student-schedule', user?.id, selectedTermId ?? 'all'],
    enabled: !!user,
    queryFn: async () => {
      let enrollQuery = supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user!.id);
      if (hasTerms && selectedTermId) enrollQuery = enrollQuery.eq('term_id', selectedTermId);
      const { data: enrollments } = await enrollQuery;

      const courseIds = (enrollments || []).map(e => e.course_id);
      if (courseIds.length === 0) return [];

      let scheduleQuery = supabase
        .from('schedules')
        .select('*')
        .in('course_id', courseIds)
        .order('day_of_week')
        .order('start_time');
      if (hasTerms && selectedTermId) scheduleQuery = scheduleQuery.eq('term_id', selectedTermId);
      const { data: schedules } = await scheduleQuery;

      const scheduleList = schedules || [];
      const cIds = [...new Set(scheduleList.map(s => s.course_id))];
      const clIds = [...new Set(scheduleList.map(s => s.classroom_id))];

      const [{ data: courses }, { data: classrooms }] = await Promise.all([
        cIds.length > 0 ? supabase.from('courses').select('id, name, code, instructor_id').in('id', cIds) : { data: [] },
        clIds.length > 0 ? supabase.from('classrooms').select('id, name, building').in('id', clIds) : { data: [] },
      ]);

      const courseMap = Object.fromEntries((courses || []).map(c => [c.id, c]));
      const classroomMap = Object.fromEntries((classrooms || []).map(c => [c.id, c]));

      // Instructor names
      const instrIds = [...new Set((courses || []).map(c => c.instructor_id).filter(Boolean))] as string[];
      let instrMap: Record<string, string> = {};
      if (instrIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', instrIds);
        instrMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
      }

      return scheduleList.map(s => ({
        ...s,
        course: courseMap[s.course_id] || null,
        classroom: classroomMap[s.classroom_id] || null,
        instructorName: courseMap[s.course_id]?.instructor_id ? instrMap[courseMap[s.course_id].instructor_id!] || null : null,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
