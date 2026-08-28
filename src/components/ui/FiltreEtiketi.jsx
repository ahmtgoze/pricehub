import React from 'react';

/**
 * Filtrenin üstünde küçük etiket.
 *
 * Tasarım prototipinde filtreler adlandırılmış: "Kategori: Tüm Kategoriler",
 * "Tarife Tipi: Tüm Tipler" gibi. Etiketsiz açılır listelerde hangi filtrenin
 * ne olduğu ancak seçili değere bakılarak anlaşılıyordu.
 */
export default function FiltreEtiketi({ ad, className = '', children }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-medium text-muted-foreground">{ad}</span>
      {children}
    </div>
  );
}
