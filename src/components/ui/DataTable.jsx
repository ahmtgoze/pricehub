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
  emptyMessage = "Veri bulunamadı"
}) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  if (isLoading) {
    return (
      <div className="ph-panel">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col, idx) => (
                <TableHead key={idx} className="px-5 [&_button]:uppercase [&_button]:tracking-[0.06em]">
                  {typeof col.header === 'function' ? col.header() : col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {columns.map((_, j) => (
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
      <div className="ph-panel">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col, idx) => (
                <TableHead
                  key={idx}
                  className="px-5 [&_button]:uppercase [&_button]:tracking-[0.06em]"
                  style={{ width: col.width }}
                >
                  {typeof col.header === 'function' ? col.header() : col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-[13.5px] text-muted-foreground">
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
                  {columns.map((col, colIdx) => (
                    <TableCell key={colIdx} className="px-5 text-[13.5px]">
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
