import React from 'react';
import { X, PackageX } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * MissingProductsModal — Sistemde var ama Excel'de olmayan ürünleri listeler
 * props:
 *   items: [{id, barkod, platform_product_name, model_code, hb_sku, status}]
 *   onClose: () => void
 */
export default function MissingProductsModal({ items = [], onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <PackageX className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-foreground">Sistemde Var, Excel'de Yok</h2>
            <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">{items.length} ürün</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground/70 hover:text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Açıklama */}
        <div className="px-5 py-3 bg-red-50 border-b border-red-100">
          <p className="text-sm text-red-700">
            Bu ürünler sistemde kayıtlı ancak yüklediğiniz Excel'de bulunmuyor. Pazaryerinden kaldırılmış olabilirler.
          </p>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Barkod</th>
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Ürün Adı</th>
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Durum</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className={`border-b border-border ${idx % 2 === 0 ? 'bg-card' : 'bg-secondary/50'}`}>
                  <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{item.barkod || item.hb_sku || '-'}</td>
                  <td className="px-4 py-2 text-foreground">{item.platform_product_name || '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${item.status === 'matched' ? 'bg-green-100 text-green-700' : 'bg-secondary text-muted-foreground'}`}>
                      {item.status === 'matched' ? 'Eşleşmiş' : 'Eşleşmemiş'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="w-full">Kapat</Button>
        </div>
      </div>
    </div>
  );
}
