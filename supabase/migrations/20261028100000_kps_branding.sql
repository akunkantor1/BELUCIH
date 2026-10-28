ALTER TABLE public.catalog_settings
  ADD COLUMN IF NOT EXISTS store_name text NOT NULL DEFAULT 'KPS',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS hero_image_url text;

INSERT INTO public.catalog_settings (catalog, banner_text, store_name)
VALUES ('kps', 'Klik untuk melihat produk KPS', 'KPS')
ON CONFLICT (catalog) DO NOTHING;

-- Public hanya boleh membaca pengaturan katalog.
-- Penulisan tetap dibatasi oleh policy Owner yang sudah ada.
GRANT SELECT ON public.catalog_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.catalog_settings TO authenticated;
