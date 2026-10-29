import { useEffect, useMemo, useState } from 'react';
import { PromotionalBanners } from '@/components/android/PromotionalBanners';
import { UserRound,
  ArrowRight,
  Bell,
  ChevronRight,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  Package,
} from 'lucide-react';
import { supabase, type Category, type Product } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { attachVariantPrices, productPriceLabel } from '@/lib/productCardPricing';
import { ProductChatOfferBadge } from '@/components/ProductChatOfferBadge';

type Props = {
  onNavigate: (page: 'home' | 'products' | 'about' | 'contact' | 'notifications') => void;
  onSelectProduct: (product: Product) => void;
  onOpenKps: () => void;
};

const rupiah = (value: number | null | undefined) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(value)
    : 'Hubungi toko';

function ProductTile({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (product: Product) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className="min-w-0 overflow-hidden rounded-2xl border border-stone-100 bg-white text-left shadow-sm transition active:scale-[0.98]"
    >
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        {product.main_image_url ? (
          <img
            src={product.main_image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-300">
            <Package size={36} strokeWidth={1.4} />
          </div>
        )}

        {product.is_featured && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-stone-900">
            Pilihan
          </span>
        )}
      </div>

      <div className="p-3">
        <p className="line-clamp-2 min-h-10 text-xs font-semibold leading-5 text-stone-800">
          {product.name}
        </p>
        <p className="mt-2 text-sm font-extrabold text-amber-700">
          {productPriceLabel(product)}
        </p>
        <p className="mt-1 truncate text-[10px] text-stone-400">
          {product.category?.name || 'Produk BELUCIH'}
        </p>
        <ProductChatOfferBadge />
      </div>
    </button>
  );
}

