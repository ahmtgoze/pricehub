import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Archive, ArchiveRestore, Trash2, Megaphone, Zap, Reply, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getHelpForPage } from '@/lib/helpContent';
import { format, addDays, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function AnnouncementPanel({ user, isAdmin, onReplyToAnnouncement }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showArchived, setShowArchived] = useState(false);

  // Duyuruya tiklaninca: okundu isaretle, link_page varsa o sayfaya git.
  const acDuyuru = (announcement, isRead) => {
    if (!isRead) markReadMutation.mutate(announcement.id);
    if (announcement.link_page) {
      navigate(createPageUrl(announcement.link_page));
    }
  };

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
    ? <Zap className="h-3.5 w-3.5 text-muted-foreground/70" />
    : <Megaphone className="h-3.5 w-3.5 text-muted-foreground/70" />;

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border bg-secondary flex-shrink-0">
        <button
          onClick={() => setShowArchived(false)}
          className={cn("text-xs font-semibold px-3 py-1.5 rounded-lg transition-all", !showArchived ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}
        >
          Gelen Kutusu
          {activeAnnouncements.length > 0 && (
            <span className="ml-1.5 bg-primary text-primary-foreground text-[9px] px-2 py-0.5 rounded-full font-bold">{activeAnnouncements.length}</span>
          )}
        </button>
        <button
          onClick={() => setShowArchived(true)}
          className={cn("text-xs font-semibold px-3 py-1.5 rounded-lg transition-all", showArchived ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}
        >
          Arşiv
          {archivedAnnouncements.length > 0 && (
            <span className="ml-1.5 bg-muted-foreground text-white text-[9px] px-2 py-0.5 rounded-full font-bold">{archivedAnnouncements.length}</span>
          )}
        </button>

        {!showArchived && !isAdmin && activeAnnouncements.length > 0 && (
          <button
            onClick={() => bulkArchiveMutation.mutate()}
            className="ml-auto text-xs text-foreground hover:text-muted-foreground flex items-center gap-1 font-medium"
          >
            <Archive className="h-3.5 w-3.5" /> Tümünü arşivle
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/70 text-sm gap-2">
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
                  className={cn("px-4 py-3.5 hover:bg-secondary transition-colors border-l-4 cursor-pointer",
                    !isRead ? "bg-secondary border-primary" : "border-transparent"
                  )}
                  onClick={() => acDuyuru(announcement, isRead)}
                  title={announcement.link_page ? 'Tıkla — ilgili sayfaya git' : undefined}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        {typeIcon(announcement.type)}
                        <span className="text-sm font-semibold text-foreground truncate">{announcement.title}</span>
                        {!isRead && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold flex-shrink-0">YENİ</span>}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-2">{announcement.content}</p>
                      {announcement.link_page && (
                        <span className="inline-flex items-center gap-1 mb-2 text-xs font-semibold text-foreground">
                          {getHelpForPage(announcement.link_page)?.title || announcement.link_page} sayfasına git
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-2.5">
                        <span>{format(new Date(announcement.created_date), 'd MMM HH:mm', { locale: tr })}</span>
                        {rec?.read_at && daysLeft !== null && daysLeft <= 7 && !rec?.is_archived && (
                          <span className={cn("font-medium", daysLeft <= 0 ? "text-red-600" : "text-amber-600")}>
                            {daysLeft <= 0 ? '⏰ Yakında silinecek' : `${daysLeft} gün`}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        {!isAdmin && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); onReplyToAnnouncement(announcement); }}
                              className="flex items-center gap-1 text-xs text-foreground hover:text-muted-foreground font-semibold hover:bg-secondary px-2.5 py-1 rounded-lg transition-colors"
                            >
                              <Reply className="h-3.5 w-3.5" /> Yanıtla
                            </button>
                            {!showArchived ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); archiveMutation.mutate({ announcementId: announcement.id, archive: true }); }}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-muted-foreground hover:bg-secondary px-2.5 py-1 rounded-lg transition-colors"
                              >
                                <Archive className="h-3.5 w-3.5" /> Arşivle
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); archiveMutation.mutate({ announcementId: announcement.id, archive: false }); }}
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-muted-foreground hover:bg-secondary px-2.5 py-1 rounded-lg transition-colors"
                                >
                                  <ArchiveRestore className="h-3.5 w-3.5" /> Geri al
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteReadMutation.mutate(announcement.id); }}
                                  className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:text-red-300 hover:bg-red-50 dark:bg-red-950/30 px-2.5 py-1 rounded-lg transition-colors"
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
                            className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:text-red-300 hover:bg-red-50 dark:bg-red-950/30 px-2.5 py-1 rounded-lg transition-colors ml-auto"
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
