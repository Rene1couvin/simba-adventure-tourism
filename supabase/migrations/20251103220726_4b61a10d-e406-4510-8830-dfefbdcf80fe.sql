-- Add missing foreign keys so PostgREST can resolve relationships between bookings -> profiles and bookings -> tours
-- Use NOT VALID to avoid failing if existing rows are inconsistent; attempt validation afterwards

-- 1) bookings.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_user_id_fkey'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;

-- 2) bookings.tour_id -> tours.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_tour_id_fkey'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_tour_id_fkey
      FOREIGN KEY (tour_id)
      REFERENCES public.tours(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;

-- Try to validate constraints; if validation fails due to legacy data, keep NOT VALID and proceed
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.bookings VALIDATE CONSTRAINT bookings_user_id_fkey;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping validation of bookings_user_id_fkey due to existing data.';
  END;
  BEGIN
    ALTER TABLE public.bookings VALIDATE CONSTRAINT bookings_tour_id_fkey;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping validation of bookings_tour_id_fkey due to existing data.';
  END;
END
$$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tour_id ON public.bookings(tour_id);