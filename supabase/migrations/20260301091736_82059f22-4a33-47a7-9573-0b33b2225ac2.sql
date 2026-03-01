
-- =============================================
-- 1. ENABLE FORCE ROW LEVEL SECURITY on all 3 tables
-- =============================================
ALTER TABLE public.newsletter_subscribers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes FORCE ROW LEVEL SECURITY;

-- =============================================
-- 2. NEWSLETTER_SUBSCRIBERS: Fix overly permissive INSERT
-- =============================================
-- Remove the WITH CHECK (true) INSERT policy
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;

-- Replace with constrained INSERT (still allows public signup but validates data)
CREATE POLICY "Public can subscribe with valid email"
ON public.newsletter_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL AND
  email <> '' AND
  is_active = true
);

-- Verify: only admin SELECT exists (already in place, no changes needed)
-- "Admins can view all subscribers" - SELECT - has_role check ✓
-- "Admins can manage subscribers" - ALL - has_role check ✓

-- =============================================
-- 3. OTP_CODES: Add max attempts trigger + cleanup function
-- =============================================
-- Trigger to enforce max 5 attempts
CREATE OR REPLACE FUNCTION public.validate_otp_attempts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.attempts > 5 THEN
    RAISE EXCEPTION 'Maximum OTP attempts exceeded';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_otp_max_attempts
BEFORE UPDATE ON public.otp_codes
FOR EACH ROW
EXECUTE FUNCTION public.validate_otp_attempts();

-- Function to clean up expired OTPs (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.otp_codes WHERE expires_at < now();
END;
$$;
