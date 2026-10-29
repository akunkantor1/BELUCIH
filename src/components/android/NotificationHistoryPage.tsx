import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, ImageOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type NotificationItem = {
  id: string;
  kind: 'product_new' | 'broadcast';
  title: string;
  body: string;
  image_url: string | null;
  target_url: string | null;
  created_at: string;
};

export function NotificationHistoryPage({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error: queryError } = await (supabase as any)
        .from('push_notifications')
        .select('id,kind,title,body,image_url,target_url,created_at')
        .in('status', ['sent', 'partial'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (!active) return;
      if (queryError) {
        console.error('Gagal memuat riwayat notifikasi:', queryError);
        setError(true);
      } else {
        setItems((data || []) as NotificationItem[]);
        try {
          const stored: string[] = JSON.parse(
            localStorage.getItem('belucih.readNotifications.v1') || '[]'
          );
          const readSet = new Set(stored);
          (data || []).forEach((item: NotificationItem) => readSet.add(item.id));
          localStorage.setItem(
            'belucih.readNotifications.v1',
            JSON.stringify(Array.from(readSet))
          );
        } catch (err) {
          console.error('Gagal menyimpan status baca:', err);
        }
      }
      setLoading(false);
    }

    void load();
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-[70vh] bg-[#f7f7f4] px-4 pb-8 pt-5">
      <header className="mb-5 flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Kembali ke beranda"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white">
          <ArrowLeft size={19} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-stone-900">Notifikasi</h1>
          <p className="text-xs text-stone-500">Informasi terbaru dari BELUCIH</p>
        </div>
      </header>

      {loading ? (
        <p className="py-12 text-center text-sm text-stone-500">Memuat notifikasi...</p>
      ) : error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-stone-700">
          Riwayat belum dapat dimuat. Periksa izin baca notifikasi pelanggan di Supabase.
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-5 py-12 text-center">
          <Bell className="mx-auto mb-3 text-stone-400" size={30} />
          <p className="font-semibold text-stone-800">Belum ada notifikasi</p>
          <p className="mt-1 text-sm text-stone-500">Informasi produk baru dan pengumuman akan muncul di sini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="flex min-w-0 gap-3 overflow-hidden rounded-2xl border border-stone-200 bg-white p-3">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                {item.image_url ? (
                  <img src={item.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-stone-400">
                    <ImageOff size={24} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 py-1">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  {item.kind === 'product_new' ? 'Produk baru' : 'Pengumuman'}
                </p>
                <h2 className="break-words font-bold text-stone-900">{item.title}</h2>
                <p className="mt-1 whitespace-pre-line break-words text-sm leading-5 text-stone-600">{item.body}</p>
                <p className="mt-2 text-xs text-stone-400">
                  {new Date(item.created_at).toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
                {item.target_url ? (
                  <a href={item.target_url}
                    className="mt-2 inline-flex text-sm font-bold text-amber-800 underline underline-offset-4">
                    Lihat selengkapnya
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
