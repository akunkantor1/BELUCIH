import { X } from 'lucide-react';
import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { supabase, type Product } from '@/lib/supabase';
import { Header, Footer } from '@/components/Storefront';
import { HomePage, ProductsPage, AboutPage, ContactPage } from '@/components/HomePage';
import { ProductDetailPage } from '@/components/ProductDetailPage';
import { OwnerLoginPage } from '@/components/OwnerLoginPage';
import { OwnerDashboard } from '@/components/OwnerDashboard';

type Page = 'home' | 'products' | 'about' | 'contact';

function AppContent() {
  const { user, isOwner, loading } = useAuth();
  const [page, setPage] = useState<Page>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Check if we're on the owner route
  const isOwnerRoute = window.location.pathname.startsWith('/owner');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brown-950">
        <div className="text-brown-200 font-semibold text-sm animate-fade-in">Memuat...</div>
      </div>
    );
  }

  // Owner routes — require both authentication AND owner status
  if (isOwnerRoute) {
    if (!user) {
      return <OwnerLoginPage />;
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

  // Storefront
  const navigate = (p: Page) => {
    setSelectedProduct(null);
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Refresh product data when opening detail
  const handleSelectProduct = async (p: Product) => {
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('id', p.id)
      .maybeSingle();
    selectProduct((data as Product) || p);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header onNavigate={navigate} currentPage={selectedProduct ? 'products' : page} />
      <main className="flex-1">
        {selectedProduct ? (
          <ProductDetailPage product={selectedProduct} onBack={() => setSelectedProduct(null)} />
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
