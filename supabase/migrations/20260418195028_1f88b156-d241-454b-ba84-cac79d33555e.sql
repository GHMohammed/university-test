CREATE POLICY "Instructors can delete session attendance"
ON public.attendance_records
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.lecture_sessions
    WHERE lecture_sessions.id = attendance_records.session_id
      AND lecture_sessions.instructor_id = auth.uid()
  )
);