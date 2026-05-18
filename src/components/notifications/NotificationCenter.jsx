import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Bell, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnnouncementPanel from './AnnouncementPanel';
import MessagesPanel from './MessagesPanel';
import AdminAnnouncementCompose from './AdminAnnouncementCompose';

export default function NotificationCenter() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false); // 'announcements' | 'messages' | false
  const [replyRef, setReplyRef] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const containerRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    db.auth.me().then(u => {
      setUser(u);
      setIsAdmin(u?.role === 'admin');
    }).catch(() => {});
  }, []);

  const panelRef = useRef(null);

  // Click outside to close — only on desktop
  useEffect(() => {
    if (isMobile || !open) return;
    const handler = (e) => {
      const inContainer = containerRef.current && containerRef.current.contains(e.target);
      const inPanel = panelRef.current && panelRef.current.contains(e.target);
      if (!inContainer && !inPanel) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, isMobile]);

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => db.entities.Announcement.filter({ is_active: true }, '-created_date', 50),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: readRecords = [] } = useQuery({
    queryKey: ['announcementReads', user?.email],
    queryFn: () => db.entities.AnnouncementRead.filter({ user_email: user?.email }),
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', user?.email, isAdmin],
    queryFn: async () => {
      if (!user) return [];
      if (isAdmin) return db.entities.Message.list('-created_date', 200);
      const [sent, received] = await Promise.all([
        db.entities.Message.filter({ sender_email: user.email }, '-created_date', 200),
        db.entities.Message.filter({ receiver_email: user.email }, '-created_date', 200),
      ]);
      return [...sent, ...received];
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const unreadAnnouncementsCount = announcements.filter(a => {
    const rec = readRecords.find(r => r.announcement_id === a.id);
    return !rec?.read_at && !rec?.is_archived;
  }).length;

  const unreadMessagesCount = messages.filter(m =>
    m.receiver_email === user?.email && !m.is_read && !m.is_archived
  ).length;

  const handleReplyToAnnouncement = (announcement) => {
    setReplyRef(announcement);
    setOpen('messages');
  };

  if (!user) return null;

  // Panel konumu: mobil=fixed fullscreen, desktop=absolute dropdown
  const panelStyle = isMobile
    ? { position: 'fixed', left: 0, right: 0, bottom: 0, top: '64px', zIndex: 300 }
    : { position: 'absolute', right: 0, top: '44px', width: '384px', maxHeight: '80vh', zIndex: 300 };

  return (
    <>
      {/* Buttons container */}
      <div className="relative flex items-center gap-1 z-[301]" ref={containerRef}>
        {/* Bell button */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setOpen(prev => prev === 'announcements' ? false : 'announcements'); }}
          className={cn(
            "relative flex items-center justify-center w-9 h-9 rounded-xl transition-all",
            open === 'announcements' ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-100"
          )}
        >
          <Bell className="h-5 w-5" />
          {unreadAnnouncementsCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {unreadAnnouncementsCount > 99 ? '99+' : unreadAnnouncementsCount}
            </span>
          )}
        </button>

        {/* Message button */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setOpen(prev => prev === 'messages' ? false : 'messages'); }}
          className={cn(
            "relative flex items-center justify-center w-9 h-9 rounded-xl transition-all",
            open === 'messages' ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-100"
          )}
        >
          <MessageSquare className="h-5 w-5" />
          {unreadMessagesCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
            </span>
          )}
        </button>

      </div>

      {/* Panel — always rendered via portal so it's above everything */}
      {open && createPortal(
        <>
          {/* Backdrop for mobile */}
          {isMobile && (
            <div
              className="fixed inset-0 bg-black/40"
              style={{ zIndex: 9998 }}
              onPointerDown={(e) => { e.stopPropagation(); setOpen(false); }}
            />
          )}
          {/* Panel */}
          <div
            ref={panelRef}
            className="bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden rounded-2xl"
            style={isMobile
              ? { position: 'fixed', left: 0, right: 0, bottom: 0, top: '64px', zIndex: 9999, borderRadius: 0 }
              : (() => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  return {
                    position: 'fixed',
                    top: rect ? rect.bottom + 8 : 60,
                    right: window.innerWidth - (rect ? rect.right : 0),
                    width: '384px',
                    maxHeight: '80vh',
                    zIndex: 9999,
                  };
                })()
            }
          >
            <PanelContent
              open={open}
              setOpen={setOpen}
              isAdmin={isAdmin}
              user={user}
              unreadAnnouncementsCount={unreadAnnouncementsCount}
              unreadMessagesCount={unreadMessagesCount}
              replyRef={replyRef}
              setReplyRef={setReplyRef}
              onReplyToAnnouncement={handleReplyToAnnouncement}
            />
          </div>
        </>,
        document.body
      )}
    </>
  );
}

function PanelContent({ open, setOpen, isAdmin, user, unreadAnnouncementsCount, unreadMessagesCount, replyRef, setReplyRef, onReplyToAnnouncement }) {
  return (
    <>
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen('announcements')}
            className={cn("flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all", open === 'announcements' ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-700")}
          >
            <Bell className="h-4 w-4" />
            Duyurular
            {unreadAnnouncementsCount > 0 && (
              <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadAnnouncementsCount}</span>
            )}
          </button>
          <button
            onClick={() => setOpen('messages')}
            className={cn("flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all", open === 'messages' ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-700")}
          >
            <MessageSquare className="h-4 w-4" />
            Mesajlar
            {unreadMessagesCount > 0 && (
              <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadMessagesCount}</span>
            )}
          </button>
        </div>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Admin compose */}
      {open === 'announcements' && isAdmin && (
        <AdminAnnouncementCompose />
      )}

      {/* Panel content */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {open === 'announcements' && (
          <AnnouncementPanel
            user={user}
            isAdmin={isAdmin}
            onReplyToAnnouncement={onReplyToAnnouncement}
          />
        )}
        {open === 'messages' && (
          <MessagesPanel
            user={user}
            isAdmin={isAdmin}
            replyRef={replyRef}
            onReplyRefConsumed={() => setReplyRef(null)}
          />
        )}
      </div>
    </>
  );
}
