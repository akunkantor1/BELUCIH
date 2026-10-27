import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Package, Search, SlidersHorizontal, X } from 'lucide-react';
import { supabase, type Category, type Product } from '@/lib/supabase';

type Props = {
  onSelectProduct: (product: Product) => void;
};

const formatPrice = (price: number | null) =>
  price == null
    ? 'Hubungi toko'
    : new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(price);

export function AndroidProductsPage({ onSelectProduct }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);

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
        console.error('Gagal memuat katalog Android:', productResult.error);
        setError(true);
      } else {
        setProducts((productResult.data || []) as Product[]);
      }

      if (categoryResult.error) {
        console.error('Gagal memuat kategori:', categoryResult.error);
      } else {
        setCategories((categoryResult.data || []) as Category[]);
      }

      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('id-ID');

    return products.filter((product) => {
      const matchesText =
        !keyword ||
        product.name.toLocaleLowerCase('id-ID').includes(keyword) ||
        (product.description || '').toLocaleLowerCase('id-ID').includes(keyword) ||
        (product.category?.name || '').toLocaleLowerCase('id-ID').includes(keyword);

      return matchesText && (!categoryId || product.category_id === categoryId);
    });
  }, [products, search, categoryId]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl bg-[#faf9f6] px-4 pb-8 pt-5">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
          KATALOG BELUCIH
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-black tracking-tight text-stone-900">
            Semua Produk
          </h1>
          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900">
            {loading ? 'Memuat...' : `${filteredProducts.length} produk`}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-stone-500">
          Temukan produk yang sesuai dengan kebutuhanmu.
        </p>
      </div>

      <label className="flex h-12 items-center gap-3 rounded-2xl border border-stone-100 bg-white px-4 shadow-sm">
        <Search size={18} className="shrink-0 text-stone-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama atau kategori produk..."
          aria-label="Cari produk"
          className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-stone-400"
        />
        {search && (
          <button
            type="button"
            aria-label="Hapus pencarian"
            onClick={() => setSearch('')}
            className="text-stone-400"
          >
            <X size={17} />
          </button>
        )}
      </label>

      <div className="mb-4 mt-5 flex items-center gap-2">
        <SlidersHorizontal size={16} className="shrink-0 text-stone-500" />
        <span className="text-xs font-bold text-stone-700">Kategori</span>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setCategoryId(null)}
          className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-bold ${
            !categoryId
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
              setCategoryId((current) =>
                current === category.id ? null : category.id,
              )
            }
            className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-bold ${
              categoryId === category.id
                ? 'border-amber-500 bg-amber-400 text-stone-950'
                : 'border-stone-200 bg-white text-stone-600'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="aspect-[0.78] animate-pulse rounded-2xl bg-stone-200/70"
            />
          ))}
        </div>
      ) : error ? (
        <div className="mt-3 rounded-2xl border border-red-100 bg-white p-6 text-center">
          <p className="text-sm font-bold text-stone-800">
            Katalog belum dapat dimuat
          </p>
          <p className="mt-2 text-xs leading-5 text-stone-500">
            Periksa koneksi internet dan coba muat ulang halaman.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white"
          >
            Coba lagi
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-stone-100 bg-white px-5 py-12 text-center">
          <Package size={30} className="mx-auto text-stone-300" />
          <p className="mt-3 text-sm font-bold text-stone-800">
            Produk tidak ditemukan
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Coba kata kunci atau kategori lainnya.
          </p>
          {(search || categoryId) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategoryId(null);
              }}
              className="mt-4 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-stone-950"
            >
              Reset filter
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => onSelectProduct(product)}
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
                  <div className="flex h-full items-center justify-center text-stone-300">
                    <Package size={34} strokeWidth={1.4} />
                  </div>
                )}
                {product.is_featured && (
                  <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-1 text-[9px] font-extrabold text-stone-950">
                    PILIHAN
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 min-h-10 text-xs font-semibold leading-5 text-stone-800">
                  {product.name}
                </p>
                <p className="mt-2 text-sm font-extrabold text-amber-700">
                  {formatPrice(product.price)}
                </p>
                <p className="mt-1 truncate text-[10px] text-stone-400">
                  {product.category?.name || 'Produk BELUCIH'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-xs font-bold text-stone-600"
      >
        <ArrowLeft size={15} className="rotate-90" />
        Kembali ke atas
      </button>
    </div>
  );
}

