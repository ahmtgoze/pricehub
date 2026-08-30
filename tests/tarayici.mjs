/**
 * Ortak tarayici katmani — Chrome'u baslatir, CDP ile konusur.
 *
 * sayfaBotu.mjs (sayfalar aciliyor mu) ve uctanUcaBot.mjs (gercek kullanici
 * gibi tiklayip veri yaziyor) bunu paylasir. Ikisi AYRI Chrome profili
 * kullanir: sayfa botu gercek veri hesabinda, uctan uca bot bos test
 * hesabinda calisir. Ayni profili paylassalardi biri otekinin oturumunu
 * ezerdi.
 *
 * Bagimlilik yok: Node 24'un yerlesik WebSocket'ini kullanir.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { setTimeout as bekle } from 'node:timers/promises';

export const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export const CANLI    = 'https://pricehub-ashen.vercel.app';
export const ONIZLEME = 'https://pricehub-git-tema-apple-v2-ahmet-s-projects7.vercel.app';
export const YEREL    = 'http://localhost:5173';

/** Komut satirindan hedef adresi sec. */
export function tabanSec(argv) {
  if (argv.includes('--yerel')) return YEREL;
  if (argv.includes('--onizleme')) return ONIZLEME;
  return CANLI;
}

/**
 * Chrome'u belirtilen profille baslatir ve CDP baglantisi dondurur.
 *
 * profilAdi — ev dizini altinda klasor adi. /tmp kullanilmaz: yeniden
 *             baslatmada silinir ve giris her seferinde tekrar istenir.
 * gorunur   — true ise pencere acilir (giris yapmak icin), false ise headless.
 */
export async function tarayiciAc({ profilAdi, port, gorunur = false }) {
  const profil = `${process.env.HOME}/.${profilAdi}`;
  if (!existsSync(profil)) mkdirSync(profil, { recursive: true });

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profil}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling',
  ];
  if (!gorunur) args.push('--headless=new', '--window-size=1440,900');

  const chrome = spawn(CHROME, args, { stdio: 'ignore', detached: false });
  process.on('exit', () => { try { chrome.kill(); } catch { /* yoksay */ } });

  const wsUrl = await hedefBul(port);
  const b = await Baglanti.ac(wsUrl);
  await b.gonder('Runtime.enable');
  await b.gonder('Page.enable');
  await b.gonder('Log.enable');
  b.chrome = chrome;
  return b;
}

async function hedefBul(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      const liste = await r.json();
      const sayfa = liste.find((t) => t.type === 'page');
      if (sayfa?.webSocketDebuggerUrl) return sayfa.webSocketDebuggerUrl;
    } catch { /* henuz acilmadi */ }
    await bekle(250);
  }
  throw new Error(`Chrome hata ayiklama portuna baglanilamadi (${port})`);
}

export class Baglanti {
  constructor(ws) { this.ws = ws; this.id = 0; this.bekleyen = new Map(); this.olaylar = []; }

  static async ac(url) {
    const ws = new WebSocket(url);
    await new Promise((c, r) => { ws.onopen = c; ws.onerror = () => r(new Error('WS acilamadi')); });
    const b = new Baglanti(ws);
    ws.onmessage = (m) => {
      const v = JSON.parse(m.data);
      if (v.id && b.bekleyen.has(v.id)) { b.bekleyen.get(v.id)(v); b.bekleyen.delete(v.id); }
      else if (v.method) b.olaylar.push(v);
    };
    return b;
  }

  gonder(method, params = {}) {
    const id = ++this.id;
    return new Promise((c) => { this.bekleyen.set(id, c); this.ws.send(JSON.stringify({ id, method, params })); });
  }

  /** Sayfada JS calistirir, sonucu dondurur. */
  async calistir(ifade) {
    const { result } = await this.gonder('Runtime.evaluate', {
      expression: ifade,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result?.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || 'JS hatasi');
    }
    return result?.result?.value;
  }

  async git(url) {
    this.olaylar.length = 0;
    await this.gonder('Page.navigate', { url });
  }

