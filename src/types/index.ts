export type AppRole = 'admin' | 'instructor' | 'student';
export type Language = 'ar' | 'en';
export type SessionStatus = 'scheduled' | 'active' | 'closed';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'rejected';
export type AlertType = 'mismatch' | 'absence_warning' | 'suspicious' | 'system';
export type TermType = 'first' | 'second' | 'summer' | 'custom';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  phone: string | null;
  department: string | null;
  student_code: string | null;
  instructor_code: string | null;
  status: string;
  created_at: string;
}

export interface Classroom {
  id: string;
  name: string;
  building: string;
  latitude: number;
  longitude: number;
  allowed_radius_meters: number;
  capacity: number;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  description: string | null;
  department: string | null;
  instructor_id: string | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  term_id?: string | null;
}

export interface Schedule {
  id: string;
  course_id: string;
  classroom_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  term_id?: string | null;
}

export interface LectureSession {
  id: string;
  course_id: string;
  instructor_id: string;
  classroom_id: string;
  schedule_id: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  qr_token: string;
  qr_expires_at: string;
  status: SessionStatus;
  term_id?: string | null;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  scanned_at: string;
  attendance_status: AttendanceStatus;
  duplicate_blocked: boolean;
  notes: string | null;
}

export interface HeadcountVerification {
  id: string;
  session_id: string;
  expected_count: number;
  detected_count: number;
  mismatch_flag: boolean;
  reviewed_by_instructor: boolean;
  created_at: string;
}

export interface Alert {
  id: string;
  user_id: string | null;
  role_target: AppRole | null;
  type: AlertType;
  title: string;
  message: string;
  read_status: boolean;
  created_at: string;
}

export interface AbsenceRule {
  id: string;
  course_id: string | null;
  max_absence_count: number;
  warning_threshold_percent: number;
}

export interface AcademicTerm {
  id: string;
  name: string;
  academic_year: string;
  term_type: TermType;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}
