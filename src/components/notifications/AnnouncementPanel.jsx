import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Archive, ArchiveRestore, Trash2, CheckCheck, Megaphone, Zap, Reply, X } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function AnnouncementPanel({ user, isAdmin, onReplyToAnnouncement }) {
  const qc = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => db.entities.Announcement.filter({ is_active: true }, '-created_date', 50),
  });

  const { data: readRecords = [] } = useQuery({
    queryKey: ['announcementReads', user?.email],
    queryFn: () => db.entities.AnnouncementRead.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  const markReadMutation = useMutation({
    mutationFn: async (announcementId) => {
      const existing = readRecords.find(r => r.announcement_id === announcementId);
      if (existing) return;
      const autoDeleteAt = addDays(new Date(), 7).toISOString();
      return db.entities.AnnouncementRead.create({
        announcement_id: announcementId,
        user_email: user.email,
        read_at: new Date().toISOString(),
        auto_delete_at: autoDeleteAt,
        is_archived: false,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcementReads'] }),
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ announcementId, archive }) => {
      const existing = readRecords.find(r => r.announcement_id === announcementId);
      if (existing) {
        return db.entities.AnnouncementRead.update(existing.id, {
          is_archived: archive,
          archived_at: archive ? new Date().toISOString() : null,
        });
      } else {
        const autoDeleteAt = addDays(new Date(), 7).toISOString();
        return db.entities.AnnouncementRead.create({
          announcement_id: announcementId,
          user_email: user.email,
          read_at: new Date().toISOString(),
          auto_delete_at: autoDeleteAt,
          is_archived: archive,
          archived_at: archive ? new Date().toISOString() : null,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcementReads'] }),
  });

  const deleteReadMutation = useMutation({
    mutationFn: async (announcementId) => {
      const existing = readRecords.find(r => r.announcement_id === announcementId);
      if (existing) {
        // Silmek yerine kalıcı olarak işaretle - böylece tekrar görünmez
        return db.entities.AnnouncementRead.update(existing.id, {
          is_archived: true,
          is_deleted: true,
          archived_at: new Date().toISOString(),
        });
      } else {
        // Kayıt yoksa oluştur ve kalıcı sil işareti koy
        return db.entities.AnnouncementRead.create({
          announcement_id: announcementId,
          user_email: user.email,
          read_at: new Date().toISOString(),
          is_archived: true,
          is_deleted: true,
          archived_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcementReads'] }),
  });

  const adminDeleteMutation = useMutation({
    mutationFn: (id) => db.entities.Announcement.update(id, { is_active: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: async () => {
      const unarchived = activeAnnouncements.filter(a => !getReadRecord(a.id)?.is_archived);
      await Promise.all(unarchived.map(a => archiveMutation.mutateAsync({ announcementId: a.id, archive: true })));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcementReads'] }),
  });

  const getReadRecord = (announcementId) => readRecords.find(r => r.announcement_id === announcementId);

  // Kullanıcının kayıt tarihinden önce oluşturulan duyuruları ve kalıcı silinen kayıtları filtrele
  const visibleAnnouncements = announcements.filter(a => {
    const rec = getReadRecord(a.id);
    if (rec?.is_deleted) return false; // Kalıcı silinmiş
    if (user?.created_date && new Date(a.created_date) < new Date(user.created_date)) return false; // Kayıt öncesi duyuru
    return true;
  });

  const activeAnnouncements = visibleAnnouncements.filter(a => {
    const rec = getReadRecord(a.id);
    return !rec?.is_archived;
  });

  const archivedAnnouncements = visibleAnnouncements.filter(a => {
    const rec = getReadRecord(a.id);
    return !!rec?.is_archived;
  });

  const displayed = showArchived ? archivedAnnouncements : activeAnnouncements;

  const getDaysUntilDelete = (record) => {
    if (!record?.auto_delete_at) return null;
    return differenceInDays(new Date(record.auto_delete_at), new Date());
  };

  const typeIcon = (type) => type === 'system_update'
    ? <Zap className="h-3.5 w-3.5 text-blue-500" />
    : <Megaphone className="h-3.5 w-3.5 text-indigo-500" />;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50 flex-shrink-0">
        <button
          onClick={() => setShowArchived(false)}
          className={cn("text-xs font-semibold px-3 py-1.5 rounded-lg transition-all", !showArchived ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100")}
        >
          Gelen Kutusu
          {activeAnnouncements.length > 0 && (
            <span className="ml-1.5 bg-indigo-400 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">{activeAnnouncements.length}</span>
          )}
        </button>
        <button
          onClick={() => setShowArchived(true)}
          className={cn("text-xs font-semibold px-3 py-1.5 rounded-lg transition-all", showArchived ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100")}
        >
          Arşiv
          {archivedAnnouncements.length > 0 && (
            <span className="ml-1.5 bg-slate-400 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">{archivedAnnouncements.length}</span>
          )}
        </button>

        {!showArchived && !isAdmin && activeAnnouncements.length > 0 && (
          <button
            onClick={() => bulkArchiveMutation.mutate()}
            className="ml-auto text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
          >
            <Archive className="h-3.5 w-3.5" /> Tümünü arşivle
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm gap-2">
            <Bell className="h-8 w-8 opacity-30" />
            <span>{showArchived ? 'Arşiv boş' : 'Yeni duyuru yok'}</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayed.map(announcement => {
              const rec = getReadRecord(announcement.id);
              const isRead = !!rec?.read_at;
              const daysLeft = getDaysUntilDelete(rec);

              return (
                <div
                  key={announcement.id}
                  className={cn("px-4 py-3.5 hover:bg-indigo-50/40 transition-colors border-l-4 cursor-pointer", 
                    !isRead ? "bg-indigo-50/60 border-indigo-500" : "border-transparent"
                  )}
                  onClick={() => !isRead && markReadMutation.mutate(announcement.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        {typeIcon(announcement.type)}
                        <span className="text-sm font-semibold text-slate-900 truncate">{announcement.title}</span>
                        {!isRead && <span className="text-[10px] bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-bold flex-shrink-0">YENİ</span>}
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed mb-2">{announcement.content}</p>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2.5">
                        <span>{format(new Date(announcement.created_date), 'd MMM HH:mm', { locale: tr })}</span>
                        {rec?.read_at && daysLeft !== null && daysLeft <= 7 && !rec?.is_archived && (
                          <span className={cn("font-medium", daysLeft <= 0 ? "text-red-600" : "text-amber-600")}>
                            {daysLeft <= 0 ? '⏰ Yakında silinecek' : `${daysLeft} gün`}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                        {!isAdmin && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); onReplyToAnnouncement(announcement); }}
                              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              <Reply className="h-3.5 w-3.5" /> Yanıtla
                            </button>
                            {!showArchived ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); archiveMutation.mutate({ announcementId: announcement.id, archive: true }); }}
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                <Archive className="h-3.5 w-3.5" /> Arşivle
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); archiveMutation.mutate({ announcementId: announcement.id, archive: false }); }}
                                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2.5 py-1 rounded-lg transition-colors"
                                >
                                  <ArchiveRestore className="h-3.5 w-3.5" /> Geri al
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteReadMutation.mutate(announcement.id); }}
                                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Sil
                                </button>
                              </>
                            )}
                          </>
                        )}
                        {isAdmin && (
                          <button
                            onClick={(e) => { e.stopPropagation(); adminDeleteMutation.mutate(announcement.id); }}
                            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors ml-auto"
                          >
                            <X className="h-3.5 w-3.5" /> Geri çek
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
