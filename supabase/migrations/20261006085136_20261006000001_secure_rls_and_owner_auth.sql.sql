/*
# Secure RLS Policies and Owner Authentication

## Problem
The original migration created all tables with RLS enabled but used
`USING (true)` and `WITH CHECK (true)` for every write policy. This means:
- ANY authenticated Supabase user (not just the store owner) can
  INSERT, UPDATE, and DELETE all store data.
- The `anon` role also has full CRUD grants on all tables, meaning
  unauthenticated requests can also modify data.
- Storage policies allow any authenticated user to upload/delete files.

## Solution
This migration introduces an ownership-based access control system:

1. New Table: `app_owners`
   - Single-column table listing user IDs that are store owners.
   - Primary key: `user_id` (uuid) referencing `auth.users(id)`.
   - Only users listed in this table can write to store tables.

2. New Function: `public.is_owner()`
   - SECURITY DEFINER function that checks whether the current
     authenticated user (`auth.uid()`) exists in `app_owners`.
   - Used in all write policies to enforce owner-only access.

3. Policy Changes (all 5 store tables):
   - SELECT: unchanged — public read for `anon, authenticated` (storefront visitors).
   - INSERT/UPDATE/DELETE: restricted to `authenticated` where `public.is_owner()` returns true.
   - Old open policies are dropped first.

4. Grant Changes:
   - REVOKE INSERT, UPDATE, DELETE from `anon` on all store tables.
   - `anon` retains SELECT only (public read for storefront).

5. Storage Policy Changes:
   - SELECT: unchanged — public read for `store-assets` bucket.
   - INSERT/UPDATE/DELETE: restricted to authenticated owners only via `public.is_owner()`.

6. Owner Seeding:
   - Inserts the existing owner user (by email) into `app_owners` if they exist in `auth.users`.

## Important Notes
- This migration is non-destructive: no tables, columns, or data are dropped.
- All existing data remains intact.
- SELECT policies for public read remain open by design (storefront needs anon read).
- The `is_owner()` function is SECURITY DEFINER so it can read `app_owners`
  regardless of the caller's RLS context.
*/

-- ============================================================
-- 1. Create app_owners table
-- ============================================================
CREATE TABLE IF NOT EXISTS app_owners (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_owners ENABLE ROW LEVEL SECURITY;

-- Allow users to check their own ownership status
DROP POLICY IF EXISTS "users_check_own_ownership" ON app_owners;
CREATE POLICY "users_check_own_ownership" ON app_owners FOR SELECT
TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- 2. Create is_owner() helper function
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_owners WHERE user_id = auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.is_owner FROM anon;
GRANT EXECUTE ON FUNCTION public.is_owner TO authenticated;

-- ============================================================
-- 3. Seed existing owner user
-- ============================================================
INSERT INTO app_owners (user_id)
SELECT id FROM auth.users WHERE email = 'owner@rodamasbelucih.com'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. Revoke excess grants from anon role
-- ============================================================
REVOKE INSERT, UPDATE, DELETE ON store_settings FROM anon;
REVOKE INSERT, UPDATE, DELETE ON categories FROM anon;
REVOKE INSERT, UPDATE, DELETE ON products FROM anon;
REVOKE INSERT, UPDATE, DELETE ON product_variants FROM anon;
REVOKE INSERT, UPDATE, DELETE ON product_images FROM anon;

-- ============================================================
-- 5. store_settings policies
-- ============================================================
DROP POLICY IF EXISTS "public_read_store_settings" ON store_settings;
CREATE POLICY "public_read_store_settings" ON store_settings
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "owner_insert_store_settings" ON store_settings;
CREATE POLICY "owner_insert_store_settings" ON store_settings
FOR INSERT TO authenticated WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "owner_update_store_settings" ON store_settings;
CREATE POLICY "owner_update_store_settings" ON store_settings
FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "owner_delete_store_settings" ON store_settings;
CREATE POLICY "owner_delete_store_settings" ON store_settings
FOR DELETE TO authenticated USING (public.is_owner());

-- ============================================================
-- 6. categories policies
-- ============================================================
DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "owner_insert_categories" ON categories;
CREATE POLICY "owner_insert_categories" ON categories
FOR INSERT TO authenticated WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "owner_update_categories" ON categories;
CREATE POLICY "owner_update_categories" ON categories
FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "owner_delete_categories" ON categories;
CREATE POLICY "owner_delete_categories" ON categories
FOR DELETE TO authenticated USING (public.is_owner());

-- ============================================================
-- 7. products policies
-- ============================================================
DROP POLICY IF EXISTS "public_read_products" ON products;
CREATE POLICY "public_read_products" ON products
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "owner_insert_products" ON products;
CREATE POLICY "owner_insert_products" ON products
FOR INSERT TO authenticated WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "owner_update_products" ON products;
CREATE POLICY "owner_update_products" ON products
FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "owner_delete_products" ON products;
CREATE POLICY "owner_delete_products" ON products
FOR DELETE TO authenticated USING (public.is_owner());

-- ============================================================
-- 8. product_variants policies
-- ============================================================
DROP POLICY IF EXISTS "public_read_product_variants" ON product_variants;
CREATE POLICY "public_read_product_variants" ON product_variants
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "owner_insert_product_variants" ON product_variants;
CREATE POLICY "owner_insert_product_variants" ON product_variants
FOR INSERT TO authenticated WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "owner_update_product_variants" ON product_variants;
CREATE POLICY "owner_update_product_variants" ON product_variants
FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "owner_delete_product_variants" ON product_variants;
CREATE POLICY "owner_delete_product_variants" ON product_variants
FOR DELETE TO authenticated USING (public.is_owner());

-- ============================================================
-- 9. product_images policies
-- ============================================================
DROP POLICY IF EXISTS "public_read_product_images" ON product_images;
CREATE POLICY "public_read_product_images" ON product_images
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "owner_insert_product_images" ON product_images;
CREATE POLICY "owner_insert_product_images" ON product_images
FOR INSERT TO authenticated WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "owner_update_product_images" ON product_images;
CREATE POLICY "owner_update_product_images" ON product_images
FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "owner_delete_product_images" ON product_images;
CREATE POLICY "owner_delete_product_images" ON product_images
FOR DELETE TO authenticated USING (public.is_owner());

-- ============================================================
-- 10. Storage policies for store-assets bucket
-- ============================================================
DROP POLICY IF EXISTS "public_read_store_assets" ON storage.objects;
CREATE POLICY "public_read_store_assets" ON storage.objects
FOR SELECT TO anon, authenticated USING (bucket_id = 'store-assets');

DROP POLICY IF EXISTS "owner_insert_store_assets" ON storage.objects;
CREATE POLICY "owner_insert_store_assets" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'store-assets' AND public.is_owner());

DROP POLICY IF EXISTS "owner_update_store_assets" ON storage.objects;
CREATE POLICY "owner_update_store_assets" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'store-assets' AND public.is_owner())
WITH CHECK (bucket_id = 'store-assets' AND public.is_owner());

DROP POLICY IF EXISTS "owner_delete_store_assets" ON storage.objects;
CREATE POLICY "owner_delete_store_assets" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'store-assets' AND public.is_owner());
