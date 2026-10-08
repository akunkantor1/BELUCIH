import { useState } from 'react';
import { supabase, type Product, type ProductVariant, type StoreSettings } from '@/lib/supabase';
import { formatPrice, formatWhatsAppNumber } from '@/lib/helpers';
import { FileText, Eye, X, ChefHat, Loader2 } from 'lucide-react';
import type { jsPDF } from 'jspdf';

type CatalogProduct = Product & { variants: ProductVariant[] };

type CatalogData = {
  products: CatalogProduct[];
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
  const products = (prodRes.data as Product[]) || [];

  const variantRes = await supabase
    .from('product_variants')
    .select('*')
    .in('product_id', products.map((p) => p.id))
    .order('created_at', { ascending: true });
  const variants = (variantRes.data as ProductVariant[]) || [];

  const variantMap = new Map<string, ProductVariant[]>();
  for (const v of variants) {
    if (!variantMap.has(v.product_id)) variantMap.set(v.product_id, []);
    variantMap.get(v.product_id)!.push(v);
  }

  return {
    products: products.map((p) => ({ ...p, variants: variantMap.get(p.id) || [] })),
    settings: (setRes.data as StoreSettings) || null,
  };
}

function groupByCategory(products: CatalogProduct[]): { categoryName: string; items: CatalogProduct[] }[] {
  const groups = new Map<string, CatalogProduct[]>();
  for (const p of products) {
    const key = p.category?.name ?? 'Lainnya';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  return Array.from(groups.entries()).map(([categoryName, items]) => ({ categoryName, items }));
}

function getImageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  return 'JPEG';
}

async function convertImageToPng(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function loadImageForPdf(url: string): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();

    if (blob.type === 'image/webp' || url.toLowerCase().includes('.webp')) {
      const png = await convertImageToPng(url);
      if (png) return { dataUrl: png, format: 'PNG' };
      return null;
    }

    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('read fail'));
      reader.readAsDataURL(blob);
    });
    return { dataUrl, format: getImageFormat(dataUrl) };
  } catch {
    return null;
  }
}

async function preloadImages(products: CatalogProduct[], settings: StoreSettings | null): Promise<Map<string, { dataUrl: string; format: 'PNG' | 'JPEG' } | null>> {
  const cache = new Map<string, { dataUrl: string; format: 'PNG' | 'JPEG' } | null>();
  const urls = new Set<string>();
  for (const p of products) {
    if (p.main_image_url) urls.add(p.main_image_url);
  }
  if (settings?.logo_url) urls.add(settings.logo_url);

  const entries = await Promise.all(
    Array.from(urls).map(async (url) => [url, await loadImageForPdf(url)] as const),
  );
  for (const [url, result] of entries) {
    cache.set(url, result);
  }
  return cache;
}

function getDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDateIndonesian(): string {
  const d = new Date();
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatPriceShort(price: number | null): string {
  if (price === null || price === undefined) return '';
  const num = Math.round(price);
  if (num >= 1000) {
    const k = num / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return num.toString();
}

// ===== PDF Layout Constants =====
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 28;
const CONTENT_W = PAGE_W - MARGIN * 2;
const GAP = 8;
const COLS = 4;
const CARD_W = (CONTENT_W - GAP * (COLS - 1)) / COLS;
const CARD_PAD = 6;
const IMG_H = 75;
const CARD_RADIUS = 4;

function drawCoverPage(doc: jsPDF, settings: StoreSettings | null, imgCache: Map<string, { dataUrl: string; format: 'PNG' | 'JPEG' } | null>) {
  doc.setFillColor(250, 248, 245);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Decorative top band
  doc.setFillColor(67, 52, 38);
  doc.rect(0, 0, PAGE_W, 120, 'F');

  // Accent line
  doc.setFillColor(180, 145, 100);
  doc.rect(0, 120, PAGE_W, 3, 'F');

  const centerY = 250;

  // Logo
  const logoSize = 70;
  const logoX = PAGE_W / 2 - logoSize / 2;
  const logoY = centerY - 40;

  const logoData = settings?.logo_url ? imgCache.get(settings.logo_url) : null;
  if (logoData) {
    try {
      doc.addImage(logoData.dataUrl, logoData.format, logoX, logoY, logoSize, logoSize, undefined, 'FAST');
    } catch {
      doc.setFillColor(180, 145, 100);
      doc.roundedRect(logoX, logoY, logoSize, logoSize, 8, 8, 'F');
    }
  } else {
    doc.setFillColor(180, 145, 100);
    doc.roundedRect(logoX, logoY, logoSize, logoSize, 8, 8, 'F');
    doc.setFontSize(28);
    doc.setTextColor(67, 52, 38);
    doc.setFont('helvetica', 'bold');
    doc.text('B', PAGE_W / 2, logoY + logoSize / 2 + 10, { align: 'center' });
  }

  // Store name
  doc.setTextColor(67, 52, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  const storeName = settings?.store_name || 'BELUCIH';
  doc.text(storeName, PAGE_W / 2, logoY + logoSize + 30, { align: 'center' });

  // KATALOG PRODUK
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(140, 110, 80);
  doc.text('KATALOG PRODUK', PAGE_W / 2, logoY + logoSize + 52, { align: 'center' });

  // Tagline
  if (settings?.tagline) {
    doc.setFontSize(10);
    doc.setTextColor(150, 130, 110);
    doc.text(settings.tagline, PAGE_W / 2, logoY + logoSize + 70, { align: 'center' });
  }

  // Contact info card
  const boxY = logoY + logoSize + 100;
  const boxH = 100;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(MARGIN + 50, boxY, CONTENT_W - 100, boxH, 6, 6, 'F');
  doc.setDrawColor(225, 220, 210);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN + 50, boxY, CONTENT_W - 100, boxH, 6, 6, 'S');

  let infoY = boxY + 20;
  const infoX = MARGIN + 68;
  const infoW = CONTENT_W - 136;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(67, 52, 38);
  doc.text('Informasi Kontak', infoX, infoY);
  infoY += 15;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 85, 70);
  doc.setFontSize(8);

  if (settings?.address) {
    const lines = doc.splitTextToSize(settings.address, infoW);
    doc.text(lines.slice(0, 2), infoX, infoY);
    infoY += lines.length > 1 ? 12 : 9;
  }
  if (settings?.whatsapp_1) {
    doc.text(`WhatsApp: ${settings.whatsapp_1}${settings?.whatsapp_2 ? ' / ' + settings.whatsapp_2 : ''}`, infoX, infoY);
    infoY += 11;
  }
  if (settings?.operating_hours) {
    doc.text(`Jam: ${settings.operating_hours}`, infoX, infoY);
  }

  // Date at bottom
  doc.setFontSize(8);
  doc.setTextColor(140, 120, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`Dibuat: ${formatDateIndonesian()}`, PAGE_W / 2, PAGE_H - 25, { align: 'center' });

  // Bottom band
  doc.setFillColor(67, 52, 38);
  doc.rect(0, PAGE_H - 6, PAGE_W, 6, 'F');
}

function calcCardHeight(product: CatalogProduct): number {
  let h = CARD_PAD + IMG_H + 6;
  h += 11; // name (1 line)
  if (product.description) h += 8;
  if (product.variants.length > 0) {
    h += 6; // "Varian" label
    h += product.variants.length * 7;
  } else if (product.price) {
    h += 4;
  }
  h += 8; // price line
  h += CARD_PAD;
  return h;
}

function drawCard(
  doc: jsPDF,
  product: CatalogProduct,
  x: number,
  y: number,
  imgCache: Map<string, { dataUrl: string; format: 'PNG' | 'JPEG' } | null>,
): void {
  const h = calcCardHeight(product);

  // Card background
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, CARD_W, h, CARD_RADIUS, CARD_RADIUS, 'F');
  doc.setDrawColor(228, 223, 213);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, CARD_W, h, CARD_RADIUS, CARD_RADIUS, 'S');

  // Image area
  const imgX = x + CARD_PAD;
  const imgY = y + CARD_PAD;
  const imgW = CARD_W - CARD_PAD * 2;

  const imgData = product.main_image_url ? imgCache.get(product.main_image_url) : null;
  if (imgData) {
    try {
      doc.addImage(imgData.dataUrl, imgData.format, imgX, imgY, imgW, IMG_H, undefined, 'FAST');
    } catch {
      drawPlaceholder(doc, imgX, imgY, imgW, IMG_H);
    }
  } else {
    drawPlaceholder(doc, imgX, imgY, imgW, IMG_H);
  }

  // Text area
  const textX = x + CARD_PAD;
  const textW = CARD_W - CARD_PAD * 2;
  let ty = imgY + IMG_H + 6;

  // Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 30, 20);
  const nameLines = doc.splitTextToSize(product.name, textW);
  doc.text(nameLines.slice(0, 2), textX, ty);
  ty += nameLines.length > 1 ? 12 : 9;

  // Description (1 line)
  if (product.description) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(120, 105, 90);
    const descLines = doc.splitTextToSize(product.description, textW);
    doc.text(descLines.slice(0, 1), textX, ty);
    ty += 7;
  }

  // Variants
  if (product.variants.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(140, 110, 80);
    doc.text('VARIAN', textX, ty);
    ty += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(80, 70, 60);
    for (const v of product.variants) {
      const vName = doc.splitTextToSize(v.name, textW - 30).slice(0, 1)[0] || v.name;
      const vPrice = v.price ? formatPriceShort(v.price) : '';
      doc.text(vName, textX, ty);
      if (vPrice) {
        doc.setTextColor(67, 52, 38);
        doc.text(vPrice, x + CARD_W - CARD_PAD, ty, { align: 'right' });
        doc.setTextColor(80, 70, 60);
      }
      ty += 7;
    }
  }

  // Price (if no variants, show product price)
  if (product.variants.length === 0 && product.price) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(67, 52, 38);
    doc.text(formatPrice(product.price), textX, ty + 2);
  }

  // Stock status badge
  if (product.stock_status) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    const isHabis = product.stock_status === 'Habis';
    doc.setTextColor(isHabis ? 180 : 60, isHabis ? 60 : 120, 50);
    doc.text(product.stock_status, x + CARD_W - CARD_PAD, y + h - CARD_PAD - 1, { align: 'right' });
  }
}

