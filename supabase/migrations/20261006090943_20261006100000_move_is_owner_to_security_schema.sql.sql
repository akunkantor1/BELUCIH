/*
# Move is_owner() and app_owners to private security schema

## Problem
Supabase linter warns that `public.is_owner()` — a SECURITY DEFINER
function — is callable by authenticated users via the PostgREST API
at `/rest/v1/rpc/is_owner`. While the function only returns a boolean,
it should not be exposed via REST.

## Solution
1. Create schema `security` (not exposed by PostgREST).
2. Move `app_owners` table to `security` schema.
3. Drop ALL old RLS write policies (they depend on `public.is_owner()`).
4. Drop `public.is_owner()` function.
5. Create `security.is_owner()` — used by RLS policies, NOT reachable via REST.
6. Create `public.is_owner_check()` — thin wrapper for frontend RPC calls.
7. Recreate all RLS write policies using `security.is_owner()`.
8. Recreate all Storage write policies using `security.is_owner()`.

## Non-destructive
- No store data is affected.
- `app_owners` data is preserved (moved, not dropped).
*/

-- ============================================================
-- 1. Create security schema
-- ============================================================
CREATE SCHEMA IF NOT EXISTS security;

-- ============================================================
-- 2. Move app_owners table to security schema
-- ============================================================
ALTER TABLE public.app_owners SET SCHEMA security;
ALTER TABLE security.app_owners ENABLE ROW LEVEL SECURITY;

-- Recreate ownership-check policy on moved table
DROP POLICY IF EXISTS "users_check_own_ownership" ON security.app_owners;
CREATE POLICY "users_check_own_ownership" ON security.app_owners
FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Lock down grants
REVOKE ALL ON security.app_owners FROM anon;
REVOKE ALL ON security.app_owners FROM public;
GRANT SELECT ON security.app_owners TO authenticated;

-- ============================================================
-- 3. Drop ALL old write policies (they depend on public.is_owner)
-- ============================================================
DROP POLICY IF EXISTS "owner_insert_store_settings" ON store_settings;
DROP POLICY IF EXISTS "owner_update_store_settings" ON store_settings;
DROP POLICY IF EXISTS "owner_delete_store_settings" ON store_settings;

DROP POLICY IF EXISTS "owner_insert_categories" ON categories;
DROP POLICY IF EXISTS "owner_update_categories" ON categories;
DROP POLICY IF EXISTS "owner_delete_categories" ON categories;

DROP POLICY IF EXISTS "owner_insert_products" ON products;
DROP POLICY IF EXISTS "owner_update_products" ON products;
DROP POLICY IF EXISTS "owner_delete_products" ON products;

DROP POLICY IF EXISTS "owner_insert_product_variants" ON product_variants;
DROP POLICY IF EXISTS "owner_update_product_variants" ON product_variants;
DROP POLICY IF EXISTS "owner_delete_product_variants" ON product_variants;

DROP POLICY IF EXISTS "owner_insert_product_images" ON product_images;
DROP POLICY IF EXISTS "owner_update_product_images" ON product_images;
DROP POLICY IF EXISTS "owner_delete_product_images" ON product_images;

DROP POLICY IF EXISTS "owner_insert_store_assets" ON storage.objects;
DROP POLICY IF EXISTS "owner_update_store_assets" ON storage.objects;
DROP POLICY IF EXISTS "owner_delete_store_assets" ON storage.objects;

-- ============================================================
-- 4. Drop old public.is_owner() function (no more dependents)
-- ============================================================
DROP FUNCTION IF EXISTS public.is_owner();

-- ============================================================
-- 5. Create security.is_owner() — NOT exposed via REST
-- ============================================================
CREATE OR REPLACE FUNCTION security.is_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = security
AS $$
  SELECT EXISTS (SELECT 1 FROM security.app_owners WHERE user_id = auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION security.is_owner() FROM anon;
REVOKE EXECUTE ON FUNCTION security.is_owner() FROM public;
GRANT EXECUTE ON FUNCTION security.is_owner() TO authenticated;

-- ============================================================
-- 6. Create public.is_owner_check() wrapper for frontend RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_owner_check()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = security
AS $$
  SELECT security.is_owner();
$$;

REVOKE EXECUTE ON FUNCTION public.is_owner_check() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_owner_check() TO authenticated;

-- ============================================================
-- 7. Recreate all RLS write policies with security.is_owner()
-- ============================================================

-- store_settings
CREATE POLICY "owner_insert_store_settings" ON store_settings
FOR INSERT TO authenticated WITH CHECK (security.is_owner());

CREATE POLICY "owner_update_store_settings" ON store_settings
FOR UPDATE TO authenticated USING (security.is_owner()) WITH CHECK (security.is_owner());

CREATE POLICY "owner_delete_store_settings" ON store_settings
FOR DELETE TO authenticated USING (security.is_owner());

-- categories
CREATE POLICY "owner_insert_categories" ON categories
FOR INSERT TO authenticated WITH CHECK (security.is_owner());

CREATE POLICY "owner_update_categories" ON categories
FOR UPDATE TO authenticated USING (security.is_owner()) WITH CHECK (security.is_owner());

CREATE POLICY "owner_delete_categories" ON categories
FOR DELETE TO authenticated USING (security.is_owner());

-- products
CREATE POLICY "owner_insert_products" ON products
FOR INSERT TO authenticated WITH CHECK (security.is_owner());

CREATE POLICY "owner_update_products" ON products
FOR UPDATE TO authenticated USING (security.is_owner()) WITH CHECK (security.is_owner());

CREATE POLICY "owner_delete_products" ON products
FOR DELETE TO authenticated USING (security.is_owner());

-- product_variants
CREATE POLICY "owner_insert_product_variants" ON product_variants
FOR INSERT TO authenticated WITH CHECK (security.is_owner());

CREATE POLICY "owner_update_product_variants" ON product_variants
FOR UPDATE TO authenticated USING (security.is_owner()) WITH CHECK (security.is_owner());

CREATE POLICY "owner_delete_product_variants" ON product_variants
FOR DELETE TO authenticated USING (security.is_owner());

-- product_images
CREATE POLICY "owner_insert_product_images" ON product_images
FOR INSERT TO authenticated WITH CHECK (security.is_owner());

CREATE POLICY "owner_update_product_images" ON product_images
FOR UPDATE TO authenticated USING (security.is_owner()) WITH CHECK (security.is_owner());

CREATE POLICY "owner_delete_product_images" ON product_images
FOR DELETE TO authenticated USING (security.is_owner());

-- ============================================================
-- 8. Recreate Storage write policies with security.is_owner()
-- ============================================================
CREATE POLICY "owner_insert_store_assets" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'store-assets' AND security.is_owner());

CREATE POLICY "owner_update_store_assets" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'store-assets' AND security.is_owner())
WITH CHECK (bucket_id = 'store-assets' AND security.is_owner());

CREATE POLICY "owner_delete_store_assets" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'store-assets' AND security.is_owner());
