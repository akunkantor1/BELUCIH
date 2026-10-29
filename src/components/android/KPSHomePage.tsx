import { useEffect, useMemo, useState } from 'react';
import { Search, Store, Package, Info, X } from 'lucide-react';
import { supabase, type Category, type Product } from '@/lib/supabase';
import { attachVariantPrices, productPriceLabel } from '@/lib/productCardPricing';
import { ProductChatOfferBadge } from '@/components/ProductChatOfferBadge';

type PromotionalBanner = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  target_url: string | null;
  sort_order: number;
  is_active: boolean;
};
type KPSPage = 'home' | 'products' | 'about';

type Props = {
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  page: KPSPage;
  onNavigate: (page: KPSPage) => void;
};

const formatPrice = (price: number | null) =>
  price == null ? 'Hubungi toko' :
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(price);

export function KPSHomePage({ onBack, onSelectProduct, page, onNavigate }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('all');
  const [search, setSearch] = useState('');
  const [bannerText, setBannerText] = useState('Selamat datang di KPS');
  const [storeName, setStoreName] = useState('KPS');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [promoBanners, setPromoBanners] = useState<PromotionalBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(false);

      const [p, c, b, s] = await Promise.all([
        supabase.from('products').select('*, category:categories(*)')
          .eq('catalog', 'kps')
          .order('is_featured', { ascending: false })
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*')
          .eq('catalog', 'kps').order('sort_order'),
        supabase.from('promotional_banners').select('id, title, description, image_url, target_url, sort_order, is_active').eq('catalog', 'kps').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('catalog_settings').select('banner_text, store_name, logo_url, hero_image_url')
          .eq('catalog', 'kps').maybeSingle(),
      ]);

      if (!active) return;
      if (p.error) {
        console.error('Gagal memuat produk KPS:', p.error);
        setLoadError(true);
      } else {
        setProducts(await attachVariantPrices((p.data || []) as Product[]));
      }
      if (!c.error) setCategories((c.data || []) as Category[]);
      if (!b.error) setPromoBanners((b.data || []) as PromotionalBanner[]);
      if (!s.error && s.data) {
        if (s.data.banner_text) setBannerText(s.data.banner_text);
        if (s.data.store_name) setStoreName(s.data.store_name);
        setLogoUrl(s.data.logo_url || null);
        setHeroImageUrl(s.data.hero_image_url || null);
      }
      setLoading(false);
    }

    void load();
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('id-ID');
    return products.filter((p) => {
      const categoryMatch = categoryId === 'all' || p.category_id === categoryId;
      const textMatch = !q ||
        p.name.toLocaleLowerCase('id-ID').includes(q) ||
        (p.description || '').toLocaleLowerCase('id-ID').includes(q) ||
        (p.category?.name || '').toLocaleLowerCase('id-ID').includes(q);
      return categoryMatch && textMatch;
    });
  }, [products, categoryId, search]);

  const productGrid = loading ? (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="aspect-[0.8] animate-pulse rounded-2xl bg-slate-200" />
      ))}
    </div>
  ) : loadError ? (
    <div className="mt-6 rounded-2xl border border-red-100 bg-white p-6 text-center text-sm text-slate-600">
      Produk KPS belum dapat dimuat. Periksa koneksi lalu buka kembali halaman ini.
    </div>
  ) : visible.length === 0 ? (
    <div className="py-12 text-center text-sm text-slate-500">
      Belum ada produk KPS yang cocok.
    </div>
  ) : (
    <div className="mt-3 grid grid-cols-2 gap-3">
      {visible.map((p) => (
        <button key={p.id} type="button" onClick={() => onSelectProduct(p)}
          className="overflow-hidden rounded-2xl border border-stone-100 bg-white text-left shadow-sm transition active:scale-[0.98]">
          {p.main_image_url ? (
            <img src={p.main_image_url} alt={p.name} className="aspect-square w-full object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center bg-stone-100 text-stone-300">
              <Store size={38} />
            </div>
          )}
          <div className="p-3">
            <p className="line-clamp-2 text-xs font-semibold leading-5 text-stone-800">{p.name}</p>
            <p className="mt-1 text-[10px] text-stone-400">{p.category?.name || 'KPS'}</p>
            <p className="mt-2 text-sm font-extrabold text-blue-700">{productPriceLabel(p)}</p>
            <ProductChatOfferBadge />
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl bg-[#faf9f6] pb-28">
      <header className="bg-white px-4 pb-4 pt-3">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={`Logo ${storeName}`} className="h-12 w-12 shrink-0 rounded-xl object-contain" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white">
              <Store size={24} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black tracking-tight text-stone-900">{storeName}</p>
            <p className="mt-0.5 truncate text-[11px] text-stone-500">Katalog khusus KPS</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 active:scale-95"
          >
            BELUCIH
          </button>
        </div>
      </header>

      <main className="space-y-6 px-4 pb-6 pt-4">
        {page === 'home' ? (
          <>
            <section className="mb-4">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm focus-within:border-blue-400">
                <Search size={18} className="shrink-0 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari produk KPS..."
                  aria-label="Cari produk KPS beranda"
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} aria-label="Hapus pencarian" className="rounded-full p-1 text-slate-400">
                    <X size={17} />
                  </button>
                )}
              </label>
            </section>

            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-blue-600 p-4 text-white shadow-sm">
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-12 right-12 h-32 w-32 rounded-full bg-sky-300/20 blur-2xl" />

              <div className="relative">
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img src={logoUrl} alt={`Logo ${storeName}`} className="h-14 w-14 rounded-2xl bg-white object-contain p-1.5 shadow-md" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                      <Store size={28} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-200">Katalog khusus</p>
                    <h1 className="mt-1 break-words text-2xl font-black leading-tight">{storeName}</h1>
                  </div>
                </div>

                <h2 className="mt-5 max-w-sm text-xl font-extrabold leading-tight">
                  Temukan produk pilihanmu.
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-blue-100">
                  {bannerText || 'Jelajahi koleksi produk KPS dalam satu katalog yang praktis.'}
                </p>

                {heroImageUrl && (
                  <img src={heroImageUrl} alt={`Banner ${storeName}`} className="mt-4 aspect-[16/7] w-full rounded-xl border border-white/15 object-cover" />
                )}

                <button
                  type="button"
                  onClick={() => onNavigate('products')}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-blue-950 shadow-md active:scale-[0.98]"
                >
                  Jelajahi semua produk <span aria-hidden="true">→</span>
                </button>
              </div>
            </section>{categories.length > 0 && (
              <section className="mt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-base font-extrabold text-slate-900">Kategori</h2>
                  <button type="button" onClick={() => onNavigate('products')} className="text-xs font-bold text-blue-700">
                    Lihat semua
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryId('all');
                      onNavigate('products');
                    }}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${categoryId === 'all' ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
                  >
                    Semua produk
                  </button>
                  {categories.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => {
                        setCategoryId(c.id);
                        onNavigate('products');
                      }}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${categoryId === c.id ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {!search && categoryId === 'all' && (
              <section className="overflow-hidden">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">KPS PROMO</p>
                    <h2 className="mt-1 text-lg font-extrabold text-slate-900">Promo untukmu</h2>
                  </div>
                  <span className="text-xs font-medium text-slate-400">Geser untuk melihat</span>
                </div>

                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {promoBanners.map((banner) => (
                    <button
                      key={banner.id}
                      type="button"
                      onClick={() => {
                        const target = banner.target_url?.trim();
                        if (!target) {
                          onNavigate('products');
                          return;
                        }
                        if (/^https?:\/\/\S+$/i.test(target)) {
                          window.open(target, '_blank', 'noopener,noreferrer');
                        } else if (target === 'about') {
                          onNavigate('about');
                        } else {
                          onNavigate('products');
                        }
                      }}
                      className="relative min-h-36 w-full min-w-full snap-center overflow-hidden rounded-2xl border border-blue-100 bg-blue-950 p-5 text-left text-white sm:min-w-[85%]"
                    >
                      {banner.image_url && (
                        <img
                          src={banner.image_url}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      )}
                      {banner.image_url && (
                        <span className="absolute inset-0 bg-gradient-to-r from-blue-950/90 via-blue-950/60 to-transparent" />
                      )}
                      <span className="relative block text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100">
                        KPS PROMO
                      </span>
                      <span className="relative mt-2 block max-w-xs text-xl font-black leading-tight">
                        {banner.title}
                      </span>
                      {banner.description && (
                        <span className="relative mt-2 block max-w-xs text-sm text-blue-50">
                          {banner.description}
                        </span>
                      )}
                      <span className="relative mt-3 inline-flex rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-900">
                        Lihat selengkapnya →
                      </span>
                    </button>
                  ))}
                  {promoBanners.length === 0 && (
                    <button
                      type="button"
                      onClick={() => onNavigate('products')}
                      className="min-h-36 w-full min-w-full snap-center rounded-2xl bg-gradient-to-r from-blue-950 via-blue-800 to-blue-600 p-5 text-left text-white sm:min-w-[85%]"
                    >
                      <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100">Katalog KPS</span>
                      <span className="mt-2 block text-xl font-black leading-tight">Temukan produk yang kamu butuhkan</span>
                      <span className="mt-3 inline-flex rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-900">Lihat produk →</span>
                    </button>
                  )}
                </div>
              </section>
            )}
<section className="mt-7">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">Katalog KPS</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {search ? 'Hasil pencarian' : 'Pilihan produk'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {loading ? 'Memuat katalog...' : `${visible.length} produk ditemukan`}
                  </p>
                </div>
                <button type="button" onClick={() => onNavigate('products')} className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                  Lihat semua →
                </button>
              </div>
              {productGrid}
            </section>

            <button
              type="button"
              onClick={() => onNavigate('about')}
              className="mt-7 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Info size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900">Kenali {storeName}</span>
                <span className="mt-1 block text-xs text-slate-500">Informasi lebih lanjut tentang katalog KPS.</span>
              </span>
              <span className="text-lg text-slate-400">›</span>
            </button>
          </>
        ) : page === 'products' ? (
          <>
            <h2 className="text-xl font-extrabold text-slate-900">Produk KPS</h2>
            <label className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
              <Search size={18} className="text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari produk KPS..." aria-label="Cari produk KPS"
                className="w-full bg-transparent py-3 text-sm outline-none" />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label="Hapus pencarian">
                  <X size={16} className="text-slate-400" />
                </button>
              )}
            </label>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              <button type="button" onClick={() => setCategoryId('all')}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${categoryId === 'all' ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                Semua
              </button>
              {categories.map((c) => (
                <button type="button" key={c.id} onClick={() => setCategoryId(c.id)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${categoryId === c.id ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                  {c.name}
                </button>
              ))}
            </div>
            {productGrid}
          </>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Info size={24} />
            </div>
            <h2 className="mt-4 text-xl font-extrabold text-slate-900">Tentang KPS</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              KPS memiliki beranda, daftar produk, kategori, dan pencarian tersendiri.
              Katalog KPS terpisah dari katalog BELUCIH meskipun berada dalam satu aplikasi.
            </p>
            <div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              <Package size={18} className="mb-2" />
              Buka tab Produk untuk menjelajahi barang yang tersedia di KPS.
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
