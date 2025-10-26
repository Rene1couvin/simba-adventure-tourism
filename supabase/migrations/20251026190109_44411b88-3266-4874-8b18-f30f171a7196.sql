-- Create audit log table for tracking admin actions on sensitive data
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  accessed_fields TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
  ON public.admin_audit_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user_id ON public.admin_audit_log(admin_user_id);

-- Remove the policy that allows users to view their own roles (prevents enumeration)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Add policy to prevent direct role enumeration via table queries
CREATE POLICY "Roles only accessible via secure functions"
  ON public.user_roles
  FOR SELECT
  USING (false);

-- Create a secure function to check if current user has a specific role
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = _role
  )
$$;

-- Function to log admin access (called from application code)
CREATE OR REPLACE FUNCTION public.log_admin_access(
  _action TEXT,
  _table_name TEXT,
  _record_id UUID DEFAULT NULL,
  _accessed_fields TEXT[] DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if user is an admin
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    INSERT INTO public.admin_audit_log (
      admin_user_id,
      action,
      table_name,
      record_id,
      accessed_fields
    ) VALUES (
      auth.uid(),
      _action,
      _table_name,
      _record_id,
      _accessed_fields
    );
  END IF;
END;
$$;

-- Add constraint to prevent multiple admin role assignments per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_role ON public.user_roles(user_id, role);