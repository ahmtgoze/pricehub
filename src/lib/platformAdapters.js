/**
 * Platform Adapter sistemi
 * Her adapter: id, name, fileType, parseLine, parseFile, getRowKey, mapToInternal, exportRow
 */

import { supabase } from '@/api/supabaseClient';

// Storage bucket private olduğu için saklanan public-formatlı URL'i
// signed URL'e çevirir. URL zaten signed/imzalı veya farklı bir kaynaktan
// geliyorsa (örn. ?token= içeriyorsa) olduğu gibi döner.
async function resolveFileUrl(originalFileUrl) {
  if (!originalFileUrl) return originalFileUrl;
  const marker = '/storage/v1/object/public/excel-files/';
  const idx = originalFileUrl.indexOf(marker);
  if (idx === -1) return originalFileUrl; // signed url veya farklı kaynak, dokunma

  const filePath = originalFileUrl.slice(idx + marker.length).split('?')[0];
  const { data, error } = await supabase.storage
    .from('excel-files')
    .createSignedUrl(filePath, 60 * 10); // 10 dakika geçerli

  if (error || !data?.signedUrl) {
    console.error('Signed URL oluşturulamadı:', error);
    return originalFileUrl; // fallback — eski davranış, hata zaten görünür olur
  }
  return data.signedUrl;
}

// CSV satırını parse eder (noktalı virgül veya virgül ayraçlı)
export function parseCSVLine(line, delimiter = ';') {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === delimiter && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += char; }
  }
  result.push(current.trim());
  return result;
}

export function escapeCSVCell(val, delimiter = ';') {
  const str = String(val ?? '');
  return str.includes(delimiter) || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

// Orijinal CSV record string'inde yalnızca belirtilen sütunun değerini değiştirir.
// Diğer tüm byte'lar olduğu gibi korunur — Shopify import uyumluluğu için kritik.
function replaceCSVField(record, colIdx, newValue, delimiter = ',') {
  let fieldStart = 0;
  let col = 0;
  let inQuotes = false;
  let i = 0;
  while (i <= record.length) {
    const ch = record[i];
    if (!inQuotes && (ch === delimiter || i === record.length)) {
      if (col === colIdx) {
        const fieldEnd = i;
        const escaped = newValue.includes(delimiter) || newValue.includes('"') || newValue.includes('\n')
          ? `"${newValue.replace(/"/g, '""')}"`
          : newValue;
        return record.slice(0, fieldStart) + escaped + record.slice(fieldEnd);
      }
      fieldStart = i + 1;
      col++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    }
    i++;
  }
  return record;
}

// Multiline-aware CSV parse: tırnak içindeki newline'ları doğru işler
function parseCSVText(text, delimiter = ';') {
  const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Önce logical records'a ayır (tırnak içindeki newline'ları koru)
  const records = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === '\n' && !inQuotes) {
      records.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) records.push(current);

  const headers = parseCSVLine(records[0], delimiter);
  const rows = [];
  // lines (raw) — export için orijinal satırları da tut
  const lines = records;
  for (let i = 1; i < records.length; i++) {
    if (!records[i].trim()) { rows.push(null); continue; }
    const values = parseCSVLine(records[i], delimiter);
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  return { headers, rows, lines };
}