export function AndroidHomePage({ onNavigate, onSelectProduct, onOpenKps }: Props) {
  const { settings } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [kpsBannerText, setKpsBannerText] = useState('Klik untuk melihat produk KPS');
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkUnreadNotifications() {
      try {
        const { data, error } = await (supabase as any)
          .from('push_notifications')
          .select('id')
          .in('status', ['sent', 'partial'])
          .order('created_at', { ascending: false })
          .limit(50);

        if (cancelled || error) return;
        const stored: string[] = JSON.parse(
          localStorage.getItem('belucih.readNotifications.v1') || '[]'
        );
        const readSet = new Set(stored);
        setHasUnreadNotifications((data || []).some(
          (item: { id: string }) => !readSet.has(item.id)
        ));
      } catch (err) {
        console.error('Gagal memeriksa notifikasi:', err);
      }
    }
    void checkUnreadNotifications();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.from('catalog_settings').select('banner_text').eq('id', 1).maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.banner_text) setKpsBannerText(data.banner_text);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHome() {
      setLoadingProducts(true);
      setLoadError(false);

      const [productResult, categoryResult] = await Promise.all([
        supabase
          .from('products')
          .select('*, category:categories(*)')
          .eq('catalog', 'belucih')
          .order('is_featured', { ascending: false })
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .eq('catalog', 'belucih')
          .order('sort_order', { ascending: true }),
      ]);

      if (cancelled) return;

      if (productResult.error) {
        console.error('Gagal memuat produk Android:', productResult.error);
        setLoadError(true);
      } else {
        setProducts(await attachVariantPrices((productResult.data || []) as Product[]));
      }

      if (categoryResult.error) {
        console.error('Gagal memuat kategori Android:', categoryResult.error);
      } else {
        setCategories((categoryResult.data || []) as Category[]);
      }

      setLoadingProducts(false);
    }

    void loadHome();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('id-ID');

    return products.filter((product) => {
      const matchesSearch =
        !keyword ||
        product.name.toLocaleLowerCase('id-ID').includes(keyword) ||
        (product.description || '').toLocaleLowerCase('id-ID').includes(keyword) ||
        (product.category?.name || '').toLocaleLowerCase('id-ID').includes(keyword);

      const matchesCategory =
        !activeCategory || product.category_id === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, activeCategory]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl overflow-hidden bg-[#faf9f6] pb-5">
      <div className="bg-white px-4 pb-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.store_name || 'BELUCIH'}
                className="h-12 w-12 shrink-0 rounded-xl object-contain"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-xl font-black text-stone-950">
                B
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-base font-black tracking-tight text-stone-900">
                {settings?.store_name || 'BELUCIH'}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-stone-500">
                {settings?.tagline || 'Temukan pilihan favoritmu'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              aria-label="Riwayat notifikasi"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-100 bg-stone-50 text-stone-700"
            >
              <Bell size={19} />
              {hasUnreadNotifications && (
                <span
                  aria-label="Ada notifikasi belum dibaca"
                  className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-stone-50 bg-red-500"
                />
              )}
            </button>
          </div>
        </div>

        <label className="mt-4 flex h-12 items-center gap-3 rounded-2xl border border-stone-100 bg-[#f7f6f2] px-4">
          <Search size={18} className="shrink-0 text-stone-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              if (event.target.value) setActiveCategory(null);
            }}
            placeholder="Cari produk yang kamu butuhkan..."
            aria-label="Cari produk"
            className="w-full min-w-0 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-xs font-semibold text-amber-700"
            >
              Hapus
            </button>
          )}
        </label>
      </div>

      <main className="space-y-7 px-4 pt-5">
        <section>
          <div className="relative min-h-[190px] overflow-hidden rounded-[26px] bg-stone-900">
            {settings?.hero_image_url && (
              <img
                src={settings.hero_image_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/65 to-stone-950/15" />

            <div className="relative z-10 flex min-h-[190px] flex-col items-start justify-center p-5 text-white">
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-wide">
                <Sparkles size={12} className="text-amber-300" />
                SELAMAT DATANG DI BELUCIH
              </span>

              <h1 className="max-w-[290px] text-[25px] font-black leading-tight tracking-tight">
                {settings?.hero_title || 'Pilihan terbaik untuk kebutuhanmu.'}
              </h1>

              <p className="mt-2 max-w-[280px] text-xs leading-5 text-white/80">
                {settings?.hero_subtitle ||
                  'Jelajahi koleksi produk pilihan dan temukan yang kamu cari.'}
              </p>

              <button
                type="button"
                onClick={() => onNavigate('products')}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-stone-950 transition active:scale-95"
              >
                Jelajahi Produk
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
                JELAJAHI
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-stone-900">
                Kategori produk
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('products')}
              className="inline-flex items-center gap-1 text-xs font-bold text-stone-500"
            >
              Semua <ChevronRight size={15} />
            </button>
          </div>

          {categories.length > 0 ? (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-bold transition ${
                  activeCategory === null
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 bg-white text-stone-600'
                }`}
              >
                Semua
              </button>

              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    setActiveCategory((current) =>
                      current === category.id ? null : category.id,
                    )
                  }
                  className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-bold transition ${
                    activeCategory === category.id
                      ? 'border-amber-500 bg-amber-400 text-stone-950'
                      : 'border-stone-200 bg-white text-stone-600'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-stone-200 p-4 text-xs text-stone-400">
              Kategori akan tampil di sini setelah tersedia.
            </p>
          )}
        </section>

        {!search && !activeCategory && (
          <button
            type="button"
            onClick={onOpenKps}
            className="group flex w-full items-center justify-between overflow-hidden rounded-xl border border-blue-200 bg-white text-left shadow-sm transition active:scale-[0.99]"
          >
            <span className="flex min-w-0 items-center gap-3 px-3 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-xs font-black tracking-tight text-white">KPS</span>
              <span className="min-w-0">
                <span className="block text-xs font-extrabold tracking-wide text-blue-800">KATALOG KPS</span>
                <span className="block truncate text-[11px] text-slate-600">{kpsBannerText}</span>
              </span>
            </span>
            <span className="mr-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <ChevronRight size={16} />
            </span>
          </button>
        )}

        {!search && !activeCategory && (
          <section aria-label="Banner promosi BELUCIH">
            <PromotionalBanners />
          </section>
        )}

        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
                KOLEKSI BELUCIH
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-stone-900">
                {search
                  ? 'Hasil pencarian'
                  : activeCategory
                    ? categories.find((item) => item.id === activeCategory)?.name || 'Produk'
                    : 'Semua produk'}
              </h2>
            </div>
            <span className="text-xs text-stone-400">
              {loadingProducts ? 'Memuat...' : `${filteredProducts.length} produk`}
            </span>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="aspect-[0.82] animate-pulse rounded-2xl bg-stone-200/70"
                />
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-100 bg-white p-5 text-center">
              <p className="text-sm font-bold text-stone-800">
                Produk belum dapat dimuat
              </p>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                Periksa koneksi internet, lalu coba buka kembali beranda.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white"
              >
                Coba lagi
              </button>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => (
                <ProductTile
                  key={product.id}
                  product={product}
                  onSelect={onSelectProduct}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-100 bg-white px-5 py-10 text-center">
              <Search size={27} className="mx-auto text-stone-300" />
              <p className="mt-3 text-sm font-bold text-stone-800">
                Produk belum ditemukan
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Coba kata kunci atau kategori yang lain.
              </p>
              {(search || activeCategory) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setActiveCategory(null);
                  }}
                  className="mt-4 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-stone-950"
                >
                  Tampilkan semua produk
                </button>
              )}
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() => onNavigate('products')}
          className="flex w-full items-center justify-between rounded-2xl bg-stone-900 p-4 text-left text-white"
        >
          <div>
            <p className="text-sm font-extrabold">Masih mencari sesuatu?</p>
            <p className="mt-1 text-xs text-stone-300">
              Lihat koleksi produk BELUCIH selengkapnya.
            </p>
          </div>
          <ArrowRight size={20} className="shrink-0 text-amber-400" />
        </button>
      </main>
    </div>
  );
}
