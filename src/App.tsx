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
  const { user, loading } = useAuth();
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

  // Owner routes
  if (isOwnerRoute) {
    if (!user) {
      return <OwnerLoginPage />;
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
