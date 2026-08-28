import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTableColumns, SABIT_GENISLIK } from "@/lib/useTableColumns";
import ColumnSettings from "@/components/ui/ColumnSettings";

const SISTEM_KOLON_GENISLIK = 48; // secim kutusu gibi anahtarsiz sutunlar

/**
 * Sola sabitlenmis sutunlarin soldan uzakligini hesaplar.
 * Yalnizca bastaki kesintisiz "sabit" dizisi yapiskan olur; ilk sabit
 * olmayan sutunda dizi biter (aradan sonrasi normal akar).
 */
function stickyOffsetleriHesapla(kolonlar) {
  const offsetler = new Array(kolonlar.length).fill(null);
  let birikim = 0;
  for (let i = 0; i < kolonlar.length; i++) {
    const col = kolonlar[i];
    const sistem = col.__key == null;
    const sabit = col.__pinned === true;
    if (!sistem && !sabit) break;
    offsetler[i] = birikim;
    const px = parseInt(String(col.width || ''), 10);
    birikim += Number.isFinite(px) ? px : (sistem ? SISTEM_KOLON_GENISLIK : SABIT_GENISLIK);
  }
  return offsetler;
}

export default function DataTable({
  columns,
  data,
  isLoading,
  page = 1,
  pageSize = 20,
  totalItems = 0,
  onPageChange,
  onRowClick,
  rowClassName,
  emptyMessage = "Veri bulunamadı",
  // pageKey verilirse sutun ayarlari (gizle/sirala/sabitle/genislik)
  // kullaniciya ozel kaydedilir. Verilmezse davranis eskisiyle aynidir.
  pageKey,
}) {
  const {
    gorunenKolonlar,
    yonetilebilir,
    prefs,
    gizleAc,
    sabitle,
    tasi,
    genislikAyarla,
    sifirla,
    kaydediliyor,
  } = useTableColumns(pageKey, columns);

  const kolonlar = pageKey ? gorunenKolonlar : columns;
  const offsetler = React.useMemo(
    () => (pageKey ? stickyOffsetleriHesapla(kolonlar) : kolonlar.map(() => null)),
    [pageKey, kolonlar]
  );

  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  const hucreStili = (idx) => {
    const off = offsetler[idx];
    if (off == null) return { width: kolonlar[idx].width };
    return { width: kolonlar[idx].width, position: 'sticky', left: off, zIndex: 2 };
  };
  const hucreSinifi = (idx, taban) =>
    offsetler[idx] == null ? taban : `${taban} bg-card`;

  if (isLoading) {
    return (
      <div className="ph-panel">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {kolonlar.map((col, idx) => (
                <TableHead key={idx} className="px-5 [&_button]:uppercase [&_button]:tracking-[0.06em]">
                  {typeof col.header === 'function' ? col.header() : col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {kolonlar.map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pageKey && (
        <div className="flex justify-end">
          <ColumnSettings
            yonetilebilir={yonetilebilir}
            prefs={prefs}
            gizleAc={gizleAc}
            sabitle={sabitle}
            tasi={tasi}
            genislikAyarla={genislikAyarla}
            sifirla={sifirla}
            kaydediliyor={kaydediliyor}
          />
        </div>
      )}

      <div className="ph-panel">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {kolonlar.map((col, idx) => (
                <TableHead
                  key={idx}
                  className={hucreSinifi(idx, "px-5 [&_button]:uppercase [&_button]:tracking-[0.06em]")}
                  style={hucreStili(idx)}
                >
                  {typeof col.header === 'function' ? col.header() : col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={kolonlar.length} className="h-32 text-center text-[13.5px] text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIdx) => (
                <TableRow
                  key={row.id || rowIdx}
                  className={`${onRowClick ? "cursor-pointer" : ""} ${rowClassName ? rowClassName(row) : "hover:bg-secondary/60"}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {kolonlar.map((col, colIdx) => (
                    <TableCell
                      key={colIdx}
                      className={hucreSinifi(colIdx, "px-5 text-[13.5px]")}
                      style={hucreStili(colIdx)}
                    >
                      {col.cell ? col.cell(row) : row[col.accessor]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalItems > pageSize && (
        <div className="flex items-center justify-between px-2">
          <p className="text-[13.5px] text-muted-foreground">
            {startItem}-{endItem} / {totalItems} kayıt
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange?.(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange?.(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-[13.5px] text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange?.(page + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange?.(totalPages)}
              disabled={page === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
