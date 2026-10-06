import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ChefHat, Lock, Mail, Eye, EyeOff, ArrowRight } from 'lucide-react';

export function OwnerLoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-screen bg-brown-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-brown-700/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-24 w-80 h-80 bg-brown-600/10 rounded-full blur-3xl" />

      <div className="max-w-sm w-full animate-scale-in relative">
        <div className="text-center mb-8">
          <div className="bg-brown-800 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-brown-700/50">
            <ChefHat className="h-7 w-7 text-brown-100" />
          </div>
          <h1 className="font-serif text-xl font-semibold text-white tracking-tight">Owner Dashboard</h1>
          <p className="text-brown-400 text-sm mt-1">CV RODAMAS BELUCIH</p>
        </div>

        <div className="bg-white rounded-3xl p-7 shadow-2xl shadow-brown-950/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-brown-400 mb-1.5 block uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brown-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-brown-50 border border-brown-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brown-400/30 focus:border-brown-400 transition-all"
                  placeholder="owner@rodamasbelucih.com"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-brown-400 mb-1.5 block uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brown-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-11 py-3 bg-brown-50 border border-brown-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brown-400/30 focus:border-brown-400 transition-all"
                  placeholder="Masukkan password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brown-400 hover:text-brown-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl px-3.5 py-2.5 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brown-800 hover:bg-brown-900 text-white py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              {loading ? 'Memproses...' : 'Masuk'}
              {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-5 bg-brown-50 rounded-xl p-3.5 text-xs border border-brown-100">
            <p className="font-bold text-brown-700 mb-1">Owner Access</p>
            <p className="text-brown-500">Silakan masuk dengan email dan password owner Anda.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
