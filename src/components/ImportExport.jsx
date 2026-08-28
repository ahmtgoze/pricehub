import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Upload, FileSpreadsheet, X } from "lucide-react";
import { toast } from 'sonner';
import { db } from '@/api/db';
import * as XLSX from 'xlsx';

/**
 * Excel'den JSON'a dönüştür
 */
export const parseExcel = (arrayBuffer, dataSheetName = null) => {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  let sheetName = dataSheetName || workbook.SheetNames[0];
  if (!workbook.Sheets[sheetName]) {
    sheetName = workbook.SheetNames[0];
  }
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  return data.map(row => {
    const converted = {};
    Object.keys(row).forEach(key => {
      let value = row[key];
      if (value === 'true' || value === 'TRUE') value = true;
      if (value === 'false' || value === 'FALSE') value = false;
      converted[key] = value;
    });
    return converted;
  });
};

/**
 * CSV'den JSON'a dönüştür
 * ✅ BOM temizleme
 * ✅ Ayracı otomatik algılar (virgül , veya noktalı virgül ;)
 * ✅ SADECE tamamen sayı olan hücreleri sayıya çevirir ("50 Adet", "60x62" metin kalır)
 */
export const parseCSV = (csvText) => {
  // ✅ BOM karakterini temizle
  csvText = csvText.replace(/^\uFEFF/, '');

  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // ✅ Ayracı otomatik algıla: başlık satırında ; mi , mı daha çok?
  const headerLine = lines[0];
  const semiCount = (headerLine.match(/;/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  const delimiter = semiCount >= commaCount ? ';' : ',';

  // ✅ Satırı ayraca göre parse et — tırnak içindeki ayracı koru
  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(headerLine);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      let value = values[idx] !== undefined ? values[idx] : '';
      const trimmed = String(value).trim();
      // ✅ SADECE baştan sona sayı olan değerleri sayıya çevir (20,4 → 20.4).
      //    "50 Adet", "60x62", "Bant-kes" gibi metinler OLDUĞU GİBİ kalır.
      const normalized = trimmed.replace(',', '.');
      if (trimmed !== '' && /^-?\d+(\.\d+)?$/.test(normalized)) {
        value = parseFloat(normalized);
      } else if (trimmed === 'true' || trimmed === 'TRUE') {
        value = true;
      } else if (trimmed === 'false' || trimmed === 'FALSE') {
        value = false;
      } else {
        value = trimmed;
      }
      row[header] = value;
    });
    data.push(row);
  }

  return data;
};

/**
 * JSON'dan CSV'ye dönüştür
 */
export const toCSV = (data, columns) => {
  if (!data || data.length === 0) return '';

  const headers = columns.map(c => c.key);
  const headerRow = columns.map(c => `"${c.label}"`).join(';');

  const rows = data.map(item => {
    return headers.map(key => {
      let value = item[key];
      if (value === null || value === undefined) value = '';
      // ✅ Sayıları virgüllü string olarak yaz — Excel tarih olarak yorumlamasın
      if (typeof value === 'number') {
        value = `"${String(value).replace('.', ',')}"`;
      } else if (typeof value === 'string') {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(';');
  });

  return [headerRow, ...rows].join('\n');
};

/**
 * CSV dosyası indir
 */
export const downloadCSV = (data, columns, filename) => {
  const csv = toCSV(data, columns);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Boş şablon indir (Excel formatında)
 */
export const downloadTemplate = (columns, filename, infoData = null) => {
  const wb = XLSX.utils.book_new();

  // 1. Bilgilendirme sayfası (varsa)
  if (infoData) {
    const infoWsData = [];
    let currentRow = 0;

    if (infoData.title) {
      infoWsData.push([infoData.title]);
      infoWsData.push([]);
      currentRow = 2;
    }

    Object.keys(infoData).forEach(key => {
      if (key === 'title') return;
      const section = infoData[key];
      if (section.title) {
        infoWsData.push([section.title]);
        currentRow++;
      }
      if (section.items && Array.isArray(section.items)) {
        section.items.forEach(item => {
          infoWsData.push([item]);
          currentRow++;
        });
      }
      infoWsData.push([]);
      currentRow++;
    });

    const infoWs = XLSX.utils.aoa_to_sheet(infoWsData);
    infoWs['!cols'] = [{ wch: 50 }];
    infoWs['!rows'] = [];
    infoWs['!rows'][0] = { hpt: 30 };

    const range = XLSX.utils.decode_range(infoWs['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!infoWs[cellAddress]) continue;
        const cell = infoWs[cellAddress];
        if (R === 0) {
          cell.s = {
            font: { name: 'Calibri', sz: 18, bold: true, color: { rgb: '1E293B' } },
            fill: { fgColor: { rgb: 'E0E7FF' } },
            alignment: { vertical: 'center', horizontal: 'left' },
            border: { bottom: { style: 'medium', color: { rgb: '4F46E5' } } }
          };
        } else if (cell.v && typeof cell.v === 'string' && cell.v.includes(':')) {
          cell.s = {
            font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: '4F46E5' } },
            fill: { fgColor: { rgb: 'F8FAFC' } },
            alignment: { vertical: 'center', horizontal: 'left' },
            border: { bottom: { style: 'thin', color: { rgb: 'CBD5E1' } } }
          };
        } else if (cell.v && typeof cell.v === 'string' && !cell.v.includes(':')) {
          cell.s = {
            font: { name: 'Calibri', sz: 11, color: { rgb: '475569' } },
            alignment: { vertical: 'center', horizontal: 'left', indent: 1 }
          };
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, infoWs, 'Bilgilendirme');
  }

  // 2. Veri giriş sayfası
  const dataWsData = [
    columns.map(c => c.label),
  ];

  const dataWs = XLSX.utils.aoa_to_sheet(dataWsData);

  // ✅ Örnek veriyi string olarak yaz — Excel tarih olarak yorumlamasın
  columns.forEach((col, colIdx) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 1, c: colIdx });
    const exampleValue = col.example || '';
    dataWs[cellAddress] = {
      v: exampleValue,
      t: 's',
      s: {}
    };
  });

  // Range'i güncelle
  dataWs['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: 1, c: columns.length - 1 }
  });

  dataWs['!cols'] = columns.map(() => ({ wch: 20 }));

  const dataRange = XLSX.utils.decode_range(dataWs['!ref']);
  for (let C = dataRange.s.c; C <= dataRange.e.c; ++C) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!dataWs[cellAddress]) continue;
    dataWs[cellAddress].s = {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E293B' } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    };
  }

  XLSX.utils.book_append_sheet(wb, dataWs, 'Veri Girişi');
  XLSX.writeFile(wb, `${filename}_sablon.xlsx`);
};

