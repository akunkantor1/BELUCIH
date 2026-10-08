import { useState } from 'react';
import { supabase, type Product, type StoreSettings } from '@/lib/supabase';
import { formatPrice, formatWhatsAppNumber } from '@/lib/helpers';
import { FileText, Eye, X, ChefHat, Loader2 } from 'lucide-react';
import type { jsPDF } from 'jspdf';

type CatalogData = {
  products: Product[];
  settings: StoreSettings | null;
};

async function fetchCatalogData(): Promise<CatalogData | null> {
  const [prodRes, setRes] = await Promise.all([
    supabase
      .from('products')
      .select('*, category:categories(*)')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase.from('store_settings').select('*').limit(1).maybeSingle(),
  ]);
  if (prodRes.error) return null;
  return {
    products: (prodRes.data as Product[]) || [],
    settings: (setRes.data as StoreSettings) || null,
  };
}

function groupByCategory(products: Product[]): { categoryName: string; items: Product[] }[] {
  const groups = new Map<string, Product[]>();
  for (const p of products) {
    const key = p.category?.name ?? 'Lainnya';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  return Array.from(groups.entries()).map(([categoryName, items]) => ({ categoryName, items }));
}

async function loadImageForPdf(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('read fail'));
      reader.readAsDataURL(blob);
    });
    return dataUrl;
  } catch {
    return null;
  }
}

function getDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDateIndonesian(): string {
  const d = new Date();
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CARD_H = 120;
const CARD_GAP = 12;
const CARDS_PER_PAGE = 5;
const CARD_IMG_W = 90;
const CARD_IMG_H = 100;

function drawCoverPage(doc: jsPDF, settings: StoreSettings | null) {
  doc.setFillColor(245, 241, 236);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Top bar
  doc.setFillColor(67, 52, 38);
  doc.rect(0, 0, PAGE_W, 8, 'F');

  // Logo
  const logoY = 200;
  if (settings?.logo_url) {
    loadImageForPdf(settings.logo_url).then((dataUrl) => {
      if (dataUrl) {
        try {
          const fmt = dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
          doc.addImage(dataUrl, fmt, PAGE_W / 2 - 40, logoY, 80, 80, undefined, 'FAST');
        } catch {
          doc.setFillColor(67, 52, 38);
          doc.roundedRect(PAGE_W / 2 - 40, logoY, 80, 80, 12, 12, 'F');
        }
      }
    });
  } else {
    doc.setFillColor(67, 52, 38);
    doc.roundedRect(PAGE_W / 2 - 40, logoY, 80, 80, 12, 12, 'F');
  }

  // Store name
  doc.setTextColor(67, 52, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  const storeName = settings?.store_name || 'BELUCIH';
  doc.text(storeName, PAGE_W / 2, logoY + 120, { align: 'center' });

  // KATALOG PRODUK
  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 100, 80);
  doc.text('KATALOG PRODUK', PAGE_W / 2, logoY + 145, { align: 'center' });

  // Tagline
  if (settings?.tagline) {
    doc.setFontSize(12);
    doc.setTextColor(140, 120, 100);
    doc.text(settings.tagline, PAGE_W / 2, logoY + 165, { align: 'center' });
  }

  // Contact info box
  const boxY = logoY + 200;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(MARGIN + 60, boxY, CONTENT_W - 120, 90, 8, 8, 'F');

  let infoY = boxY + 22;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(67, 52, 38);
  doc.text('Informasi Kontak', MARGIN + 80, infoY);
  infoY += 16;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 85, 70);
  doc.setFontSize(9);

  if (settings?.address) {
    doc.text(`Alamat: ${settings.address}`, MARGIN + 80, infoY);
    infoY += 13;
  }
  if (settings?.whatsapp_1) {
    const wa1 = formatWhatsAppNumber(settings.whatsapp_1);
    doc.text(`WhatsApp 1: +${wa1}`, MARGIN + 80, infoY);
    infoY += 13;
  }
  if (settings?.whatsapp_2) {
    const wa2 = formatWhatsAppNumber(settings.whatsapp_2);
    doc.text(`WhatsApp 2: +${wa2}`, MARGIN + 80, infoY);
    infoY += 13;
  }
  if (settings?.operating_hours) {
    doc.text(`Jam Operasional: ${settings.operating_hours}`, MARGIN + 80, infoY);
  }

  // Date at bottom
  doc.setFontSize(9);
  doc.setTextColor(120, 100, 80);
  doc.text(`Dibuat pada: ${formatDateIndonesian()}`, PAGE_W / 2, PAGE_H - 40, { align: 'center' });

  // Bottom bar
  doc.setFillColor(67, 52, 38);
  doc.rect(0, PAGE_H - 8, PAGE_W, 8, 'F');
}

