
-- 1. Drop overly broad permissive "Deny anonymous" policies
DROP POLICY IF EXISTS "Deny anonymous access to bookings" ON public.bookings;
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous access to hotel bookings" ON public.hotel_bookings;

-- 2. Add restrictive authentication policies instead
CREATE POLICY "Must be authenticated" ON public.bookings
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Must be authenticated" ON public.profiles
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Must be authenticated" ON public.hotel_bookings
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL);

-- 3. Add CHECK constraints for booking validation
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_people_check CHECK (number_of_people BETWEEN 1 AND 50),
  ADD CONSTRAINT bookings_price_check CHECK (total_price > 0),
  ADD CONSTRAINT bookings_special_requests_length CHECK (special_requests IS NULL OR length(special_requests) <= 500);

ALTER TABLE public.hotel_bookings
  ADD CONSTRAINT hotel_bookings_guests_check CHECK (number_of_guests > 0),
  ADD CONSTRAINT hotel_bookings_rooms_check CHECK (number_of_rooms BETWEEN 1 AND 20),
  ADD CONSTRAINT hotel_bookings_price_check CHECK (total_price > 0),
  ADD CONSTRAINT hotel_bookings_dates_check CHECK (check_out_date > check_in_date),
  ADD CONSTRAINT hotel_bookings_special_requests_length CHECK (special_requests IS NULL OR length(special_requests) <= 1000);

-- 4. Create server-side booking functions that verify prices
CREATE OR REPLACE FUNCTION public.book_tour(
  _tour_id uuid,
  _booking_date timestamptz,
  _number_of_people integer,
  _special_requests text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _tour record;
  _total_price numeric;
  _booking_id uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id, price, max_group_size, available INTO _tour
  FROM public.tours WHERE id = _tour_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Tour not found'; END IF;
  IF NOT _tour.available THEN RAISE EXCEPTION 'Tour not available'; END IF;
  IF _number_of_people < 1 OR _number_of_people > _tour.max_group_size THEN
    RAISE EXCEPTION 'Invalid number of people';
  END IF;
  IF _booking_date <= now() THEN RAISE EXCEPTION 'Booking date must be in the future'; END IF;

  _total_price := _tour.price * _number_of_people;

  INSERT INTO public.bookings (user_id, tour_id, booking_date, number_of_people, total_price, special_requests, status)
  VALUES (_user_id, _tour_id, _booking_date, _number_of_people, _total_price, left(_special_requests, 500), 'pending')
  RETURNING id INTO _booking_id;

  RETURN _booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.book_hotel(
  _hotel_id uuid,
  _room_type_id uuid,
  _check_in_date date,
  _check_out_date date,
  _number_of_guests integer,
  _number_of_rooms integer,
  _special_requests text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _room record;
  _hotel record;
  _nights integer;
  _total_price numeric;
  _booking_id uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT id, available INTO _hotel FROM public.hotels WHERE id = _hotel_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hotel not found'; END IF;
  IF NOT _hotel.available THEN RAISE EXCEPTION 'Hotel not available'; END IF;

  SELECT id, price_per_night, max_guests, available INTO _room
  FROM public.room_types WHERE id = _room_type_id AND hotel_id = _hotel_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Room type not found'; END IF;
  IF NOT _room.available THEN RAISE EXCEPTION 'Room type not available'; END IF;

  IF _check_out_date <= _check_in_date THEN RAISE EXCEPTION 'Check-out must be after check-in'; END IF;
  IF _check_in_date < CURRENT_DATE THEN RAISE EXCEPTION 'Check-in must be today or later'; END IF;
  IF _number_of_guests < 1 OR _number_of_guests > _room.max_guests * _number_of_rooms THEN
    RAISE EXCEPTION 'Invalid number of guests';
  END IF;
  IF _number_of_rooms < 1 OR _number_of_rooms > 20 THEN RAISE EXCEPTION 'Invalid number of rooms'; END IF;

  _nights := _check_out_date - _check_in_date;
  _total_price := _room.price_per_night * _nights * _number_of_rooms;

  INSERT INTO public.hotel_bookings (user_id, hotel_id, room_type_id, check_in_date, check_out_date, number_of_guests, number_of_rooms, total_price, special_requests, status)
  VALUES (_user_id, _hotel_id, _room_type_id, _check_in_date, _check_out_date, _number_of_guests, _number_of_rooms, _total_price, left(_special_requests, 1000), 'pending')
  RETURNING id INTO _booking_id;

  RETURN _booking_id;
END;
$$;
