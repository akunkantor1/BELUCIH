import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Camera, LogOut, Save, UserRound } from 'lucide-react';

type Props = { onBack: () => void };

export function CustomerProfilePage({ onBack }: Props) {
  const { user, signOut } = useAuth();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!user) {
        if (active) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('customer_profiles')
        .select('full_name, avatar_url, phone, address')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setNotice(`Gagal memuat profil: ${error.message}`);
      } else if (data) {
        setName(data.full_name ?? '');
        setAvatar(data.avatar_url ?? '');
        setPhone(data.phone ?? user.phone ?? '');
        setAddress(data.address ?? '');
      } else {
        setName(
          typeof user.user_metadata?.full_name === 'string'
            ? user.user_metadata.full_name
            : ''
        );
        setPhone(user.phone ?? '');
      }

      setLoading(false);
    }

    void loadProfile();
    return () => { active = false; };
  }, [user]);

  async function uploadAvatar(file?: File) {
    if (!user || !file) return;
    setNotice('');

    if (!file.type.startsWith('image/')) {
      setNotice('Pilih berkas gambar yang valid.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice('Ukuran foto maksimal 5 MB.');
      return;
    }

    setSaving(true);
    try {
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
      const originalExtension = file.name.split('.').pop()?.toLowerCase() ?? '';
      const ext = allowedExtensions.includes(originalExtension)
        ? originalExtension
        : 'jpg';
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from('customer-avatars')
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) throw error;

      setAvatar(path);
      setNotice('Foto berhasil diunggah. Tekan Simpan Profil untuk menyimpan perubahan.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Gagal mengunggah foto.');
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;

    setSaving(true);
    setNotice('');

    try {
      const { error } = await supabase.from('customer_profiles').upsert({
        user_id: user.id,
        full_name: name.trim(),
        avatar_url: avatar || null,
        phone: phone.trim() || null,
        address: address.trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (error) throw error;
      setNotice('Profil berhasil disimpan.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setNotice('');

    try {
      await signOut();
      window.location.href = '/';
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Gagal keluar. Silakan coba lagi.');
      setLoggingOut(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen grid place-items-center">Memuat profil...</main>;
  }

  if (!user) {
    window.location.replace('/login-pelanggan');
    return null;
  }

  return (
    <main className="min-h-screen bg-amber-50 px-5 py-8">
      <section className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-lg">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm text-stone-500"
        >
          <ArrowLeft size={17} /> Kembali
        </button>

        <h1 className="text-2xl font-extrabold text-stone-900">Profil Saya</h1>
        <p className="mt-2 text-sm text-stone-500">
          Kelola informasi akun BELUCIH Anda.
        </p>

        <div className="my-6 flex flex-col items-center gap-3">
          <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-amber-100 text-amber-800">
            {avatar ? <AvatarImage path={avatar} /> : <UserRound size={42} />}
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold">
            <Camera size={17} /> Pilih foto dari galeri
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={saving || loggingOut}
              onChange={(e) => {
                void uploadAvatar(e.currentTarget.files?.[0]);
                e.currentTarget.value = '';
              }}
            />
          </label>
          <p className="text-xs text-stone-500">Format JPG, PNG, WebP, atau GIF. Maksimal 5 MB.</p>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <label className="block text-sm font-semibold text-stone-700">
            Nama lengkap
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              autoComplete="name"
              className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3"
              placeholder="Nama lengkap Anda"
            />
          </label>

          <label className="block text-sm font-semibold text-stone-700">
            Email akun
            <input
              type="email"
              value={user.email ?? ''}
              readOnly
              className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"
            />
            <span className="mt-1 block text-xs font-normal text-stone-500">
              Email berasal dari akun Supabase Anda.
            </span>
          </label>

          <label className="block text-sm font-semibold text-stone-700">
            Nomor WhatsApp
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={25}
              autoComplete="tel"
              inputMode="tel"
              className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3"
              placeholder="Contoh: 081234567890"
            />
          </label>

          <label className="block text-sm font-semibold text-stone-700">
            Alamat lengkap
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={1000}
              rows={4}
              autoComplete="street-address"
              className="mt-2 w-full resize-y rounded-xl border border-stone-200 px-4 py-3"
              placeholder="Jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kota, provinsi, kode pos"
            />
          </label>

          {notice && (
            <p role="status" className="break-words rounded-xl bg-amber-50 p-3 text-sm text-stone-700">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-3.5 font-bold text-white disabled:opacity-50"
          >
            <Save size={17} /> {saving ? 'Menyimpan...' : 'Simpan Profil'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => void logout()}
          disabled={saving || loggingOut}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-3 font-semibold text-red-700 disabled:opacity-50"
        >
          <LogOut size={17} /> {loggingOut ? 'Keluar...' : 'Keluar'}
        </button>
      </section>
    </main>
  );
}

function AvatarImage({ path }: { path: string }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let active = true;

    if (/^https?:\/\//i.test(path)) {
      setUrl(path);
      return () => { active = false; };
    }

    setUrl('');
    supabase.storage
      .from('customer-avatars')
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (active && !error && data?.signedUrl) setUrl(data.signedUrl);
      })
      .catch(() => {
        if (active) setUrl('');
      });

    return () => { active = false; };
  }, [path]);

  return url
    ? <img src={url} alt="Foto profil" className="h-full w-full object-cover" />
    : <UserRound size={42} className="text-amber-800" />;
}
