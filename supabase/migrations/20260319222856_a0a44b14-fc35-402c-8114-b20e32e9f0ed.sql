-- Allow instructors to INSERT attendance records for students in their sessions
CREATE POLICY "Instructors can insert session attendance"
  ON public.attendance_records FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lecture_sessions
      WHERE lecture_sessions.id = attendance_records.session_id
        AND lecture_sessions.instructor_id = auth.uid()
    )
  );