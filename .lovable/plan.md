

## Plan: Remove OTP Verification & Add Role-Based Redirect

### What changes

1. **Update `src/pages/Auth.tsx`** — Remove the OTP redirect logic. After successful login, check the user's role via `current_user_has_role` RPC and redirect accordingly:
   - Admin → `/admin`
   - Regular user → `/`
   - Remove `sessionStorage` OTP references

2. **Remove `src/pages/VerifyOTP.tsx`** — Delete this file entirely.

3. **Update `src/App.tsx`** — Remove the VerifyOTP import and `/verify-otp` route.

4. **Delete `supabase/functions/send-otp/index.ts`** — Remove the edge function (and delete the deployed function).

5. **No database changes needed** — The `otp_codes` table can remain (harmless) or be dropped. The `cleanup_expired_otps` function and `validate_otp_attempts` trigger are also now unused.

### Technical details

**Auth.tsx login redirect logic:**
```typescript
const handleSignIn = async (e) => {
  // ... signInWithPassword
  // On success, check role:
  const { data: isAdmin } = await supabase.rpc('current_user_has_role', { _role: 'admin' });
  if (isAdmin) navigate('/admin');
  else navigate('/');
};
```

The `onAuthStateChange` listener will be simplified to just check for an existing session and redirect based on role (no OTP gate).

**Signup flow** stays the same — user signs up, gets email verification (standard Supabase email confirm), then logs in normally.

**Files modified:** `Auth.tsx`, `App.tsx`
**Files deleted:** `VerifyOTP.tsx`, `supabase/functions/send-otp/index.ts`
**Edge function deleted:** `send-otp`

### Optional cleanup (can do separately)
- Drop the `otp_codes` table
- Remove `cleanup_expired_otps` and `validate_otp_attempts` functions

