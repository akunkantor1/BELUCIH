ALTER TABLE public.promotional_banners
  ADD COLUMN IF NOT EXISTS catalog text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'promotional_banners_catalog_check'
      AND conrelid = 'public.promotional_banners'::regclass
  ) THEN
    ALTER TABLE public.promotional_banners
      ADD CONSTRAINT promotional_banners_catalog_check
      CHECK (catalog IS NULL OR catalog IN ('belucih', 'kps'));
  END IF;
END $$;

COMMENT ON COLUMN public.promotional_banners.catalog IS
  'Katalog pemilik banner: belucih atau kps. NULL menandai banner lama yang belum diklasifikasikan.';