  /**
   * GERCEK fare tiklamasi (CDP Input) — sentetik PointerEvent'lerden farkli
   * olarak tarayicinin kendi urettigi guvenilir olaylardir.
   *
   * Radix Select/Dropdown sentetik olaylarla ACILIYOR ama SECMIYOR: secim
   * pointerup zincirini `isTrusted` bekleyen ic mantiga bagli. Menu, acilir
   * liste ve modal etkilesimlerinde bunu kullan.
   *
   * secici — sayfada calistirilacak, elementi dondurmesi gereken JS ifadesi.
   */
  async gercekTikla(secici, saniye = 4) {
    // Element hemen hazir olmayabilir: Radix pencereleri acilirken once
    // DOM'a giriyor, olculebilir hale gelmesi bir animasyon suruyor. Tek
    // seferlik bakan surum "buton yok" deyip yaniltiyordu.
    let kutu = null;
    for (let i = 0; i < saniye * 4; i++) {
      kutu = await this.calistir(`(() => {
        const el = (${secici});
        if (!el) return null;
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      })()`);
      if (kutu) break;
      await bekle(250);
    }
    if (!kutu) return false;
    const { x, y } = JSON.parse(kutu);

    // Radix once fareyi elementin uzerinde gormek ister (odak/hover mantigi).
    await this.gonder('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', clickCount: 0 });
    await this.gonder('Input.dispatchMouseEvent', { type: 'mousePressed',  x, y, button: 'left', clickCount: 1 });
    await this.gonder('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    return true;
  }

  /**
   * Gizli <input type=file> alanina dosya yukler.
   *
   * "Ice Aktar" butonu gizli bir dosya alanini tetikliyor; isletim sistemi
   * dosya penceresi otomatize edilemez. CDP DOM.setFileInputFiles dosyayi
   * dogrudan alana koyar ve change olayini tetikler.
   */
  async dosyaSec(secici, dosyaYolu) {
    // gonder() CDP zarfinin tamamini dondurur: { id, result }
    const belge = await this.gonder('DOM.getDocument', { depth: -1 });
    const kokId = belge?.result?.root?.nodeId;
    if (!kokId) return false;

    const bulunan = await this.gonder('DOM.querySelector', { nodeId: kokId, selector: secici });
    const nodeId = bulunan?.result?.nodeId;
    if (!nodeId) return false;
    await this.gonder('DOM.setFileInputFiles', { nodeId, files: [dosyaYolu] });
    return true;
  }

  /** Gercek klavye tusu (ornegin 'Enter', 'ArrowDown', 'Escape'). */
  async tus(tus) {
    const kodlar = {
      Enter:     { windowsVirtualKeyCode: 13, code: 'Enter', key: 'Enter', text: '\r' },
      ArrowDown: { windowsVirtualKeyCode: 40, code: 'ArrowDown', key: 'ArrowDown' },
      ArrowUp:   { windowsVirtualKeyCode: 38, code: 'ArrowUp', key: 'ArrowUp' },
      Escape:    { windowsVirtualKeyCode: 27, code: 'Escape', key: 'Escape' },
      Tab:       { windowsVirtualKeyCode: 9,  code: 'Tab', key: 'Tab' },
    };
    const k = kodlar[tus];
    if (!k) throw new Error(`tanimsiz tus: ${tus}`);
    await this.gonder('Input.dispatchKeyEvent', { type: 'keyDown', ...k });
    await this.gonder('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
  }

  kapat() { try { this.chrome?.kill(); } catch { /* yoksay */ } }

  /**
   * Chrome'u DUZGUN kapatir ve diske yazmasini bekler.
   *
   * kill() ile oldurulunce Chrome localStorage'i diske flush edemiyor ve
   * yeni acilan oturum GIRIS YAPILMAMIS geliyordu — giris ekraninda
   * oturum acmak bu yuzden ise yaramiyordu. Browser.close duzgun kapanis
   * yapar, veriler kalici olur.
   */
  async duzgunKapat() {
    try {
      await this.gonder('Browser.close');
      await bekle(1500);
    } catch { /* zaten kapanmis olabilir */ }
    this.kapat();
  }
}

/** Konsol hatasi/istisna metnini cikarir; null ise hata degil. */
export const hataMetni = (o) => {
  if (o.method === 'Runtime.exceptionThrown') {
    const d = o.params?.exceptionDetails;
    return d?.exception?.description?.split('\n')[0] || d?.text || 'Bilinmeyen istisna';
  }
  if (o.method === 'Runtime.consoleAPICalled' && o.params?.type === 'error') {
    return (o.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ').split('\n')[0];
  }
  return null;
};

/** Uygulamanin kendi hatasi olmayan gurultu. */
export const YOKSAY = [/favicon/i, /net::ERR_/i, /Failed to load resource/i, /ResizeObserver/i];

export { bekle };
