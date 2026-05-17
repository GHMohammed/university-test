ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_student_id_course_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS enrollments_student_course_term_unique_idx
  ON public.enrollments (student_id, course_id, term_id)
  WHERE term_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS enrollments_student_course_null_term_unique_idx
  ON public.enrollments (student_id, course_id)
  WHERE term_id IS NULL;