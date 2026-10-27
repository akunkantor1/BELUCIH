import { useEffect, useMemo, useState } from 'react';
import { Search, Store, Package, Info, X } from 'lucide-react';
import { supabase, type Category, type Product } from '@/lib/supabase';

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

export function KPSHomePage({ onBack, onSelectProduct, page }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('all');
  const [search, setSearch] = useState('');
  const [bannerText, setBannerText] = useState('Selamat datang di KPS');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(false);

      const [p, c, s] = await Promise.all([
        supabase.from('products').select('*, category:categories(*)')
          .eq('catalog', 'kps')
          .order('is_featured', { ascending: false })
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*')
          .eq('catalog', 'kps').order('sort_order'),
        supabase.from('catalog_settings').select('banner_text')
          .eq('catalog', 'kps').maybeSingle(),
      ]);

      if (!active) return;
      if (p.error) {
        console.error('Gagal memuat produk KPS:', p.error);
        setLoadError(true);
      } else {
        setProducts((p.data || []) as Product[]);
      }
      if (!c.error) setCategories((c.data || []) as Category[]);
      if (!s.error && s.data?.banner_text) setBannerText(s.data.banner_text);
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
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm active:scale-[0.99]">
          {p.main_image_url ? (
            <img src={p.main_image_url} alt={p.name} className="aspect-square w-full object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center bg-blue-50 text-blue-300">
              <Store size={38} />
            </div>
          )}
          <div className="p-3">
            <p className="line-clamp-2 text-sm font-bold text-slate-900">{p.name}</p>
            <p className="mt-1 text-xs text-slate-500">{p.category?.name || 'KPS'}</p>
            <p className="mt-2 text-sm font-extrabold text-blue-700">{formatPrice(p.price)}</p>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl bg-slate-50 pb-28">
      <header className="bg-blue-700 px-4 pb-5 pt-4 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white p-3 text-blue-700"><Store size={25} /></div>
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-blue-100">KATALOG TERPISAH</p>
            <h1 className="text-2xl font-extrabold">KPS</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-blue-100">
          {page === 'home' ? 'Selamat datang di katalog KPS.' :
           page === 'products' ? 'Temukan produk yang kamu butuhkan.' :
           'Informasi tentang KPS.'}
        </p>
      </header>

      <main className="px-4 pt-4">
        {page === 'home' ? (
          <>
            <div className="rounded-xl border border-blue-200 bg-white px-4 py-3">
  <button
    type="button"
    onClick={onBack}
    className="flex min-h-10 w-full items-center gap-3 text-left text-sm font-semibold text-blue-800"
  >
    <span aria-hidden="true" className="text-xl">←</span>
    <span className="flex-1">
      <span className="block">Kembali ke BELUCIH</span>
      <span className="mt-1 block text-xs font-normal text-slate-500">Kembali ke katalog utama</span>
    </span>
    <span aria-hidden="true" className="text-lg">›</span>
  </button>
</div>
            <h2 className="mt-5 text-lg font-extrabold text-slate-900">Pilihan Produk KPS</h2>
            <p className="mt-1 text-sm text-slate-500">Jelajahi katalog khusus KPS.</p>
            {productGrid}
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