// ─────────────────────────────────────────────
// SHOPIFY ADAPTER — Standart Shopify Admin Export (products_export.csv)
// Shopify Admin → Ürünler → Dışa Aktar → CSV formatında indir
// ─────────────────────────────────────────────
export const SHOPIFY_ADAPTER = {
  id: 'shopify',
  name: 'Shopify',
  fileType: 'csv',
  delimiter: ',',
  priceMapKey: 'variant_sku', // Variant SKU sütunu → variant_sku

  // SKU boşsa Title + Option kombinasyonunu anahtar olarak üret
  _makeKey: (title, row) => {
    const opts = [row['Option1 Value'], row['Option2 Value'], row['Option3 Value']]
      .filter(v => v && v.trim() && v.trim() !== 'Default Title')
      .join('|');
    return opts ? `${title}|${opts}` : title;
  },

  parseFile: async (file) => {
    const text = await file.text();
    const { rows } = parseCSVText(text, ',');
    let lastTitle = '';

    // Birinci geçiş: her title için gerçek varyantı olan satır sayısını hesapla
    const titleHasVariants = {};
    let scanTitle = '';
    for (const row of rows.filter(Boolean)) {
      if (row['Title'] && row['Title'].trim()) scanTitle = row['Title'].trim();
      const MEANINGLESS = /^(default title|default|-)$/i;
      const hasOpt = [row['Option1 Value'], row['Option2 Value'], row['Option3 Value']]
        .some(v => v && v.trim() && !MEANINGLESS.test(v.trim()));
      if (hasOpt) titleHasVariants[scanTitle] = true;
    }

    return rows.filter(Boolean).map(row => {
      // Shopify çok satırlı yapı: Title yalnızca ilk varyant satırında dolu
      if (row['Title'] && row['Title'].trim()) lastTitle = row['Title'].trim();
      const skuRaw = (row['Variant SKU'] || '').trim();

      // Anlamsız / boş option değerlerini filtrele
      const MEANINGLESS = /^(default title|default|-)$/i;
      const cleanOption = (v) => {
        const s = (v || '').trim();
        return (!s || MEANINGLESS.test(s)) ? '' : s;
      };
      const o1 = cleanOption(row['Option1 Value']);
      const o2 = cleanOption(row['Option2 Value']);
      const o3 = cleanOption(row['Option3 Value']);

      // Bu ürünün varyantları varsa ve bu satırda hiç option yoksa → boş/sahte satır, atla
      if (titleHasVariants[lastTitle] && !o1 && !o2 && !o3 && !skuRaw) return null;

      // Title'da zaten geçen option değerlerini varyant başlığına ekleme
      // Binlik noktası (1.000 vs 1000) farkına karşı normalize ederek karşılaştır
      const normTitle = normTR(lastTitle).replace(/(?<=\d)\.(?=\d{3})/g, '');
      const uniqueOptions = [o1, o2, o3].filter(v => {
        if (!v) return false;
        const normV = normTR(v).replace(/(?<=\d)\.(?=\d{3})/g, '');
        return !normTitle.includes(normV);
      });
      const variantTitle = uniqueOptions.join(' / ');

      const compositeKey = `${lastTitle}|${o1}|${o2}|${o3}`;
      const sku = skuRaw || compositeKey;
      return {
        product_name: lastTitle,
        variant_title: variantTitle,
        sku,
        barcode: (row['Variant Barcode'] || '').trim(),
        price: parseFloat((row['Variant Price'] || '0').replace(',', '.')) || 0,
        compare_price: parseFloat((row['Variant Compare At Price'] || '0').replace(',', '.')) || 0,
        raw: row,
      };
    }).filter(Boolean);
  },

  getRowKey: (item) => item.sku || item.barcode || item.product_name,

  exportFile: async (originalFileUrl, priceMap) => {
    const resolvedUrl = await resolveFileUrl(originalFileUrl);
    const resp = await fetch(resolvedUrl);
    const text = await resp.text();
    const { headers, lines } = parseCSVText(text, ',');
    const priceColIdx = headers.findIndex(h => h === 'Variant Price');
    const skuColIdx = headers.findIndex(h => h === 'Variant SKU');
    const titleColIdx = headers.findIndex(h => h === 'Title');
    const opt1Idx = headers.findIndex(h => h === 'Option1 Value');
    const opt2Idx = headers.findIndex(h => h === 'Option2 Value');
    const opt3Idx = headers.findIndex(h => h === 'Option3 Value');
    // Shopify re-import sırasında "geçersiz kategori" hatasına yol açan sütunları boşalt
    const categoryColIndices = headers.reduce((acc, h, idx) => {
      if (h === 'Product Category' || h === 'Google Shopping / Google Product Category') acc.push(idx);
      return acc;
    }, []);

    let lastTitle = '';
    const outputLines = [lines[0]]; // Header satırı AYNEN korunur
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) { outputLines.push(lines[i]); continue; }
      const values = parseCSVLine(lines[i], ',');
      const rowTitle = titleColIdx >= 0 ? (values[titleColIdx] || '').trim() : '';
      if (rowTitle) lastTitle = rowTitle;
      const skuRaw = skuColIdx >= 0 ? (values[skuColIdx] || '').trim() : '';
      const o1 = opt1Idx >= 0 ? ((values[opt1Idx] || '').trim() === 'Default Title' ? '' : (values[opt1Idx] || '').trim()) : '';
      const o2 = opt2Idx >= 0 ? ((values[opt2Idx] || '').trim() === 'Default Title' ? '' : (values[opt2Idx] || '').trim()) : '';
      const o3 = opt3Idx >= 0 ? ((values[opt3Idx] || '').trim() === 'Default Title' ? '' : (values[opt3Idx] || '').trim()) : '';
      const compositeKey = `${lastTitle}|${o1}|${o2}|${o3}`;
      const lookupKey = skuRaw || compositeKey;

      let line = lines[i];
      // Sadece Variant Price hücresini güncelle
      if (priceColIdx >= 0 && lookupKey && priceMap[lookupKey] != null) {
        line = replaceCSVField(line, priceColIdx, String(priceMap[lookupKey]), ',');
      }
      // Kategori sütunlarını boşalt (ilk satırda bile sıfırla, sonraki satırlar zaten boş)
      for (const catIdx of categoryColIndices) {
        line = replaceCSVField(line, catIdx, '', ',');
      }
      outputLines.push(line);
    }
    // UTF-8 BOM korunur, satırlar \n ile birleştirilir
    return { content: '\uFEFF' + outputLines.join('\n'), mimeType: 'text/csv;charset=utf-8;', ext: 'csv' };
  }
};

