'use client';
import Image from 'next/image';
import { use, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { messagingApi, usersApi, authApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';
import { useUnreadCounts } from '@/store/unreadCounts';
import type { Conversation, ConversationMember, Message, User } from '@/types';

const HEADER_CONFIG: Record<string, { label: string; gradient: string }> = {
  COMMUNAUTE: { label: '🌍 Communauté',         gradient: 'from-[#F58A4B] via-[#E55A35] to-[#7A2820]' },
  REGION:     { label: '🗺️ Région',              gradient: 'from-[#F58A4B] via-[#E55A35] to-[#7A2820]' },
  DOYENNE:    { label: '🛡️ District',             gradient: 'from-[#F58A4B] via-[#E55A35] to-[#7A2820]' },
  PAROISSE:   { label: '⛪ Paroisse',             gradient: 'from-[#F58A4B] via-[#E55A35] to-[#7A2820]' },
  PRIVE:      { label: '🤝 Conversation privée', gradient: 'from-[#F58A4B] via-[#E55A35] to-[#7A2820]' },
  GROUPE:     { label: '👥 Groupe',               gradient: 'from-[#F58A4B] via-[#E55A35] to-[#7A2820]' },
  DIFFUSION:  { label: '📣 Diffusion générale',  gradient: 'from-[#B71C1C] via-[#c62828] to-[#7f1010]' },
};

const PANEL_LABELS: Record<string, string> = {
  COMMUNAUTE: 'Membres de la communauté',
  REGION:     'Membres de la région',
  DOYENNE:    'Membres du district',
  PAROISSE:   'Membres de la paroisse',
  PRIVE:      'Participants',
  GROUPE:     'Membres du groupe',
  DIFFUSION:  'Tous les membres',
};

const PANEL_ICONS: Record<string, string> = {
  COMMUNAUTE: '🌍',
  REGION:     '🗺️',
  DOYENNE:    '🛡️',
  PAROISSE:   '⛪',
  PRIVE:      '🤝',
  GROUPE:     '👥',
  DIFFUSION:  '📣',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN:      'Administrateur',
  SENTINELLE: 'Sentinelle régionale',
  GUIDE:      'Guide paroissial',
  GARDIEN:    'Gardien',
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
  const refreshMessages = useUnreadCounts(s => s.refreshMessages);
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
  const [syncingMembers, setSyncingMembers] = useState(false);
  const [syncResult, setSyncResult] = useState<number | null>(null);
  const isOwner = myRole === 'OWNER';

  const TERRITORY_TYPES = ['PAROISSE', 'DOYENNE', 'REGION', 'DIFFUSION'];

  const handleSyncMembers = async () => {
    setSyncingMembers(true);
    setSyncResult(null);
    try {
      const { data } = await messagingApi.syncMembers(id);
      setSyncResult((data as { synced: number }).synced);
      // Reload members
      const conv = await messagingApi.getConversation(id);
      setGroupMembers((conv.data as { members?: ConversationMember[] }).members ?? []);
    } catch { /* ignore */ }
    finally { setSyncingMembers(false); }
  };

  // Swipe-to-reply
  const swipeStartX = useRef(0);
  const swipeStartId = useRef<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<{ id: string; offset: number } | null>(null);

  // Polling fallback: timestamp du dernier message connu
  const lastMsgAtRef = useRef<string | null>(null);
  // Token WS court-vécu fetchant depuis /auth/ws-token pour authentifier le socket
  const wsTokenRef = useRef<string | null>(null);

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
        const msgs = r.data as Message[];
        setMessages(msgs);
        if (msgs.length) lastMsgAtRef.current = msgs[msgs.length - 1].createdAt as string;
        return messagingApi.conversations();
      })
      .then(cr => {
        const conv = (cr.data as Conversation[]).find(c => c.id === id);
        if (conv) {
          setConvType(conv.type);
          setConvNom(conv.nom ?? '');
          loadGroupDetails();
        }
      })
      .catch(() => {});
    messagingApi.markRead(id).then(() => refreshMessages()).catch(() => {});
  }, [id, loadGroupDetails]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const onNewMessage = (msg: Message) => {
      // Ignorer les messages d'autres conversations (socket rejoint toutes les rooms)
      if (msg.conversationId !== id) return;
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        lastMsgAtRef.current = msg.createdAt as string;
        return [...prev, msg];
      });
      // Marquer comme lu immédiatement si l'utilisateur est en train de lire
      if (document.visibilityState === 'visible') {
        messagingApi.markRead(id).catch(() => {});
        refreshMessages();
      }
    };
    const onEditMessage = (msg: Message) => {
      if (msg.conversationId !== id) return;
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m));
    };
    const onDeleteMessage = ({ id: msgId, conversationId: convId }: { id: string; conversationId?: string }) => {
      if (convId && convId !== id) return;
      setMessages(prev => prev.map(m => m.id === msgId
        ? { ...m, deletedAt: new Date().toISOString(), contenu: undefined }
        : m));
    };

    let activeSocket: ReturnType<typeof getSocket> | null = null;

    const joinRoom = () => {
      if (!activeSocket || !mounted) return;
      activeSocket.emit('join:conversation', id, (res: { joined: string | false } | null) => {
        if (mounted && !res?.joined) {
          retryTimer = setTimeout(joinRoom, 3000);
        }
      });
    };

    const setupSocket = (tok: string | null) => {
      if (!mounted) return;
      wsTokenRef.current = tok;
      activeSocket = getSocket(tok);
      joinRoom();
      activeSocket.on('connect', joinRoom);
      activeSocket.on('new:message', onNewMessage);
      activeSocket.on('edit:message', onEditMessage);
      activeSocket.on('delete:message', onDeleteMessage);
    };

    // Fetch d'un token WS dédié (cookie-based, court-vécu) puis connexion socket
    authApi.wsToken()
      .then(({ data }) => setupSocket(data.token))
      .catch(() => setupSocket(null)); // Fallback : cookie withCredentials

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      if (activeSocket) {
        activeSocket.emit('leave:conversation', id);
        activeSocket.off('connect', joinRoom);
        activeSocket.off('new:message', onNewMessage);
        activeSocket.off('edit:message', onEditMessage);
        activeSocket.off('delete:message', onDeleteMessage);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  // Polling de secours + refresh sur visibilité de l'onglet
  useEffect(() => {
    if (!user) return;

    const fetchRecent = async () => {
      try {
        // Derniers 20 messages — fiable sans dépendance sur l'horodatage
        const r = await messagingApi.messages(id, 1, undefined, 20);
        const incoming = r.data as Message[];
        if (!incoming.length) return;
        let hasFresh = false;
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const fresh = incoming.filter(m => !existingIds.has(m.id));
          if (!fresh.length) return prev;
          hasFresh = true;
          lastMsgAtRef.current = fresh[fresh.length - 1].createdAt as string;
          return [...prev, ...fresh];
        });
        // Marquer comme lu si de nouveaux messages sont arrivés et qu'on est sur la page
        if (hasFresh && document.visibilityState === 'visible') {
          messagingApi.markRead(id).catch(() => {});
          refreshMessages();
        }
      } catch { /* ignore */ }
    };

    const timer = setInterval(fetchRecent, 3000);

    // Fetch immédiat + markRead quand l'onglet redevient visible
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchRecent();
        messagingApi.markRead(id).then(() => refreshMessages()).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const sendMessage = () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    const replyId = replyingTo?.id;
    setInput('');
    setReplyingTo(null);
    setSending(true);

    const sock = getSocket(wsTokenRef.current);

    const addMessage = (msg: Message) => {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      lastMsgAtRef.current = msg.createdAt as string;
    };

    if (sock.connected) {
      // Envoi via WebSocket — le gateway broadcast directement depuis this.server
      sock.emit(
        'send:message',
        { conversationId: id, contenu: text, replyToId: replyId },
        (msg: Message | { message?: string } | null) => {
          setSending(false);
          if (msg && 'id' in msg) {
            addMessage(msg as Message);
          } else {
            // Erreur gateway — fallback HTTP avec ajout local
            messagingApi.send(id, text, replyId)
              .then(({ data }) => addMessage(data as Message))
              .catch(() => setInput(text));
          }
        },
      );
    } else {
      // Socket non connecté — HTTP direct avec ajout local
      messagingApi.send(id, text, replyId)
        .then(({ data }) => { addMessage(data as Message); setSending(false); })
        .catch(() => { setInput(text); setSending(false); });
    }
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
    const savedId = editingId;
    const savedText = editText.trim();
    cancelEdit();
    try {
      const { data } = await messagingApi.editMessage(savedId, savedText);
      // Mise à jour locale immédiate (WebSocket le propage aux autres)
      setMessages(prev => prev.map(m => m.id === savedId ? { ...m, ...(data as Message) } : m));
    } catch { /* ignore */ }
  };

  const deleteForEveryone = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setDeleteTarget(null);
    try {
      await messagingApi.deleteMessage(targetId);
      // Mise à jour locale immédiate (WebSocket le propage aux autres)
      setMessages(prev => prev.map(m => m.id === targetId
        ? { ...m, deletedAt: new Date().toISOString(), contenu: undefined }
        : m));
    } catch { /* ignore */ }
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
              : `${privatePartner.nom?.[0] ?? ''}${privatePartner.prenoms?.[0] ?? ''}`}
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
        <button onClick={() => setShowGroupPanel(true)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base" title="Voir les membres">
          👥
        </button>
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

                  {/* ⋮ bouton actions (messages envoyés — apparaît à gauche de la bulle) */}
                  {isMine && !isDeleted && editingId !== msg.id && (
                    <button
                      onClick={() => setMenuMsgId(menuMsgId === msg.id ? null : msg.id)}
                      className="self-end mb-1.5 w-6 h-6 rounded-full bg-white/80 shadow-sm flex items-center justify-center text-[#6b6b78] text-base flex-shrink-0 border border-[#e0e0e0]"
                    >⋮</button>
                  )}

                  {/* Bulle */}
                  <div
                    className="relative max-w-[72%] flex flex-col"
                    style={{ transform: `translateX(${swipe}px)`, transition: swipe === 0 ? 'transform 0.2s ease-out' : 'none' }}
                    onTouchStart={e => onTouchStart(e, msg.id)}
                    onTouchMove={e => onTouchMove(e, msg.id)}
                    onTouchEnd={() => onTouchEnd(msg)}
                  >
                    <div className={`relative px-3 py-2 rounded-[14px] shadow-sm text-sm leading-relaxed ${
                      isDeleted
                        ? 'bg-white text-[#9b9ba8] italic'
                        : isMine
                          ? 'bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] text-white rounded-br-[4px]'
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
                  </div>

                  {/* ⋮ bouton actions (messages reçus — apparaît à droite de la bulle) */}
                  {!isMine && !isDeleted && editingId !== msg.id && (
                    <button
                      onClick={() => setMenuMsgId(menuMsgId === msg.id ? null : msg.id)}
                      className="self-end mb-1.5 w-6 h-6 rounded-full bg-white/80 shadow-sm flex items-center justify-center text-[#6b6b78] text-base flex-shrink-0 border border-[#e0e0e0]"
                    >⋮</button>
                  )}

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
      {convType === 'DIFFUSION' && user?.role !== 'ADMIN' && user?.role !== 'REGION' ? (
        <div className="flex-shrink-0 bg-[#fef2f2] border-t border-[#fca5a5] px-4 py-3 flex items-center gap-2">
          <span className="text-base">📣</span>
          <p className="text-[12px] text-[#991b1b] font-medium">Canal en lecture seule — seuls les administrateurs et responsables régionaux peuvent écrire ici.</p>
        </div>
      ) : (
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
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F58A4B] via-[#E55A35] to-[#7A2820] flex items-center justify-center text-white disabled:opacity-60 flex-shrink-0 transition-opacity shadow"
          >
            {sending ? <span className="text-xs animate-pulse">…</span> : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M2 21L23 12 2 3v7l15 2-15 2v7z"/></svg>
            )}
          </button>
        </div>
      )}

      {/* ── Panneau membres / gestion groupe ── */}
      {showGroupPanel && (() => {
        const isGroupe = convType === 'GROUPE';
        const panelTitle = showAddMember
          ? 'Ajouter des membres'
          : isGroupe
            ? convNom
            : PANEL_LABELS[convType] ?? 'Membres';
        const panelSub = showAddMember
          ? (selectedToAdd.length > 0 ? `${selectedToAdd.length} sélectionné${selectedToAdd.length > 1 ? 's' : ''}` : `${annuaire.length} disponibles`)
          : `${groupMembers.length} membre${groupMembers.length > 1 ? 's' : ''}`;

        return (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col">

          {/* Header */}
          <div className="bg-gradient-to-r from-[#F58A4B] via-[#E55A35] to-[#7A2820] text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => { setShowGroupPanel(false); closeAddMember(); setSelectedToRemove([]); }}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg"
            >‹</button>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{panelTitle}</div>
              <div className="text-[11px] opacity-80">{panelSub}</div>
            </div>
            {isGroupe && isOwner && !showAddMember && (
              <button onClick={openAddMember} className="bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                + Ajouter
              </button>
            )}
            {isGroupe && showAddMember && (
              <button onClick={closeAddMember} className="bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                Annuler
              </button>
            )}
            {!isGroupe && TERRITORY_TYPES.includes(convType) && convType !== 'DIFFUSION' && (
              syncResult !== null ? (
                <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full">
                  {syncResult} membres ✓
                </span>
              ) : (
                <button onClick={handleSyncMembers} disabled={syncingMembers}
                  className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full disabled:opacity-50">
                  {syncingMembers ? '…' : '⟳ Sync'}
                </button>
              )
            )}
          </div>

          {/* ── Vue AJOUTER (GROUPE seulement) ── */}
          {isGroupe && showAddMember ? (
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
                    const COLORS = ['from-[#F58A4B] via-[#E55A35] to-[#7A2820]','from-[#6A1B9A] to-[#4a1370]','from-[#2E7D32] to-[#1a5021]','from-[#1F1B2E] to-[#3a1d4d]'];
                    const color = COLORS[u.id.charCodeAt(0) % COLORS.length];
                    const isSelected = selectedToAdd.includes(u.id);
                    return (
                      <button key={u.id} onClick={() => toggleAdd(u.id)} className="flex items-center w-full px-4 py-3 hover:bg-[#F5F5F5] transition-colors">
                        {u.avatarUrl
                          ? <Image src={u.avatarUrl} width={44} height={44} className="w-11 h-11 rounded-full object-cover flex-shrink-0" alt="" />
                          : <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>{u.nom?.[0] ?? ''}{u.prenoms?.[0] ?? ''}</div>
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
              {/* Bandeau territoire pour les canaux non-groupe */}
              {!isGroupe && convNom && (
                <div className="px-4 py-2.5 bg-[#f9f4ff] border-b border-[#ede4f8] flex-shrink-0 flex items-center gap-2">
                  <span className="text-[#6A1B9A] text-base">{PANEL_ICONS[convType] ?? '📡'}</span>
                  <span className="text-[13px] text-[#6A1B9A] font-semibold truncate">{convNom}</span>
                </div>
              )}
              {/* Barre sélectionner tout (GROUPE + owner uniquement) */}
              {isGroupe && isOwner && removableMembers.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#f0f0f0] flex-shrink-0">
                  <span className="text-[12px] text-[#9b9ba8]">
                    {selectedToRemove.length > 0 ? `${selectedToRemove.length} sélectionné${selectedToRemove.length > 1 ? 's' : ''}` : `${groupMembers.length} membres`}
                  </span>
                  <button
                    onClick={() => setSelectedToRemove(allRemovableSelected ? [] : removableMembers.map(m => m.userId))}
                    className="text-[12px] font-bold text-[#E55A35]"
                  >
                    {allRemovableSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>
              )}
              {/* Liste */}
              <div className="flex-1 overflow-y-auto">
                {groupMembers.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-[#9b9ba8]">
                    <span className="text-3xl">👥</span>
                    <span className="text-sm">Aucun membre trouvé</span>
                  </div>
                )}
                {groupMembers.map(m => {
                  const u = m.user;
                  if (!u) return null;
                  const COLORS = ['from-[#F58A4B] via-[#E55A35] to-[#7A2820]','from-[#6A1B9A] to-[#4a1370]','from-[#2E7D32] to-[#1a5021]','from-[#1F1B2E] to-[#3a1d4d]'];
                  const color = COLORS[u.id.charCodeAt(0) % COLORS.length];
                  const isMe = u.id === user?.id;
                  const canSelect = isGroupe && isOwner && !isMe && m.role !== 'OWNER';
                  const isSelected = selectedToRemove.includes(u.id);
                  const roleLabel = ROLE_LABELS[u.role as string] ?? u.role;
                  return (
                    <div
                      key={m.id}
                      onClick={() => canSelect && toggleRemove(u.id)}
                      className={`flex items-center px-4 py-3 transition-colors ${canSelect ? 'cursor-pointer hover:bg-[#F5F5F5]' : ''} ${isSelected ? 'bg-[#fff5f5]' : ''}`}
                    >
                      <div className="relative flex-shrink-0">
                        {u.avatarUrl
                          ? <Image src={u.avatarUrl} width={50} height={50} className="w-[50px] h-[50px] rounded-full object-cover" alt="" />
                          : <div className={`w-[50px] h-[50px] rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-sm font-bold text-white`}>{u.nom?.[0] ?? ''}{u.prenoms?.[0] ?? ''}</div>
                        }
                        {m.role === 'OWNER' && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#F58A4B] border-2 border-white flex items-center justify-center text-[10px]">👑</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 ml-3 border-b border-[#F2F2F2] py-1">
                        <p className="font-semibold text-[15px] text-[#1F1B2E] truncate">{u.prenoms} {u.nom}{isMe ? ' (moi)' : ''}</p>
                        <p className="text-[13px] text-[#9b9ba8] truncate">
                          {m.role === 'OWNER' ? 'Administrateur' : (u.parish?.nom ?? roleLabel)}
                        </p>
                      </div>
                      {canSelect && (
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ml-3 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#E55A35] border-[#E55A35]' : 'border-[#d0d0d0]'}`}>
                          {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Bouton confirmer retrait (GROUPE uniquement) */}
              {isGroupe && selectedToRemove.length > 0 && (
                <div className="px-4 py-3 pb-safe border-t border-[#f0f0f0] flex-shrink-0 bg-white">
                  <button
                    onClick={handleConfirmRemove}
                    disabled={applyingChanges}
                    className="w-full py-3 rounded-xl bg-[#E55A35] text-white font-bold text-sm disabled:opacity-60"
                  >
                    {applyingChanges ? 'Retrait en cours…' : `Retirer ${selectedToRemove.length} membre${selectedToRemove.length > 1 ? 's' : ''}`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        );
      })()}

      {/* ── Action sheet message (mobile) ── */}
      {menuMsgId && (() => {
        const menuMsg = messages.find(m => m.id === menuMsgId);
        if (!menuMsg) return null;
        const isMineMenu = menuMsg.authorId === user?.id;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-end z-[60]" onClick={() => setMenuMsgId(null)}>
            <div className="bg-white rounded-t-2xl w-full max-w-lg mx-auto shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
              {menuMsg.contenu && (
                <div className="px-5 pt-4 pb-3 border-b border-[#f0f0f4]">
                  <p className="text-[11px] font-semibold text-[#6A1B9A] mb-0.5 truncate">{menuMsg.author.prenoms} {menuMsg.author.nom}</p>
                  <p className="text-sm text-[#1F1B2E] line-clamp-2">{menuMsg.contenu}</p>
                </div>
              )}
              <div className="flex flex-col p-3 gap-1">
                <button
                  onClick={() => { setReplyingTo(menuMsg); setMenuMsgId(null); }}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl active:bg-[#f0f0f4] text-left transition-colors"
                >
                  <span className="w-9 h-9 rounded-full bg-[#f0f0f4] flex items-center justify-center text-lg flex-shrink-0">↩</span>
                  <span className="font-semibold text-sm text-[#1F1B2E]">Répondre</span>
                </button>
                {isMineMenu && (
                  <button
                    onClick={() => startEdit(menuMsg)}
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl active:bg-[#f0f0f4] text-left transition-colors"
                  >
                    <span className="w-9 h-9 rounded-full bg-[#f0f0f4] flex items-center justify-center text-lg flex-shrink-0">✏️</span>
                    <span className="font-semibold text-sm text-[#1F1B2E]">Modifier</span>
                  </button>
                )}
                <button
                  onClick={() => { setMenuMsgId(null); setDeleteTarget({ id: menuMsg.id, isMine: isMineMenu }); }}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl active:bg-[#fff8f3] text-left transition-colors"
                >
                  <span className="w-9 h-9 rounded-full bg-[#ffe6e6] flex items-center justify-center text-lg flex-shrink-0">🗑️</span>
                  <span className="font-semibold text-sm text-[#E55A35]">Supprimer</span>
                </button>
                <button
                  onClick={() => setMenuMsgId(null)}
                  className="w-full py-3.5 rounded-xl border border-[#e6e6ea] text-sm font-semibold text-[#6b6b78] mt-1 active:bg-[#f7f7fb]"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-[#fff8f3] text-left transition-colors"
                >
                  <span className="w-9 h-9 rounded-full bg-[#ffe6e6] flex items-center justify-center text-lg flex-shrink-0">🗑️</span>
                  <div>
                    <div className="font-semibold text-sm text-[#E55A35]">Supprimer pour tous</div>
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
    'from-[#F58A4B] via-[#E55A35] to-[#7A2820]',
    'from-[#6A1B9A] to-[#4a1370]',
    'from-[#2E7D32] to-[#1a5021]',
    'from-[#1F1B2E] to-[#3a1d4d]',
    'from-[#FFB36B] to-[#7A2820]',
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
