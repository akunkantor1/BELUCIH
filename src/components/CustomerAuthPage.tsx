
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';

type Props = {
  onBack: () => void;
  onSuccess: () => void;
};

export function CustomerAuthPage({ onBack, onSuccess }: Props) {
  const { signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');

    const cleanEmail = email.trim().toLowerCase();

    if (mode === 'register' && name.trim().length < 2) {
      setError('Masukkan nama lengkap.');
      return;
    }
    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const { data, error: registerError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { full_name: name.trim() } },
        });

        if (registerError) throw registerError;

        if (data.session) {
          onSuccess();
          return;
        }

        setMessage(
          'Pendaftaran berhasil. Periksa email untuk konfirmasi akun, lalu login.'
        );
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (loginError) throw loginError;
        onSuccess();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Autentikasi gagal. Silakan coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'mt-2 w-full rounded-xl border border-[#766044]/60 bg-[#17130f] px-4 py-3 text-sm text-[#f8ead2] placeholder:text-[#8d8171] outline-none transition focus:border-[#e6bd79] focus:ring-2 focus:ring-[#e6bd79]/15';

  return (
    <section className="mx-auto w-full max-w-sm rounded-3xl border border-[#b99b6c]/25 bg-[#17130f]/95 p-5 text-[#f8ead2] shadow-2xl sm:p-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-2 text-sm text-[#b9aa94] transition hover:text-[#f3d7a2]"
      >
        <ArrowLeft size={17} />
        Kembali
      </button>

      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#b99b6c]/30 bg-[#e6bd79]/10 text-[#e6bd79]">
        {mode === 'login' ? <Mail size={24} /> : <ShieldCheck size={24} />}
      </div>

      <p className="mb-2 text-[10px] font-bold tracking-[0.28em] text-[#c4a777]">
        AKUN BELUCIH
      </p>

      <h2 className="font-serif text-3xl text-[#f5e5c9]">
        {mode === 'login' ? 'Selamat datang' : 'Buat akun'}
      </h2>

      <p className="mt-2 text-sm leading-6 text-[#b4a99b]">
        {mode === 'login'
          ? 'Masuk untuk melanjutkan perjalananmu bersama BELUCIH.'
          : 'Daftarkan akun untuk mengakses profil pelanggan BELUCIH.'}
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        {mode === 'register' && (
          <label className="block text-sm font-medium text-[#e8d9c2]">
            Nama lengkap
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap"
              required
              className={inputClass}
            />
          </label>
        )}

        <label className="block text-sm font-medium text-[#e8d9c2]">
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            required
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium text-[#e8d9c2]">
          Kata sandi
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 8 karakter"
            minLength={8}
            required
            className={inputClass}
          />
        </label>

        {mode === 'register' && (
          <label className="block text-sm font-medium text-[#e8d9c2]">
            Konfirmasi kata sandi
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi kata sandi"
              minLength={8}
              required
              className={inputClass}
            />
          </label>
        )}

        {error && (
          <p role="alert" className="break-words rounded-xl border border-red-400/20 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {message && (
          <p role="status" className="break-words rounded-xl border border-[#b99b6c]/20 bg-[#e6bd79]/10 p-3 text-sm text-[#f3d7a2]">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl border border-[#f1d6a0]/30 bg-gradient-to-r from-[#c49b5d] to-[#e6bd79] py-3.5 font-bold text-[#21180e] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? 'Memproses...'
            : mode === 'login'
              ? 'Masuk ke akun'
              : 'Buat akun'}
        </button>
      </form>

      {mode === 'login' && (
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setError('');
            setMessage('');
            setLoading(true);
            try {
              const result = await signInWithGoogle();
              if (result.error) setError(result.error);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Login Google gagal.');
            } finally {
              setLoading(false);
            }
          }}
          className="w-full rounded-xl border border-[#766044]/60 bg-[#211b14] py-3 font-semibold text-[#f8ead2] transition hover:bg-[#302519] disabled:opacity-50"
        >
          Lanjutkan dengan Google
        </button>
      )}

      <div className="my-5 h-px bg-gradient-to-r from-transparent via-[#b99b6c]/30 to-transparent" />

      <p className="text-center text-sm text-[#b4a99b]">
        {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
            setMessage('');
          }}
          className="font-bold text-[#e6bd79] underline-offset-4 hover:underline"
        >
          {mode === 'login' ? 'Daftar sekarang' : 'Masuk'}
        </button>
      </p>
    </section>
  );
}
