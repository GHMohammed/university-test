
-- Table for configurable time slots
CREATE TABLE public.time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage time slots" ON public.time_slots FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view time slots" ON public.time_slots FOR SELECT TO authenticated USING (true);

-- Table for active days configuration
CREATE TABLE public.active_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL UNIQUE CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.active_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage active days" ON public.active_days FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view active days" ON public.active_days FOR SELECT TO authenticated USING (true);

-- Seed all 7 days (Sat=6, Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5)
INSERT INTO public.active_days (day_of_week, is_active, sort_order) VALUES
  (6, true, 0),  -- Saturday
  (0, true, 1),  -- Sunday
  (1, true, 2),  -- Monday
  (2, true, 3),  -- Tuesday
  (3, true, 4),  -- Wednesday
  (4, true, 5),  -- Thursday
  (5, false, 6); -- Friday (off by default)

-- Seed example time slots
INSERT INTO public.time_slots (label, start_time, end_time, sort_order) VALUES
  ('Slot 1', '08:00', '08:50', 0),
  ('Slot 2', '09:00', '09:50', 1),
  ('Slot 3', '10:00', '10:50', 2),
  ('Slot 4', '11:00', '11:50', 3),
  ('Slot 5', '12:00', '12:50', 4),
  ('Slot 6', '13:00', '13:50', 5),
  ('Slot 7', '14:00', '14:50', 6);
