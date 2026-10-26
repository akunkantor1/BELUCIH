import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, Check, ChefHat, ChevronLeft, ChevronRight,
  MessageCircle, Minus, Plus, Star, X
} from 'lucide-react';
import { supabase, type Product, type ProductVariant, type ProductImage } from '@/lib/supabase';
import { formatPrice, buildWhatsAppLink } from '@/lib/helpers';
import { useSettings } from '@/context/SettingsContext';

type Props = {
  product: Product;
  onBack: () => void;
};

export function AndroidProductDetailPage({ product, onBack }: Props) {
  const { settings } = useSettings();
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedImage, setSelectedImage] = useState(product.main_image_url);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    setLoading(true);

    const [variantResult, imageResult] = await Promise.all([
      supabase.from('product_variants').select('*')
        .eq('product_id', product.id).order('created_at'),
      supabase.from('product_images').select('*')
        .eq('product_id', product.id).order('sort_order'),
    ]);

    const variantList = (variantResult.data as ProductVariant[] | null) || [];
    setVariants(variantList);
    setSelectedVariant((current) =>
      current && variantList.some((item) => item.id === current.id)
        ? variantList.find((item) => item.id === current.id) || null
        : variantList[0] || null
    );
    setImages((imageResult.data as ProductImage[] | null) || []);
    setLoading(false);
  }, [product.id]);

  useEffect(() => {
    setSelectedImage(product.main_image_url);
    setQty(1);
    void fetchDetails();
  }, [fetchDetails, product.main_image_url]);

  const allImages = Array.from(
    new Set([product.main_image_url, ...images.map((item) => item.image_url)].filter(Boolean))
  ) as string[];

  const currentImage = selectedImage || allImages[0] || null;
  const price = selectedVariant?.price || product.price;
  const soldOut = product.stock_status === 'Habis';
  const wa1 = settings?.whatsapp_1 || '081331767199';
  const wa2 = settings?.whatsapp_2 || '082123207202';
  const orderName = `${product.name}${selectedVariant ? ` - ${selectedVariant.name}` : ''}`;

  return (
    <div className="min-h-screen bg-[#f7f7f4] pb-8">
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-neutral-200 bg-white/95 px-4 py-3">
        <button onClick={onBack} aria-label="Kembali" className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 active:scale-95">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-neutral-500">BELUCIH / Produk</p>
          <p className="truncate text-sm font-semibold text-neutral-900">{product.name}</p>
        </div>
      </div>

      <div className="mx-auto max-w-xl">
        <div className="relative overflow-hidden bg-white">
          <div className="relative flex aspect-square max-h-[480px] items-center justify-center bg-white">
            {currentImage ? (
              <img src={currentImage} alt={product.name} className="h-full w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-neutral-300">
                <ChefHat className="h-16 w-16" />
                <span className="text-sm">Gambar belum tersedia</span>
              </div>
            )}

            {product.is_featured && (
              <span className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
                <Star className="h-3.5 w-3.5 fill-current" /> Unggulan
              </span>
            )}

            {allImages.length > 1 && (
              <>
                <button
                  aria-label="Gambar sebelumnya"
                  onClick={() => {
                    const index = allImages.indexOf(currentImage || '');
                    setSelectedImage(allImages[(index - 1 + allImages.length) % allImages.length]);
                  }}
                  className="absolute left-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  aria-label="Gambar berikutnya"
                  onClick={() => {
                    const index = allImages.indexOf(currentImage || '');
                    setSelectedImage(allImages[(index + 1) % allImages.length]);
                  }}
                  className="absolute right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-4">
              {allImages.map((img, index) => (
                <button
                  key={`${img}-${index}`}
                  onClick={() => setSelectedImage(img)}
                  aria-label={`Pilih gambar ${index + 1}`}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white ${
                    currentImage === img ? 'border-neutral-900' : 'border-neutral-200'
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-2 space-y-3">
          <section className="bg-white px-4 py-5">
            {product.category?.name && (
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
                {product.category.name}
              </p>
            )}
            <h1 className="text-xl font-bold leading-snug text-neutral-900">{product.name}</h1>
            <p className="mt-3 text-2xl font-extrabold text-neutral-900">
              {price ? formatPrice(price) : 'Harga hubungi admin'}
            </p>
            <div className="mt-4">
              {soldOut ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                  <X className="h-4 w-4" /> Stok habis
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <Check className="h-4 w-4" /> {product.stock_status || 'Tanyakan ketersediaan'}
                </span>
              )}
            </div>
          </section>

          {!loading && variants.length > 0 && (
            <section className="bg-white px-4 py-5">
              <h2 className="mb-3 text-sm font-bold text-neutral-900">Pilih varian</h2>
              <div className="flex flex-wrap gap-2">
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm ${
                      selectedVariant?.id === variant.id
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-white text-neutral-800'
                    }`}
                  >
                    <span className="block font-semibold">{variant.name}</span>
                    {variant.price != null && variant.price > 0 && (
                      <span className="mt-1 block text-xs opacity-80">{formatPrice(variant.price)}</span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="bg-white px-4 py-5">
            <h2 className="mb-3 text-sm font-bold text-neutral-900">Deskripsi produk</h2>
            {product.description ? (
              <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-600">{product.description}</p>
            ) : (
              <p className="text-sm text-neutral-400">Belum ada deskripsi produk.</p>
            )}
          </section>

          {!soldOut && (
            <section className="bg-white px-4 py-5">
              <h2 className="mb-3 text-sm font-bold text-neutral-900">Jumlah pesanan</h2>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">Jumlah barang</span>
                <div className="flex items-center gap-4 rounded-xl border border-neutral-200 p-1">
                  <button
                    onClick={() => setQty((value) => Math.max(1, value - 1))}
                    disabled={qty <= 1}
                    aria-label="Kurangi jumlah"
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-5 text-center font-bold">{qty}</span>
                  <button
                    onClick={() => setQty((value) => value + 1)}
                    aria-label="Tambah jumlah"
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="bg-white px-4 py-5">
            <h2 className="text-base font-bold text-neutral-900">Pesan melalui WhatsApp</h2>
            <p className="mt-1 text-sm leading-6 text-neutral-500">
              Hubungi admin untuk menanyakan produk dan melakukan pemesanan.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <a
                href={buildWhatsAppLink(wa1, orderName, qty)}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={soldOut}
                onClick={(event) => { if (soldOut) event.preventDefault(); }}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white ${
                  soldOut ? 'pointer-events-none bg-neutral-300' : 'bg-[#16834a] active:scale-[0.99]'
                }`}
              >
                <MessageCircle className="h-5 w-5" /> Pesan ke Admin 1
              </a>
              <a
                href={buildWhatsAppLink(wa2, orderName, qty)}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={soldOut}
                onClick={(event) => { if (soldOut) event.preventDefault(); }}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${
                  soldOut
                    ? 'pointer-events-none border-neutral-200 bg-neutral-100 text-neutral-400'
                    : 'border-neutral-200 bg-white text-neutral-800 active:scale-[0.99]'
                }`}
              >
                <MessageCircle className="h-5 w-5" /> Pesan ke Admin 2
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
