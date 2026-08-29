/**
 * Uctan uca bot icin TEST HESABI girisi.
 *
 * Sayfa botundan AYRI bir Chrome profili acar. Sebep: sayfa botu gercek veri
 * hesabinda (svsetiketplastik) calisir; uctan uca bot ise veri YAZAR, bu
 * yuzden bos bir test kiracisinda calismali. Ayni profili paylassalardi
 * biri otekinin oturumunu ezerdi.
 *
 * TEST HESABI NASIL OLUSUR
 *   Sistemde kayit kapisi yok: user_profiles.is_active = false degilse her
 *   e-posta kendi izole kiracisini alir. Gmail'in "+" takma adi kullanilir:
 *
 *     svsetiketplastik+bot@gmail.com
 *
 *   Kod ayni gelen kutuna duser, ama Supabase icin AYRI bir kullanicidir.
 *   Yani yeni hesap acmaya gerek yok, gercek veriye de dokunulmaz.
 *
 * KULLANIM
 *   npm run bot:test:giris   → pencere acilir, e-postayi yazip kodu girersin
 *   npm run bot:test         → senaryolari calistirir
 */

import { tarayiciAc, tabanSec, bekle } from './tarayici.mjs';

const taban = tabanSec(process.argv.slice(2));
const EPOSTA = process.env.PRICEHUB_TEST_EPOSTA || 'svsetiketplastik+bot@gmail.com';

const b = await tarayiciAc({
  profilAdi: 'pricehub-bot-test-profili',
  port: 9334,                 // sayfa botu 9333 kullaniyor, cakismasin
  gorunur: true,
});

await b.git(`${taban}/login`);
await bekle(2500);

// E-posta alanini onceden doldur — kullanici yalnizca kodu girsin.
try {
  await b.calistir(`
    (() => {
      const alan = document.querySelector('input[type="email"], input[name="email"]');
      if (!alan) return 'alan-yok';
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(alan, ${JSON.stringify(EPOSTA)});
      alan.dispatchEvent(new Event('input', { bubbles: true }));
      return 'dolduruldu';
    })()
  `);
} catch { /* sayfa henuz hazir degilse kullanici elle yazar */ }

console.log(`
Chrome acildi — TEST HESABI girisi
──────────────────────────────────────────────────────────────────────────
  Adres    ${taban}/login
  E-posta  ${EPOSTA}   (alana yazildi)

  1. "Giris Kodu Gonder" butonuna bas
  2. Kod svsetiketplastik@gmail.com gelen kutusuna duser ("+bot" ayni kutu)
  3. Kodu gir, Dashboard'u gor

  Bu hesap BOS baslar — urun, kategori, komisyon yok. Dogrusu bu:
  uctan uca bot her seyi sifirdan kurup test edecek.

  Bitince Ctrl+C. Oturum ~/.pricehub-bot-test-profili altinda kalici.
  Gercek veri hesabinin oturumu (sayfa botu) ayri profilde, etkilenmez.

  Pencere 45 dakika acik kalir.
`);

await bekle(1000 * 60 * 45);
process.exit(0);
