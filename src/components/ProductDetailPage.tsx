import { useEffect, useState, useCallback } from 'react';
import { supabase, type Product, type ProductVariant, type ProductImage } from '@/lib/supabase';
import { formatPrice, buildWhatsAppLink } from '@/lib/helpers';
import { useSettings } from '@/context/SettingsContext';
import { ArrowLeft, MessageCircle, ChefHat, Check, X, Star, Minus, Plus } from 'lucide-react';

type Props = {
  product: Product;
  onBack: () => void;
};

export function ProductDetailPage({ product, onBack }: Props) {
  const { settings } = useSettings();
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(product.main_image_url);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [qty, setQty] = useState(1);

  const fetchDetails = useCallback(async () => {
    const { data: vData } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', product.id)
      .order('created_at');
    const vList = (vData as ProductVariant[]) || [];
    setVariants(vList);
    if (vList.length > 0) setSelectedVariant(vList[0]);

    const { data: iData } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', product.id)
      .order('sort_order');
    setImages((iData as ProductImage[]) || []);
  }, [product.id]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const allImages = [product.main_image_url, ...images.map((i) => i.image_url)].filter(Boolean) as string[];
  const wa1 = settings?.whatsapp_1 || '081331767199';
  const wa2 = settings?.whatsapp_2 || '082123207202';
  const variantName = selectedVariant ? ` - ${selectedVariant.name}` : '';
  const orderProductName = `${product.name}${variantName}`;
  const disabled = product.stock_status === 'Habis';

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-brown-600 hover:text-brown-900 mb-6 transition-colors text-sm font-semibold group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Kembali ke Produk
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div className="animate-fade-up">
          <div className="aspect-square bg-brown-50 rounded-3xl overflow-hidden border border-brown-100">
            {selectedImage ? (
              <img src={selectedImage} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ChefHat className="h-16 w-16 text-brown-200" />
              </div>
            )}
          </div>

          {allImages.length > 1 && (
            <div className="flex gap-2.5 mt-3 overflow-x-auto scrollbar-hide">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-[72px] h-[72px] rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                    selectedImage === img ? 'border-brown-700 ring-2 ring-brown-300' : 'border-brown-200 hover:border-brown-400'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col animate-fade-up" style={{ animationDelay: '100ms' }}>
          {product.category && (
            <span className="inline-flex items-center gap-1.5 bg-brown-100 text-brown-700 text-xs font-bold px-3 py-1.5 rounded-lg mb-3 uppercase tracking-wide w-fit">
              <ChefHat className="h-3 w-3" /> {product.category.name}
            </span>
          )}
          <h1 className="font-serif text-2xl md:text-3xl font-semibold text-brown-950 tracking-tight mb-3 leading-tight">{product.name}</h1>

          {selectedVariant?.price ? (
            <p className="text-3xl font-extrabold text-brown-800 mb-4">{formatPrice(selectedVariant.price)}</p>
          ) : product.price ? (
            <p className="text-3xl font-extrabold text-brown-800 mb-4">{formatPrice(product.price)}</p>
          ) : (
            <p className="text-lg text-brown-400 font-medium mb-4">Harga hubungi admin</p>
          )}

          <div className="flex items-center gap-2 mb-5">
            {product.stock_status === 'Habis' ? (
              <span className="flex items-center gap-1.5 text-brown-400 text-sm font-semibold bg-brown-100 px-3 py-1.5 rounded-lg">
                <X className="h-4 w-4" /> Stok Habis
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-green-700 text-sm font-semibold bg-green-50 px-3 py-1.5 rounded-lg">
                <Check className="h-4 w-4" /> {product.stock_status}
              </span>
            )}
            {product.is_featured && (
              <span className="flex items-center gap-1 text-brown-700 text-sm font-semibold bg-brown-100 px-3 py-1.5 rounded-lg">
                <Star className="h-3.5 w-3.5 fill-brown-700 text-brown-700" /> Unggulan
              </span>
            )}
          </div>

          {variants.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-brown-900 mb-2.5">Pilih Varian / Ukuran</h3>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                      selectedVariant?.id === v.id
                        ? 'border-brown-800 bg-brown-800 text-white'
                        : 'border-brown-200 text-brown-700 hover:border-brown-400 bg-white'
                    }`}
                  >
                    {v.name}
                    {v.price ? ` — ${formatPrice(v.price)}` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.description && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-brown-900 mb-2">Deskripsi</h3>
              <p className="text-brown-700 text-sm leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          {/* Quantity selector */}
          {!disabled && (
            <div className="mb-5">
              <h3 className="text-sm font-bold text-brown-900 mb-2.5">Jumlah Pesanan</h3>
              <div className="inline-flex items-center bg-white border-2 border-brown-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                  className="w-11 h-11 flex items-center justify-center text-brown-700 hover:bg-brown-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Kurangi jumlah"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    setQty(isNaN(v) || v < 1 ? 1 : v);
                  }}
                  className="w-14 h-11 text-center text-sm font-bold text-brown-950 bg-transparent border-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => setQty(qty + 1)}
                  className="w-11 h-11 flex items-center justify-center text-brown-700 hover:bg-brown-50 transition-colors"
                  aria-label="Tambah jumlah"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-brown-400 mt-2 font-medium">{qty} pcs akan dipesan</p>
            </div>
          )}

          {/* WhatsApp order */}
          <div className="mt-auto bg-brown-50 rounded-2xl p-5 border border-brown-100">
            <p className="text-sm font-bold text-brown-950 mb-1">Pesan via WhatsApp</p>
            <p className="text-xs text-brown-500 mb-4">Pilih admin untuk memesan produk ini</p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={buildWhatsAppLink(wa1, orderProductName, qty)}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${disabled ? 'bg-brown-300 text-brown-500 cursor-not-allowed pointer-events-none' : 'bg-green-600 hover:bg-green-700 text-white'}`}
              >
                <MessageCircle className="h-4 w-4" />
                Admin 1
              </a>
              <a
                href={buildWhatsAppLink(wa2, orderProductName, qty)}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${disabled ? 'bg-brown-300 text-brown-500 cursor-not-allowed pointer-events-none' : 'bg-green-600 hover:bg-green-700 text-white'}`}
              >
                <MessageCircle className="h-4 w-4" />
                Admin 2
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
