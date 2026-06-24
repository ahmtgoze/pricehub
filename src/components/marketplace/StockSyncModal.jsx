import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Trash2, EyeOff, X } from 'lucide-react';

/**
 * StockSyncModal
 * props:
 *   zeroStockItems: [{ id, platform_product_name, barkod, variant_sku, stock_quantity }]
 *   onDelete: (ids) => Promise
 *   onPassive: (ids) => Promise  — stok 0 işaretler, silmez
 *   onDismiss: () => void
 */
export default function StockSyncModal({ zeroStockItems, onDelete, onPassive, onDismiss }) {
  const [selected, setSelected] = useState(new Set(zeroStockItems.map(i => i.id)));
  const [loading, setLoading] = useState(false);
  const [undoItems, setUndoItems] = useState(null); // { type, items }

  const toggleItem = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const toggleAll = () => {
    if (selected.size === zeroStockItems.length) setSelected(new Set());
    else setSelected(new Set(zeroStockItems.map(i => i.id)));
  };

  const handleDelete = async (ids) => {
    setLoading(true);
    const deletedItems = zeroStockItems.filter(i => ids.includes(i.id));
    await onDelete(ids);
    setUndoItems({ type: 'deleted', items: deletedItems });
    setLoading(false);
  };

  const handlePassive = async (ids) => {
    setLoading(true);
    await onPassive(ids);
    setLoading(false);
    onDismiss();
  };

  if (undoItems) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{undoItems.items.length} ürün silindi</h3>
              <p className="text-sm text-gray-500">İşlem tamamlandı</p>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto mb-4 space-y-1">
            {undoItems.items.map(item => (
              <div key={item.id} className="text-xs text-gray-600 bg-gray-50 rounded px-3 py-1.5 truncate">
                {item.platform_product_name}
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onDismiss}>
              <X className="w-4 h-4 mr-1" />Kapat
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Stokta Olmayan Ürünler Tespit Edildi</h2>
              <p className="text-sm text-gray-500 mt-1">
                Yeni yüklenen Excel dosyasında <strong>{zeroStockItems.length} eşleşmiş ürünün</strong> stoğu 0 görünüyor.
                Bu ürünleri pazaryeri ürün listesinden kaldırmak ister misiniz?
              </p>
            </div>
          </div>
        </div>

        {/* Ürün Listesi */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Tümünü seç */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <Checkbox
              checked={selected.size === zeroStockItems.length && zeroStockItems.length > 0}
              onCheckedChange={toggleAll}
            />
            <span className="text-sm font-medium text-gray-700">
              Tümünü Seç ({selected.size}/{zeroStockItems.length})
            </span>
          </div>

          <div className="space-y-2">
            {zeroStockItems.map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                  selected.has(item.id) ? 'border-amber-300 bg-amber-50' : 'border-gray-100 bg-gray-50'
                }`}
                onClick={() => toggleItem(item.id)}
              >
                <Checkbox
                  checked={selected.has(item.id)}
                  onCheckedChange={() => toggleItem(item.id)}
                  onClick={e => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.platform_product_name}</p>
                  <p className="text-xs text-gray-400">{item.barkod || item.variant_sku || '-'}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-gray-500">Mevcut Durum</span>
                  <p className="text-xs font-semibold text-green-600">Eşleşmiş</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-gray-500">Yeni Stok</span>
                  <p className="text-xs font-bold text-red-600">0</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Butonlar */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <div className="flex flex-wrap gap-2 justify-between">
            <Button variant="outline" size="sm" onClick={onDismiss} disabled={loading}>
              <X className="w-4 h-4 mr-1" />Vazgeç
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePassive(Array.from(selected))}
                disabled={selected.size === 0 || loading}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
              >
                <EyeOff className="w-4 h-4 mr-1" />
                Pasife Al ({selected.size})
              </Button>
              <Button
                size="sm"
                onClick={() => handleDelete(Array.from(selected))}
                disabled={selected.size === 0 || loading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {loading ? 'İşleniyor...' : `Seçilenleri Sil (${selected.size})`}
              </Button>
              <Button
                size="sm"
                onClick={() => handleDelete(zeroStockItems.map(i => i.id))}
                disabled={loading}
                className="bg-red-800 hover:bg-red-900 text-white"
              >
                Hepsini Sil ({zeroStockItems.length})
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            💡 Varsayılan öneri: Silmek yerine <strong>Pasife Al</strong> seçeneğini kullanın
          </p>
        </div>
      </div>
    </div>
  );
}