// ─────────────────────────────────────────────
// İKAS ADAPTER
// ─────────────────────────────────────────────
export const IKAS_ADAPTER = {
  id: 'ikas',
  name: 'ikas',
  fileType: 'csv',
  delimiter: ',',
  priceMapKey: 'variant_sku', // ikas'ta SKU sütunu = variant_sku

  parseFile: async (file) => {
    const text = await file.text();
    const { rows } = parseCSVText(text, ',');
    return rows.filter(Boolean).map(row => ({
      product_name: (row['Product Name'] || row['Ürün Adı'] || '').trim(),
      variant_title: (row['Variant Title'] || row['Varyant'] || '').trim(),
      sku: (row['SKU'] || row['Stok Kodu'] || '').trim(),
      barcode: (row['Barcode'] || row['Barkod'] || '').trim(),
      price: parseFloat((row['Price'] || row['Fiyat'] || '0').replace(',', '.')) || 0,
      compare_price: parseFloat((row['Compare At Price'] || row['Karşılaştırma Fiyatı'] || '0').replace(',', '.')) || 0,
      raw: row,
    }));
  },

  getRowKey: (item) => item.sku || item.barcode || item.product_name,

  exportFile: async (originalFileUrl, priceMap) => {
    const resolvedUrl = await resolveFileUrl(originalFileUrl);
    const resp = await fetch(resolvedUrl);
    const text = await resp.text();
    const { headers, lines } = parseCSVText(text, ',');
    const priceColIdx = headers.findIndex(h => h === 'Price' || h === 'Fiyat');
    const skuColIdx = headers.findIndex(h => h === 'SKU' || h === 'Stok Kodu');

    const outputLines = [lines[0]];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) { outputLines.push(lines[i]); continue; }
      const values = parseCSVLine(lines[i], ',');
      const sku = skuColIdx >= 0 ? (values[skuColIdx] || '').trim() : '';
      if (priceColIdx >= 0 && sku && priceMap[sku] != null) {
        values[priceColIdx] = String(priceMap[sku]);
      }
      outputLines.push(values.map(v => escapeCSVCell(v, ',')).join(','));
    }
    return { content: '\uFEFF' + outputLines.join('\n'), mimeType: 'text/csv;charset=utf-8;', ext: 'csv' };
  }
};

