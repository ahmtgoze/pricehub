import React, { useState } from 'react';
import { db } from '@/api/db';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Megaphone, Zap, X } from 'lucide-react';

export default function AdminAnnouncementCompose({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', content: '', type: 'announcement' });
  const [open, setOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => db.entities.Announcement.create({ ...form, is_active: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setForm({ title: '', content: '', type: 'announcement' });
      setOpen(false);
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-700 font-semibold px-4 py-3 border-b border-slate-100 w-full hover:bg-indigo-50/50 transition-colors"
      >
        <Plus className="h-4 w-4" /> Yeni Duyuru Yayınla
      </button>
    );
  }

  return (
    <div className="px-4 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white space-y-3.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">Yeni Duyuru Oluştur</p>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setForm(f => ({ ...f, type: 'announcement' }))}
          className={`flex items-center justify-center gap-1.5 text-xs px-3 py-2.5 rounded-xl border-2 font-semibold transition-all ${form.type === 'announcement' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'}`}
        >
          <Megaphone className="h-4 w-4" /> Duyuru
        </button>
        <button
          type="button"
          onClick={() => setForm(f => ({ ...f, type: 'system_update' }))}
          className={`flex items-center justify-center gap-1.5 text-xs px-3 py-2.5 rounded-xl border-2 font-semibold transition-all ${form.type === 'system_update' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'}`}
        >
          <Zap className="h-4 w-4" /> Güncellemesi
        </button>
      </div>

      <input
        type="text"
        placeholder="Başlık yazın..."
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent bg-white font-medium"
      />
      <textarea
        placeholder="Duyuru içeriğini yazın..."
        value={form.content}
        onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
        rows={3}
        className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent bg-white"
      />
      <div className="flex justify-between items-center pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen(false)}
          className="text-slate-600"
        >
          İptal
        </Button>
        <Button
          size="sm"
          onClick={() => createMutation.mutate()}
          disabled={!form.title.trim() || !form.content.trim() || createMutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2"
        >
          <Megaphone className="h-4 w-4" /> Yayınla
        </Button>
      </div>
    </div>
  );
}