function drawProductCard(
  doc: jsPDF,
  product: Product,
  y: number,
): void {
  const x = MARGIN;

  // Card background
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, CONTENT_W, CARD_H, 6, 6, 'F');
  doc.setDrawColor(230, 225, 215);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, CONTENT_W, CARD_H, 6, 6, 'S');

  // Image
  const imgX = x + 10;
  const imgY = y + 10;
  if (product.main_image_url) {
    loadImageForPdf(product.main_image_url).then((dataUrl) => {
      if (dataUrl) {
        try {
          const fmt = dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
          doc.addImage(dataUrl, fmt, imgX, imgY, CARD_IMG_W, CARD_IMG_H, undefined, 'FAST');
        } catch {
          drawPlaceholder(doc, imgX, imgY);
        }
      } else {
        drawPlaceholder(doc, imgX, imgY);
      }
    });
  } else {
    drawPlaceholder(doc, imgX, imgY);
  }

  // Text area
  const textX = imgX + CARD_IMG_W + 14;
  const textW = CONTENT_W - (textX - x) - 10;
  let ty = y + 22;

  // Category
  if (product.category?.name) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(140, 110, 80);
    doc.text(product.category.name.toUpperCase(), textX, ty);
    ty += 10;
  }

  // Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(40, 30, 20);
  const nameLines = doc.splitTextToSize(product.name, textW);
  doc.text(nameLines.slice(0, 2), textX, ty);
  ty += nameLines.length > 1 ? 13 : 9;

  // Description
  if (product.description) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 95, 80);
    const descLines = doc.splitTextToSize(product.description, textW);
    doc.text(descLines.slice(0, 2), textX, ty);
    ty += descLines.length > 1 ? 11 : 8;
  }

  // Stock status
  if (product.stock_status) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(product.stock_status === 'Habis' ? 180 : 60, product.stock_status === 'Habis' ? 60 : 120, 50);
    doc.text(product.stock_status, textX, ty);
  }

  // Price at bottom right
  if (product.price) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(67, 52, 38);
    doc.text(formatPrice(product.price), x + CONTENT_W - 10, y + CARD_H - 12, { align: 'right' });
  }
}

function drawPlaceholder(doc: jsPDF, x: number, y: number) {
  doc.setFillColor(240, 235, 228);
  doc.roundedRect(x, y, CARD_IMG_W, CARD_IMG_H, 4, 4, 'F');
  doc.setFontSize(20);
  doc.setTextColor(200, 190, 175);
  doc.setFont('helvetica', 'normal');
  doc.text('?', x + CARD_IMG_W / 2, y + CARD_IMG_H / 2 + 7, { align: 'center' });
}

function drawCategoryHeader(doc: jsPDF, categoryName: string, y: number): number {
  doc.setFillColor(67, 52, 38);
  doc.roundedRect(MARGIN, y, CONTENT_W, 20, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(245, 241, 236);
  doc.text(categoryName.toUpperCase(), MARGIN + 12, y + 14);
  return y + 20 + 8;
}

function drawPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  doc.setFontSize(7);
  doc.setTextColor(140, 120, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`BELUCIH - Katalog Produk - Halaman ${pageNum} dari ${totalPages}`, PAGE_W / 2, PAGE_H - 15, { align: 'center' });
}