// ─────────────────────────────────────────────
// TİCIMAX ADAPTER
// ─────────────────────────────────────────────
export const TICIMAX_ADAPTER = {
  id: 'ticimax',
  name: 'Ticimax',
  fileType: 'xlsx',
  priceMapKey: 'variant_sku', // Ticimax'ta Stok Kodu/SKU = variant_sku

  parseFile: async (file) => {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);
    return data.map(row => ({
      product_name: (row['Ürün Adı'] || row['Urun Adi'] || '').toString().trim(),
      variant_title: (row['Varyant'] || row['Renk'] || row['Beden'] || '').toString().trim(),
      sku: (row['Stok Kodu'] || row['SKU'] || row['Barkod'] || '').toString().trim(),
      barcode: (row['Barkod'] || row['Stok Kodu'] || '').toString().trim(),
      price: parseFloat(row['Fiyat'] || row['Satış Fiyatı'] || 0) || 0,
      compare_price: parseFloat(row['Piyasa Fiyatı'] || row['Karşılaştırma Fiyatı'] || 0) || 0,
      raw: row,
    }));
  },

  getRowKey: (item) => item.sku || item.barcode || item.product_name,

  exportFile: async (originalFileUrl, priceMap) => {
    const XLSX = await import('xlsx');
    const resolvedUrl = await resolveFileUrl(originalFileUrl);
    const resp = await fetch(resolvedUrl);
    const arrayBuffer = await resp.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const wsName = wb.SheetNames[0];
    const ws = wb.Sheets[wsName];

    // Sütun indexlerini header row'dan bul
    const range = XLSX.utils.decode_range(ws['!ref']);
    const headerRowIdx = range.s.r;
    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: headerRowIdx, c })];
      headers.push(cell ? String(cell.v || '') : '');
    }
    const priceColIdx = headers.findIndex(h => h === 'Fiyat' || h === 'Satış Fiyatı');
    const skuColIdx = headers.findIndex(h => h === 'Stok Kodu' || h === 'SKU' || h === 'Barkod');

    // Orijinal cell'leri direkt güncelle — sütun sırası ve format korunur
    if (priceColIdx >= 0 && skuColIdx >= 0) {
      for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
        const skuCell = ws[XLSX.utils.encode_cell({ r, c: skuColIdx })];
        const sku = skuCell ? String(skuCell.v || '').trim() : '';
        if (sku && priceMap[sku] != null) {
          const addr = XLSX.utils.encode_cell({ r, c: priceColIdx });
          if (!ws[addr]) ws[addr] = {};
          ws[addr].v = priceMap[sku];
          ws[addr].t = 'n';
          delete ws[addr].f;
        }
      }
    }

    const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return { content: wbOut, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx', isBinary: true };
  }
};

