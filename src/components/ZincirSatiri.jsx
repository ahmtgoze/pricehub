import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const tl = (n) => `₺${(Number(n) || 0).toFixed(2)}`;

/**
 * Promosyon kartlarında "diğer indirimlerle birlikte" kârı: kartta tek kısa
 * satır, ayrıntı tıklayınca açılır (Trendyol'un "Bu fiyat nasıl hesaplandı?"
 * kutusu gibi). Eskiden bütün zincir kartın içine yazılıyordu; kullanıcı
 * "göz yoruyor" dedi (13 Eki 2026). Hesap değişmedi, yalnız gösterim.
 *
 * @param zk { z: zincirKur sonucu, profit, profitRate } | null
 */
export default function ZincirSatiri({ zk }) {
  if (!zk) return null;
  const { z } = zk;
  const adimlar = [
    z.net && [z.net.ad, z.net.indirim],
    z.genel && [z.genel.ad, z.genelIndirim],
    z.plus && z.plusIndirim > 0 && [z.plus.etiket, z.plusIndirim],
    z.birlikte && [z.birlikte.ad, z.birlikte.indirim],
    z.kod && [z.kod.ad, z.kod.indirim],
    z.kupon && [z.kupon.ad, z.kupon.indirim],
  ].filter(Boolean);
  const renk = zk.profit > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-red-600';
  const kar = `${zk.profit > 0 ? '+' : ''}${tl(zk.profit)} (%${zk.profitRate.toFixed(1)})`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={`mt-0.5 block text-left text-[10px] leading-tight underline decoration-dotted underline-offset-2 ${renk}`}>
          İndirimlerle: {kar}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 text-xs">
        <div className="mb-2 font-semibold">Bu fiyat nasıl hesaplandı?</div>
        <div className="space-y-1">
          <div className="flex justify-between gap-3"><span className="text-muted-foreground">{z.taban.kaynak}</span><span>{tl(z.taban.fiyat)}</span></div>
          {adimlar.map(([ad, tutar], i) => (
            <div key={i} className="flex justify-between gap-3"><span className="text-muted-foreground">{ad}</span><span>−{tl(tutar)}</span></div>
          ))}
          <div className="flex justify-between gap-3 border-t pt-1 font-medium"><span>Müşterinin ödediği</span><span>{tl(z.musteriFiyat)}</span></div>
          <div className="flex justify-between gap-3"><span className="text-muted-foreground">Size kalan (komisyon öncesi)</span><span>{tl(z.saticiNet)}</span></div>
          <div className={`flex justify-between gap-3 font-semibold ${renk}`}><span>Kâr</span><span>{kar}</span></div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
