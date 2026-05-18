import React, { useState, useRef, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, ChevronLeft, Archive, User, Users, ChevronDown, Trash2, Pencil, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function MessagesPanel({ user, isAdmin, replyRef, onReplyRefConsumed }) {
  const qc = useQueryClient();
  const [selectedContact, setSelectedContact] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [newConversationEmail, setNewConversationEmail] = useState('');
  const [showNewConv, setShowNewConv] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const bottomRef = useRef(null);

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [deletePopup, setDeletePopup] = useState(null); // { messageId }
  const [deleteConvPopup, setDeleteConvPopup] = useState(null); // { email }
  const [editingMessage, setEditingMessage] = useState(null); // { id, content }
  const editInputRef = useRef(null);

  // Admin email'ini bul (kullanıcılar için)
  const { data: adminUser, isLoading: adminLoading } = useQuery({
    queryKey: ['admin-user'],
    queryFn: async () => {
      const users = await db.entities.User.filter({ role: 'admin' });
      return users[0] || null;
    },
    enabled: !!user?.email && !isAdmin,
    staleTime: 30000,
    retry: 3,
    retryDelay: 1000,
  });

  // Tüm kullanıcıları getir (admin için yeni mesaj)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-list'],
    queryFn: async () => {
      const users = await db.entities.User.list();
      return users.filter(u => u.role !== 'admin');
    },
    enabled: !!isAdmin,
  });

  // All messages relevant to this user
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', user?.email, isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        return db.entities.Message.list('-created_date', 200);
      }
      const [sent, received] = await Promise.all([
        db.entities.Message.filter({ sender_email: user.email }, '-created_date', 200),
        db.entities.Message.filter({ receiver_email: user.email }, '-created_date', 200),
      ]);
      return [...sent, ...received].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user?.email,
    refetchInterval: 10000,
  });

  // Handle reply ref from announcement panel
  useEffect(() => {
    if (replyRef) {
      setNewMessage(`[Duyuru yanıtı: "${replyRef.title}"]\n\n`);
      setShowNewConv(false);
      if (isAdmin) {
        setSelectedContact(null);
      }
      onReplyRefConsumed?.();
    }
  }, [replyRef]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedContact, messages]);

  const sendMutation = useMutation({
    mutationFn: async ({ content, receiverEmail, refId, refTitle }) => {
      return db.entities.Message.create({
        sender_email: user.email,
        sender_role: isAdmin ? 'admin' : 'user',
        receiver_email: receiverEmail,
        content,
        is_read: false,
        is_archived: false,
        announcement_ref_id: refId || null,
        announcement_ref_title: refTitle || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] });
      setNewMessage('');
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => db.entities.Message.update(id, { is_read: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Message.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  });

  const handleDeleteOnlyMe = (messageId) => {
    // Mesajı arşivle (sadece admin panelinde görünmesin)
    db.entities.Message.update(messageId, { is_archived: true, archived_at: new Date().toISOString() })
      .then(() => qc.invalidateQueries({ queryKey: ['messages'] }));
    setDeletePopup(null);
  };

  const handleDeleteForEveryone = (messageId) => {
    deleteMutation.mutate(messageId);
    setDeletePopup(null);
  };

  // Tüm sohbeti sil
  const handleDeleteConversation = async (contactEmail, mode) => {
    const convMsgs = getConversationMessages(contactEmail);
    if (mode === 'me') {
      // Sadece arşivle
      await Promise.all(convMsgs.map(m => db.entities.Message.update(m.id, { is_archived: true, archived_at: new Date().toISOString() })));
    } else {
      // Tamamen sil
      await Promise.all(convMsgs.map(m => db.entities.Message.delete(m.id)));
    }
    qc.invalidateQueries({ queryKey: ['messages'] });
    setDeleteConvPopup(null);
    setSelectedContact(null);
  };

  // Mesaj düzenleme
  const updateMutation = useMutation({
    mutationFn: ({ id, content }) => db.entities.Message.update(id, { content }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages'] }); setEditingMessage(null); },
  });

  const canEdit = (msg) => {
    // Sadece kendi mesajı ve 5 dakika içinde
    if (msg.sender_email !== user.email) return false;
    const diff = (Date.now() - new Date(msg.created_date).getTime()) / 1000 / 60;
    return diff <= 5;
  };

  useEffect(() => {
    if (editingMessage) editInputRef.current?.focus();
  }, [editingMessage]);

  // Get admin email - tüm kaynaklardan bul
  const getAdminEmail = () => {
    if (adminUser?.email) return adminUser.email;
    // Gelen mesajlardan admin emaili bul
    const adminMsg = messages.find(m => m.sender_role === 'admin');
    if (adminMsg?.sender_email) return adminMsg.sender_email;
    return null;
  };

  // Get unique conversations
  const getConversations = () => {
    const contactMap = new Map();
    messages.forEach(m => {
      const isArchived = m.is_archived;
      if (showArchived !== isArchived) return;

      let contactEmail;
      if (isAdmin) {
        // Admin için: karşı taraf her zaman admin olmayan kişi
        if (m.sender_role === 'admin') {
          contactEmail = m.receiver_email;
        } else {
          contactEmail = m.sender_email;
        }
      } else {
        contactEmail = m.sender_email === user.email ? m.receiver_email : m.sender_email;
      }

      if (!contactEmail) return;

      if (!contactMap.has(contactEmail)) {
        contactMap.set(contactEmail, { email: contactEmail, lastMessage: m, unread: 0 });
      }
      const conv = contactMap.get(contactEmail);
      if (new Date(m.created_date) > new Date(conv.lastMessage.created_date)) {
        conv.lastMessage = m;
      }
      if (!m.is_read && m.receiver_email === user.email) {
        conv.unread++;
      }
    });
    return Array.from(contactMap.values()).sort((a, b) => new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date));
  };

  const getConversationMessages = (contactEmail) => {
    return messages
      .filter(m => {
        if (isAdmin) {
          // Admin ile bu müşteri arasındaki tüm mesajlar (sender_role ile eşleştir)
          return (m.sender_role === 'admin' && m.receiver_email === contactEmail) ||
                 (m.sender_role === 'user' && m.sender_email === contactEmail);
        }
        return (m.sender_email === user.email && m.receiver_email === contactEmail) ||
               (m.receiver_email === user.email && m.sender_email === contactEmail);
      })
      .filter(m => showArchived ? m.is_archived : !m.is_archived)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  };

  const handleSelectContact = (conv) => {
    setSelectedContact(conv.email);
    // Mark unread messages as read
    const unread = messages.filter(m =>
      m.receiver_email === user.email &&
      m.sender_email === conv.email &&
      !m.is_read
    );
    unread.forEach(m => markReadMutation.mutate(m.id));
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    
    let receiver;
    if (isAdmin) {
      receiver = selectedContact;
    } else {
      // Müşteri her zaman adminin seçili contact'ına veya ilk admin'e gönderir
      receiver = selectedContact !== 'admin' && selectedContact ? selectedContact : getAdminEmail();
      if (!receiver) {
        const admins = await db.entities.User.filter({ role: 'admin' });
        receiver = admins[0]?.email;
      }
    }
    if (!receiver) return;

    // Parse reply ref from message if present
    const refMatch = newMessage.match(/\[Duyuru yanıtı: "(.+?)"\]/);
    const refTitle = refMatch ? refMatch[1] : null;

    sendMutation.mutate({
      content: newMessage,
      receiverEmail: receiver,
      refTitle,
    });
  };

  const conversations = getConversations();
  const convMessages = selectedContact ? getConversationMessages(selectedContact) : [];

  if (selectedContact) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-slate-50 to-indigo-50">
          <button onClick={() => setSelectedContact(null)} className="text-slate-400 hover:text-slate-700 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">{selectedContact === 'admin' ? 'Sistem Yöneticisi' : selectedContact}</p>
            <p className="text-[11px] text-slate-500">{selectedContact === 'admin' ? 'Admin' : (isAdmin ? 'Müşteri' : 'Yönetici')}</p>
          </div>
          {isAdmin && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteConvPopup(deleteConvPopup ? null : { email: selectedContact }); }}
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Sohbeti sil"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              {deleteConvPopup?.email === selectedContact && (
                <div
                  onClick={e => e.stopPropagation()}
                  className="absolute top-full right-0 mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden w-48"
                >
                  <p className="text-xs font-semibold text-slate-500 px-3 pt-2.5 pb-1">Sohbeti sil</p>
                  <button onClick={() => handleDeleteConversation(selectedContact, 'me')} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    Sadece benden sil
                  </button>
                  <button onClick={() => handleDeleteConversation(selectedContact, 'all')} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    Müşteriden de sil
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" onClick={() => { setDeletePopup(null); setDeleteConvPopup(null); }}>
          {convMessages.map(m => {
            const isMine = m.sender_email === user.email;
            const isEditing = editingMessage?.id === m.id;
            const editable = canEdit(m);
            return (
              <div key={m.id} className={cn("flex group", isMine ? "justify-end" : "justify-start")}>
                <div className="flex items-end gap-1.5 max-w-[80%]" style={{ flexDirection: isMine ? 'row-reverse' : 'row' }}>
                  <div className={cn("rounded-2xl px-4 py-3 text-sm", isMine ? "bg-indigo-600 text-white rounded-br-none shadow-sm" : "bg-slate-100 text-slate-900 rounded-bl-none shadow-sm")}>
                    {m.announcement_ref_title && (
                      <div className={cn("text-xs mb-2 px-3 py-2 rounded-lg border-l-2 font-medium", isMine ? "border-indigo-300 bg-indigo-500/20 text-indigo-100" : "border-indigo-400 bg-indigo-50 text-indigo-700")}>
                        ↩️ Duyuru: {m.announcement_ref_title}
                      </div>
                    )}
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          ref={editInputRef}
                          value={editingMessage.content}
                          onChange={e => setEditingMessage(p => ({ ...p, content: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); updateMutation.mutate({ id: m.id, content: editingMessage.content }); } if (e.key === 'Escape') setEditingMessage(null); }}
                          rows={2}
                          className="w-full text-sm bg-white/20 border border-white/40 rounded-lg px-2 py-1 resize-none focus:outline-none text-white placeholder-white/60"
                        />
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => setEditingMessage(null)} className="p-1 rounded text-white/70 hover:text-white"><X className="h-3.5 w-3.5" /></button>
                          <button onClick={() => updateMutation.mutate({ id: m.id, content: editingMessage.content })} className="p-1 rounded text-white/70 hover:text-white"><Check className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content.replace(/\[Duyuru yanıtı: ".+?"\]\n\n/, '')}</p>
                    )}
                    <p className={cn("text-xs mt-2 text-right", isMine ? "text-indigo-100" : "text-slate-500")}>
                      {format(new Date(m.created_date), 'HH:mm', { locale: tr })}
                    </p>
                  </div>
                  {/* Action buttons */}
                  <div className="flex flex-col gap-1 flex-shrink-0 mb-1">
                    {editable && !isEditing && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingMessage({ id: m.id, content: m.content.replace(/\[Duyuru yanıtı: ".+?"\]\n\n/, '') }); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isAdmin && (
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeletePopup(deletePopup?.messageId === m.id ? null : { messageId: m.id }); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {deletePopup?.messageId === m.id && (
                          <div
                            onClick={e => e.stopPropagation()}
                            className={cn(
                              "absolute bottom-full mb-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden w-44",
                              isMine ? "right-0" : "left-0"
                            )}
                          >
                            <p className="text-xs font-semibold text-slate-500 px-3 pt-2.5 pb-1">Silme seçeneği</p>
                            <button onClick={() => handleDeleteOnlyMe(m.id)} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                              Sadece benden sil
                            </button>
                            <button onClick={() => handleDeleteForEveryone(m.id)} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                              Müşteriden de sil
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {!showArchived && (
          <div className="flex items-end gap-2 px-4 py-3 border-t border-slate-100 flex-shrink-0 bg-gradient-to-r from-white to-indigo-50">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Mesaj yazın..."
              rows={2}
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white"
            />
            <Button size="icon" onClick={handleSend} disabled={!newMessage.trim()} className="flex-shrink-0 h-10 w-10 bg-indigo-600 hover:bg-indigo-700">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-slate-50 to-indigo-50">
        <button
          onClick={() => setShowArchived(false)}
          className={cn("text-xs font-semibold px-3 py-1.5 rounded-lg transition-all", !showArchived ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100")}
        >
          Mesajlar
        </button>
        {isAdmin && (
          <button
            onClick={() => setShowArchived(true)}
            className={cn("text-xs font-semibold px-3 py-1.5 rounded-lg transition-all", showArchived ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100")}
          >
            <Archive className="h-3.5 w-3.5 inline mr-1" />Arşiv
          </button>
        )}
        {!showArchived && (
          <button
            onClick={() => { setShowNewConv(true); setSelectedContact(null); }}
            className="ml-auto text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            + Yeni
          </button>
        )}
      </div>

      {showNewConv && !showArchived && (
        <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-br from-indigo-50 to-white space-y-3">
          {isAdmin ? (
            <>
              <p className="text-xs font-medium text-slate-600">Müşteri seçin ve mesaj gönderin</p>
              {/* Kullanıcı seçimi */}
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(p => !p)}
                  className="w-full flex items-center justify-between text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white hover:border-indigo-300 transition-colors"
                >
                  <span className={newConversationEmail ? 'text-slate-900' : 'text-slate-400'}>
                    {newConversationEmail || 'Kullanıcı seçin...'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
                {showUserDropdown && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {allUsers.length === 0 ? (
                      <p className="text-xs text-slate-400 p-3">Kullanıcı bulunamadı</p>
                    ) : (
                      allUsers.map(u => (
                        <button
                          key={u.id}
                          onClick={() => { setNewConversationEmail(u.email); setShowUserDropdown(false); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors"
                        >
                          <span className="font-medium">{u.full_name || u.email}</span>
                          {u.full_name && <span className="text-slate-400 text-xs ml-2">{u.email}</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs font-medium text-slate-600">Yöneticiye mesaj gönderin</p>
          )}
          <textarea
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Mesajınızı yazın..."
            rows={2}
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => { setShowNewConv(false); setNewMessage(''); setNewConversationEmail(''); }}>İptal</Button>
            <Button size="sm" onClick={async () => {
             if (!newMessage.trim()) return;
             let receiver;
             if (isAdmin) {
               receiver = newConversationEmail;
               if (!receiver) return;
             } else {
               // Önce mevcut state'ten bul, yoksa DB'den çek
               receiver = getAdminEmail();
               if (!receiver) {
                 try {
                   const admins = await db.entities.User.filter({ role: 'admin' });
                   receiver = admins[0]?.email;
                 } catch (e) {
                   console.error('Admin bulunamadı:', e);
                 }
               }
               if (!receiver) {
                 alert('Yönetici bulunamadı. Lütfen tekrar deneyin.');
                 return;
               }
             }
             sendMutation.mutate({ content: newMessage, receiverEmail: receiver });
             setShowNewConv(false);
             setNewMessage('');
             setNewConversationEmail('');
            }} disabled={isAdmin ? (!newConversationEmail || !newMessage.trim()) : (!newMessage.trim() || adminLoading)} className="bg-indigo-600 hover:bg-indigo-700">
              <Send className="h-3.5 w-3.5 mr-1" /> Gönder
            </Button>
          </div>
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm gap-2">
            <MessageSquare className="h-8 w-8 opacity-30" />
            <span>{showArchived ? 'Arşiv boş' : 'Henüz mesaj yok'}</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {conversations.map(conv => (
              <button
                key={conv.email}
                onClick={() => handleSelectContact(conv)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-indigo-50/50 text-left transition-colors border-l-4 border-transparent hover:border-indigo-400"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white font-semibold">
                  {conv.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{conv.email === 'admin' ? 'Sistem Yöneticisi' : conv.email}</p>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {format(new Date(conv.lastMessage.created_date), 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{conv.lastMessage.content.replace(/\[Duyuru yanıtı: ".+?"\]\n\n/, '')}</p>
                </div>
                {conv.unread > 0 && (
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                    {conv.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