// ─────────────────────────────────────────────
// GENEL EXCEL ADAPTER
// ─────────────────────────────────────────────
export const GENERIC_EXCEL_ADAPTER = {
  id: 'generic_excel',
  name: 'Genel Excel',
  fileType: 'xlsx',
  priceMapKey: 'barkod', // Genel Excel'de Barkod sütunu öncelikli anahtar

  parseFile: async (file) => {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);
    return data.map(row => ({
      product_name: (row['Ürün Adı'] || row['Urun Adi'] || row['Product Name'] || '').toString().trim(),
      variant_title: (row['Varyant'] || row['Variant'] || '').toString().trim(),
      sku: (row['SKU'] || row['Stok Kodu'] || row['Barkod'] || '').toString().trim(),
      barcode: (row['Barkod'] || row['Barcode'] || row['SKU'] || '').toString().trim(),
      price: parseFloat(row['Fiyat'] || row['Price'] || row['Satış Fiyatı'] || 0) || 0,
      compare_price: parseFloat(row['Karşılaştırma Fiyatı'] || row['Piyasa Fiyatı'] || row['Compare Price'] || 0) || 0,
      raw: row,
    }));
  },

  getRowKey: (item) => item.sku || item.barcode || item.product_name,

  exportFile: async (originalFileUrl, priceMap) => {
    const XLSX = await import('xlsx');
    const resolvedUrl = await resolveFileUrl(originalFileUrl);
    const resp = await fetch(resolvedUrl);
    const arrayBuffer = await resp.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const wsName = wb.SheetNames[0];
    const ws = wb.Sheets[wsName];

    const range = XLSX.utils.decode_range(ws['!ref']);
    const headerRowIdx = range.s.r;
    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: headerRowIdx, c })];
      headers.push(cell ? String(cell.v || '') : '');
    }
    const priceColIdx = headers.findIndex(h => ['Fiyat', 'Price', 'Satış Fiyatı'].includes(h));
    const skuColIdx = headers.findIndex(h => ['SKU', 'Stok Kodu', 'Barkod', 'Barcode'].includes(h));

    if (priceColIdx >= 0 && skuColIdx >= 0) {
      for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
        const skuCell = ws[XLSX.utils.encode_cell({ r, c: skuColIdx })];
        const sku = skuCell ? String(skuCell.v || '').trim() : '';
        if (sku && priceMap[sku] != null) {
          const addr = XLSX.utils.encode_cell({ r, c: priceColIdx });
          if (!ws[addr]) ws[addr] = {};
          ws[addr].v = priceMap[sku];
          ws[addr].t = 'n';
          delete ws[addr].f;
        }
      }
    }

    const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return { content: wbOut, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx', isBinary: true };
  }
};

// ─────────────────────────────────────────────
// ADAPTER REGISTRY
// ─────────────────────────────────────────────
export const ADAPTERS = {
  shopify: SHOPIFY_ADAPTER,
  ikas: IKAS_ADAPTER,
  ticimax: TICIMAX_ADAPTER,
  generic_excel: GENERIC_EXCEL_ADAPTER,
};

export const ADAPTER_OPTIONS = [
  { value: 'shopify', label: 'Shopify' },
  { value: 'ikas', label: 'ikas' },
  { value: 'ticimax', label: 'Ticimax' },
  { value: 'generic_excel', label: 'Genel Excel' },
];

export function getAdapter(platformObj) {
  if (!platformObj) return null;
  if (platformObj.platform_type !== 'website') return null;
  return ADAPTERS[platformObj.website_adapter] || SHOPIFY_ADAPTER;
}

// Türkçe normalize: şçğıöü harflerini ASCII'ye çevirir + binlik noktasını kaldırır (karşılaştırma için)
export function normTR(s) {
  return s.toLowerCase()
    .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .replace(/(?<=\d)\.(?=\d{3})/g, '');
}

// Adapter ile ürün adı + varyant birleştir
// Duplicate kelimeleri önler: varyant parçaları title'da zaten geçiyorsa tekrar eklenmez
export function getCombinedName(item) {
  if (!item.variant_title) return item.product_name;
  const titleNorm = normTR(item.product_name || '');
  const parts = item.variant_title.split(' / ').filter(p => {
    const trimmed = p.trim();
    if (!trimmed) return false;
    // Binlik noktasını kaldırıp normalize ederek karşılaştır (1.000 === 1000)
    const normP = normTR(trimmed).replace(/(?<=\d)\.(?=\d{3})/g, '');
    const normT = titleNorm.replace(/(?<=\d)\.(?=\d{3})/g, '');
    return !normT.includes(normP);
  });
  return parts.length > 0 ? `${item.product_name} ${parts.join(' / ')}` : item.product_name;
}

// Dosyayı indirme fonksiyonu
export function downloadFile({ content, mimeType, ext, isBinary, filename }) {
  let blob;
  if (isBinary) {
    blob = new Blob([content], { type: mimeType });
  } else {
    blob = new Blob([content], { type: mimeType });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
