
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'instructor', 'student');
CREATE TYPE public.session_status AS ENUM ('scheduled', 'active', 'closed');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'rejected');
CREATE TYPE public.gps_status AS ENUM ('valid', 'invalid', 'not_checked');
CREATE TYPE public.alert_type AS ENUM ('mismatch', 'absence_warning', 'suspicious', 'system');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  student_code TEXT,
  instructor_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1 $$;

-- Profiles RLS
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can view profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'instructor'));

-- User roles RLS
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Classrooms
CREATE TABLE public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  building TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  allowed_radius_meters INTEGER NOT NULL DEFAULT 100,
  capacity INTEGER NOT NULL DEFAULT 30
);
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view classrooms" ON public.classrooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert classrooms" ON public.classrooms FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update classrooms" ON public.classrooms FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete classrooms" ON public.classrooms FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  department TEXT,
  instructor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view courses" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert courses" ON public.courses FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update courses" ON public.courses FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete courses" ON public.courses FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Enrollments
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id)
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can view course enrollments" ON public.enrollments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE courses.id = enrollments.course_id AND courses.instructor_id = auth.uid())
);

-- Schedules
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view schedules" ON public.schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert schedules" ON public.schedules FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update schedules" ON public.schedules FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete schedules" ON public.schedules FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Lecture Sessions
CREATE TABLE public.lecture_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id),
  instructor_id UUID NOT NULL REFERENCES auth.users(id),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id),
  schedule_id UUID REFERENCES public.schedules(id),
  session_date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  qr_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  qr_expires_at TIMESTAMPTZ,
  status session_status NOT NULL DEFAULT 'scheduled'
);
ALTER TABLE public.lecture_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Instructors can manage own sessions" ON public.lecture_sessions FOR ALL USING (auth.uid() = instructor_id);
CREATE POLICY "Students can view enrolled sessions" ON public.lecture_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.enrollments WHERE enrollments.student_id = auth.uid() AND enrollments.course_id = lecture_sessions.course_id)
);
CREATE POLICY "Admins can manage all sessions" ON public.lecture_sessions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Attendance Records
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.lecture_sessions(id),
  student_id UUID NOT NULL REFERENCES auth.users(id),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  gps_status gps_status NOT NULL DEFAULT 'not_checked',
  attendance_status attendance_status NOT NULL DEFAULT 'present',
  duplicate_blocked BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  UNIQUE(session_id, student_id)
);
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own attendance" ON public.attendance_records FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can insert own attendance" ON public.attendance_records FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Instructors can view session attendance" ON public.attendance_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.lecture_sessions WHERE lecture_sessions.id = attendance_records.session_id AND lecture_sessions.instructor_id = auth.uid())
);
CREATE POLICY "Admins can manage all attendance" ON public.attendance_records FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Headcount Verifications
CREATE TABLE public.headcount_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.lecture_sessions(id),
  expected_count INTEGER NOT NULL DEFAULT 0,
  detected_count INTEGER NOT NULL DEFAULT 0,
  mismatch_flag BOOLEAN NOT NULL DEFAULT false,
  reviewed_by_instructor BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.headcount_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Instructors can manage own headcounts" ON public.headcount_verifications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.lecture_sessions WHERE lecture_sessions.id = headcount_verifications.session_id AND lecture_sessions.instructor_id = auth.uid())
);
CREATE POLICY "Admins can manage all headcounts" ON public.headcount_verifications FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  role_target app_role,
  type alert_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_status BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id OR role_target = public.get_user_role(auth.uid()));
CREATE POLICY "Users can update own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all alerts" ON public.alerts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Absence Rules
CREATE TABLE public.absence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id),
  max_absence_count INTEGER NOT NULL DEFAULT 5,
  warning_threshold_percent INTEGER NOT NULL DEFAULT 70
);
ALTER TABLE public.absence_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view absence rules" ON public.absence_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage absence rules" ON public.absence_rules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
