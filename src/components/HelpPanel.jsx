import React from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, BookOpen, ArrowRight } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { getHelpForPage } from '@/lib/helpContent';

/**
 * Sayfa ici "Nasil kullanilir?" paneli.
 * Kullanim Kilavuzu'ndaki ayni metni, bulundugun sayfa icin sagdan acilan
 * bir panelde gosterir. Icerik src/lib/helpContent.js'ten gelir.
 */
export default function HelpPanel({ pageName, open, onClose }) {
  const help = getHelpForPage(pageName);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        style={{ zIndex: 9998 }}
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-card border-l border-border flex flex-col shadow-2xl"
        style={{ zIndex: 9999 }}
        role="dialog"
        aria-label="Nasıl kullanılır?"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-[13px] border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-[13.5px] font-semibold text-foreground truncate">
              {help ? help.title : 'Nasıl kullanılır?'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex-shrink-0"
            title="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {!help ? (
            <p className="text-[13.5px] text-muted-foreground">
              Bu sayfa için henüz yardım metni eklenmemiş. Tüm konular için
              Kullanım Kılavuzu'na bakabilirsin.
            </p>
          ) : (
            <div className="space-y-5">
              <p className="text-[13.5px] leading-relaxed text-foreground">{help.short}</p>

              {help.detail && (
                <div className="space-y-3">
                  {help.detail.split('\n\n').map((p, i) => (
                    <p key={i} className="text-[13.5px] leading-relaxed text-muted-foreground">{p}</p>
                  ))}
                </div>
              )}

              {help.faq?.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Sıkça sorulanlar
                  </p>
                  {help.faq.map((item, i) => (
                    <div key={i} className="rounded-[14px] bg-secondary px-4 py-3">
                      <p className="text-[13px] font-semibold text-foreground">{item.q}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{item.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border p-3 flex-shrink-0">
          <Link
            to={createPageUrl('Help')}
            onClick={onClose}
            className="flex items-center justify-between gap-2 rounded-[11px] bg-secondary px-[14px] py-[11px] text-[13px] font-medium text-foreground hover:bg-muted transition-colors"
          >
            Tüm Kullanım Kılavuzu
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </aside>
    </>,
    document.body
  );
}
