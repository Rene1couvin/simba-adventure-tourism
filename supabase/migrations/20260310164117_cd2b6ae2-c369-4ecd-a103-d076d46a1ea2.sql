
-- Update has_role to treat super_admin as having admin privileges
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id 
      AND (role = _role OR (role::text = 'super_admin' AND _role::text = 'admin'))
  );
END;
$$;

-- Update current_user_has_role similarly
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() 
      AND (role = _role OR (role::text = 'super_admin' AND _role::text = 'admin'))
  );
END;
$$;
