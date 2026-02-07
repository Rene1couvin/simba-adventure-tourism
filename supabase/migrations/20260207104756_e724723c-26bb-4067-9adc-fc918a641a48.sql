
-- Hotels table
CREATE TABLE public.hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT,
  star_rating INTEGER DEFAULT 3 CHECK (star_rating >= 1 AND star_rating <= 5),
  image_url TEXT,
  amenities TEXT[] DEFAULT '{}',
  check_in_time TEXT DEFAULT '14:00',
  check_out_time TEXT DEFAULT '10:00',
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Room types table
CREATE TABLE public.room_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_per_night NUMERIC NOT NULL,
  max_guests INTEGER NOT NULL DEFAULT 2,
  bed_type TEXT DEFAULT 'Double',
  image_url TEXT,
  amenities TEXT[] DEFAULT '{}',
  total_rooms INTEGER NOT NULL DEFAULT 1,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Hotel bookings table
CREATE TABLE public.hotel_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id),
  room_type_id UUID NOT NULL REFERENCES public.room_types(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  number_of_guests INTEGER NOT NULL DEFAULT 1,
  number_of_rooms INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL,
  special_requests TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_bookings ENABLE ROW LEVEL SECURITY;

-- Hotels policies (public read, admin manage)
CREATE POLICY "Anyone can view available hotels" ON public.hotels
  FOR SELECT USING ((available = true) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can manage hotels" ON public.hotels
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Room types policies
CREATE POLICY "Anyone can view available room types" ON public.room_types
  FOR SELECT USING ((available = true) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can manage room types" ON public.room_types
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Hotel bookings policies
CREATE POLICY "Deny anonymous access to hotel bookings" ON public.hotel_bookings
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their own hotel bookings" ON public.hotel_bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own hotel bookings" ON public.hotel_bookings
  FOR SELECT USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own hotel bookings" ON public.hotel_bookings
  FOR UPDATE USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete hotel bookings" ON public.hotel_bookings
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON public.room_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hotel_bookings_updated_at BEFORE UPDATE ON public.hotel_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for hotel images
INSERT INTO storage.buckets (id, name, public) VALUES ('hotel-images', 'hotel-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view hotel images" ON storage.objects
  FOR SELECT USING (bucket_id = 'hotel-images');

CREATE POLICY "Admins can upload hotel images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'hotel-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update hotel images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'hotel-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete hotel images" ON storage.objects
  FOR DELETE USING (bucket_id = 'hotel-images' AND has_role(auth.uid(), 'admin'::app_role));
