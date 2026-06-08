'use client';
import Image from 'next/image';
import { use, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { messagingApi, usersApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';
import type { Conversation, ConversationMember, Message, User } from '@/types';

const HEADER_CONFIG: Record<string, { label: string; gradient: string }> = {
  COMMUNAUTE: { label: '🌍 Communauté',         gradient: 'from-[#C62828] to-[#8e1a1a]' },
  REGION:     { label: '🗺️ Région',              gradient: 'from-[#C62828] to-[#8e1a1a]' },
  DOYENNE:    { label: '🛡️ District',             gradient: 'from-[#C62828] to-[#8e1a1a]' },
  PAROISSE:   { label: '⛪ Paroisse',             gradient: 'from-[#C62828] to-[#8e1a1a]' },
  PRIVE:      { label: '🤝 Conversation privée', gradient: 'from-[#C62828] to-[#8e1a1a]' },
  GROUPE:     { label: '👥 Groupe',               gradient: 'from-[#C62828] to-[#8e1a1a]' },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function groupByDate(msgs: Message[]): { label: string; messages: Message[] }[] {
  const map = new Map<string, Message[]>();
  for (const m of msgs) {
    const key = new Date(m.createdAt).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return [...map.entries()].map(([key, messages]) => ({
    label: formatDateLabel(new Date(key + ' 12:00').toISOString()),
    messages,
  }));
}

export default function AdminChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [convType, setConvType] = useState('PRIVE');
  const [convNom, setConvNom] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reply
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Context menu
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Delete — { id, isMine: peut supprimer pour tous }
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; isMine: boolean } | null>(null);

  // Messages masqués localement (delete for me) — persistés en localStorage
  const HIDDEN_KEY = `hidden-msgs-${id}`;
  const [hiddenMsgIds, setHiddenMsgIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]')); }
    catch { return new Set(); }
  });

  const hideForMe = (msgId: string) => {
    setHiddenMsgIds(prev => {
      const next = new Set(prev).add(msgId);
      localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
      return next;
    });
    setDeleteTarget(null);
  };

  // Group / private management
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [groupMembers, setGroupMembers] = useState<ConversationMember[]>([]);
  const [convMembers, setConvMembers] = useState<ConversationMember[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [annuaire, setAnnuaire] = useState<User[]>([]);
  const [loadingAnnuaire, setLoadingAnnuaire] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [selectedToRemove, setSelectedToRemove] = useState<string[]>([]);
  const [applyingChanges, setApplyingChanges] = useState(false);
  const isOwner = myRole === 'OWNER';

  // Swipe-to-reply
  const swipeStartX = useRef(0);
  const swipeStartId = useRef<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<{ id: string; offset: number } | null>(null);

  // Refs to scroll to a specific message
  const msgRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const scrollToMsg = (msgId: string) => {
    const el = msgRefs.current.get(msgId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.transition = 'background 0.3s';
    el.style.background = 'rgba(106,27,154,0.15)';
    setTimeout(() => { el.style.background = ''; }, 1000);
  };

  const loadGroupDetails = useCallback(() => {
    messagingApi.getConversation(id).then(r => {
      const conv = r.data;
      setGroupMembers(conv.members ?? []);
      setConvMembers(conv.members ?? []);
      const me = (conv.members ?? []).find((m: ConversationMember) => m.userId === user?.id);
      setMyRole(me?.role ?? null);
    }).catch(() => {});
  }, [id, user?.id]);

  useEffect(() => {
    messagingApi.messages(id)
      .then(r => {
        setMessages(r.data);
        return messagingApi.conversations();
      })
      .then(cr => {
        const conv = (cr.data as Conversation[]).find(c => c.id === id);
        if (conv) {
          setConvType(conv.type);
          setConvNom(conv.nom ?? '');
          if (conv.type === 'GROUPE' || conv.type === 'PRIVE') loadGroupDetails();
        }
      })
      .catch(() => {});
    messagingApi.markRead(id).catch(() => {});
  }, [id, loadGroupDetails]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);
    socket.emit('join:conversation', id);
    socket.on('new:message', (msg: Message) => {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    });
    return () => { socket.emit('leave:conversation', id); socket.off('new:message'); };
  }, [id, accessToken]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuMsgId) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuMsgId(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuMsgId]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input;
    const replyId = replyingTo?.id;
    setInput('');
    setReplyingTo(null);
    setSending(true);
    try {
      const { data } = await messagingApi.send(id, text, replyId);
      setMessages(prev => [...prev, data]);
    } catch { setInput(text); }
    finally { setSending(false); }
  };

  const startEdit = useCallback((msg: Message) => {
    setMenuMsgId(null);
    setEditingId(msg.id);
    setEditText(msg.contenu ?? '');
    setTimeout(() => editInputRef.current?.focus(), 50);
  }, []);

  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const confirmEdit = async () => {
    if (!editingId || !editText.trim()) return;
    try {
      const { data } = await messagingApi.editMessage(editingId, editText.trim());
      setMessages(prev => prev.map(m => m.id === editingId ? { ...m, ...data } : m));
      cancelEdit();
    } catch { /* ignore */ }
  };

  const deleteForEveryone = async () => {
    if (!deleteTarget) return;
    try {
      await messagingApi.deleteMessage(deleteTarget.id);
      setMessages(prev => prev.map(m => m.id === deleteTarget.id
        ? { ...m, deletedAt: new Date().toISOString(), contenu: undefined }
        : m));
    } catch { /* ignore */ }
    setDeleteTarget(null);
  };

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent, msgId: string) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartId.current = msgId;
  };
  const onTouchMove = (e: React.TouchEvent, msgId: string) => {
    if (swipeStartId.current !== msgId) return;
    const delta = e.touches[0].clientX - swipeStartX.current;
    if (delta > 0) setSwipeOffset({ id: msgId, offset: Math.min(delta, 72) });
  };
  const onTouchEnd = (msg: Message) => {
    if (swipeOffset?.id === msg.id && swipeOffset.offset >= 52) {
      setReplyingTo(msg);
    }
    swipeStartId.current = null;
    setSwipeOffset(null);
  };

  const openAddMember = () => {
    setShowAddMember(true);
    setAddSearch('');
    setSelectedToAdd([]);
    setLoadingAnnuaire(true);
    usersApi.list().then(r => {
      const existingIds = new Set(groupMembers.map(m => m.userId));
      setAnnuaire((r.data as User[]).filter(u => !existingIds.has(u.id)));
    }).catch(() => {}).finally(() => setLoadingAnnuaire(false));
  };

  const closeAddMember = () => { setShowAddMember(false); setSelectedToAdd([]); setAddSearch(''); };

  const toggleAdd = (uid: string) =>
    setSelectedToAdd(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]);

  const toggleRemove = (uid: string) =>
    setSelectedToRemove(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]);

  const handleConfirmAdd = async () => {
    if (!selectedToAdd.length) return;
    setApplyingChanges(true);
    await Promise.all(selectedToAdd.map(uid => messagingApi.addMember(id, uid).catch(() => {})));
    setApplyingChanges(false);
    closeAddMember();
    loadGroupDetails();
  };

  const handleConfirmRemove = async () => {
    if (!selectedToRemove.length) return;
    setApplyingChanges(true);
    await Promise.all(selectedToRemove.map(uid => messagingApi.removeMember(id, uid).catch(() => {})));
    setApplyingChanges(false);
    setSelectedToRemove([]);
    loadGroupDetails();
  };

  // Membres retirables (non-owner, non-moi)
  const removableMembers = groupMembers.filter(m => m.role !== 'OWNER' && m.userId !== user?.id);
  const allRemovableSelected = removableMembers.length > 0 && removableMembers.every(m => selectedToRemove.includes(m.userId));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };
  const handleEditKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmEdit(); }
    if (e.key === 'Escape') cancelEdit();
  };

  const header = HEADER_CONFIG[convType] ?? HEADER_CONFIG.PRIVE;
  const groups = groupByDate(messages.filter(m => !hiddenMsgIds.has(m.id)));

  /* Nom à afficher dans le header pour les convs privées */
  const privatePartner = convType === 'PRIVE'
    ? convMembers.find(m => m.userId !== user?.id)?.user
    : null;
  const headerLabel = convNom
    || (privatePartner ? `${privatePartner.prenoms} ${privatePartner.nom}` : null)
    || header.label;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ── Header ── */}
      <div className={`bg-gradient-to-r ${header.gradient} text-white px-4 py-2.5 flex items-center gap-3 flex-shrink-0`}>
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg leading-none">‹</button>
        {convType === 'PRIVE' && privatePartner && (
          <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden relative">
            {privatePartner.avatarUrl
              ? <Image src={privatePartner.avatarUrl} fill className="object-cover" alt="" sizes="32px" />
              : `${privatePartner.nom[0]}${privatePartner.prenoms[0]}`}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{headerLabel}</div>
          <div className="text-[11px] opacity-80">
            {convType === 'GROUPE'
              ? `${groupMembers.length} membre${groupMembers.length > 1 ? 's' : ''}`
              : privatePartner
                ? privatePartner.parish?.nom ?? 'Guide paroissial'
                : `${messages.length} message${messages.length > 1 ? 's' : ''}`}
          </div>
        </div>
        {convType === 'GROUPE' && (
          <button onClick={() => setShowGroupPanel(true)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">
            👥
          </button>
        )}
      </div>

      {/* ── Zone messages ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#EFE8DD] px-3 py-3 flex flex-col gap-0.5">
        {messages.filter(m => !hiddenMsgIds.has(m.id)).length === 0 && (
          <div className="self-center text-[11px] text-[#6b6b78] bg-white/70 px-4 py-2 rounded-full mt-6 shadow-sm">
            Aucun message — commencez la conversation
          </div>
        )}

        {groups.map(({ label, messages: dayMsgs }) => (
          <div key={label}>
            {/* Séparateur de date */}
            <div className="flex justify-center my-3">
              <span className="text-[11px] text-[#6b6b78] bg-white/70 px-3 py-1 rounded-full shadow-sm font-medium">
                {label}
              </span>
            </div>

            {dayMsgs.map(msg => {
              const isMine = msg.authorId === user?.id;
              const isDeleted = !!msg.deletedAt;
              const isSystem = msg.type === 'SYSTEME';
              const swipe = swipeOffset?.id === msg.id ? swipeOffset.offset : 0;

              if (isSystem) return (
                <div key={msg.id} className="flex justify-center my-2">
                  <span className="text-[11px] text-[#6A1B9A] bg-[#6A1B9A]/10 px-4 py-1.5 rounded-full">
                    {msg.contenu}
                  </span>
                </div>
              );

              return (
                <div
                  key={msg.id}
                  ref={el => { if (el) msgRefs.current.set(msg.id, el); else msgRefs.current.delete(msg.id); }}
                  className={`flex items-end mb-1 gap-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Icône swipe-reply (messages reçus) */}
                  {!isMine && swipe > 10 && (
                    <div className="text-[#6A1B9A] text-lg" style={{ opacity: Math.min(swipe / 52, 1) }}>↩</div>
                  )}

                  {/* Avatar de l'expéditeur (messages reçus) */}
                  {!isMine && <MsgAvatar author={msg.author} />}

                  {/* Bulle */}
                  <div
                    className="group relative max-w-[72%] flex flex-col"
                    style={{ transform: `translateX(${swipe}px)`, transition: swipe === 0 ? 'transform 0.2s ease-out' : 'none' }}
                    onTouchStart={e => onTouchStart(e, msg.id)}
                    onTouchMove={e => onTouchMove(e, msg.id)}
                    onTouchEnd={() => onTouchEnd(msg)}
                  >

                    <div className={`relative px-3 py-2 rounded-[14px] shadow-sm text-sm leading-relaxed ${
                      isDeleted
                        ? 'bg-white text-[#9b9ba8] italic'
                        : isMine
                          ? 'bg-gradient-to-br from-[#C62828] to-[#8e1a1a] text-white rounded-br-[4px]'
                          : 'bg-white text-[#1F1B2E] rounded-bl-[4px]'
                    }`}>

                      {/* Nom de l'expéditeur (intérieur de la bulle pour messages reçus) */}
                      {!isMine && !isDeleted && (
                        <p className="text-[11px] font-bold text-[#6A1B9A] mb-1">
                          {msg.author.prenoms} {msg.author.nom}
                        </p>
                      )}

                      {/* Citation de réponse */}
                      {!isDeleted && msg.replyTo && (
                        <button
                          onClick={() => msg.replyTo?.id && scrollToMsg(msg.replyTo.id)}
                          className={`block w-full text-left rounded-lg px-2.5 py-1.5 mb-2 border-l-4 ${
                            isMine
                              ? 'bg-white/15 border-white/60'
                              : 'bg-[#f3eef8] border-[#6A1B9A]'
                          }`}
                        >
                          <p className={`text-[11px] font-bold truncate ${isMine ? 'text-white/90' : 'text-[#6A1B9A]'}`}>
                            {msg.replyTo.author?.prenoms} {msg.replyTo.author?.nom}
                          </p>
                          <p className={`text-[11px] truncate ${isMine ? 'text-white/70' : 'text-[#6b6b78]'}`}>
                            {msg.replyTo.deletedAt ? 'Message supprimé' : msg.replyTo.contenu}
                          </p>
                        </button>
                      )}

                      {isDeleted ? (
                        <span className="flex items-center gap-1.5">🚫 Message supprimé</span>
                      ) : editingId === msg.id ? (
                        <div className="flex flex-col gap-1.5 min-w-[180px]">
                          <textarea
                            ref={editInputRef}
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            onKeyDown={handleEditKey}
                            rows={2}
                            className="bg-white/20 text-white rounded-lg px-2 py-1 text-sm outline-none resize-none w-full placeholder:text-white/50"
                          />
                          <div className="flex gap-1.5 justify-end">
                            <button onClick={cancelEdit} className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-full font-bold">Annuler</button>
                            <button onClick={confirmEdit} className="text-[10px] bg-white text-[#6A1B9A] px-2.5 py-1 rounded-full font-bold">Enregistrer</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.contenu}
                          <span className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-[#9b9ba8]'}`}>
                            {msg.editedAt && <span>modifié ·</span>}
                            {formatTime(msg.createdAt)}
                            {isMine && <span className="text-white/80">✓✓</span>}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Actions hover desktop — MES messages (à gauche de la bulle) */}
                    {isMine && !isDeleted && (
                      <div className="absolute -left-16 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1" ref={menuMsgId === msg.id ? menuRef : undefined}>
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="w-6 h-6 rounded-full bg-white shadow border border-[#e6e6ea] flex items-center justify-center text-[#6b6b78] text-xs"
                          title="Répondre"
                        >↩</button>
                        <div className="relative">
                          <button
                            onClick={() => setMenuMsgId(menuMsgId === msg.id ? null : msg.id)}
                            className="w-6 h-6 rounded-full bg-white shadow border border-[#e6e6ea] flex items-center justify-center text-[#6b6b78] text-[10px] font-bold"
                          >···</button>
                          {menuMsgId === msg.id && (
                            <div className="absolute bottom-8 right-0 bg-white rounded-xl shadow-xl border border-[#e6e6ea] overflow-hidden z-20 min-w-[130px]">
                              <button onClick={() => startEdit(msg)} className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-[#1F1B2E] hover:bg-[#f3f3f5] font-semibold">✏️ Modifier</button>
                              <button onClick={() => { setMenuMsgId(null); setDeleteTarget({ id: msg.id, isMine: true }); }} className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-[#C62828] hover:bg-[#fff0f0] font-semibold">🗑️ Supprimer</button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions hover desktop — MESSAGES REÇUS (à droite de la bulle) */}
                    {!isMine && !isDeleted && (
                      <div className="absolute -right-14 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="w-6 h-6 rounded-full bg-white shadow border border-[#e6e6ea] flex items-center justify-center text-[#6b6b78] text-xs"
                          title="Répondre"
                        >↩</button>
                        <button
                          onClick={() => setDeleteTarget({ id: msg.id, isMine: false })}
                          className="w-6 h-6 rounded-full bg-white shadow border border-[#e6e6ea] flex items-center justify-center text-[#9b9ba8] text-xs"
                          title="Masquer pour moi"
                        >🗑️</button>
                      </div>
                    )}
                  </div>

                  {/* Icône de réponse qui apparaît derrière lors du swipe (messages envoyés) */}
                  {isMine && swipe > 10 && (
                    <div className="text-[#6A1B9A] text-lg" style={{ opacity: Math.min(swipe / 52, 1) }}>↩</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Barre de réponse ── */}
      {replyingTo && (
        <div className="flex-shrink-0 bg-white border-t border-[#e6e6ea] px-3 py-2 flex items-center gap-3">
          <div className="w-1 self-stretch bg-[#6A1B9A] rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-[#6A1B9A] truncate">
              {replyingTo.author.prenoms} {replyingTo.author.nom}
            </p>
            <p className="text-xs text-[#6b6b78] truncate">{replyingTo.contenu}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-[#6b6b78] text-xl leading-none flex-shrink-0">✕</button>
        </div>
      )}

      {/* ── Barre d'input ── */}
      <div className="flex-shrink-0 bg-[#F0F2F5] px-2 py-2 flex items-center gap-2">
        <input
          ref={inputRef}
          className="flex-1 bg-white rounded-full px-4 py-2.5 text-sm outline-none shadow-sm"
          placeholder="Message…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C62828] to-[#8e1a1a] flex items-center justify-center text-white disabled:opacity-60 flex-shrink-0 transition-opacity shadow"
        >
          {sending ? <span className="text-xs animate-pulse">…</span> : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M2 21L23 12 2 3v7l15 2-15 2v7z"/></svg>
          )}
        </button>
      </div>

      {/* ── Panneau gestion groupe ── */}
      {showGroupPanel && (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col">

          {/* Header */}
          <div className="bg-gradient-to-r from-[#C62828] to-[#8e1a1a] text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => { setShowGroupPanel(false); closeAddMember(); setSelectedToRemove([]); }}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg"
            >‹</button>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{showAddMember ? 'Ajouter des membres' : convNom}</div>
              <div className="text-[11px] opacity-80">
                {showAddMember
                  ? `${selectedToAdd.length > 0 ? `${selectedToAdd.length} sélectionné${selectedToAdd.length > 1 ? 's' : ''}` : `${annuaire.length} disponibles`}`
                  : `${groupMembers.length} membre${groupMembers.length > 1 ? 's' : ''}`}
              </div>
            </div>
            {isOwner && !showAddMember && (
              <button onClick={openAddMember} className="bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                + Ajouter
              </button>
            )}
            {showAddMember && (
              <button onClick={closeAddMember} className="bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                Annuler
              </button>
            )}
          </div>

          {/* ── Vue AJOUTER ── */}
          {showAddMember ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Recherche */}
              <div className="px-3 py-2 flex-shrink-0">
                <div className="flex items-center bg-[#F0F2F5] rounded-full px-3.5 py-2 gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#9b9ba8]" placeholder="Rechercher…" value={addSearch} onChange={e => setAddSearch(e.target.value)} autoFocus />
                  {addSearch && <button onClick={() => setAddSearch('')} className="text-[#9b9ba8]">✕</button>}
                </div>
              </div>
              {/* Barre sélectionner tout */}
              {!loadingAnnuaire && annuaire.length > 0 && (
                <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#f0f0f0] flex-shrink-0">
                  <span className="text-[12px] text-[#9b9ba8]">{annuaire.filter(u => !addSearch || u.nom.toLowerCase().includes(addSearch.toLowerCase()) || u.prenoms.toLowerCase().includes(addSearch.toLowerCase())).length} utilisateurs</span>
                  <button
                    onClick={() => {
                      const visible = annuaire.filter(u => !addSearch || u.nom.toLowerCase().includes(addSearch.toLowerCase()) || u.prenoms.toLowerCase().includes(addSearch.toLowerCase()));
                      const allSel = visible.every(u => selectedToAdd.includes(u.id));
                      setSelectedToAdd(allSel ? selectedToAdd.filter(id => !visible.some(u => u.id === id)) : [...new Set([...selectedToAdd, ...visible.map(u => u.id)])]);
                    }}
                    className="text-[12px] font-bold text-[#6A1B9A]"
                  >
                    {annuaire.filter(u => !addSearch || u.nom.toLowerCase().includes(addSearch.toLowerCase()) || u.prenoms.toLowerCase().includes(addSearch.toLowerCase())).every(u => selectedToAdd.includes(u.id)) && annuaire.length > 0
                      ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>
              )}
              {/* Liste */}
              <div className="flex-1 overflow-y-auto">
                {loadingAnnuaire ? (
                  <div className="flex items-center justify-center py-12 text-[#9b9ba8] text-sm">Chargement…</div>
                ) : annuaire
                  .filter(u => !addSearch || u.nom.toLowerCase().includes(addSearch.toLowerCase()) || u.prenoms.toLowerCase().includes(addSearch.toLowerCase()))
                  .map(u => {
                    const COLORS = ['from-[#C62828] to-[#8e1a1a]','from-[#6A1B9A] to-[#4a1370]','from-[#2E7D32] to-[#1a5021]','from-[#1F1B2E] to-[#3a1d4d]'];
                    const color = COLORS[u.id.charCodeAt(0) % COLORS.length];
                    const isSelected = selectedToAdd.includes(u.id);
                    return (
                      <button key={u.id} onClick={() => toggleAdd(u.id)} className="flex items-center w-full px-4 py-3 hover:bg-[#F5F5F5] transition-colors">
                        {u.avatarUrl
                          ? <Image src={u.avatarUrl} width={44} height={44} className="w-11 h-11 rounded-full object-cover flex-shrink-0" alt="" />
                          : <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>{u.nom[0]}{u.prenoms[0]}</div>
                        }
                        <div className="flex-1 min-w-0 ml-3 border-b border-[#F2F2F2] py-1 text-left">
                          <p className="font-semibold text-[15px] text-[#1F1B2E] truncate">{u.prenoms} {u.nom}</p>
                          <p className="text-[13px] text-[#9b9ba8] truncate">{u.parish?.nom ?? u.district?.nom ?? u.role}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ml-3 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#2E7D32] border-[#2E7D32]' : 'border-[#d0d0d0]'}`}>
                          {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                      </button>
                    );
                  })
                }
              </div>
              {/* Bouton confirmer */}
              {selectedToAdd.length > 0 && (
                <div className="px-4 py-3 pb-safe border-t border-[#f0f0f0] flex-shrink-0 bg-white">
                  <button
                    onClick={handleConfirmAdd}
                    disabled={applyingChanges}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2E7D32] to-[#1a5021] text-white font-bold text-sm disabled:opacity-60"
                  >
                    {applyingChanges ? 'Ajout en cours…' : `Ajouter ${selectedToAdd.length} membre${selectedToAdd.length > 1 ? 's' : ''}`}
                  </button>
                </div>
              )}
            </div>

          ) : (
            /* ── Vue MEMBRES ── */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Barre sélectionner tout (owner uniquement) */}
              {isOwner && removableMembers.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#f0f0f0] flex-shrink-0">
                  <span className="text-[12px] text-[#9b9ba8]">
                    {selectedToRemove.length > 0 ? `${selectedToRemove.length} sélectionné${selectedToRemove.length > 1 ? 's' : ''}` : `${groupMembers.length} membres`}
                  </span>
                  <button
                    onClick={() => setSelectedToRemove(allRemovableSelected ? [] : removableMembers.map(m => m.userId))}
                    className="text-[12px] font-bold text-[#C62828]"
                  >
                    {allRemovableSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>
              )}
              {/* Liste */}
              <div className="flex-1 overflow-y-auto">
                {groupMembers.map(m => {
                  const u = m.user;
                  if (!u) return null;
                  const COLORS = ['from-[#C62828] to-[#8e1a1a]','from-[#6A1B9A] to-[#4a1370]','from-[#2E7D32] to-[#1a5021]','from-[#1F1B2E] to-[#3a1d4d]'];
                  const color = COLORS[u.id.charCodeAt(0) % COLORS.length];
                  const isMe = u.id === user?.id;
                  const canSelect = isOwner && !isMe && m.role !== 'OWNER';
                  const isSelected = selectedToRemove.includes(u.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => canSelect && toggleRemove(u.id)}
                      className={`flex items-center px-4 py-3 transition-colors ${canSelect ? 'cursor-pointer hover:bg-[#F5F5F5]' : ''} ${isSelected ? 'bg-[#fff5f5]' : ''}`}
                    >
                      <div className="relative flex-shrink-0">
                        {u.avatarUrl
                          ? <Image src={u.avatarUrl} width={50} height={50} className="w-[50px] h-[50px] rounded-full object-cover" alt="" />
                          : <div className={`w-[50px] h-[50px] rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-sm font-bold text-white`}>{u.nom[0]}{u.prenoms[0]}</div>
                        }
                        {m.role === 'OWNER' && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#F58A4B] border-2 border-white flex items-center justify-center text-[10px]">👑</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 ml-3 border-b border-[#F2F2F2] py-1">
                        <p className="font-semibold text-[15px] text-[#1F1B2E] truncate">{u.prenoms} {u.nom}{isMe ? ' (moi)' : ''}</p>
                        <p className="text-[13px] text-[#9b9ba8] truncate">
                          {m.role === 'OWNER' ? 'Administrateur' : u.parish?.nom ?? u.role}
                        </p>
                      </div>
                      {canSelect && (
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ml-3 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#C62828] border-[#C62828]' : 'border-[#d0d0d0]'}`}>
                          {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Bouton confirmer retrait */}
              {selectedToRemove.length > 0 && (
                <div className="px-4 py-3 pb-safe border-t border-[#f0f0f0] flex-shrink-0 bg-white">
                  <button
                    onClick={handleConfirmRemove}
                    disabled={applyingChanges}
                    className="w-full py-3 rounded-xl bg-[#C62828] text-white font-bold text-sm disabled:opacity-60"
                  >
                    {applyingChanges ? 'Retrait en cours…' : `Retirer ${selectedToRemove.length} membre${selectedToRemove.length > 1 ? 's' : ''}`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Modal suppression WhatsApp-style ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-[60] pb-16"
          onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b border-[#f0f0f4]">
              <p className="text-[15px] font-bold text-[#1F1B2E]">Supprimer le message ?</p>
              <p className="text-xs text-[#9b9ba8] mt-0.5">
                {deleteTarget.isMine
                  ? 'Choisissez qui ne pourra plus voir ce message.'
                  : 'Ce message sera masqué uniquement pour vous.'}
              </p>
            </div>
            <div className="flex flex-col p-3 gap-2">
              {/* Pour moi seulement — toujours disponible */}
              <button
                onClick={() => hideForMe(deleteTarget.id)}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-[#f7f7fb] text-left transition-colors"
              >
                <span className="w-9 h-9 rounded-full bg-[#f0f0f4] flex items-center justify-center text-lg flex-shrink-0">🙈</span>
                <div>
                  <div className="font-semibold text-sm text-[#1F1B2E]">Supprimer pour moi</div>
                  <div className="text-xs text-[#9b9ba8]">Masqué uniquement sur votre appareil</div>
                </div>
              </button>

              {/* Pour tous — seulement si c'est mon message */}
              {deleteTarget.isMine && (
                <button
                  onClick={deleteForEveryone}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-[#fff0f0] text-left transition-colors"
                >
                  <span className="w-9 h-9 rounded-full bg-[#ffe6e6] flex items-center justify-center text-lg flex-shrink-0">🗑️</span>
                  <div>
                    <div className="font-semibold text-sm text-[#C62828]">Supprimer pour tous</div>
                    <div className="text-xs text-[#9b9ba8]">Le message disparaît pour tout le monde</div>
                  </div>
                </button>
              )}

              <button onClick={() => setDeleteTarget(null)}
                className="w-full py-3 rounded-xl border border-[#e6e6ea] text-sm font-semibold text-[#6b6b78] hover:bg-[#f7f7fb] transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MsgAvatar({ author }: { author: Partial<User> }) {
  const initials = `${author.nom?.[0] ?? ''}${author.prenoms?.[0] ?? ''}`.toUpperCase() || '?';
  const COLORS = [
    'from-[#C62828] to-[#8e1a1a]',
    'from-[#6A1B9A] to-[#4a1370]',
    'from-[#2E7D32] to-[#1a5021]',
    'from-[#1F1B2E] to-[#3a1d4d]',
    'from-[#F58A4B] to-[#C62828]',
  ];
  const color = COLORS[(author.id?.charCodeAt(0) ?? 0) % COLORS.length];

  if (author.avatarUrl) {
    return (
      <Image
        src={author.avatarUrl}
        width={32}
        height={32}
        alt={initials}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 shadow-sm"
      />
    );
  }
  return (
    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm`}>
      {initials}
    </div>
  );
}