async function generatePdf(data: CatalogData): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const groups = groupByCategory(data.products);

  // Cover page
  drawCoverPage(doc, data.settings);

  // Product pages
  let pageNum = 1;
  let cardsOnPage = 0;
  let y = MARGIN + 8;
  let needNewPage = true;

  // We'll build pages in a single pass
  const allItems: { type: 'category' | 'product'; name: string; product?: Product }[] = [];
  for (const g of groups) {
    allItems.push({ type: 'category', name: g.categoryName });
    for (const p of g.items) {
      allItems.push({ type: 'product', name: p.name, product: p });
    }
  }

  let i = 0;
  while (i < allItems.length) {
    if (needNewPage) {
      if (pageNum > 1) drawPageFooter(doc, pageNum, 0);
      doc.addPage();
      doc.setFillColor(252, 250, 247);
      doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
      y = MARGIN + 8;
      cardsOnPage = 0;
      pageNum++;
      needNewPage = false;
    }

    const item = allItems[i];
    if (item.type === 'category') {
      // Check space for category header + at least one card
      if (cardsOnPage >= CARDS_PER_PAGE - 1 || (cardsOnPage > 0 && y + 20 + 8 + CARD_H > PAGE_H - MARGIN - 20)) {
        needNewPage = true;
        continue;
      }
      y = drawCategoryHeader(doc, item.name, y);
      i++;
      continue;
    }

    // Product card
    if (cardsOnPage >= CARDS_PER_PAGE || y + CARD_H > PAGE_H - MARGIN - 20) {
      needNewPage = true;
      continue;
    }

    drawProductCard(doc, item.product!, y);
    y += CARD_H + CARD_GAP;
    cardsOnPage++;
    i++;
  }

  // Footer on last page
  // We don't know total pages ahead, but we used pageNum count
  // Add footers for all pages except cover
  const totalPages = pageNum;
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageFooter(doc, p - 1, totalPages - 1);
  }

  return doc;
}

