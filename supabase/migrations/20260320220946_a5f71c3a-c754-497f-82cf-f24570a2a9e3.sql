
-- Drop the old permissive INSERT policy for instructors
DROP POLICY IF EXISTS "Instructors can insert session attendance" ON public.attendance_records;

-- Recreate with additional check: session must be active
CREATE POLICY "Instructors can insert session attendance"
ON public.attendance_records
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM lecture_sessions
    WHERE lecture_sessions.id = attendance_records.session_id
      AND lecture_sessions.instructor_id = auth.uid()
      AND lecture_sessions.status = 'active'
  )
);
