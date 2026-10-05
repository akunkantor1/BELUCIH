import { useEffect, useState, useCallback } from 'react';
import { supabase, type Product, type Category, type ProductVariant, type StoreSettings } from '@/lib/supabase';
import { uploadImage, formatPrice } from '@/lib/helpers';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import {
  Package, Settings, LogOut, Plus, Pencil, Trash2, X, Upload, ChefHat, Tag,
  Layers, Image as ImageIcon, Save, ChevronDown, ChevronRight, Check, ArrowLeft, Star,
} from 'lucide-react';

type Tab = 'products' | 'categories' | 'settings';

export function OwnerDashboard() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('products');

  return (
    <div className="min-h-screen bg-brown-50">
      <header className="bg-white border-b border-brown-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="bg-brown-800 w-9 h-9 rounded-xl flex items-center justify-center">
                <ChefHat className="h-5 w-5 text-brown-100" />
              </div>
              <div>
                <h1 className="font-extrabold text-brown-950 text-sm">Owner Dashboard</h1>
                <p className="text-[11px] text-brown-400">CV RODAMAS BELUCIH</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-brown-500 hover:text-red-500 text-sm font-semibold px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-brown-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <nav className="flex gap-1">
            {[
              { id: 'products' as Tab, label: 'Produk', icon: Package },
              { id: 'categories' as Tab, label: 'Kategori', icon: Tag },
              { id: 'settings' as Tab, label: 'Pengaturan Toko', icon: Settings },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  tab === t.id ? 'border-brown-800 text-brown-900' : 'border-transparent text-brown-400 hover:text-brown-700'
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-8">
        {tab === 'products' && <ProductsManager />}
        {tab === 'categories' && <CategoriesManager />}
        {tab === 'settings' && <StoreSettingsManager />}
      </div>
    </div>
  );
}

function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .order('created_at', { ascending: false });
    setProducts((data as Product[]) || []);
    setLoading(false);
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order');
    setCategories((data as Category[]) || []);
  };

  useEffect(() => { fetchProducts(); fetchCategories(); }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus produk ini?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  if (showForm || editing) {
    return (
      <ProductForm
        product={editing}
        categories={categories}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={() => { setShowForm(false); setEditing(null); fetchProducts(); }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-xl font-semibold text-brown-950 tracking-tight">Produk</h2>
          <p className="text-brown-400 text-sm mt-0.5">{products.length} produk</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-brown-800 hover:bg-brown-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" /> Tambah Produk
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-44 animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-brown-100">
          <Package className="h-10 w-10 text-brown-300 mx-auto mb-3" />
          <p className="text-brown-400 text-sm mb-4">Belum ada produk</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-brown-800 hover:bg-brown-900 text-white px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" /> Tambah Produk Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-brown-100 overflow-hidden hover:shadow-lg hover:shadow-brown-900/5 transition-shadow">
              <div className="flex gap-4 p-4">
                <div className="w-20 h-20 rounded-xl bg-brown-50 overflow-hidden flex-shrink-0">
                  {p.main_image_url ? (
                    <img src={p.main_image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat className="h-7 w-7 text-brown-200" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {p.category && <p className="text-[10px] text-brown-400 font-bold uppercase tracking-wide">{p.category.name}</p>}
                  <h3 className="font-bold text-brown-950 text-sm line-clamp-2">{p.name}</h3>
                  {p.price && <p className="text-brown-800 font-extrabold text-sm mt-1">{formatPrice(p.price)}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-semibold ${p.stock_status === 'Habis' ? 'text-brown-400' : 'text-green-700'}`}>
                      {p.stock_status}
                    </span>
                    {p.is_featured && (
                      <span className="flex items-center gap-1 bg-brown-100 text-brown-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Star className="h-2.5 w-2.5 fill-brown-700 text-brown-700" /> Unggulan
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex border-t border-brown-100">
                <button onClick={() => setEditing(p)} className="flex-1 py-2.5 text-sm text-brown-600 hover:bg-brown-50 flex items-center justify-center gap-1 transition-colors font-medium">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => handleDelete(p.id)} className="flex-1 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center justify-center gap-1 border-l border-brown-100 transition-colors font-medium">
                  <Trash2 className="h-3.5 w-3.5" /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductForm({ product, categories, onClose, onSaved }: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [categoryId, setCategoryId] = useState(product?.category_id || '');
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [stockStatus, setStockStatus] = useState(product?.stock_status || 'Tersedia');
  const [isFeatured, setIsFeatured] = useState(product?.is_featured || false);
  const [mainImage, setMainImage] = useState(product?.main_image_url || '');
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [extraImages, setExtraImages] = useState<{ id?: string; image_url: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [showVariants, setShowVariants] = useState(true);
  const [showImages, setShowImages] = useState(true);

  useEffect(() => {
    if (product) {
      supabase.from('product_variants').select('*').eq('product_id', product.id).order('created_at')
        .then(({ data }) => setVariants((data as ProductVariant[]) || []));
      supabase.from('product_images').select('*').eq('product_id', product.id).order('sort_order')
        .then(({ data }) => setExtraImages(((data as any[]) || []).map((d) => ({ id: d.id, image_url: d.image_url }))));
    }
  }, [product]);

  const handleUpload = async (file: File, target: 'main' | 'extra') => {
    setUploading(true);
    const url = await uploadImage(file, 'products');
    setUploading(false);
    if (!url) return;
    if (target === 'main') setMainImage(url);
    else setExtraImages([...extraImages, { image_url: url }]);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const payload = {
      name, description: description || null, category_id: categoryId || null,
      price: price ? parseFloat(price) : null, stock_status: stockStatus,
      is_featured: isFeatured, main_image_url: mainImage || null,
    };
    let productId = product?.id;
    if (product) {
      await supabase.from('products').update(payload).eq('id', product.id);
    } else {
      const { data } = await supabase.from('products').insert(payload).select().single();
      productId = (data as any)?.id;
    }
    if (productId) {
      if (product) await supabase.from('product_variants').delete().eq('product_id', productId);
      if (variants.length > 0) {
        await supabase.from('product_variants').insert(
          variants.map((v) => ({ product_id: productId, name: v.name, price: v.price, stock: v.stock || 0 }))
        );
      }
      if (product) await supabase.from('product_images').delete().eq('product_id', productId);
      if (extraImages.length > 0) {
        await supabase.from('product_images').insert(
          extraImages.map((img, idx) => ({ product_id: productId, image_url: img.image_url, sort_order: idx }))
        );
      }
    }
    setSaving(false);
    onSaved();
  };

  const inputCls = 'w-full px-3.5 py-2.5 bg-brown-50 border border-brown-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brown-400/30 focus:border-brown-400 transition-all';
  const labelCls = 'text-[11px] font-bold text-brown-400 mb-1.5 block uppercase tracking-wider';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onClose} className="text-brown-400 hover:text-brown-900 p-1 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="font-serif text-xl font-semibold text-brown-950 tracking-tight">{product ? 'Edit Produk' : 'Tambah Produk'}</h2>
      </div>

      <div className="bg-white rounded-2xl border border-brown-100 p-6 space-y-5">
        <div>
          <label className={labelCls}>Foto Utama Produk</label>
          <div className="flex items-center gap-4">
            <div className="w-28 h-28 rounded-xl bg-brown-50 border-2 border-dashed border-brown-200 overflow-hidden flex-shrink-0">
              {mainImage ? <img src={mainImage} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-7 w-7 text-brown-300" /></div>}
            </div>
            <label className="cursor-pointer bg-brown-100 hover:bg-brown-200 px-3.5 py-2 rounded-lg text-sm font-semibold text-brown-700 flex items-center gap-2 transition-colors">
              <Upload className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Upload'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'main')} />
            </label>
            {mainImage && <button onClick={() => setMainImage('')} className="text-red-500 text-sm hover:text-red-600 font-medium">Hapus</button>}
          </div>
        </div>

        <div>
          <label className={labelCls}>Nama Produk *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Nama produk" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Kategori</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`${inputCls} bg-white`}>
              <option value="">Pilih kategori</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Harga (opsional)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} placeholder="0" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Status Stok</label>
            <select value={stockStatus} onChange={(e) => setStockStatus(e.target.value)} className={`${inputCls} bg-white`}>
              <option value="Tersedia">Tersedia</option>
              <option value="Habis">Habis</option>
              <option value="Pre-order">Pre-order</option>
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="w-4 h-4 rounded text-brown-800 focus:ring-brown-400/30" />
              <span className="text-sm font-semibold text-brown-700">Produk Unggulan</span>
            </label>
          </div>
        </div>

        <div>
          <label className={labelCls}>Deskripsi</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputCls} placeholder="Deskripsi produk" />
        </div>

        <div className="border border-brown-100 rounded-xl">
          <button onClick={() => setShowVariants(!showVariants)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-brown-700">
            <span className="flex items-center gap-2"><Layers className="h-4 w-4 text-brown-400" /> Varian / Ukuran ({variants.length})</span>
            {showVariants ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {showVariants && (
            <div className="px-4 pb-4 space-y-2.5">
              {variants.map((v, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input type="text" value={v.name} onChange={(e) => { const n = [...variants]; n[idx] = { ...v, name: e.target.value }; setVariants(n); }} className={`${inputCls} flex-1`} placeholder="Nama varian" />
                  <input type="number" value={v.price?.toString() || ''} onChange={(e) => { const n = [...variants]; n[idx] = { ...v, price: e.target.value ? parseFloat(e.target.value) : null }; setVariants(n); }} className={`${inputCls} w-28`} placeholder="Harga" />
                  <input type="number" value={v.stock?.toString() || ''} onChange={(e) => { const n = [...variants]; n[idx] = { ...v, stock: parseInt(e.target.value) || 0 }; setVariants(n); }} className={`${inputCls} w-20`} placeholder="Stok" />
                  <button onClick={() => setVariants(variants.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-600 p-1"><X className="h-4 w-4" /></button>
                </div>
              ))}
              <button onClick={() => setVariants([...variants, { id: '', product_id: '', name: '', price: null, stock: 0 }])} className="text-brown-800 hover:text-brown-900 text-sm font-bold flex items-center gap-1">
                <Plus className="h-4 w-4" /> Tambah Varian
              </button>
            </div>
          )}
        </div>

        <div className="border border-brown-100 rounded-xl">
          <button onClick={() => setShowImages(!showImages)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-brown-700">
            <span className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-brown-400" /> Foto Tambahan ({extraImages.length})</span>
            {showImages ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {showImages && (
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {extraImages.map((img, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden group">
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setExtraImages(extraImages.filter((_, i) => i !== idx))} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
              <label className="cursor-pointer bg-brown-100 hover:bg-brown-200 px-3.5 py-2 rounded-lg text-sm font-semibold text-brown-700 flex items-center gap-2 transition-colors w-fit">
                <Upload className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Upload Foto'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'extra')} />
              </label>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1 bg-brown-800 hover:bg-brown-900 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button onClick={onClose} className="px-5 bg-brown-100 hover:bg-brown-200 text-brown-700 py-2.5 rounded-xl text-sm font-semibold transition-colors">Batal</button>
        </div>
      </div>
    </div>
  );
}

function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order');
    setCategories((data as Category[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    await supabase.from('categories').insert({ name, sort_order: categories.length });
    setName('');
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchCategories();
  };

  const handleRename = async (cat: Category) => {
    const newName = prompt('Nama kategori baru:', cat.name);
    if (newName && newName !== cat.name) {
      await supabase.from('categories').update({ name: newName }).eq('id', cat.id);
      fetchCategories();
    }
  };

  const inputCls = 'flex-1 px-3.5 py-2.5 bg-brown-50 border border-brown-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brown-400/30 focus:border-brown-400 transition-all';

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-brown-950 tracking-tight mb-6">Kategori</h2>

      <div className="bg-white rounded-2xl border border-brown-100 p-5 mb-5">
        <div className="flex gap-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} className={inputCls} placeholder="Nama kategori baru" />
          <button onClick={handleAdd} className="bg-brown-800 hover:bg-brown-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
            <Plus className="h-4 w-4" /> Tambah
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2.5">{[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-14" />)}</div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-xl border border-brown-100 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brown-100 flex items-center justify-center"><Tag className="h-4 w-4 text-brown-600" /></div>
                <span className="font-bold text-brown-950 text-sm">{cat.name}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleRename(cat)} className="text-brown-400 hover:text-brown-900 p-2 transition-colors"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(cat.id)} className="text-red-400 hover:text-red-500 p-2 transition-colors"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StoreSettingsManager() {
  const { settings, refresh } = useSettings();
  const [form, setForm] = useState<StoreSettings | null>(settings);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  if (!form) return <div className="text-center py-8 text-brown-400 text-sm">Memuat...</div>;

  const handleUpload = async (file: File, field: 'logo_url' | 'hero_image_url') => {
    setUploading(true);
    const url = await uploadImage(file, field === 'logo_url' ? 'logo' : 'hero');
    setUploading(false);
    if (url) setForm({ ...form, [field]: url });
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('store_settings').update({
      store_name: form.store_name, tagline: form.tagline, description: form.description,
      logo_url: form.logo_url, hero_image_url: form.hero_image_url, hero_title: form.hero_title,
      hero_subtitle: form.hero_subtitle, address: form.address, operating_hours: form.operating_hours,
      whatsapp_1: form.whatsapp_1, whatsapp_2: form.whatsapp_2,
    }).eq('id', form.id);
    setSaving(false);
    setSaved(true);
    refresh();
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (field: keyof StoreSettings, value: string) => setForm({ ...form, [field]: value });

  const inputCls = 'w-full px-3.5 py-2.5 bg-brown-50 border border-brown-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brown-400/30 focus:border-brown-400 transition-all';
  const labelCls = 'text-[11px] font-bold text-brown-400 mb-1.5 block uppercase tracking-wider';

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-brown-950 tracking-tight mb-6">Pengaturan Toko</h2>

      <div className="bg-white rounded-2xl border border-brown-100 p-6 space-y-5">
        <div>
          <label className={labelCls}>Logo Website</label>
          <div className="flex items-center gap-4">
            <div className="w-[72px] h-[72px] rounded-xl bg-brown-50 border-2 border-dashed border-brown-200 overflow-hidden flex-shrink-0">
              {form.logo_url ? <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ChefHat className="h-7 w-7 text-brown-300" /></div>}
            </div>
            <label className="cursor-pointer bg-brown-100 hover:bg-brown-200 px-3.5 py-2 rounded-lg text-sm font-semibold text-brown-700 flex items-center gap-2 transition-colors">
              <Upload className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Upload'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'logo_url')} />
            </label>
            {form.logo_url && <button onClick={() => update('logo_url', '')} className="text-red-500 text-sm font-medium">Hapus</button>}
          </div>
        </div>

        <div>
          <label className={labelCls}>Foto Hero Banner</label>
          <div className="flex items-center gap-4">
            <div className="w-[112px] h-[72px] rounded-xl bg-brown-50 border-2 border-dashed border-brown-200 overflow-hidden flex-shrink-0">
              {form.hero_image_url ? <img src={form.hero_image_url} alt="Hero" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-6 w-6 text-brown-300" /></div>}
            </div>
            <label className="cursor-pointer bg-brown-100 hover:bg-brown-200 px-3.5 py-2 rounded-lg text-sm font-semibold text-brown-700 flex items-center gap-2 transition-colors">
              <Upload className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Upload'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'hero_image_url')} />
            </label>
            {form.hero_image_url && <button onClick={() => update('hero_image_url', '')} className="text-red-500 text-sm font-medium">Hapus</button>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nama Toko" value={form.store_name} onChange={(v) => update('store_name', v)} inputCls={inputCls} labelCls={labelCls} />
          <Field label="Tagline" value={form.tagline} onChange={(v) => update('tagline', v)} inputCls={inputCls} labelCls={labelCls} />
        </div>

        <div>
          <label className={labelCls}>Deskripsi Toko</label>
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3} className={inputCls} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Judul Hero" value={form.hero_title} onChange={(v) => update('hero_title', v)} inputCls={inputCls} labelCls={labelCls} />
          <Field label="Subjudul Hero" value={form.hero_subtitle} onChange={(v) => update('hero_subtitle', v)} inputCls={inputCls} labelCls={labelCls} />
        </div>

        <Field label="Alamat" value={form.address} onChange={(v) => update('address', v)} inputCls={inputCls} labelCls={labelCls} />
        <Field label="Jam Operasional" value={form.operating_hours} onChange={(v) => update('operating_hours', v)} inputCls={inputCls} labelCls={labelCls} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="WhatsApp Admin 1" value={form.whatsapp_1} onChange={(v) => update('whatsapp_1', v)} inputCls={inputCls} labelCls={labelCls} />
          <Field label="WhatsApp Admin 2" value={form.whatsapp_2} onChange={(v) => update('whatsapp_2', v)} inputCls={inputCls} labelCls={labelCls} />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={handleSave} disabled={saving} className="bg-brown-800 hover:bg-brown-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          {saved && <span className="text-green-700 flex items-center gap-1 text-sm font-bold animate-fade-in"><Check className="h-4 w-4" /> Tersimpan</span>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, inputCls, labelCls }: {
  label: string; value: string; onChange: (v: string) => void; inputCls: string; labelCls: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </div>
  );
}
