-- Separate BELUCIH and KPS catalogs while preserving existing BELUCIH data.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS catalog text NOT NULL DEFAULT 'belucih';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS catalog text NOT NULL DEFAULT 'belucih';

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_catalog_check;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_catalog_check
  CHECK (catalog IN ('belucih', 'kps'));

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_catalog_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_catalog_check
  CHECK (catalog IN ('belucih', 'kps'));

CREATE INDEX IF NOT EXISTS categories_catalog_sort_idx
  ON public.categories (catalog, sort_order);

CREATE INDEX IF NOT EXISTS products_catalog_created_idx
  ON public.products (catalog, created_at DESC);

CREATE INDEX IF NOT EXISTS products_catalog_featured_idx
  ON public.products (catalog, is_featured, sort_order);

-- Prevent a product from using a category belonging to another catalog.
CREATE OR REPLACE FUNCTION public.validate_product_category_catalog()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  category_catalog text;
BEGIN
  IF NEW.category_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.catalog INTO category_catalog
  FROM public.categories AS c
  WHERE c.id = NEW.category_id;

  IF category_catalog IS NULL THEN
    RAISE EXCEPTION 'Kategori produk tidak ditemukan.';
  END IF;

  IF category_catalog <> NEW.catalog THEN
    RAISE EXCEPTION 'Kategori dan produk harus berasal dari katalog yang sama.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_product_category_catalog
  ON public.products;

CREATE TRIGGER validate_product_category_catalog
BEFORE INSERT OR UPDATE OF category_id, catalog
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.validate_product_category_catalog();

-- Also prevent changing a category's catalog while products still use it.
CREATE OR REPLACE FUNCTION public.prevent_category_catalog_mismatch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.products AS p
    WHERE p.category_id = NEW.id
      AND p.catalog <> NEW.catalog
  ) THEN
    RAISE EXCEPTION
      'Katalog kategori tidak dapat diubah selama masih digunakan produk katalog lain.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_category_catalog_mismatch
  ON public.categories;

CREATE TRIGGER prevent_category_catalog_mismatch
BEFORE UPDATE OF catalog
ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.prevent_category_catalog_mismatch();

-- Owner-editable KPS banner settings.
CREATE TABLE IF NOT EXISTS public.catalog_settings (
  catalog text PRIMARY KEY
    CHECK (catalog IN ('kps')),
  banner_text text NOT NULL DEFAULT 'Klik untuk melihat produk KPS',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalog_settings_public_read
  ON public.catalog_settings;

CREATE POLICY catalog_settings_public_read
ON public.catalog_settings
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS catalog_settings_owner_insert
  ON public.catalog_settings;

CREATE POLICY catalog_settings_owner_insert
ON public.catalog_settings
FOR INSERT
TO authenticated
WITH CHECK (security.is_owner());

DROP POLICY IF EXISTS catalog_settings_owner_update
  ON public.catalog_settings;

CREATE POLICY catalog_settings_owner_update
ON public.catalog_settings
FOR UPDATE
TO authenticated
USING (security.is_owner())
WITH CHECK (security.is_owner());

GRANT SELECT ON public.catalog_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.catalog_settings TO authenticated;

INSERT INTO public.catalog_settings (catalog, banner_text)
VALUES ('kps', 'Klik untuk melihat produk KPS')
ON CONFLICT (catalog) DO NOTHING;

-- Keep new-product notifications catalog-aware.
CREATE OR REPLACE FUNCTION public.enqueue_new_product_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  description_text text;
  notification_target text;
BEGIN
  description_text := left(
    regexp_replace(coalesce(NEW.description, ''), '\s+', ' ', 'g'),
    180
  );

  notification_target :=
    CASE
      WHEN NEW.catalog = 'kps'
        THEN '/?catalog=kps&product=' || NEW.id::text
      ELSE '/?product=' || NEW.id::text
    END;

  INSERT INTO public.push_notifications (
    kind, title, body, image_url, product_id,
    target_url, status, created_by
  )
  VALUES (
    'product_new',
    NEW.name,
    coalesce(
      nullif(description_text, ''),
      CASE
        WHEN NEW.catalog = 'kps'
          THEN 'Produk baru tersedia di KPS.'
        ELSE 'Produk baru tersedia di BELUCIH.'
      END
    ),
    NEW.main_image_url,
    NEW.id,
    notification_target,
    'pending',
    auth.uid()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_new_product_notification()
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.validate_product_category_catalog()
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.prevent_category_catalog_mismatch()
  FROM PUBLIC, anon, authenticated;
