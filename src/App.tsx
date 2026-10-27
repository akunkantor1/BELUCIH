import { X, House, Package, Info, Phone, UserRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { supabase, type Product } from '@/lib/supabase';
import { Header, Footer } from '@/components/Storefront';
import { HomePage, ProductsPage, AboutPage, ContactPage } from '@/components/HomePage';
import { AndroidHomePage } from '@/components/android/AndroidHomePage';
import { KPSHomePage } from '@/components/android/KPSHomePage';
import { PromotionalBanners } from '@/components/android/PromotionalBanners';
import { AndroidProductsPage } from '@/components/android/AndroidProductsPage';
import { AndroidProductDetailPage } from '@/components/android/AndroidProductDetailPage';
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
  const { settings } = useSettings();
  const isAndroidApp = Capacitor.getPlatform() === 'android';
  const [page, setPage] = useState<Page>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductCatalog, setSelectedProductCatalog] = useState<'belucih' | 'kps'>('belucih');
  const [showKps, setShowKps] = useState(false);
  const [kpsPage, setKpsPage] = useState<'home' | 'products' | 'about'>('home');

  const openProductById = useCallback(async (id: string, catalog: 'belucih' | 'kps' = 'belucih') => {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('id', id)
      .eq('catalog', catalog)
      .maybeSingle();
    if (error || !data) {
      console.error('Tidak dapat membuka produk dari notifikasi:', error);
      return;
    }
    setSelectedProduct(data as Product);
    setSelectedProductCatalog(catalog);
    setShowKps(catalog === 'kps');
    if (catalog === 'kps') setKpsPage('products');
    setPage('products');
    setProductQuery(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectProduct = useCallback(async (product: Product) => {
    const catalog = product.catalog === 'kps' ? 'kps' : 'belucih';
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('id', product.id)
      .eq('catalog', catalog)
      .maybeSingle();
    const selected = (data as Product) || product;
    setSelectedProduct(selected);
    setSelectedProductCatalog(catalog);
    setShowKps(catalog === 'kps');
    if (catalog === 'kps') setKpsPage('products');
    setPage('products');
    setProductQuery(selected.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');
    const catalog = params.get('catalog') === 'kps' ? 'kps' : 'belucih';
    if (productId) void openProductById(productId, catalog);
    else if (catalog === 'kps') setShowKps(true);
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
            let catalog: 'belucih' | 'kps' = data.catalog === 'kps' ? 'kps' : 'belucih';
            if (targetUrl) {
              try { if (new URL(targetUrl, window.location.origin).searchParams.get('catalog') === 'kps') catalog = 'kps'; } catch { /* URL akan diabaikan */ }
            }
            void openProductById(productId, catalog);
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

  // Etalase pelanggan dapat diakses tanpa login.
const navigate = (p: Page) => {
    setShowKps(false);
    setSelectedProduct(null);
    setSelectedProductCatalog('belucih');
    setProductQuery(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('catalog');
    url.searchParams.delete('product');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backFromProduct = () => {
    setSelectedProduct(null);
    setProductQuery(null);
    if (selectedProductCatalog === 'kps') {
      setKpsPage('products');
      setShowKps(true);
      const url = new URL(window.location.href);
      url.searchParams.set('catalog', 'kps');
      url.searchParams.delete('product');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      return;
    }
    setPage('products');
  };

  const openKps = () => {
    setSelectedProduct(null);
    setSelectedProductCatalog('kps');
    setProductQuery(null);
    setPage('home');
    setKpsPage('home');
    setShowKps(true);
    const url = new URL(window.location.href);
    url.searchParams.set('catalog', 'kps');
    url.searchParams.delete('product');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isAndroidApp) {
    return (
      <div className="min-h-screen bg-[#f7f7f4] text-neutral-900 pb-24">
        <main className="min-h-[70vh]">
          {selectedProduct ? (
            <AndroidProductDetailPage product={selectedProduct} onBack={backFromProduct} />
          ) : showKps ? (
            <KPSHomePage
              onBack={() => {
                setShowKps(false);
                setSelectedProductCatalog('belucih');
                const url = new URL(window.location.href);
                url.searchParams.delete('catalog');
                url.searchParams.delete('product');
                window.history.replaceState({}, '', url.pathname + url.search + url.hash);
              }}
              onSelectProduct={handleSelectProduct}
              page={kpsPage}
              onNavigate={setKpsPage}
            />
          ) : page === 'home' ? (
            <>
              <AndroidHomePage onNavigate={navigate} onSelectProduct={handleSelectProduct} onOpenKps={openKps} />
              <PromotionalBanners />
            </>
          ) : page === 'products' ? (
            <AndroidProductsPage onSelectProduct={handleSelectProduct} />
          ) : page === 'about' ? (
            <AboutPage />
          ) : page === 'contact' ? (
            <ContactPage />
          ) : null}
        </main>

        {showKps ? (
          <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
            <div className="mx-auto grid max-w-lg grid-cols-3 gap-1">
              {[
                { id: 'home' as const, label: 'Beranda', icon: House },
                { id: 'products' as const, label: 'Produk', icon: Package },
                { id: 'about' as const, label: 'Tentang', icon: Info },
              ].map((item) => {
                const Icon = item.icon;
                const active = !selectedProduct && kpsPage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setSelectedProductCatalog('kps');
                      setProductQuery(null);
                      setKpsPage(item.id);
                      setShowKps(true);
                      const url = new URL(window.location.href);
                      url.searchParams.set('catalog', 'kps');
                      url.searchParams.delete('product');
                      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold ${
                      active ? 'bg-sky-50 text-sky-800' : 'text-slate-500'
                    }`}
                  >
                    <Icon size={20} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        ) : (
<nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
          <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
            {[
              { id: 'home', label: 'Beranda', icon: House },
              { id: 'products', label: 'Produk', icon: Package },
              { id: 'about', label: 'Tentang', icon: Info },
              { id: 'contact', label: 'Kontak', icon: Phone },
            ].map((item) => {
              const active = !selectedProduct && page === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id as Page)}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold transition-colors ${
                    active ? 'bg-amber-100 text-neutral-950' : 'text-neutral-500 hover:bg-neutral-100'
                  }`}
                >
                  <item.icon size={20} strokeWidth={1.8} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
        )}
      </div>
    );
  }

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
























