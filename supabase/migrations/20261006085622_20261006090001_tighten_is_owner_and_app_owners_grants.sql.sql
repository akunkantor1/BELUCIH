/*
# Tighten is_owner() EXECUTE grant and app_owners table privileges

## Problem
The previous security migration created the `is_owner()` function with
`SECURITY DEFINER` but the `REVOKE EXECUTE FROM anon` did not fully take
effect — the security posture shows `anon` still has EXECUTE on the function.

Additionally, `app_owners` was created with default grants giving `anon`
full CRUD privileges (SELECT, INSERT, UPDATE, DELETE). While RLS blocks
the actual operations (no policies exist for INSERT/UPDATE/DELETE), the
excess grants are unnecessary and should be revoked as defense-in-depth.

## Changes
1. Revoke EXECUTE on `is_owner()` from `anon` explicitly (with CASCADE).
2. Revoke INSERT, UPDATE, DELETE on `app_owners` from `anon`.
3. Revoke INSERT, UPDATE, DELETE on `app_owners` from `authenticated`
   (no policies exist for these, and owner management should be done
   via SQL/Supabase dashboard, not via the data API).

## Non-destructive
- No data is lost.
- No tables or columns are dropped.
- SELECT on `app_owners` remains for `authenticated` (needed for the
  AuthContext ownership check).
*/

-- 1. Lock down is_owner() function execution
REVOKE EXECUTE ON FUNCTION public.is_owner() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_owner() FROM public;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;

-- 2. Lock down app_owners table grants
-- anon: SELECT only (not needed, but harmless for the ownership check
--        which runs as authenticated). Actually revoke ALL from anon.
REVOKE ALL ON app_owners FROM anon;

-- authenticated: SELECT only (for ownership check in AuthContext)
REVOKE INSERT, UPDATE, DELETE ON app_owners FROM authenticated;
GRANT SELECT ON app_owners TO authenticated;
GRANT SELECT ON app_owners TO anon;
