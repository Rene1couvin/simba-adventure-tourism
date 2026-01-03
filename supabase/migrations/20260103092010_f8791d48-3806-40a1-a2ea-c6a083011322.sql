-- Add explicit policies to deny anonymous access to sensitive tables

-- For bookings table: Ensure anonymous users cannot access
CREATE POLICY "Deny anonymous access to bookings" 
ON public.bookings 
FOR ALL
USING (auth.uid() IS NOT NULL);

-- For profiles table: Ensure anonymous users cannot access
CREATE POLICY "Deny anonymous access to profiles" 
ON public.profiles 
FOR ALL
USING (auth.uid() IS NOT NULL);