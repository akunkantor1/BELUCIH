import { supabase } from '@/lib/supabase';

export function formatWhatsAppNumber(num: string): string {
  let cleaned = num.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('62')) {
    // already correct
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function buildWhatsAppLink(phone: string, productName?: string, quantity?: number): string {
  const formatted = formatWhatsAppNumber(phone);
  let message: string;
  if (productName) {
    message = quantity && quantity > 1
      ? `Halo Admin, saya tertarik dengan produk: ${productName}. Saya ingin pesan ${quantity} pcs. Apakah masih tersedia?`
      : `Halo Admin, saya tertarik dengan produk: ${productName}. Apakah masih tersedia?`;
  } else {
    message = 'Halo Admin, saya ingin bertanya tentang produk baking tool.';
  }
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
}

export async function uploadImage(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from('store-assets').upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data } = supabase.storage.from('store-assets').getPublicUrl(fileName);
  return data.publicUrl;
}

export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return '';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
}
