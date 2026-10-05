import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type StoreSettings = {
  id: string;
  store_name: string;
  tagline: string;
  description: string;
  logo_url: string | null;
  hero_image_url: string | null;
  hero_title: string;
  hero_subtitle: string;
  address: string;
  operating_hours: string;
  whatsapp_1: string;
  whatsapp_2: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  price: number | null;
  stock: number;
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
};

export type Product = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  main_image_url: string | null;
  price: number | null;
  stock_status: string;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  category?: Category | null;
  variants?: ProductVariant[];
  images?: ProductImage[];
};
