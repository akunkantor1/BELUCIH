/*
# Create CV RODAMAS BELUCIH store schema

1. New Tables
- `store_settings`: single-row table for logo, hero banner image, store name, tagline, description, address, operating hours, and two WhatsApp admin numbers. Public read, owner-only write.
- `categories`: product categories (e.g. baking tools, cake decoration). Public read, owner-only write.
- `products`: product listing with name, description, main image, category, stock status, created_at. Public read, owner-only write.
- `product_variants`: variant/size options per product (e.g. small, large) with optional price and stock. Public read, owner-only write.
- `product_images`: additional images per product beyond the main image. Public read, owner-only write.

2. Storage
- Creates a public storage bucket `store-assets` for product photos, logo, and hero banner.

3. Security
- RLS enabled on all tables.
- Public (anon, authenticated) can SELECT all store data.
- Only authenticated users (owner) can INSERT, UPDATE, DELETE.
- Storage bucket is public for reads; writes restricted to authenticated.
*/

-- Store settings (single row)
CREATE TABLE IF NOT EXISTS store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL DEFAULT 'CV RODAMAS BELUCIH',
  tagline text DEFAULT 'Supplier Baking Tool & Dekorasi Kue',
  description text DEFAULT 'Menjual berbagai macam peralatan baking dan dekorasi kue berkualitas.',
  logo_url text,
  hero_image_url text,
  hero_title text DEFAULT 'CV RODAMAS BELUCIH',
  hero_subtitle text DEFAULT 'Supplier Baking Tool & Dekorasi Kue Terlengkap di Sidoarjo',
  address text DEFAULT 'Tulangan, Sidoarjo, Jawa Timur',
  operating_hours text DEFAULT 'Senin - Sabtu, 09:00 - 18:00',
  whatsapp_1 text DEFAULT '081331767199',
  whatsapp_2 text DEFAULT '082123207202',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  main_image_url text,
  price decimal(12,2),
  stock_status text DEFAULT 'Tersedia',
  is_featured boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Product variants (size/options)
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  price decimal(12,2),
  stock int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Product additional images
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- ===== store_settings policies =====
DROP POLICY IF EXISTS "public_read_store_settings" ON store_settings;
CREATE POLICY "public_read_store_settings" ON store_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "owner_insert_store_settings" ON store_settings;
CREATE POLICY "owner_insert_store_settings" ON store_settings FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "owner_update_store_settings" ON store_settings;
CREATE POLICY "owner_update_store_settings" ON store_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "owner_delete_store_settings" ON store_settings;
CREATE POLICY "owner_delete_store_settings" ON store_settings FOR DELETE TO authenticated USING (true);

-- ===== categories policies =====
DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "owner_insert_categories" ON categories;
CREATE POLICY "owner_insert_categories" ON categories FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "owner_update_categories" ON categories;
CREATE POLICY "owner_update_categories" ON categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "owner_delete_categories" ON categories;
CREATE POLICY "owner_delete_categories" ON categories FOR DELETE TO authenticated USING (true);

-- ===== products policies =====
DROP POLICY IF EXISTS "public_read_products" ON products;
CREATE POLICY "public_read_products" ON products FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "owner_insert_products" ON products;
CREATE POLICY "owner_insert_products" ON products FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "owner_update_products" ON products;
CREATE POLICY "owner_update_products" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "owner_delete_products" ON products;
CREATE POLICY "owner_delete_products" ON products FOR DELETE TO authenticated USING (true);

-- ===== product_variants policies =====
DROP POLICY IF EXISTS "public_read_product_variants" ON product_variants;
CREATE POLICY "public_read_product_variants" ON product_variants FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "owner_insert_product_variants" ON product_variants;
CREATE POLICY "owner_insert_product_variants" ON product_variants FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "owner_update_product_variants" ON product_variants;
CREATE POLICY "owner_update_product_variants" ON product_variants FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "owner_delete_product_variants" ON product_variants;
CREATE POLICY "owner_delete_product_variants" ON product_variants FOR DELETE TO authenticated USING (true);

-- ===== product_images policies =====
DROP POLICY IF EXISTS "public_read_product_images" ON product_images;
CREATE POLICY "public_read_product_images" ON product_images FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "owner_insert_product_images" ON product_images;
CREATE POLICY "owner_insert_product_images" ON product_images FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "owner_update_product_images" ON product_images;
CREATE POLICY "owner_update_product_images" ON product_images FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "owner_delete_product_images" ON product_images;
CREATE POLICY "owner_delete_product_images" ON product_images FOR DELETE TO authenticated USING (true);

-- Insert default settings row
INSERT INTO store_settings (store_name, tagline, description, address, operating_hours, whatsapp_1, whatsapp_2)
SELECT 'CV RODAMAS BELUCIH', 'Supplier Baking Tool & Dekorasi Kue', 'Menjual berbagai macam peralatan baking dan dekorasi kue berkualitas dengan harga terbaik.', 'Tulangan, Sidoarjo, Jawa Timur', 'Senin - Sabtu, 09:00 - 18:00', '081331767199', '082123207202'
WHERE NOT EXISTS (SELECT 1 FROM store_settings);

-- Insert default categories
INSERT INTO categories (name, sort_order)
SELECT cat.name, cat.sort_order
FROM (VALUES
  ('Baking Tool', 0),
  ('Dekorasi Kue', 1),
  ('Loyang & Cetakan', 2),
  ('Aksesoris', 3)
) AS cat(name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM categories);

-- Create storage bucket for store assets (public read)
INSERT INTO storage.buckets (id, name, public)
SELECT 'store-assets', 'store-assets', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'store-assets');

-- Storage policies: public read, authenticated write
DROP POLICY IF EXISTS "public_read_store_assets" ON storage.objects;
CREATE POLICY "public_read_store_assets" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'store-assets');

DROP POLICY IF EXISTS "owner_insert_store_assets" ON storage.objects;
CREATE POLICY "owner_insert_store_assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'store-assets');

DROP POLICY IF EXISTS "owner_update_store_assets" ON storage.objects;
CREATE POLICY "owner_update_store_assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'store-assets') WITH CHECK (bucket_id = 'store-assets');

DROP POLICY IF EXISTS "owner_delete_store_assets" ON storage.objects;
CREATE POLICY "owner_delete_store_assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'store-assets');
