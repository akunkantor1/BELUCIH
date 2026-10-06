/*
# Revoke anon EXECUTE on public.is_owner_check()

The previous migration created public.is_owner_check() as a wrapper
for the frontend to verify owner status via RPC. However, the
REVOKE EXECUTE FROM anon did not fully take effect — the security
posture shows anon still has EXECUTE.

This migration explicitly revokes all access from anon and public,
then grants EXECUTE only to authenticated.
*/

REVOKE EXECUTE ON FUNCTION public.is_owner_check() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_owner_check() FROM public;
GRANT EXECUTE ON FUNCTION public.is_owner_check() TO authenticated;
