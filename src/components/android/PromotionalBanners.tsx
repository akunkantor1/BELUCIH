import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Banner = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  target_url: string | null;
};

export function PromotionalBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadBanners() {
      const { data, error } = await (supabase as any)
        .from('promotional_banners')
        .select('id,title,description,image_url,target_url')
        .eq('catalog', 'belucih')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!cancelled && !error && data) {
        setBanners(data as Banner[]);
      }
    }

    void loadBanners();
    return () => { cancelled = true; };
  }, []);

  if (banners.length === 0) return null;

  return (
    <section className="min-w-0 w-full space-y-3 pt-0" aria-label="Promo terbaru">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-stone-900">Promo untukmu</h2>
        <span className="text-xs text-stone-400">Penawaran terbaru</span>
      </div>
      <div className="flex w-full min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2">
        {banners.map((banner) => {
          const content = (
            <>
              <img
                src={banner.image_url}
                alt={banner.title}
                loading="lazy"
                className="h-auto max-h-64 min-h-36 w-full object-contain bg-stone-50"
              />
              <div className="p-3">
                <h3 className="line-clamp-1 text-sm font-bold text-stone-900">
                  {banner.title}
                </h3>
                {banner.description && (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">
                    {banner.description}
                  </p>
                )}
              </div>
            </>
          );

          return (
            <article
              key={banner.id}
              className="w-full min-w-0 max-w-full shrink-0 snap-start overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm"
            >
              {banner.target_url ? (
                <a
                  href={banner.target_url}
                  target={/^https?:\/\//i.test(banner.target_url) ? '_blank' : undefined}
                  rel={/^https?:\/\//i.test(banner.target_url) ? 'noopener noreferrer' : undefined}
                  className="block"
                >
                  {content}
                </a>
              ) : content}
            </article>
          );
        })}
      </div>
    </section>
  );
}