export function CatalogSection() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<CatalogData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async () => {
    setError(null);
    setPreviewLoading(true);
    const data = await fetchCatalogData();
    setPreviewLoading(false);
    if (!data) {
      setError('Gagal memuat data produk. Silakan coba lagi.');
      return;
    }
    if (data.products.length === 0) {
      setError('Belum ada produk untuk dibuat katalog.');
      return;
    }
    setPreviewData(data);
    setPreviewOpen(true);
  };

  const handleDownload = async () => {
    setError(null);
    setPdfLoading(true);
    try {
      const data = await fetchCatalogData();
      if (!data) {
        setError('Gagal memuat data produk. Silakan coba lagi.');
        setPdfLoading(false);
        return;
      }
      if (data.products.length === 0) {
        setError('Belum ada produk untuk dibuat katalog.');
        setPdfLoading(false);
        return;
      }

      // Wait for images to load
      await Promise.all(
        data.products.map((p) =>
          p.main_image_url ? loadImageForPdf(p.main_image_url) : Promise.resolve(null),
        ),
      );
      if (data.settings?.logo_url) {
        await loadImageForPdf(data.settings.logo_url);
      }

      const doc = await generatePdf(data);
      doc.save(`BELUCIH-Katalog-${getDateString()}.pdf`);
    } catch {
      setError('Gagal membuat katalog. Silakan coba lagi.');
    }
    setPdfLoading(false);
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-brown-100 p-6">
        <div className="flex items-start gap-4">
          <div className="bg-brown-100 w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-brown-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-brown-950 text-sm">Katalog Produk</h3>
            <p className="text-brown-400 text-xs mt-0.5 mb-4">
              Buat katalog PDF dari produk aktif yang saat ini tersedia.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={handlePreview}
                disabled={previewLoading || pdfLoading}
                className="bg-brown-100 hover:bg-brown-200 text-brown-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Lihat Katalog
              </button>
              <button
                onClick={handleDownload}
                disabled={previewLoading || pdfLoading}
                className="bg-brown-800 hover:bg-brown-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {pdfLoading ? 'Membuat katalog...' : 'Download Katalog PDF'}
              </button>
            </div>
            {error && (
              <div className="mt-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl px-3.5 py-2.5 font-medium">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {previewOpen && previewData && (
        <CatalogPreview data={previewData} onClose={() => setPreviewOpen(false)} />
      )}
    </>
  );
}

function CatalogPreview({ data, onClose }: { data: CatalogData; onClose: () => void }) {
  const groups = groupByCategory(data.products);
  const settings = data.settings;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4 animate-fade-in">
      <div className="bg-brown-50 rounded-2xl max-w-2xl w-full my-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-brown-100 px-5 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <h3 className="font-bold text-brown-950 text-sm">Preview Katalog</h3>
          <button onClick={onClose} className="text-brown-400 hover:text-brown-900 p-1 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cover */}
        <div className="bg-white p-8 border-b border-brown-100">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-brown-800 flex items-center justify-center mx-auto mb-4 overflow-hidden">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <ChefHat className="h-9 w-9 text-brown-100" />
              )}
            </div>
            <h2 className="font-serif text-2xl font-bold text-brown-950">{settings?.store_name || 'BELUCIH'}</h2>
            <p className="text-brown-500 text-sm mt-1 uppercase tracking-wider">Katalog Produk</p>
            {settings?.tagline && <p className="text-brown-400 text-xs mt-1">{settings.tagline}</p>}
          </div>

          <div className="mt-6 bg-brown-50 rounded-xl p-4 space-y-1.5">
            {settings?.address && <p className="text-xs text-brown-700"><span className="font-bold">Alamat:</span> {settings.address}</p>}
            {settings?.whatsapp_1 && <p className="text-xs text-brown-700"><span className="font-bold">WhatsApp 1:</span> {settings.whatsapp_1}</p>}
            {settings?.whatsapp_2 && <p className="text-xs text-brown-700"><span className="font-bold">WhatsApp 2:</span> {settings.whatsapp_2}</p>}
            {settings?.operating_hours && <p className="text-xs text-brown-700"><span className="font-bold">Jam:</span> {settings.operating_hours}</p>}
            <p className="text-xs text-brown-500 pt-1 border-t border-brown-200 mt-2"><span className="font-bold">Dibuat:</span> {formatDateIndonesian()}</p>
          </div>
        </div>

        {/* Products by category */}
        <div className="p-5 space-y-6">
          {groups.map((g) => (
            <div key={g.categoryName}>
              <div className="bg-brown-800 text-brown-100 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide mb-3">
                {g.categoryName}
              </div>
              <div className="space-y-3">
                {g.items.map((p) => (
                  <div key={p.id} className="bg-white rounded-xl border border-brown-100 p-3 flex gap-3">
                    <div className="w-[72px] h-[72px] rounded-lg bg-brown-50 overflow-hidden flex-shrink-0">
                      {p.main_image_url ? (
                        <img src={p.main_image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ChefHat className="h-6 w-6 text-brown-200" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-brown-950 text-sm line-clamp-1">{p.name}</h4>
                      {p.description && <p className="text-brown-400 text-xs line-clamp-2 mt-0.5">{p.description}</p>}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className={`text-[10px] font-bold ${p.stock_status === 'Habis' ? 'text-red-500' : 'text-green-700'}`}>
                          {p.stock_status}
                        </span>
                        {p.price && <span className="font-extrabold text-brown-900 text-sm">{formatPrice(p.price)}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
