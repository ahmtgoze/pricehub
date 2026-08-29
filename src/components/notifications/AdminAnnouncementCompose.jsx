import React, { useState } from 'react';
import { db } from '@/api/db';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Megaphone, Zap, X } from 'lucide-react';
import { PAGES as HELP_PAGES } from '@/lib/helpContent';

export default function AdminAnnouncementCompose({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', content: '', type: 'announcement', link_page: '' });
  const [open, setOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => db.entities.Announcement.create({
      ...form,
      link_page: form.link_page || null,
      is_active: true,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setForm({ title: '', content: '', type: 'announcement', link_page: '' });
      setOpen(false);
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs text-foreground hover:text-muted-foreground font-semibold px-4 py-3 border-b border-border w-full hover:bg-secondary transition-colors"
      >
        <Plus className="h-4 w-4" /> Yeni Duyuru Yayınla
      </button>
    );
  }

  return (
    <div className="px-4 py-4 border-b border-border bg-card space-y-3.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">Yeni Duyuru Oluştur</p>
        <button onClick={() => setOpen(false)} className="text-muted-foreground/70 hover:text-muted-foreground transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setForm(f => ({ ...f, type: 'announcement' }))}
          className={`flex items-center justify-center gap-1.5 text-xs px-3 py-2.5 rounded-xl border-2 font-semibold transition-all ${form.type === 'announcement' ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'border-border text-muted-foreground hover:border-input hover:bg-secondary'}`}
        >
          <Megaphone className="h-4 w-4" /> Duyuru
        </button>
        <button
          type="button"
          onClick={() => setForm(f => ({ ...f, type: 'system_update' }))}
          className={`flex items-center justify-center gap-1.5 text-xs px-3 py-2.5 rounded-xl border-2 font-semibold transition-all ${form.type === 'system_update' ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'border-border text-muted-foreground hover:border-input hover:bg-secondary'}`}
        >
          <Zap className="h-4 w-4" /> Güncellemesi
        </button>
      </div>

      <input
        type="text"
        placeholder="Başlık yazın..."
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        className="w-full text-sm border border-border rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-card font-medium"
      />
      <textarea
        placeholder="Duyuru içeriğini yazın..."
        value={form.content}
        onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
        rows={3}
        className="w-full text-sm border border-border rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-card"
      />
      {/* Duyuruya tiklayinca gidilecek sayfa — bos birakilabilir */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">
          İlgili sayfa <span className="font-normal">(isteğe bağlı)</span>
        </label>
        <select
          value={form.link_page}
          onChange={e => setForm(f => ({ ...f, link_page: e.target.value }))}
          className="w-full text-sm border border-border rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-card"
        >
          <option value="">Sayfa yok — duyuru tıklanmaz</option>
          {HELP_PAGES.map(p => (
            <option key={p.page} value={p.page}>{p.title}</option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">
          Sayfa seçersen kullanıcı duyuruya tıklayınca doğrudan oraya gider.
        </p>
      </div>

      <div className="flex justify-between items-center pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen(false)}
          className="text-muted-foreground"
        >
          İptal
        </Button>
        <Button
          size="sm"
          onClick={() => createMutation.mutate()}
          disabled={!form.title.trim() || !form.content.trim() || createMutation.isPending}
          className="bg-primary hover:bg-black dark:hover:bg-white/90 text-primary-foreground font-semibold gap-2"
        >
          <Megaphone className="h-4 w-4" /> Yayınla
        </Button>
      </div>
    </div>
  );
}
