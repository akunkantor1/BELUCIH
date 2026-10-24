-- BELUCIH push notifications: device tokens, history, and product event queue.

CREATE TABLE IF NOT EXISTS public.push_device_tokens (
  token text PRIMARY KEY,
  platform text NOT NULL DEFAULT 'android'
    CHECK (platform IN ('android', 'web')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL
    CHECK (kind IN ('product_new', 'broadcast')),
  title text NOT NULL,
  body text NOT NULL,
  image_url text,
  target_url text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'partial', 'failed')),
  recipient_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

-- A product can have at most one automatic new-product notification.
CREATE UNIQUE INDEX IF NOT EXISTS push_notifications_one_product_event
  ON public.push_notifications (product_id)
  WHERE kind = 'product_new' AND product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS push_notifications_history_idx
  ON public.push_notifications (created_at DESC);

ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

-- Only authenticated Owners may read token records and notification history.
DROP POLICY IF EXISTS push_tokens_owner_read ON public.push_device_tokens;
CREATE POLICY push_tokens_owner_read
  ON public.push_device_tokens
  FOR SELECT TO authenticated
  USING (security.is_owner());

DROP POLICY IF EXISTS push_notifications_owner_read ON public.push_notifications;
CREATE POLICY push_notifications_owner_read
  ON public.push_notifications
  FOR SELECT TO authenticated
  USING (security.is_owner());

-- Clients must not register tokens or send/edit notification records directly.
REVOKE ALL ON public.push_device_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.push_device_tokens TO authenticated;

REVOKE ALL ON public.push_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.push_notifications TO authenticated;

-- Queue a notification when a product is first inserted.
-- Editing an existing product does not execute this trigger.
CREATE OR REPLACE FUNCTION public.enqueue_new_product_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  description_text text;
BEGIN
  description_text := left(
    regexp_replace(coalesce(NEW.description, ''), '\s+', ' ', 'g'),
    180
  );

  INSERT INTO public.push_notifications (
    kind,
    title,
    body,
    image_url,
    product_id,
    target_url,
    status,
    created_by
  )
  VALUES (
    'product_new',
    NEW.name,
    coalesce(
      nullif(description_text, ''),
      'Produk baru tersedia di BELUCIH.'
    ),
    NEW.main_image_url,
    NEW.id,
    '/?product=' || NEW.id::text,
    'pending',
    auth.uid()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_new_product_notification()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS products_enqueue_new_notification ON public.products;
CREATE TRIGGER products_enqueue_new_notification
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_new_product_notification();
