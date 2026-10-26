CREATE TABLE IF NOT EXISTS public.promotional_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  target_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.promotional_banners FROM PUBLIC;
REVOKE ALL ON public.promotional_banners FROM anon;
REVOKE ALL ON public.promotional_banners FROM authenticated;

GRANT SELECT ON public.promotional_banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotional_banners TO authenticated;

CREATE POLICY "public_read_active_promotional_banners"
ON public.promotional_banners
FOR SELECT TO anon, authenticated
USING (is_active = true);

CREATE POLICY "owner_read_all_promotional_banners"
ON public.promotional_banners
FOR SELECT TO authenticated
USING ((SELECT security.is_owner()));

CREATE POLICY "owner_insert_promotional_banners"
ON public.promotional_banners
FOR INSERT TO authenticated
WITH CHECK ((SELECT security.is_owner()));

CREATE POLICY "owner_update_promotional_banners"
ON public.promotional_banners
FOR UPDATE TO authenticated
USING ((SELECT security.is_owner()))
WITH CHECK ((SELECT security.is_owner()));

CREATE POLICY "owner_delete_promotional_banners"
ON public.promotional_banners
FOR DELETE TO authenticated
USING ((SELECT security.is_owner()));
