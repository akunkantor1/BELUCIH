import { supabase, type Product, type ProductVariant } from '@/lib/supabase';

export async function attachVariantPrices(products: Product[]): Promise<Product[]> {
  if (products.length === 0) return products;

  const ids = products.map((product) => product.id);
  const { data, error } = await supabase
    .from('product_variants')
    .select('id, product_id, name, price, stock')
    .in('product_id', ids);

  if (error) {
    console.error('Gagal memuat harga varian produk:', error);
    return products;
  }

  const variants = (data || []) as ProductVariant[];
  return products.map((product) => ({
    ...product,
    variants: variants.filter((variant) => variant.product_id === product.id),
  }));
}

export function productPriceLabel(product: Product): string {
  const prices = (product.variants || [])
    .map((variant) => variant.price)
    .filter((price): price is number => typeof price === 'number' && Number.isFinite(price))
    .sort((a, b) => a - b);

  const format = (price: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(price);

  if (prices.length > 0) {
    const min = prices[0];
    const max = prices[prices.length - 1];
    return min === max ? format(min) : `${format(min)}–${format(max)}`;
  }

  return typeof product.price === 'number' ? format(product.price) : 'Hubungi toko';
}
