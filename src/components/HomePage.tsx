import { useEffect, useState, useCallback } from 'react';
import { supabase, type Product, type Category } from '@/lib/supabase';
import { formatPrice, buildWhatsAppLink } from '@/lib/helpers';
import { useSettings } from '@/context/SettingsContext';
import {
  ChefHat, MessageCircle, Package, Search, ArrowRight, MapPin, Clock,
  Phone, Sparkles, Check, X, Star, Download,
} from 'lucide-react';

type Props = {
  onNavigate: (page: 'home' | 'products' | 'about' | 'contact') => void;
  onSelectProduct: (product: Product) => void;
};

export function HomePage({ onNavigate, onSelectProduct }: Props) {
  const { settings } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8);
    setProducts((data as Product[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*').order('sort_order');
      setCategories((data as Category[]) || []);
    };
    fetchProducts();
    fetchCategories();
  }, [fetchProducts]);

  const hasHeroImage = !!settings?.hero_image_url;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brown-950">
        {hasHeroImage ? (
          <>
            <img src={settings!.hero_image_url!} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-brown-950/90 via-brown-950/70 to-brown-900/40" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brown-950 via-brown-900 to-brown-800" />
        )}

        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brown-700/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-24 w-80 h-80 bg-brown-600/10 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-24 md:py-32 lg:py-40">
          <div className="max-w-xl animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-brown-100/10 text-brown-200 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-5 backdrop-blur-sm border border-brown-700/30">
              <Sparkles className="h-3.5 w-3.5 text-brown-300" />
              {settings?.tagline || 'Supplier Baking Tool & Dekorasi Kue'}
            </div>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white mb-5 leading-[1.1] tracking-tight text-balance">
              {settings?.hero_title || 'CV RODAMAS BELUCIH'}
            </h1>
            <p className="text-base md:text-lg text-brown-300 mb-8 leading-relaxed max-w-lg">
              {settings?.hero_subtitle || 'Peralatan baking dan dekorasi kue terlengkap di Sidoarjo'}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('products')}
                className="bg-brown-100 text-brown-950 hover:bg-white px-5 py-3 rounded-xl text-sm font-bold transition-all hover:shadow-2xl hover:shadow-brown-900/50 flex items-center gap-2 group"
              >
                Lihat Produk
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href={buildWhatsAppLink(settings?.whatsapp_1 || '081331767199')}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-brown-800/40 hover:bg-brown-800/60 text-white border border-brown-700/40 px-5 py-3 rounded-xl text-sm font-bold transition-all backdrop-blur-sm flex items-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Hubungi Kami
              </a>
              <a
                href="https://github.com/akunkantor1/BELUCIH/releases/download/v1.0.0/app-release.apk"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-brown-800/40 hover:bg-brown-800/60 text-white border border-brown-700/40 px-5 py-3 rounded-xl text-sm font-bold transition-all backdrop-blur-sm flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Aplikasi BELUCIH
              </a>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full h-[40px] md:h-[60px]" preserveAspectRatio="none">
            <path d="M0 60V20C240 0 480 0 720 15C960 30 1200 30 1440 15V60H0Z" fill="#faf6f2" />
          </svg>
        </div>
      </section>

      {/* Info bar */}
      <section className="bg-brown-50 pt-2 pb-6">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <InfoItem icon={MapPin} label="Lokasi" value={settings?.address || ''} />
            <InfoItem icon={Clock} label="Jam Operasional" value={settings?.operating_hours || ''} />
            <InfoItem icon={Phone} label="WhatsApp" value={`${settings?.whatsapp_1} / ${settings?.whatsapp_2}`} />
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-14">
          <SectionHeader title="Kategori Produk" subtitle="Jelajahi koleksi berdasarkan kategori" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {categories.map((cat, i) => (
              <button
                key={cat.id}
                onClick={() => onNavigate('products')}
                className="group relative bg-white border border-brown-100 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-xl hover:shadow-brown-900/5 hover:border-brown-300 overflow-hidden animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-brown-50 rounded-full group-hover:scale-150 transition-transform duration-500" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-brown-100 group-hover:bg-brown-800 flex items-center justify-center mb-3 transition-colors duration-300">
                    <ChefHat className="h-6 w-6 text-brown-700 group-hover:text-brown-100 transition-colors duration-300" />
                  </div>
                  <p className="font-bold text-brown-950 text-sm">{cat.name}</p>
                  <div className="flex items-center gap-1 mt-2 text-brown-400 group-hover:text-brown-700 transition-colors">
                    <span className="text-xs font-medium">Lihat</span>
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-6 pb-14">
        <div className="flex items-end justify-between mb-8">
          <SectionHeader title="Produk Unggulan" subtitle="Pilihan terbaik dari koleksi kami" noMargin />
          <button
            onClick={() => onNavigate('products')}
            className="text-brown-600 hover:text-brown-900 text-sm font-semibold flex items-center gap-1 transition-colors flex-shrink-0 group"
          >
            Lihat Semua <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="bg-brown-100/50 rounded-3xl h-80 animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} onClick={() => onSelectProduct(product)} delay={i * 50} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-brown-100 flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-brown-700" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-brown-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-brown-900 font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, noMargin }: { title: string; subtitle?: string; noMargin?: boolean }) {
  return (
    <div className={noMargin ? '' : 'mb-8'}>
      <h2 className="font-serif text-2xl md:text-3xl font-semibold text-brown-950 tracking-tight">{title}</h2>
      {subtitle && <p className="text-brown-500 text-sm mt-1.5">{subtitle}</p>}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 bg-white rounded-3xl border border-brown-100">
      <Package className="h-12 w-12 text-brown-300 mx-auto mb-3" />
      <p className="text-brown-400 text-sm">Belum ada produk. Silakan cek lagi nanti.</p>
    </div>
  );
}

export function ProductCard({ product, onClick, delay }: { product: Product; onClick: () => void; delay?: number }) {
  const minVariantPrice = product.variants && product.variants.length > 0
    ? Math.min(...product.variants.filter(v => v.price).map(v => v.price!))
    : null;

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-3xl border border-brown-100 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-brown-900/8 hover:border-brown-200 animate-fade-up"
      style={{ animationDelay: `${delay || 0}ms` }}
    >
      <div className="aspect-square bg-brown-50 overflow-hidden relative">
        {product.main_image_url ? (
          <img
            src={product.main_image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat className="h-12 w-12 text-brown-200" />
          </div>
        )}
        {product.is_featured && (
          <span className="absolute top-3 left-3 bg-brown-900/90 text-brown-100 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
            <Star className="h-2.5 w-2.5 fill-brown-300 text-brown-300" /> Unggulan
          </span>
        )}
        {product.stock_status === 'Habis' && (
          <div className="absolute inset-0 bg-brown-50/70 flex items-center justify-center">
            <span className="bg-brown-900 text-white text-xs font-bold px-3.5 py-1.5 rounded-full">Stok Habis</span>
          </div>
        )}
      </div>
      <div className="p-4">
        {product.category && (
          <p className="text-[10px] text-brown-500 font-bold uppercase tracking-wider mb-1">{product.category.name}</p>
        )}
        <h3 className="text-sm font-bold text-brown-950 line-clamp-2 mb-2 leading-snug min-h-[2.5rem]">{product.name}</h3>
        <div className="flex items-center justify-between">
          {product.price ? (
            <p className="text-base font-extrabold text-brown-800">{formatPrice(product.price)}</p>
          ) : minVariantPrice ? (
            <p className="text-base font-extrabold text-brown-800">{formatPrice(minVariantPrice)}</p>
          ) : (
            <p className="text-xs text-brown-400 font-medium">Hubungi admin</p>
          )}
        </div>
        <div className="flex items-center gap-1 mt-2.5 pt-2.5 border-t border-brown-100">
          {product.stock_status === 'Habis' ? (
            <span className="flex items-center gap-1 text-brown-400 text-[11px] font-semibold">
              <X className="h-3 w-3" /> Habis
            </span>
          ) : (
            <span className="flex items-center gap-1 text-green-700 text-[11px] font-semibold">
              <Check className="h-3 w-3" /> {product.stock_status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductsPage({ onSelectProduct }: { onSelectProduct: (p: Product) => void }) {
  const { settings } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    let query = supabase
      .from('products')
      .select('*, category:categories(*)')
      .order('created_at', { ascending: false });
    if (selectedCategory) query = query.eq('category_id', selectedCategory);
    if (search) query = query.ilike('name', `%${search}%`);
    const { data } = await query;
    setProducts((data as Product[]) || []);
    setLoading(false);
  }, [selectedCategory, search]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*').order('sort_order');
      setCategories((data as Category[]) || []);
    };
    fetchCategories();
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-10">
      <h1 className="font-serif text-3xl md:text-4xl font-semibold text-brown-950 tracking-tight mb-1">Semua Produk</h1>
      <p className="text-brown-500 text-sm mb-8">Temukan peralatan baking dan dekorasi kue pilihan Anda</p>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-brown-400" />
        <input
          type="text"
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-brown-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brown-400/30 focus:border-brown-400 transition-all placeholder:text-brown-400"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            !selectedCategory ? 'bg-brown-800 text-white' : 'bg-white text-brown-600 hover:bg-brown-100 border border-brown-200'
          }`}
        >
          Semua
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              selectedCategory === cat.id ? 'bg-brown-800 text-white' : 'bg-white text-brown-600 hover:bg-brown-100 border border-brown-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="bg-brown-100/50 rounded-3xl h-80 animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} onClick={() => onSelectProduct(product)} delay={i * 40} />
          ))}
        </div>
      )}

      {settings && (
        <div className="mt-14 bg-brown-900 rounded-3xl p-8 md:p-10 text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-brown-700/30 rounded-full blur-3xl" />
          <div className="relative">
            <h3 className="text-white font-serif text-xl font-semibold mb-2">Tidak menemukan yang Anda cari?</h3>
            <p className="text-brown-300 text-sm mb-5">Hubungi admin kami via WhatsApp untuk produk lainnya</p>
            <div className="flex justify-center gap-3 flex-wrap">
              <a
                href={buildWhatsAppLink(settings.whatsapp_1)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
              >
                <MessageCircle className="h-4 w-4" /> Admin 1
              </a>
              <a
                href={buildWhatsAppLink(settings.whatsapp_2)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
              >
                <MessageCircle className="h-4 w-4" /> Admin 2
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AboutPage() {
  const { settings } = useSettings();
  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 py-12">
      <h1 className="font-serif text-3xl md:text-4xl font-semibold text-brown-950 tracking-tight mb-8">Tentang Kami</h1>
      <div className="space-y-6">
        <p className="text-brown-700 text-lg leading-relaxed">{settings?.description}</p>
        <p className="text-brown-700 leading-relaxed">
          {settings?.store_name} berlokasi di {settings?.address}. Kami berkomitmen menyediakan berbagai
          peralatan baking dan dekorasi kue berkualitas dengan harga terbaik untuk kebutuhan usaha dan
          hobi Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
        <div className="bg-white rounded-2xl p-6 border border-brown-100">
          <div className="w-11 h-11 rounded-xl bg-brown-100 flex items-center justify-center mb-3">
            <Clock className="h-5 w-5 text-brown-700" />
          </div>
          <h3 className="font-bold text-brown-950 mb-1">Jam Operasional</h3>
          <p className="text-brown-600 text-sm">{settings?.operating_hours}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-brown-100">
          <div className="w-11 h-11 rounded-xl bg-brown-100 flex items-center justify-center mb-3">
            <MapPin className="h-5 w-5 text-brown-700" />
          </div>
          <h3 className="font-bold text-brown-950 mb-1">Alamat</h3>
          <p className="text-brown-600 text-sm">{settings?.address}</p>
        </div>
      </div>
    </div>
  );
}

export function ContactPage() {
  const { settings } = useSettings();
  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 py-12">
      <h1 className="font-serif text-3xl md:text-4xl font-semibold text-brown-950 tracking-tight mb-1">Hubungi Kami</h1>
      <p className="text-brown-500 text-sm mb-8">Klik salah satu admin untuk chat via WhatsApp</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a
          href={buildWhatsAppLink(settings?.whatsapp_1 || '081331767199')}
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-white border border-brown-100 rounded-2xl p-7 transition-all duration-300 hover:shadow-xl hover:shadow-brown-900/5 hover:border-brown-300"
        >
          <div className="w-14 h-14 rounded-2xl bg-green-600 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <h3 className="font-bold text-brown-950 text-lg mb-1">Admin 1</h3>
          <p className="text-brown-700 text-lg font-medium">{settings?.whatsapp_1}</p>
          <p className="text-sm text-green-700 mt-2 flex items-center gap-1 font-semibold">
            Chat WhatsApp <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </p>
        </a>

        <a
          href={buildWhatsAppLink(settings?.whatsapp_2 || '082123207202')}
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-white border border-brown-100 rounded-2xl p-7 transition-all duration-300 hover:shadow-xl hover:shadow-brown-900/5 hover:border-brown-300"
        >
          <div className="w-14 h-14 rounded-2xl bg-green-600 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <h3 className="font-bold text-brown-950 text-lg mb-1">Admin 2</h3>
          <p className="text-brown-700 text-lg font-medium">{settings?.whatsapp_2}</p>
          <p className="text-sm text-green-700 mt-2 flex items-center gap-1 font-semibold">
            Chat WhatsApp <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </p>
        </a>
      </div>

      <div className="bg-white rounded-2xl p-7 mt-4 border border-brown-100 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brown-100 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-5 w-5 text-brown-700" />
          </div>
          <div>
            <h3 className="font-bold text-brown-950 text-sm">Lokasi Toko</h3>
            <p className="text-brown-600 text-sm">{settings?.address}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brown-100 flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5 text-brown-700" />
          </div>
          <div>
            <h3 className="font-bold text-brown-950 text-sm">Jam Operasional</h3>
            <p className="text-brown-600 text-sm">{settings?.operating_hours}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
