import { Phone, Clock, MapPin, Menu, X, ChefHat } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useState } from 'react';

type Props = {
  onNavigate: (page: 'home' | 'products' | 'about' | 'contact') => void;
  currentPage: string;
};

export function Header({ onNavigate, currentPage }: Props) {
  const { settings } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks: { label: string; page: 'home' | 'products' | 'about' | 'contact' }[] = [
    { label: 'Beranda', page: 'home' },
    { label: 'Produk', page: 'products' },
    { label: 'Tentang', page: 'about' },
    { label: 'Kontak', page: 'contact' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-brown-50/90 backdrop-blur-lg border-b border-brown-200/60">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <button onClick={() => onNavigate('home')} className="flex items-center gap-3 flex-shrink-0 group">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-10 w-10 md:h-11 md:w-11 rounded-xl object-cover ring-1 ring-brown-200" />
            ) : (
              <div className="h-10 w-10 md:h-11 md:w-11 bg-brown-800 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 group-hover:rotate-3 duration-300">
                <ChefHat className="h-5 w-5 md:h-6 md:w-6 text-brown-100" />
              </div>
            )}
            <div className="text-left">
              <h1 className="text-sm md:text-base font-extrabold text-brown-950 leading-tight tracking-tight">
                {settings?.store_name || 'CV RODAMAS BELUCIH'}
              </h1>
              <p className="text-[10px] md:text-[11px] text-brown-500 font-medium">{settings?.tagline || 'Baking Tool & Dekorasi Kue'}</p>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.page}
                onClick={() => onNavigate(link.page)}
                className={`relative px-4 py-2 text-sm font-semibold transition-all duration-200 rounded-lg ${
                  currentPage === link.page
                    ? 'text-brown-900 bg-brown-100'
                    : 'text-brown-600 hover:text-brown-900 hover:bg-brown-100/50'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          <button
            className="md:hidden p-2 rounded-lg text-brown-700 hover:bg-brown-100 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden bg-brown-50 border-t border-brown-200/60 px-5 py-3 space-y-0.5 animate-fade-in">
          {navLinks.map((link) => (
            <button
              key={link.page}
              onClick={() => { onNavigate(link.page); setMenuOpen(false); }}
              className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                currentPage === link.page ? 'bg-brown-100 text-brown-900' : 'text-brown-600 hover:bg-brown-100/50'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  const { settings } = useSettings();
  return (
    <footer className="bg-brown-950 text-brown-200 mt-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-10 w-10 rounded-xl object-cover" />
              ) : (
                <div className="h-10 w-10 bg-brown-800 rounded-xl flex items-center justify-center">
                  <ChefHat className="h-5 w-5 text-brown-100" />
                </div>
              )}
              <h3 className="text-white font-extrabold text-base">{settings?.store_name || 'CV RODAMAS BELUCIH'}</h3>
            </div>
            <p className="text-sm text-brown-400 leading-relaxed">{settings?.description}</p>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-brown-400" /> Alamat
              </h4>
              <p className="text-sm text-brown-400">{settings?.address}</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-brown-400" /> Jam Operasional
              </h4>
              <p className="text-sm text-brown-400">{settings?.operating_hours}</p>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-brown-400" /> WhatsApp Admin
            </h4>
            <div className="space-y-2.5">
              <a
                href={`https://wa.me/${settings?.whatsapp_1?.replace(/^0/, '62')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-brown-400 hover:text-white transition-colors group"
              >
                <span className="h-2 w-2 rounded-full bg-green-500 group-hover:scale-150 transition-transform" />
                Admin 1 — {settings?.whatsapp_1}
              </a>
              <a
                href={`https://wa.me/${settings?.whatsapp_2?.replace(/^0/, '62')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-brown-400 hover:text-white transition-colors group"
              >
                <span className="h-2 w-2 rounded-full bg-green-500 group-hover:scale-150 transition-transform" />
                Admin 2 — {settings?.whatsapp_2}
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-brown-800 mt-10 pt-6 text-center text-xs text-brown-500">
          &copy; {new Date().getFullYear()} {settings?.store_name || 'CV RODAMAS BELUCIH'}
        </div>
      </div>
    </footer>
  );
}
