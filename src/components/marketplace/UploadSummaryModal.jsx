import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, AlertTriangle, X, TrendingDown, PackageX } from 'lucide-react';

/**
 * UploadSummaryModal — Excel yükleme sonrası özet ekranı
 * props:
 *   summary: { newCount, updateCount, zeroStockCount, stockChangedCount, platform, missingItems }
 *   onClose: () => void
 *   onReviewZeroStock: () => void  — sıfır stoklularını göster
 *   onReviewMissing: () => void  — sistemde var excel'de yok ürünleri göster
 */
export default function UploadSummaryModal({ summary, onClose, onReviewZeroStock, onReviewMissing }) {
  const {
    newCount, updateCount = 0, zeroStockCount, stockChangedCount = 0, missingCount = 0,
    trendyolStockUpdated = 0, hepsiSkipped = 0, websiteStockUpdated = 0, excelDupCount = 0,
    platform
  } = summary;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-foreground">Excel Yükleme Tamamlandı</h2>
            <button onClick={onClose} className="text-muted-foreground/70 hover:text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-5">{platform} platformu için yükleme özeti:</p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {/* Yeni eklenen */}
            <div className="bg-secondary border border-input rounded-xl p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Plus className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">{newCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Yeni Eklenen</p>
            </div>

            {/* Trendyol / Website stok güncelleme */}
            {(trendyolStockUpdated > 0 || websiteStockUpdated > 0) && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-100 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <RefreshCw className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-700">{trendyolStockUpdated || websiteStockUpdated}</p>
                <p className="text-xs text-green-500 mt-1">Stok Güncellenen (Tekrar Eden)</p>
              </div>
            )}

            {/* Hepsiburada güncellenen */}
            {hepsiSkipped > 0 && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-100 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <RefreshCw className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-700">{hepsiSkipped}</p>
                <p className="text-xs text-green-500 mt-1">Fiyat / Stok Güncellendi</p>
              </div>
            )}

            {/* Excel içi duplicate */}
            {excelDupCount > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-yellow-700">{excelDupCount}</p>
                <p className="text-xs text-yellow-600 mt-1">Excel İçinde Tekrar Eden</p>
              </div>
            )}

            {/* Stok değişimi */}
            <div className={`border rounded-xl p-4 text-center ${stockChangedCount > 0 ? 'bg-secondary border-input' : 'bg-secondary border-border'}`}>
              <div className="flex items-center justify-center mb-2">
                <TrendingDown className={`w-5 h-5 ${stockChangedCount > 0 ? 'text-muted-foreground' : 'text-muted-foreground/70'}`} />
              </div>
              <p className={`text-2xl font-bold ${stockChangedCount > 0 ? 'text-foreground' : 'text-muted-foreground/70'}`}>{stockChangedCount}</p>
              <p className={`text-xs mt-1 ${stockChangedCount > 0 ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Güncellenen Ürün</p>
            </div>

            {/* Excel'de olmayan */}
            <div className={`border rounded-xl p-4 text-center col-span-2 ${missingCount > 0 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50' : 'bg-secondary border-border'}`}>
              <div className="flex items-center justify-center mb-2">
                <PackageX className={`w-5 h-5 ${missingCount > 0 ? 'text-red-500' : 'text-muted-foreground/70'}`} />
              </div>
              <p className={`text-2xl font-bold ${missingCount > 0 ? 'text-red-700' : 'text-muted-foreground/70'}`}>{missingCount}</p>
              <p className={`text-xs mt-1 ${missingCount > 0 ? 'text-red-500' : 'text-muted-foreground/70'}`}>Sistemde Var, Excel'de Yok</p>
              {missingCount > 0 && (
                <>
                  <p className="text-xs text-red-400 mt-1">Bu ürünler pazaryerinden kaldırılmış olabilir</p>
                  <button onClick={onReviewMissing} className="mt-2 text-xs text-red-600 underline hover:text-red-800 font-medium">Listele →</button>
                </>
              )}
            </div>

            {/* Sıfır stok */}
            <div className={`border rounded-xl p-4 text-center ${zeroStockCount > 0 ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50' : 'bg-secondary border-border'}`}>
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className={`w-5 h-5 ${zeroStockCount > 0 ? 'text-amber-500' : 'text-muted-foreground/70'}`} />
              </div>
              <p className={`text-2xl font-bold ${zeroStockCount > 0 ? 'text-amber-700' : 'text-muted-foreground/70'}`}>{zeroStockCount}</p>
              <p className={`text-xs mt-1 ${zeroStockCount > 0 ? 'text-amber-500' : 'text-muted-foreground/70'}`}>Stoğu 0 Olan Eşleşmiş Ürün</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Kapat</Button>
            {zeroStockCount > 0 && (
              <Button size="sm" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => { onClose(); onReviewZeroStock(); }}>
                <AlertTriangle className="w-4 h-4 mr-1" />
                İncele ({zeroStockCount})
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