function drawPlaceholder(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFillColor(242, 238, 232);
  doc.roundedRect(x, y, w, h, 3, 3, 'F');
  doc.setFontSize(16);
  doc.setTextColor(205, 195, 180);
  doc.setFont('helvetica', 'normal');
  doc.text('?', x + w / 2, y + h / 2 + 5, { align: 'center' });
}

function drawCategoryHeader(doc: jsPDF, categoryName: string, y: number): number {
  const headerH = 18;
  doc.setFillColor(67, 52, 38);
  doc.roundedRect(MARGIN, y, CONTENT_W, headerH, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(245, 241, 236);
  doc.text(categoryName.toUpperCase(), MARGIN + 10, y + 12);
  return y + headerH + 6;
}

function drawPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  doc.setFontSize(7);
  doc.setTextColor(140, 120, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`BELUCIH — Katalog Produk — Halaman ${pageNum} dari ${totalPages}`, PAGE_W / 2, PAGE_H - 12, { align: 'center' });
}

function drawPageBg(doc: jsPDF) {
  doc.setFillColor(252, 250, 247);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
}

async function generatePdf(data: CatalogData): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });

  // Preload all images
  const imgCache = await preloadImages(data.products, data.settings);

  // Cover page
  drawPageBg(doc);
  drawCoverPage(doc, data.settings, imgCache);

  const groups = groupByCategory(data.products);
  const FOOTER_Y = PAGE_H - 22;
  const USABLE_BOTTOM = FOOTER_Y - 6;
  let pageNum = 2;
  let y = MARGIN;

  doc.addPage();
  drawPageBg(doc);
  y = MARGIN;

  for (const group of groups) {
    // Category header
    const headerH = 18 + 6;
    if (y + headerH > USABLE_BOTTOM) {
      drawPageFooter(doc, pageNum - 1, 0);
      doc.addPage();
      drawPageBg(doc);
      y = MARGIN;
      pageNum++;
    }
    y = drawCategoryHeader(doc, group.categoryName, y);

    // Products in 4-col grid
    let col = 0;
    let rowStartY = y;
    let rowMaxH = 0;

    for (const product of group.items) {
      const cardH = calcCardHeight(product);

      // Check if card fits in current row
      if (col >= COLS) {
        // Move to next row
        y = rowStartY + rowMaxH + GAP;
        col = 0;
        rowMaxH = 0;
      }

      // Check if card fits on current page
      const cardY = col === 0 ? y : rowStartY;
      if (cardY + cardH > USABLE_BOTTOM) {
        // New page
        drawPageFooter(doc, pageNum - 1, 0);
        doc.addPage();
        drawPageBg(doc);
        y = MARGIN;
        pageNum++;
        col = 0;
        rowStartY = y;
        rowMaxH = 0;
      }

      const cardX = MARGIN + col * (CARD_W + GAP);
      const finalY = col === 0 ? rowStartY : rowStartY;
      drawCard(doc, product, cardX, finalY, imgCache);

      if (cardH > rowMaxH) rowMaxH = cardH;
      col++;
    }

    // Advance past the last row
    y = rowStartY + rowMaxH + GAP + 4;
    col = 0;
    rowStartY = y;
    rowMaxH = 0;
  }

  // Add footers to all product pages
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
      <div className="bg-brown-50 rounded-2xl max-w-3xl w-full my-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
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
            {settings?.whatsapp_1 && <p className="text-xs text-brown-700"><span className="font-bold">WhatsApp:</span> {settings.whatsapp_1}{settings?.whatsapp_2 ? ' / ' + settings.whatsapp_2 : ''}</p>}
            {settings?.operating_hours && <p className="text-xs text-brown-700"><span className="font-bold">Jam:</span> {settings.operating_hours}</p>}
            <p className="text-xs text-brown-500 pt-1 border-t border-brown-200 mt-2"><span className="font-bold">Dibuat:</span> {formatDateIndonesian()}</p>
          </div>
        </div>

        {/* Products by category — 4 column grid */}
        <div className="p-5 space-y-6">
          {groups.map((g) => (
            <div key={g.categoryName}>
              <div className="bg-brown-800 text-brown-100 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide mb-3">
                {g.categoryName}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {g.items.map((p) => (
                  <div key={p.id} className="bg-white rounded-lg border border-brown-100 overflow-hidden flex flex-col">
                    {/* Image */}
                    <div className="aspect-square bg-brown-50 overflow-hidden">
                      {p.main_image_url ? (
                        <img src={p.main_image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ChefHat className="h-7 w-7 text-brown-200" />
                        </div>
                      )}
                    </div>
                    {/* Content */}
                    <div className="p-2 flex-1 flex flex-col">
                      <h4 className="font-bold text-brown-950 text-xs leading-tight line-clamp-2">{p.name}</h4>
                      {p.description && (
                        <p className="text-brown-400 text-[10px] line-clamp-1 mt-0.5">{p.description}</p>
                      )}
                      {/* Variants */}
                      {p.variants.length > 0 ? (
                        <div className="mt-1.5 space-y-0.5">
                          <p className="text-[9px] font-bold text-brown-500 uppercase">Varian</p>
                          {p.variants.map((v) => (
                            <div key={v.id} className="flex items-center justify-between text-[10px]">
                              <span className="text-brown-700 truncate pr-1">{v.name}</span>
                              {v.price && <span className="font-bold text-brown-900 flex-shrink-0">{formatPriceShort(v.price)}</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        p.price && <span className="font-extrabold text-brown-900 text-sm mt-auto pt-1">{formatPrice(p.price)}</span>
                      )}
                      {/* Status */}
                      {p.stock_status && (
                        <span className={`text-[9px] font-bold mt-1 ${p.stock_status === 'Habis' ? 'text-red-500' : 'text-green-700'}`}>
                          {p.stock_status}
                        </span>
                      )}
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
