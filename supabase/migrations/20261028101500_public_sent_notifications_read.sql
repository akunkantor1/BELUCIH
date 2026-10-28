-- BELUCIH: customers may read sent notifications only.
-- Device tokens remain restricted to Owner policies.

DROP POLICY IF EXISTS push_notifications_owner_read
  ON public.push_notifications;

CREATE POLICY push_notifications_owner_read
  ON public.push_notifications
  FOR SELECT
  TO authenticated
  USING (security.is_owner());

DROP POLICY IF EXISTS push_notifications_public_sent_read
  ON public.push_notifications;

CREATE POLICY push_notifications_public_sent_read
  ON public.push_notifications
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('sent', 'partial'));

-- Anonymous customers receive access only to public display columns.
GRANT SELECT (
  id,
  kind,
  title,
  body,
  image_url,
  target_url,
  created_at,
  status
)
ON public.push_notifications TO anon;

-- Authenticated Owners retain their existing full-table read access.
GRANT SELECT ON public.push_notifications TO authenticated;

-- No INSERT, UPDATE, or DELETE privileges are granted to customers.