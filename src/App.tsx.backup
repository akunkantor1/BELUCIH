import { X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { supabase, type Product } from '@/lib/supabase';
import { Header, Footer } from '@/components/Storefront';
import { HomePage, ProductsPage, AboutPage, ContactPage } from '@/components/HomePage';
import { ProductDetailPage } from '@/components/ProductDetailPage';
import { OwnerLoginPage } from '@/components/OwnerLoginPage';
import { OwnerDashboard } from '@/components/OwnerDashboard';

type Page = 'home' | 'products' | 'about' | 'contact';

function setProductQuery(productId: string | null) {
  const url = new URL(window.location.href);
  if (productId) url.searchParams.set('product', productId);
  else url.searchParams.delete('product');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function AppContent() {
  const { user, isOwner, loading } = useAuth();
  const [page, setPage] = useState<Page>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const openProductById = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) {
      console.error('Tidak dapat membuka produk dari notifikasi:', error);
      return;
    }
    setSelectedProduct(data as Product);
    setPage('products');
    setProductQuery(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectProduct = useCallback(async (product: Product) => {
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('id', product.id)
      .maybeSingle();
    const selected = (data as Product) || product;
    setSelectedProduct(selected);
    setPage('products');
    setProductQuery(selected.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const productId = new URLSearchParams(window.location.search).get('product');
    if (productId) void openProductById(productId);
  }, [openProductById]);

  // Register this Android installation for push messages and handle notification taps.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let active = true;
    let registrationListener: { remove: () => Promise<void> } | undefined;
    let actionListener: { remove: () => Promise<void> } | undefined;
    let errorListener: { remove: () => Promise<void> } | undefined;

    const setup = async () => {
      try {
        registrationListener = await PushNotifications.addListener('registration', async (token) => {
          if (!active || !token.value) return;
          const { error } = await supabase.functions.invoke('send-notification', {
            body: {
              action: 'register_token',
              token: token.value,
              platform: 'android',
            },
          });
          
if (error) {
  console.error('Gagal mendaftarkan token notifikasi:', error);
  alert(`Registrasi notifikasi gagal: ${error.message}`);
} else {
  console.info('Token notifikasi berhasil tersimpan di server.');
}
});

actionListener = await PushNotifications.addListener(
  'pushNotificationActionPerformed',
  (action) => {
          const data = action.notification.data || {};
          const productId = typeof data.productId === 'string' ? data.productId : '';
          const targetUrl = typeof data.targetUrl === 'string' ? data.targetUrl : '';
          if (productId) {
            void openProductById(productId);
            return;
          }
          if (targetUrl) {
            try {
              const target = new URL(targetUrl, window.location.origin);
              if (target.origin === window.location.origin) {
                window.location.href = `${target.pathname}${target.search}${target.hash}`;
              } else if (target.protocol === 'https:') {
                window.location.href = target.href;
              }
            } catch (error) {
              console.error('Tautan notifikasi tidak valid:', error);
            }
          }
        });

        errorListener = await PushNotifications.addListener('registrationError', (error) => {
          console.error('Registrasi push notification gagal:', error);
        });

        await PushNotifications.createChannel({
          id: 'default',
          name: 'Notifikasi BELUCIH',
          description: 'Informasi produk baru dan pengumuman BELUCIH',
          importance: 5,
          visibility: 1,
          vibration: true,
        });

        let permission = await PushNotifications.checkPermissions();
        if (permission.receive !== 'granted') {
          permission = await PushNotifications.requestPermissions();
        }
        if (permission.receive === 'granted' && active) {
          await PushNotifications.register();
        }
      } catch (error) {
        console.error('Inisialisasi push notification gagal:', error);
      }
    };

    void setup();
    return () => {
      active = false;
      void registrationListener?.remove();
      void actionListener?.remove();
      void errorListener?.remove();
    };
  }, [openProductById]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brown-950">
        <div className="text-brown-200 font-semibold text-sm animate-fade-in">Memuat...</div>
      </div>
    );
  }

  const currentPath = window.location.pathname;
  const isOwnerRoute = currentPath === '/owner' || currentPath.startsWith('/owner/');
  const isLoginRoute = currentPath === '/login-owner';

  if (isLoginRoute) {
    if (user && isOwner) {
      window.location.href = '/owner';
      return null;
    }
    return <OwnerLoginPage />;
  }

  if (isOwnerRoute) {
    if (!user) {
      window.location.href = '/login-owner';
      return null;
    }
    if (!isOwner) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-brown-950 px-4">
          <div className="text-center max-w-sm">
            <div className="bg-red-900/30 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <X className="h-7 w-7 text-red-300" />
            </div>
            <h1 className="font-serif text-xl font-semibold text-white mb-2">Akses Ditolak</h1>
            <p className="text-brown-400 text-sm mb-6">Akun Anda tidak memiliki izin owner. Hubungi administrator jika ini adalah kesalahan.</p>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="bg-brown-800 hover:bg-brown-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      );
    }
    return <OwnerDashboard />;
  }

  const navigate = (p: Page) => {
    setSelectedProduct(null);
    setProductQuery(null);
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backFromProduct = () => {
    setSelectedProduct(null);
    setProductQuery(null);
    setPage('products');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header onNavigate={navigate} currentPage={selectedProduct ? 'products' : page} />
      <main className="flex-1">
        {selectedProduct ? (
          <ProductDetailPage product={selectedProduct} onBack={backFromProduct} />
        ) : page === 'home' ? (
          <HomePage onNavigate={navigate} onSelectProduct={handleSelectProduct} />
        ) : page === 'products' ? (
          <ProductsPage onSelectProduct={handleSelectProduct} />
        ) : page === 'about' ? (
          <AboutPage />
        ) : page === 'contact' ? (
          <ContactPage />
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
