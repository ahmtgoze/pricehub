import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
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
 * ✅ BOM temizleme, tırnak içi noktalı virgül desteği, virgüllü sayı desteği
 */
export const parseCSV = (csvText) => {
  // ✅ BOM karakterini temizle
  csvText = csvText.replace(/^\uFEFF/, '');

  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  // ✅ Satırı doğru parse et — tırnak içindeki noktalı virgülleri koru
  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ';' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      let value = values[idx] !== undefined ? values[idx] : '';
      // ✅ Virgüllü sayıları da parse et (20,4 → 20.4)
      const normalized = String(value).replace(',', '.');
      const numVal = parseFloat(normalized);
      if (!isNaN(numVal) && value !== '') {
        value = numVal;
      }
      if (value === 'true') value = true;
      if (value === 'false') value = false;
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

export default function ImportExport({
  data,
  columns,
  filename,
  onImport,
  templateColumns,
  templateInfoData
}) {
  const fileInputRef = useRef(null);

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
      onImport?.(parsed);
    };
    reader.readAsArrayBuffer(file);
  } else {
    reader.onload = (event) => {
      const text = event.target?.result;
      const parsed = parseCSV(text);
      onImport?.(parsed);
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
          <DropdownMenuItem onClick={() => downloadCSV(data, columns, filename)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            CSV Olarak İndir
          </DropdownMenuItem>
          {templateColumns && (
            <DropdownMenuItem onClick={() => downloadTemplate(templateColumns, filename, templateInfoData)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Boş Şablon İndir
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {onImport && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          İçe Aktar
        </Button>
      )}
    </div>
  );
}
