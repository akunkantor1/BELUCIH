import { MessageCircle } from 'lucide-react';

export function ProductChatOfferBadge() {
  return (
    <span className="mt-2 flex w-full items-center justify-between gap-1 rounded-lg bg-yellow-100 px-2 py-1.5 text-[9px] font-semibold leading-tight text-amber-950">
      <span>Penawaran harga murah chat admin</span>
      <MessageCircle size={13} className="shrink-0" aria-hidden="true" />
    </span>
  );
}
