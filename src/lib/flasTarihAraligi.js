/**
 * Flas Urunler: yuklenen dosyadaki teklifler secilen tarih araligina gore
 * ayiklanir.
 *
 * Trendyol bazen SONRAKI haftanin flas gunlerini erkenden ayni dosyaya
 * koyuyor (kullanici, 15 Eylul 2026: "15-22 arasinda yukledik ama excelde
 * 24 var, onu sayma"). Onceden yalnizca HER IKI teklifi de aralik disinda
 * olan satir atiliyordu; tarihi OLMAYAN teklif "aralikta" sayiliyordu. Bu
 * yuzden 24 saatlik teklifi 24 Eylul'de, 3 saatlik teklifi bos olan satir
 * iceri giriyor ve 24 saatlik fiyati secilebiliyordu.
 *
 * Kural (teklif bazinda): fiyati > 0 VE tarihleri var VE tarihler araligin
 * icinde ise teklif secilebilir. Aksi halde fiyati SIFIRLANIR (hicbir
 * secim yolu — Akilli Sec, Toplu Sec, tikla, manuel — fiyati 0 olan
 * teklifi secmez) ve tarihi "aralik_disi_*" alaninda gosterim icin kalir.
 * Iki teklifi de secilemeyen satir listeye alinmaz (atla).
 *
 * Import icermez — duz node ile test edilebilir.
 */

const tarihVar = (t) => typeof t === 'string' && t.length >= 10;

/** Teklif secilen aralikta mi? Tarihi olmayan teklif araliga girmez. */
export function flasTeklifAralikta(teklif, aralik) {
  if (!(Number(teklif?.fiyat) > 0)) return false;
  if (!tarihVar(teklif.baslangic) || !tarihVar(teklif.bitis)) return false;
  if (!tarihVar(aralik?.baslangic) || !tarihVar(aralik?.bitis)) return false;
  return teklif.baslangic >= aralik.baslangic && teklif.bitis <= aralik.bitis;
}

/**
 * Satirdaki 24 saat / 3 saat tekliflerini ayiklar.
 * @param satir  { price_24h, start_24h, end_24h, price_3h, start_3h, end_3h }
 * @param aralik { baslangic, bitis }  yyyy-mm-dd
 * @returns { atla, degerler }  degerler: sifirlanmis fiyatlar + aralik_disi_24h/3h
 */
export function flasTeklifleriAyikla(satir, aralik) {
  const s = satir || {};
  const t24 = { fiyat: s.price_24h, baslangic: s.start_24h, bitis: s.end_24h };
  const t3 = { fiyat: s.price_3h, baslangic: s.start_3h, bitis: s.end_3h };
  const ok24 = flasTeklifAralikta(t24, aralik);
  const ok3 = flasTeklifAralikta(t3, aralik);
  const disi = (t) => (Number(t.fiyat) > 0 && tarihVar(t.baslangic) ? `${t.baslangic}${t.bitis && t.bitis !== t.baslangic ? ` – ${t.bitis}` : ''}` : null);
  return {
    atla: !ok24 && !ok3,
    degerler: {
      price_24h: ok24 ? Number(s.price_24h) : 0,
      price_3h: ok3 ? Number(s.price_3h) : 0,
      aralik_disi_24h: ok24 ? null : disi(t24),
      aralik_disi_3h: ok3 ? null : disi(t3),
    },
  };
}
