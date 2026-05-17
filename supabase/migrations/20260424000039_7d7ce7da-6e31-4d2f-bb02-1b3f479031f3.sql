-- Academic Terms table
CREATE TABLE public.academic_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  academic_year text NOT NULL,
  term_type text NOT NULL DEFAULT 'custom' CHECK (term_type IN ('first', 'second', 'summer', 'custom')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

-- Enable RLS
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated can view academic terms"
  ON public.academic_terms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert academic terms"
  ON public.academic_terms FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update academic terms"
  ON public.academic_terms FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete academic terms"
  ON public.academic_terms FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger: ensure only one active term
CREATE OR REPLACE FUNCTION public.ensure_single_active_term()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.academic_terms
      SET is_active = false
      WHERE id <> NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_active_term
  BEFORE INSERT OR UPDATE ON public.academic_terms
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_active_term();

-- Add term_id to linked tables
ALTER TABLE public.schedules ADD COLUMN term_id uuid REFERENCES public.academic_terms(id) ON DELETE SET NULL;
ALTER TABLE public.enrollments ADD COLUMN term_id uuid REFERENCES public.academic_terms(id) ON DELETE SET NULL;
ALTER TABLE public.lecture_sessions ADD COLUMN term_id uuid REFERENCES public.academic_terms(id) ON DELETE SET NULL;

-- Indexes for filtering
CREATE INDEX idx_schedules_term_id ON public.schedules(term_id);
CREATE INDEX idx_enrollments_term_id ON public.enrollments(term_id);
CREATE INDEX idx_lecture_sessions_term_id ON public.lecture_sessions(term_id);