/**
 * Dosya adi: <sayfa>_<YYYY-AA-GG_SS-DD>. Ayni sayfadan birden fazla indirme
 * yapildiginda dosyalar birbirinin ustune yazmasin diye tarih-saat eklenir.
 */
export const dosyaAdiUret = (filename) => {
  const d = new Date();
  const iki = (n) => String(n).padStart(2, '0');
  const damga = `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}_${iki(d.getHours())}-${iki(d.getMinutes())}`;
  return `${filename}_${damga}`;
};

/**
 * Excel (.xlsx) olarak disa aktar — CSV'nin yaninda ikinci format secenegi.
 */
export const downloadExcel = (data, columns, filename) => {
  const basliklar = columns.map(c => c.label);
  const satirlar = data.map(row => columns.map(c => {
    const v = typeof c.format === 'function' ? c.format(row) : row[c.key];
    return v === null || v === undefined ? '' : v;
  }));
  const ws = XLSX.utils.aoa_to_sheet([basliklar, ...satirlar]);
  ws['!cols'] = columns.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Veri');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Baslik normalizasyonu: buyuk/kucuk harf (Turkce), bosluk ve noktalama
 * farklarini yok sayar. "Ürün Adı" = " URUN ADI " = "urun_adi".
 */
const basligiNormalize = (s) =>
  String(s ?? '')
    .replace(/[İIı]/g, 'i')
    .toLocaleLowerCase('tr')
    .replace(/[^a-z0-9çğıöşü]+/gi, '')
    .trim();

/**
 * Ice aktarilan satirlarda basliklari beklenen sutun etiketlerine esler.
 * Ozgun anahtarlar KORUNUR (mevcut sayfalar bozulmasin), eslesen etiket
 * ayrica eklenir. Boylece "urun adi" yazan dosya da "Ürün Adı" ile okunur.
 */
export const basligaGoreEslestir = (satirlar, beklenenSutunlar) => {
  if (!beklenenSutunlar?.length) return satirlar;
  const harita = new Map(beklenenSutunlar.map(c => [basligiNormalize(c.label), c.label]));
  return satirlar.map(row => {
    const yeni = { ...row };
    Object.keys(row).forEach(k => {
      const hedef = harita.get(basligiNormalize(k));
      if (hedef && hedef !== k && yeni[hedef] === undefined) yeni[hedef] = row[k];
    });
    return yeni;
  });
};

/**
 * Zorunlu alan kontrolu. templateColumns icinde required: true olan
 * sutunlar bos ise satir numarasiyla birlikte hata listesi doner.
 */
export const zorunluAlanlariDogrula = (satirlar, beklenenSutunlar) => {
  const zorunlular = (beklenenSutunlar || []).filter(c => c.required);
  if (!zorunlular.length) return [];
  const hatalar = [];
  satirlar.forEach((row, i) => {
    const eksik = zorunlular
      .filter(c => {
        const v = row[c.label];
        return v === undefined || v === null || String(v).trim() === '';
      })
      .map(c => c.label);
    // Excel'de 1. satir baslik oldugu icin gercek satir numarasi i + 2
    if (eksik.length) hatalar.push(`Satır ${i + 2}: ${eksik.join(', ')} boş`);
  });
  return hatalar;
};

export default function ImportExport({
  data,
  columns,
  filename,
  onImport,
  templateColumns,
  templateInfoData,
  // Yeni (opsiyonel): verilirse kullanici sablonlari ve zorunlu alan
  // kontrolu devreye girer. Verilmezse davranis eskisiyle AYNI.
  pageKey,
}) {
  const fileInputRef = useRef(null);
  const qc = useQueryClient();
  const [sablonAdi, setSablonAdi] = useState('');

  // Kullaniciya ozel disa aktarma sablonlari (RLS ile izole)
  const { data: sablonlar = [] } = useQuery({
    queryKey: ['exportTemplates', pageKey],
    queryFn: () => db.entities.ExportTemplate.filter({ page_key: pageKey }, '-created_at', 50),
    enabled: !!pageKey,
  });

  const sablonKaydet = useMutation({
    mutationFn: (ad) => db.entities.ExportTemplate.create({
      page_key: pageKey,
      name: ad,
      fields: columns.map(c => c.key),
      format: 'xlsx',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exportTemplates', pageKey] });
      setSablonAdi('');
      toast.success('Şablon kaydedildi');
    },
    onError: (e) => toast.error(e?.message || 'Şablon kaydedilemedi'),
  });

  const sablonSil = useMutation({
    mutationFn: (id) => db.entities.ExportTemplate.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exportTemplates', pageKey] });
      toast.success('Şablon silindi');
    },
  });

  // Sablon = hangi sutunlar disa aktarilacak
  const sablonlaIndir = (sablon) => {
    const secili = columns.filter(c => sablon.fields.includes(c.key));
    const kullanilacak = secili.length ? secili : columns;
    const ad = dosyaAdiUret(filename);
    if (sablon.format === 'csv') downloadCSV(data, kullanilacak, ad);
    else downloadExcel(data, kullanilacak, ad);
  };

  const handleFileChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    reader.onload = (event) => {
      const arrayBuffer = event.target?.result;
      // ✅ Önce 'Veri Girişi' sayfasını dene, yoksa ilk sayfayı oku
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames.includes('Veri Girişi')
        ? 'Veri Girişi'
        : workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      const parsed = data.map(row => {
        const converted = {};
        Object.keys(row).forEach(key => {
          let value = row[key];
          if (value === 'true' || value === 'TRUE') value = true;
          if (value === 'false' || value === 'FALSE') value = false;
          converted[key] = value;
        });
        return converted;
      });
      const eslenmis = basligaGoreEslestir(parsed, templateColumns);
      const hatalar = zorunluAlanlariDogrula(eslenmis, templateColumns);
      if (hatalar.length) {
        toast.error(`${hatalar.length} satırda zorunlu alan eksik`, {
          description: hatalar.slice(0, 5).join(' · ') + (hatalar.length > 5 ? ' …' : ''),
        });
        return;
      }
      onImport?.(eslenmis);
    };
    reader.readAsArrayBuffer(file);
  } else {
    reader.onload = (event) => {
      const text = event.target?.result;
      const parsed = parseCSV(text);
      const eslenmis = basligaGoreEslestir(parsed, templateColumns);
      const hatalar = zorunluAlanlariDogrula(eslenmis, templateColumns);
      if (hatalar.length) {
        toast.error(`${hatalar.length} satırda zorunlu alan eksik`, {
          description: hatalar.slice(0, 5).join(' · ') + (hatalar.length > 5 ? ' …' : ''),
        });
        return;
      }
      onImport?.(eslenmis);
    };
    reader.readAsText(file, 'UTF-8');
  }

  e.target.value = '';
};

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.xlsx,.xls"
        className="hidden"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Dışa Aktar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => downloadExcel(data, columns, dosyaAdiUret(filename))}
            className="gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel (.xlsx) İndir
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => downloadCSV(data, columns, dosyaAdiUret(filename))}
            className="gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            CSV Olarak İndir
          </DropdownMenuItem>
          {templateColumns && (
            <DropdownMenuItem
              onClick={() => downloadTemplate(templateColumns, filename, templateInfoData)}
              className="gap-2 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Boş Şablon İndir
            </DropdownMenuItem>
          )}

          {pageKey && (
            <>
              <DropdownMenuSeparator />
              {sablonlar.map(sb => (
                <DropdownMenuItem
                  key={sb.id}
                  onClick={() => sablonlaIndir(sb)}
                  className="gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="flex-1 truncate">{sb.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); sablonSil.mutate(sb.id); }}
                    className="text-muted-foreground hover:text-destructive"
                    title="Şablonu sil"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuItem>
              ))}
              <div
                className="flex items-center gap-1 px-2 py-1.5"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Input
                  value={sablonAdi}
                  onChange={(e) => setSablonAdi(e.target.value)}
                  placeholder="Yeni şablon adı"
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  className="h-8 px-2"
                  disabled={!sablonAdi.trim() || sablonKaydet.isPending}
                  onClick={() => sablonKaydet.mutate(sablonAdi.trim())}
                >
                  Kaydet
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        İçe Aktar
      </Button>
    </div>
  );
}
