-- 1. Add attendance_source column with default 'qr'
ALTER TABLE public.attendance_records
  ADD COLUMN attendance_source text NOT NULL DEFAULT 'qr';

-- 2. Unique constraint to prevent duplicate attendance per session per student
CREATE UNIQUE INDEX unique_student_session_attendance
  ON public.attendance_records (session_id, student_id);

-- 3. Fix alerts UPDATE RLS: only allow updating alerts that belong to the user by user_id
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;

CREATE POLICY "Users can update own alerts"
  ON public.alerts FOR UPDATE TO public
  USING (auth.uid() = user_id AND user_id IS NOT NULL)
  WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);