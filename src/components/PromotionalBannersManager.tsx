import { useCallback, useEffect, useState } from 'react';
import { Image as ImageIcon, Pencil, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/helpers';

type Banner = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  target_url: string | null;
  sort_order: number;
  is_active: boolean;
  catalog?: 'belucih' | 'kps' | null;
};

const emptyForm = {
  title: '',
  description: '',
  image_url: '',
  target_url: '',
  sort_order: 0,
  is_active: true,
};

const table = () => (supabase as any).from('promotional_banners');

export function PromotionalBannersManager({ catalog }: { catalog: 'belucih' | 'kps' }) {
  const [items, setItems] = useState<Banner[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await table()
      .select('*')
      .eq('catalog', catalog)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      setMessage(`Gagal memuat banner: ${error.message}`);
      return;
    }
    setItems((data || []) as Banner[]);
  }, [catalog]);

  useEffect(() => { void load(); }, [load]);

  function startEdit(item: Banner) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description || '',
      image_url: item.image_url,
      target_url: item.target_url || '',
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setMessage('');
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setMessage('');
  }

  async function handleImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Pilih file gambar yang valid.');
      return;
    }

    setUploading(true);
    setMessage('');
    try {
      const url = await uploadImage(file, 'banners');
      if (typeof url !== 'string' || !url) {
        throw new Error('URL gambar tidak ditemukan dari proses upload.');
      }
      setForm((current) => ({ ...current, image_url: url }));
      setMessage('Gambar berhasil diunggah.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload gambar gagal.');
    } finally {
      setUploading(false);
    }
  }

  async function saveBanner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.image_url.trim()) {
      setMessage('Judul dan gambar wajib diisi.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim(),
        target_url: form.target_url.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
        catalog,
        updated_at: new Date().toISOString(),
      };

      const result = editingId
        ? await table().update(payload).eq('id', editingId).eq('catalog', catalog)
        : await table().insert(payload);

      if (result.error) throw result.error;

      resetForm();
      await load();
      setMessage(editingId ? 'Banner berhasil diperbarui.' : 'Banner berhasil ditambahkan.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan banner.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(item: Banner) {
    const { error } = await table()
      .update({ is_active: !item.is_active, updated_at: new Date().toISOString() })
      .eq('id', item.id).eq('catalog', catalog);

    if (error) {
      setMessage(`Gagal mengubah status: ${error.message}`);
      return;
    }
    await load();
  }

  async function deleteBanner(item: Banner) {
    if (!window.confirm(`Hapus banner "${item.title}"?`)) return;

    const { error } = await table().delete().eq('id', item.id).eq('catalog', catalog);
    if (error) {
      setMessage(`Gagal menghapus banner: ${error.message}`);
      return;
    }
    if (editingId === item.id) resetForm();
    await load();
    setMessage('Banner berhasil dihapus.');
  }

  const inputClass = 'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-stone-500';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-brown-950">Banner Promosi</h2>
        <p className="mt-1 text-sm text-brown-400">
          Atur gambar promo yang tampil di Beranda Android. Hanya banner aktif yang terlihat oleh pengunjung.
        </p>
      </div>

      <form onSubmit={saveBanner} className="space-y-4 rounded-2xl border border-brown-100 bg-white p-5 sm:p-6">
        <h3 className="font-semibold text-brown-900">
          {editingId ? 'Edit banner' : 'Tambah banner baru'}
        </h3>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Judul *</label>
          <input
            required
            maxLength={120}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            placeholder="Contoh: Promo spesial bulan ini"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Deskripsi</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
            rows={2}
            placeholder="Informasi singkat tentang promo"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium">Gambar banner *</label>
          {form.image_url && (
            <img src={form.image_url} alt="Pratinjau banner" className="max-h-48 w-full rounded-xl object-cover" />
          )}
          <input
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            className={inputClass}
            placeholder="URL gambar atau unggah gambar"
            required
          />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold hover:bg-stone-50">
            <Upload size={16} />
            {uploading ? 'Mengunggah...' : 'Pilih gambar'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                void handleImage(e.target.files?.[0]);
                e.currentTarget.value = '';
              }}
            />
          </label>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Tautan tujuan (opsional)</label>
          <input
            type="text"
            value={form.target_url}
            onChange={(e) => setForm({ ...form, target_url: e.target.value })}
            className={inputClass}
            placeholder="URL halaman produk atau promo"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Urutan tampil</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4"
            />
            Tampilkan di Beranda
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button disabled={busy || uploading} className="inline-flex items-center gap-2 rounded-xl bg-brown-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
            <Save size={16} />
            {busy ? 'Menyimpan...' : editingId ? 'Simpan perubahan' : 'Tambah banner'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm">
              <X size={16} /> Batal edit
            </button>
          )}
        </div>
        {message && <p role="status" className="text-sm text-stone-600">{message}</p>}
      </form>

      <div className="space-y-3">
        <h3 className="font-semibold text-brown-900">Daftar banner ({items.length})</h3>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
            <ImageIcon className="mx-auto mb-2" size={24} />
            Belum ada banner. Tambahkan banner melalui formulir di atas.
          </div>
        ) : items.map((item) => (
          <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-brown-100 bg-white p-4 sm:flex-row">
            <img src={item.image_url} alt={item.title} className="h-28 w-full rounded-xl object-cover sm:w-40" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold text-brown-950">{item.title}</h4>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                  {item.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              {item.description && <p className="mt-1 text-sm text-stone-500">{item.description}</p>}
              <p className="mt-1 text-xs text-stone-400">Urutan: {item.sort_order}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => startEdit(item)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold">
                  <Pencil size={14} /> Edit
                </button>
                <button type="button" onClick={() => void toggleActive(item)} className="rounded-lg border px-3 py-2 text-xs font-semibold">
                  {item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button type="button" onClick={() => void deleteBanner(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600">
                  <Trash2 size={14} /> Hapus
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
