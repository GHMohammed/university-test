ALTER TABLE public.lecture_sessions DROP COLUMN IF EXISTS gps_enabled;
ALTER TABLE public.attendance_records DROP COLUMN IF EXISTS gps_status;
ALTER TABLE public.attendance_records DROP COLUMN IF EXISTS latitude;
ALTER TABLE public.attendance_records DROP COLUMN IF EXISTS longitude;
DROP TYPE IF EXISTS public.gps_status;