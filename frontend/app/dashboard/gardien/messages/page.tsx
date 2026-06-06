'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { messagingApi, contactsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { Conversation, ContactItem, ContactUser, Contact } from '@/types';

/* ── Types locaux ── */
type ConvMode = 'pick' | 'individual' | 'group' | 'channels';

const CONV_ICON: Record<string, string> = {
  COMMUNAUTE: '🌍', REGION: '🗺️', DOYENNE: '🛡️', PAROISSE: '⛪', PRIVE: '🤝', GROUPE: '👥',
};
const CONV_GRADIENT: Record<string, string> = {
  COMMUNAUTE: 'from-[#F58A4B] to-[#C62828]',
  REGION:     'from-[#F58A4B] to-[#C62828]',
  DOYENNE:    'from-[#6A1B9A] to-[#3d1163]',
  PAROISSE:   'from-[#C62828] to-[#7a1717]',
  PRIVE:      'from-[#1F1B2E] to-[#3a1d4d]',
  GROUPE:     'from-[#2E7D32] to-[#1a5021]',
};
const CANAL_LABEL: Record<string, string> = {
  COMMUNAUTE: 'Communauté', REGION: 'Région', DOYENNE: 'Doyenné',
  PAROISSE: 'Paroisse', GROUPE: 'Groupe', PRIVE: 'Privé',
};

type Tab = 'messages' | 'contacts';
const TAB_KEY = 'gardien-messages-tab';

function convTimeLabel(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

/* Dérive le nom d'affichage d'une conversation (style WhatsApp) */
function convDisplayName(conv: Conversation, myId?: string): string {
  if (conv.nom) return conv.nom;
  if (conv.type === 'PRIVE' && conv.members && myId) {
    const other = conv.members.find(m => m.userId !== myId);
    if (other?.user) return `${other.user.prenoms} ${other.user.nom}`;
  }
  return 'Conversation';
}

export default function MessagesPage() {
  const { user }   = useAuthStore();
  const pathname   = usePathname();
  const msgsBase   = pathname.startsWith('/dashboard/guide')
    ? '/dashboard/guide/messages'
    : '/dashboard/gardien/messages';
  const [tab, setTab] = useState<Tab>('messages');

  /* ── Persistance de l'onglet via localStorage ── */
  useEffect(() => {
    const saved = localStorage.getItem(TAB_KEY) as Tab;
    if (saved === 'messages' || saved === 'contacts') setTab(saved);
  }, []);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    localStorage.setItem(TAB_KEY, t);
  };

  const initials = user ? `${user.nom[0]}${user.prenoms[0]}`.toUpperCase() : '?';

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-[#C62828] to-[#8e1a1a] flex-shrink-0">
        <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
          <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center font-bold text-xs text-white flex-shrink-0 overflow-hidden">
            {user?.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" alt="" /> : initials}
          </div>
          <h1 className="flex-1 text-[18px] font-black text-white tracking-tight">Messagerie</h1>
        </div>

        <div className="flex">
          {(['messages', 'contacts'] as Tab[]).map(t => (
            <button key={t} onClick={() => handleTabChange(t)}
              className={`flex-1 py-2.5 text-[12px] font-bold uppercase tracking-widest transition-colors relative ${
                tab === t ? 'text-white' : 'text-white/40'
              }`}>
              {t === 'messages' ? 'Messages' : 'Contacts'}
              {tab === t && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-t-sm" />}
            </button>
          ))}
        </div>
      </div>

      {tab === 'messages' ? <MessagesTab myId={user?.id} msgsBase={msgsBase} /> : <ContactsTab msgsBase={msgsBase} />}
    </div>
  );
}

/* ══════════════════════════════════════════════ MESSAGES TAB ══ */

function MessagesTab({ myId, msgsBase }: { myId?: string; msgsBase: string }) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showModal, setShowModal]         = useState(false);

  const reload = useCallback(() => {
    messagingApi.conversations()
      .then(r => setConversations(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handlePin = async (conv: Conversation) => {
    await messagingApi.togglePin(conv.id).catch(() => {});
    reload();
  };

  const handleDelete = async (id: string) => {
    await messagingApi.deleteConversation(id).catch(() => {});
    setDeleteConfirmId(null);
    reload();
  };

  /* N'afficher que les conversations avec au moins un message */
  const withMessages = conversations.filter(c =>
    (c._count?.messages ?? 0) > 0 || (c.messages?.length ?? 0) > 0
  );

  const filtered = useCallback(
    (list: Conversation[]) =>
      search ? list.filter(c => {
        const name = convDisplayName(c, myId).toLowerCase();
        return name.includes(search.toLowerCase());
      }) : list,
    [search, myId],
  );

  const pinned   = filtered(withMessages.filter(c => c.isPinned));
  const channels = filtered(withMessages.filter(c => !c.isPinned && c.type !== 'PRIVE' && c.type !== 'GROUPE'));
  const groups   = filtered(withMessages.filter(c => !c.isPinned && c.type === 'GROUPE'));
  const privates = filtered(withMessages.filter(c => !c.isPinned && c.type === 'PRIVE'));
  const isEmpty  = !loading && withMessages.length === 0;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white relative">
      {/* Recherche */}
      <div className="px-3 py-2 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center bg-[#F0F2F5] rounded-full px-3.5 py-2 gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="flex-1 bg-transparent text-sm outline-none text-[#1F1B2E] placeholder:text-[#9b9ba8]"
            placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} className="text-[#9b9ba8] text-base leading-none">✕</button>}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-[#9b9ba8]">
          <div className="text-4xl mb-3 animate-pulse">💬</div>
          <p className="text-sm">Chargement…</p>
        </div>
      )}

      {pinned.length > 0   && <><ListDivider label="Épinglés" />{pinned.map(c => <ConvRow key={c.id} conv={c} myId={myId} msgsBase={msgsBase} onPin={() => handlePin(c)} onDelete={() => setDeleteConfirmId(c.id)} />)}</>}
      {channels.length > 0 && <><ListDivider label="Canaux" />{channels.map(c => <ConvRow key={c.id} conv={c} myId={myId} msgsBase={msgsBase} onPin={() => handlePin(c)} onDelete={() => setDeleteConfirmId(c.id)} />)}</>}
      {groups.length > 0   && <><ListDivider label="Groupes" />{groups.map(c => <ConvRow key={c.id} conv={c} myId={myId} msgsBase={msgsBase} onPin={() => handlePin(c)} onDelete={() => setDeleteConfirmId(c.id)} />)}</>}
      {privates.length > 0 && <><ListDivider label="Conversations privées" />{privates.map(c => <ConvRow key={c.id} conv={c} myId={myId} msgsBase={msgsBase} onPin={() => handlePin(c)} onDelete={() => setDeleteConfirmId(c.id)} />)}</>}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-[#EDE7F6] flex items-center justify-center text-4xl mb-4">💬</div>
          <p className="text-[15px] font-bold text-[#1F1B2E] mb-1">Aucune conversation</p>
          <p className="text-sm text-[#9b9ba8] leading-relaxed">Tes canaux apparaîtront ici dès que tu seras rattaché(e).</p>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#3d1163] shadow-lg flex items-center justify-center text-white z-30 active:scale-95 transition-transform"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          <line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/>
        </svg>
      </button>

      {/* Modal nouvelle conversation */}
      {showModal && (
        <NewConvModal
          onClose={() => setShowModal(false)}
          onCreated={id => {
            setShowModal(false);
            reload();
            router.push(`${msgsBase}/${id}`);
          }}
        />
      )}

      {/* Modal suppression */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 pb-8">
            <p className="text-[15px] font-bold text-[#1F1B2E] mb-1">Supprimer cette conversation ?</p>
            <p className="text-sm text-[#9b9ba8] mb-5">Elle disparaîtra de ta liste.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 rounded-xl border border-[#e6e6ea] text-sm font-bold text-[#6b6b78]">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="flex-1 py-3 rounded-xl bg-[#C62828] text-white text-sm font-bold">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════ CONTACTS TAB ══ */

type ContactFilter = 'TOUS' | 'PAROISSE' | 'DOYENNE' | 'CONTACTS';

const CONTACT_FILTERS: { key: ContactFilter; label: string; icon: string }[] = [
  { key: 'TOUS',     label: 'Tous',     icon: '👥' },
  { key: 'PAROISSE', label: 'Paroisse', icon: '⛪' },
  { key: 'DOYENNE',  label: 'Doyenné',  icon: '🛡️' },
  { key: 'CONTACTS', label: 'Contacts', icon: '🤝' },
];

function ContactsTab({ msgsBase }: { msgsBase: string }) {
  const router = useRouter();
  const { user: me } = useAuthStore();
  const [parish,   setParish]   = useState<ContactUser[]>([]);
  const [accepted, setAccepted] = useState<ContactItem[]>([]);
  const [received, setReceived] = useState<Contact[]>([]);
  const [sent,     setSent]     = useState<Contact[]>([]);
  const [searchQ,  setSearchQ]  = useState('');
  const [searchRes,setSearchRes]= useState<ContactUser[]>([]);
  const [searching,setSearching]= useState(false);
  const [loading,  setLoading]  = useState(true);
  const [dmLoading,setDmLoading]= useState<string | null>(null);
  const [addOpen,  setAddOpen]  = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);
  const [contactFilter, setContactFilter] = useState<ContactFilter>('TOUS');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, ok: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const canSearch      = searchQ.length >= 2;
  const visibleSearch  = canSearch ? searchRes : [];

  const reload = useCallback(() => {
    Promise.all([
      contactsApi.parish(),
      contactsApi.list(),
      contactsApi.received(),
      contactsApi.sent(),
    ]).then(([p, a, r, s]) => {
      setParish(p.data);
      setAccepted(a.data);
      setReceived(r.data);
      setSent(s.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (!canSearch) { setSearchRes([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { const r = await contactsApi.search(searchQ); setSearchRes(r.data); }
      catch { setSearchRes([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [canSearch, searchQ]);

  const handleAccept = async (id: string, name?: string) => {
    try {
      await contactsApi.accept(id);
      reload();
      showToast(`✓ ${name ? name + ' ajouté' : 'Contact accepté'} !`, true);
    } catch { showToast('Erreur lors de l\'acceptation.', false); }
  };
  const handleDecline = async (id: string) => {
    try {
      await contactsApi.decline(id);
      reload();
      showToast('Demande refusée.', true);
    } catch { showToast('Erreur.', false); }
  };
  const handleRequest = async (userId: string, name?: string) => {
    try {
      await contactsApi.request(userId);
      reload(); setSearchQ(''); setSearchRes([]);
      showToast(`Demande envoyée${name ? ' à ' + name : ''} !`, true);
    } catch { showToast('Impossible d\'envoyer la demande.', false); }
  };
  const handleDM = async (userId: string) => {
    setDmLoading(userId);
    try {
      const { data } = await messagingApi.createPrivate(userId);
      router.push(`${msgsBase}/${data.id}`);
    } catch { showToast('Impossible d\'ouvrir la conversation.', false); }
    finally { setDmLoading(null); }
  };

  /* ── Logique de filtrage ── */
  const myDistrictId = (me as { district?: { id: string } } | null)?.district?.id;

  const visibleParish = (() => {
    if (contactFilter === 'CONTACTS') return [];
    if (contactFilter === 'DOYENNE' && myDistrictId) {
      return parish.filter(u => !u.district || u.district.id === myDistrictId);
    }
    return parish;
  })();

  const visibleAccepted = (() => {
    if (contactFilter === 'PAROISSE') return [];
    if (contactFilter === 'DOYENNE' && myDistrictId) {
      return accepted.filter(c => !c.user.district || c.user.district.id === myDistrictId);
    }
    if (contactFilter === 'CONTACTS') return accepted;
    return accepted;
  })();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center text-[#9b9ba8]">
          <div className="text-3xl mb-3 animate-pulse">👥</div>
          <p className="text-sm">Chargement des contacts…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[150] px-4 py-2.5 rounded-2xl text-white text-sm font-semibold shadow-xl flex items-center gap-2.5 min-w-[240px] max-w-[90vw] ${
          toast.ok ? 'bg-[#2E7D32]' : 'bg-[#C62828]'
        }`}>
          <span className="text-base">{toast.ok ? '✓' : '✕'}</span>
          <span className="flex-1">{toast.msg}</span>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="px-3 pt-2 pb-0 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center bg-[#F0F2F5] rounded-full px-3.5 py-2 gap-2 mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#9b9ba8]"
            placeholder="Rechercher un contact…" value={searchQ}
            onChange={e => setSearchQ(e.target.value)} />
          {searchQ && <button onClick={() => { setSearchQ(''); setSearchRes([]); }} className="text-[#9b9ba8]">✕</button>}
        </div>

        {/* Filtres */}
        {!canSearch && (
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {CONTACT_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setContactFilter(f.key)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                  contactFilter === f.key
                    ? 'bg-[#1F1B2E] text-white shadow-sm'
                    : 'bg-[#F0F2F5] text-[#6b6b78]'
                }`}
              >
                <span>{f.icon}</span>{f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Résultats de recherche */}
      {(visibleSearch.length > 0 || (canSearch && searching)) && (
        <div className="px-4 pt-3">
          <ListDivider label="Résultats de recherche" />
          {searching && <p className="text-xs text-center text-[#9b9ba8] py-3">Recherche…</p>}
          {visibleSearch.map(u => {
            const isContact   = accepted.some(c => c.user.id === u.id);
            const alreadySent = sent.some(c => c.receiver.id === u.id);
            return (
              <ContactRow key={u.id} user={u} action={
                isContact ? (
                  <button onClick={() => handleDM(u.id)} disabled={dmLoading === u.id}
                    className="text-[11px] bg-[#1F1B2E] text-white px-3 py-1 rounded-full font-bold disabled:opacity-50">
                    {dmLoading === u.id ? '…' : '💬'}
                  </button>
                ) : alreadySent ? (
                  <span className="text-[10px] bg-[#f3f3f5] text-[#6b6b78] px-2.5 py-1 rounded-full font-bold">Envoyé</span>
                ) : (
                  <button onClick={() => handleRequest(u.id)}
                    className="text-[11px] bg-[#6A1B9A] text-white px-3 py-1 rounded-full font-bold">
                    + Ajouter
                  </button>
                )
              } />
            );
          })}
          {!searching && visibleSearch.length === 0 && canSearch && (
            <p className="text-xs text-center text-[#9b9ba8] py-4">Aucun résultat pour « {searchQ} »</p>
          )}
        </div>
      )}

      {/* Demandes reçues — toujours visible */}
      <div className="px-4 pt-3">
        <ListDivider label={
          received.length > 0
            ? <><span>🔔 Demandes reçues</span><span className="ml-1.5 bg-[#C62828] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{received.length}</span></>
            : <span>🔔 Demandes reçues</span>
        } />
        {received.length > 0 ? (
          received.map(c => (
            <ContactRow key={c.id} user={c.requester} action={
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleAccept(c.id, `${c.requester.prenoms} ${c.requester.nom}`)}
                  className="text-[11px] bg-[#2E7D32] text-white px-3 py-1 rounded-full font-bold">✓ Accepter</button>
                <button onClick={() => handleDecline(c.id)}
                  className="text-[11px] bg-white border border-[#e6e6ea] text-[#6b6b78] px-3 py-1 rounded-full font-bold">✕</button>
              </div>
            } />
          ))
        ) : (
          <div className="flex items-center gap-2.5 px-2 py-3 text-[#9b9ba8]">
            <span className="text-xl">📭</span>
            <p className="text-sm">Aucune demande en attente</p>
          </div>
        )}
      </div>

      {/* FAB : Ajouter un contact */}
      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-20 right-4 w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#3d1163] shadow-lg flex items-center justify-center text-white z-30 active:scale-95 transition-transform"
        title="Ajouter un contact"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <line x1="19" y1="8" x2="19" y2="14"/>
          <line x1="22" y1="11" x2="16" y2="11"/>
        </svg>
      </button>

      {/* Modal : Ajouter un contact */}
      {addOpen && (
        <AddContactModal
          accepted={accepted}
          sent={sent}
          dmLoading={dmLoading}
          onClose={() => setAddOpen(false)}
          onRequest={async (userId, name) => { await handleRequest(userId, name); }}
          onDM={handleDM}
          onToast={showToast}
        />
      )}

      {/* Ma paroisse */}
      {visibleParish.length > 0 && (
        <div className="px-4 pt-3">
          <ListDivider label={`⛪ Ma paroisse${me?.parish?.nom ? ` — ${me.parish.nom}` : ''}`} />
          {contactFilter === 'TOUS' && (
            <div className="bg-[#EDE7F6] rounded-2xl p-3 mb-3 flex items-center gap-2">
              <span className="text-base flex-shrink-0">ℹ️</span>
              <p className="text-xs text-[#4a1370] leading-relaxed">
                Les membres de ta paroisse sont automatiquement tes contacts.
              </p>
            </div>
          )}
          {visibleParish.map(u => (
            <ContactRow key={u.id} user={u}
              onClick={() => handleDM(u.id)}
              action={
                <button onClick={() => handleDM(u.id)} disabled={dmLoading === u.id}
                  className="text-[11px] bg-[#6A1B9A] text-white px-3 py-1 rounded-full font-bold disabled:opacity-50">
                  {dmLoading === u.id ? '…' : '💬'}
                </button>
              }
            />
          ))}
        </div>
      )}

      {/* Mes contacts acceptés */}
      {visibleAccepted.length > 0 && (
        <div className="px-4 pt-3">
          <ListDivider label={`🤝 Mes contacts (${visibleAccepted.length})`} />
          {visibleAccepted.map(c => (
            <ContactRow key={c.contactId} user={c.user} sub={c.user.parish?.nom}
              onClick={() => handleDM(c.user.id)}
              action={
                <button onClick={() => handleDM(c.user.id)} disabled={dmLoading === c.user.id}
                  className="text-[11px] bg-[#1F1B2E] text-white px-3 py-1 rounded-full font-bold disabled:opacity-50">
                  {dmLoading === c.user.id ? '…' : '💬'}
                </button>
              }
            />
          ))}
        </div>
      )}

      {/* Demandes envoyées — visible seulement en mode Tous ou Contacts */}
      {(contactFilter === 'TOUS' || contactFilter === 'CONTACTS') && sent.length > 0 && (
        <div className="px-4 pt-3">
          <ListDivider label="⏳ Demandes envoyées" />
          {sent.map(c => (
            <ContactRow key={c.id} user={c.receiver} sub={c.receiver.parish?.nom} action={
              <button onClick={() => handleDecline(c.id)}
                className="text-[11px] bg-white border border-[#e6e6ea] text-[#6b6b78] px-3 py-1 rounded-full font-bold">
                Annuler
              </button>
            } />
          ))}
        </div>
      )}

      {/* État vide filtré */}
      {!canSearch && visibleParish.length === 0 && visibleAccepted.length === 0 && contactFilter !== 'TOUS' && (
        <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#f0f0f5] flex items-center justify-center text-3xl mb-3">
            {CONTACT_FILTERS.find(f => f.key === contactFilter)?.icon ?? '👥'}
          </div>
          <p className="text-[14px] font-bold text-[#1F1B2E]">Aucun contact dans ce filtre</p>
          <p className="text-xs text-[#9b9ba8] mt-1">Essaie un autre filtre ou ajoute des contacts.</p>
        </div>
      )}

      {parish.length === 0 && accepted.length === 0 && received.length === 0 && !canSearch && contactFilter === 'TOUS' && (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#f0e8ff] flex items-center justify-center text-3xl mb-3">👥</div>
          <p className="text-[15px] font-bold text-[#1F1B2E]">Aucun contact pour le moment</p>
          <p className="text-sm text-[#9b9ba8] mt-1 leading-relaxed">
            Recherche un Gardien par son nom pour lui envoyer une demande.
          </p>
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}

/* ══════════════════════════════════════════ MODAL NOUVELLE CONV ══ */

function NewConvModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [mode, setMode]           = useState<ConvMode>('pick');
  const [contacts, setContacts]   = useState<ContactUser[]>([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating]   = useState(false);
  /* Map userId → conversationId pour les convs existantes */
  const [existingConvs, setExistingConvs] = useState<Map<string, string>>(new Map());
  /* Canaux suggérés */
  const [channels, setChannels]   = useState<{
    channelKey: 'PAROISSE' | 'DOYENNE' | 'REGION' | 'GARDIENS' | 'GUIDES' | 'SENTINELLES';
    convType: string;
    nom: string; description: string; icon: string;
    territoryId: string; conversationId: string | null;
    memberCount: number; isMember: boolean;
  }[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [joiningChannel, setJoiningChannel]   = useState<string | null>(null);

  /* Charge contacts + conversations existantes en parallèle */
  useEffect(() => {
    setLoading(true);
    Promise.all([contactsApi.parish(), contactsApi.list(), messagingApi.conversations()])
      .then(([parish, accepted, convRes]) => {
        /* Contacts */
        const parishUsers: ContactUser[] = parish.data ?? [];
        const acceptedUsers: ContactUser[] = (accepted.data as ContactItem[]).map(c => c.user);
        const seen = new Set<string>();
        const all: ContactUser[] = [];
        for (const u of [...parishUsers, ...acceptedUsers]) {
          if (!seen.has(u.id)) { seen.add(u.id); all.push(u); }
        }
        setContacts(all.sort((a, b) => a.nom.localeCompare(b.nom, 'fr')));

        /* Map userId → convId pour les PRIVE existantes */
        const map = new Map<string, string>();
        for (const conv of convRes.data as Conversation[]) {
          if (conv.type === 'PRIVE' && conv.members) {
            for (const m of conv.members) {
              map.set(m.userId, conv.id);
            }
          }
        }
        setExistingConvs(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = search.trim()
    ? contacts.filter(u => {
        const q = search.toLowerCase();
        return u.nom.toLowerCase().includes(q) || u.prenoms.toLowerCase().includes(q);
      })
    : contacts;

  const allVisibleSelected = visible.length > 0 && visible.every(u => selected.includes(u.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) setSelected(prev => prev.filter(id => !visible.some(u => u.id === id)));
    else setSelected(prev => [...new Set([...prev, ...visible.map(u => u.id)])]);
  };

  const handleIndividual = async (userId: string) => {
    /* Si conversation existante → navigation directe sans appel API */
    const existingId = existingConvs.get(userId);
    if (existingId) { onCreated(existingId); return; }

    setCreating(true);
    try {
      const { data } = await messagingApi.createPrivate(userId);
      onCreated(data.id);
    } catch { /* ignore */ }
    finally { setCreating(false); }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selected.length === 0) return;
    setCreating(true);
    try {
      const { data } = await messagingApi.createGroup(groupName.trim(), selected);
      onCreated(data.id);
    } catch { /* ignore */ }
    finally { setCreating(false); }
  };

  const goBack = () => { setMode('pick'); setSelected([]); setSearch(''); };

  const openChannels = () => {
    setMode('channels');
    if (channels.length > 0) return;
    setChannelsLoading(true);
    messagingApi.suggestedChannels()
      .then(r => setChannels(r.data ?? []))
      .catch(() => {})
      .finally(() => setChannelsLoading(false));
  };

  const handleJoinChannel = async (channelKey: 'PAROISSE' | 'DOYENNE' | 'REGION' | 'GARDIENS' | 'GUIDES' | 'SENTINELLES') => {
    setJoiningChannel(channelKey);
    try {
      const { data } = await messagingApi.createOrJoinChannel(channelKey);
      onCreated(data.id);
    } catch { /* ignore */ }
    finally { setJoiningChannel(null); }
  };

  const COLORS = ['from-[#C62828] to-[#8e1a1a]','from-[#6A1B9A] to-[#4a1370]','from-[#2E7D32] to-[#1a5021]','from-[#1F1B2E] to-[#3a1d4d]']; // fallback unused

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">

      {/* Header */}
      <div className="bg-gradient-to-br from-[#C62828] to-[#8e1a1a] flex-shrink-0">
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={mode === 'pick' ? onClose : goBack}
            className="w-8 h-8 flex items-center justify-center text-white/80 text-2xl leading-none">‹</button>
          <h2 className="flex-1 text-[16px] font-bold text-white">
            {mode === 'pick'      ? 'Nouvelle conversation'
              : mode === 'individual' ? 'Message individuel'
              : mode === 'channels'   ? 'Canaux d\'équipe'
              : 'Nouveau groupe'}
          </h2>
          {mode === 'group' && (
            <button onClick={handleCreateGroup}
              disabled={!groupName.trim() || selected.length === 0 || creating}
              className="text-[13px] font-bold text-white/90 bg-white/20 px-3 py-1 rounded-full disabled:opacity-40">
              {creating ? '…' : `Créer${selected.length > 0 ? ` (${selected.length})` : ''}`}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-white">

        {/* ── Choix du type ── */}
        {mode === 'pick' && (
          <div className="p-4 flex flex-col gap-3">
            {[
              { m: 'individual' as ConvMode, icon: '🤝', gradient: 'from-[#1F1B2E] to-[#3a1d4d]',
                title: 'Message individuel', sub: 'Conversation privée avec un contact',
                action: () => setMode('individual') },
              { m: 'group' as ConvMode, icon: '👥', gradient: 'from-[#2E7D32] to-[#1a5021]',
                title: 'Créer un groupe', sub: 'Conversation avec plusieurs contacts',
                action: () => setMode('group') },
              { m: 'channels' as ConvMode, icon: '📡', gradient: 'from-[#6A1B9A] to-[#4a1370]',
                title: 'Canaux d\'équipe', sub: 'Rejoindre les canaux paroissiaux, doyennaux ou régionaux',
                action: openChannels },
            ].map(({ m, icon, gradient, title, sub, action }) => (
              <button key={m} onClick={action}
                className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-[#e6e6ea] active:bg-[#F0F0F0] text-left hover:border-[#c0c0cc] transition-colors">
                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-xl flex-shrink-0`}>
                  {icon}
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#1F1B2E]">{title}</p>
                  <p className="text-[12px] text-[#9b9ba8] mt-0.5">{sub}</p>
                </div>
              </button>
            ))}

            {contacts.length === 0 && !loading && (
              <div className="text-center py-8 text-[#9b9ba8]">
                <div className="text-3xl mb-2">👥</div>
                <p className="text-sm font-semibold text-[#1F1B2E]">Aucun contact disponible</p>
                <p className="text-xs mt-1">Ajoute des contacts depuis l&apos;onglet Contacts.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Canaux d'équipe ── */}
        {mode === 'channels' && (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {channelsLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-[#9b9ba8]">
                <div className="text-3xl animate-pulse mb-3">📡</div>
                <p className="text-sm">Recherche des canaux…</p>
              </div>
            )}

            {!channelsLoading && channels.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-[#9b9ba8]">
                <div className="text-3xl mb-3">📡</div>
                <p className="text-sm font-semibold text-[#1F1B2E]">Aucun canal disponible</p>
                <p className="text-xs mt-1 text-center">Aucun canal d'équipe n'est disponible pour votre territoire.</p>
              </div>
            )}

            {!channelsLoading && channels.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-[11px] text-[#9b9ba8] uppercase tracking-wider font-semibold mb-1">
                  Canaux disponibles pour votre territoire
                </p>
                {channels.map(ch => {
                  const typeGradient: Record<string, string> = {
                    PAROISSE:   'from-[#C62828] to-[#7a1717]',
                    GARDIENS:   'from-[#C62828] to-[#7a1717]',
                    DOYENNE:    'from-[#6A1B9A] to-[#4a1370]',
                    GUIDES:     'from-[#6A1B9A] to-[#4a1370]',
                    REGION:     'from-[#1F1B2E] to-[#3a1d4d]',
                    SENTINELLES:'from-[#1F1B2E] to-[#3a1d4d]',
                  };
                  const isJoining = joiningChannel === ch.channelKey;
                  return (
                    <div key={ch.channelKey}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-[#e6e6ea] bg-white hover:border-[#c0c0cc] transition-colors">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${typeGradient[ch.channelKey]} flex items-center justify-center text-2xl flex-shrink-0 shadow-sm`}>
                        {ch.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-[#1F1B2E] truncate">{ch.nom}</p>
                        <p className="text-[12px] text-[#9b9ba8] mt-0.5">{ch.description}</p>
                        {ch.memberCount > 0 && (
                          <p className="text-[11px] text-[#6b6b78] mt-0.5">
                            👥 {ch.memberCount} membre{ch.memberCount > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleJoinChannel(ch.channelKey)}
                        disabled={isJoining}
                        className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all disabled:opacity-50 ${
                          ch.isMember
                            ? 'bg-[#e8f5e9] text-[#2E7D32] border border-[#a5d6a7] hover:bg-[#2E7D32] hover:text-white'
                            : `bg-gradient-to-r ${typeGradient[ch.channelKey]} text-white shadow-sm`
                        }`}>
                        {isJoining ? '…' : ch.isMember ? 'Ouvrir' : 'Rejoindre'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Liste utilisateurs ── */}
        {mode !== 'pick' && mode !== 'channels' && (
          <>
            {/* Nom du groupe */}
            {mode === 'group' && (
              <div className="px-4 pt-3 pb-2 flex-shrink-0 border-b border-[#f0f0f0]">
                <input
                  className="w-full bg-[#F0F2F5] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#6A1B9A]/20"
                  placeholder="Nom du groupe…"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {/* Recherche */}
            <div className="px-3 pt-2.5 pb-1.5 flex-shrink-0">
              <div className="flex items-center bg-[#F0F2F5] rounded-full px-3.5 py-2 gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#9b9ba8]"
                  placeholder="Rechercher un contact…"
                  value={search} onChange={e => setSearch(e.target.value)} />
                {search && <button onClick={() => setSearch('')} className="text-[#9b9ba8]">✕</button>}
              </div>
            </div>

            {/* Sélection totale (groupe) */}
            {mode === 'group' && visible.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#f0f0f0] flex-shrink-0">
                <span className="text-[12px] text-[#9b9ba8]">
                  {visible.length} contact{visible.length > 1 ? 's' : ''}
                  {selected.length > 0 && ` · ${selected.length} sélectionné${selected.length > 1 ? 's' : ''}`}
                </span>
                <button onClick={toggleSelectAll}
                  className="text-[12px] font-bold text-[#6A1B9A]">
                  {allVisibleSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>
            )}

            {/* Liste */}
            <div className="flex-1 overflow-y-auto pb-6">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-[#9b9ba8] text-sm animate-pulse">👥</div>
              ) : visible.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-[#9b9ba8] text-sm">Aucun résultat</div>
              ) : visible.map(u => {
                const isSelected  = selected.includes(u.id);
                const hasExisting = existingConvs.has(u.id);
                const avatarCls   = ROLE_AVATAR[u.role] ?? 'from-[#1F1B2E] to-[#3a1d4d]';
                const pillCls     = ROLE_PILL[u.role]   ?? 'bg-[#f3f3f5] text-[#6b6b78]';
                const roleLabel   = ROLE_LABEL[u.role]  ?? u.role;
                return (
                  <button key={u.id}
                    disabled={creating}
                    onClick={() => mode === 'individual'
                      ? handleIndividual(u.id)
                      : setSelected(prev => isSelected ? prev.filter(x => x !== u.id) : [...prev, u.id])
                    }
                    className="flex items-center w-full px-4 py-3 hover:bg-[#F5F5F5] transition-colors"
                  >
                    <div className="relative flex-shrink-0">
                      {(u as { avatarUrl?: string }).avatarUrl
                        ? <img src={(u as { avatarUrl?: string }).avatarUrl}
                            className="w-[50px] h-[50px] rounded-full object-cover" alt="" />
                        : <div className={`w-[50px] h-[50px] rounded-full bg-gradient-to-br ${avatarCls} flex items-center justify-center text-sm font-bold text-white`}>
                            {u.nom[0]}{u.prenoms[0]}
                          </div>
                      }
                      {mode === 'group' && isSelected && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#6A1B9A] border-2 border-white flex items-center justify-center text-white text-[10px] font-bold">✓</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 ml-3 border-b border-[#F2F2F2] py-1 text-left">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-[15px] text-[#1F1B2E] truncate">{u.prenoms} {u.nom}</p>
                        <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pillCls}`}>{roleLabel}</span>
                        {mode === 'individual' && hasExisting && (
                          <span className="flex-shrink-0 text-[10px] bg-[#e8f5e9] text-[#2E7D32] px-2 py-0.5 rounded-full font-bold">
                            En cours
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-[#9b9ba8] truncate">
                        {u.parish?.nom ?? u.district?.nom ?? ''}
                        {mode === 'individual' && hasExisting ? ' · Continuer la conversation' : ''}
                      </p>
                    </div>
                    {mode === 'group' && (
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ml-3 flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-[#6A1B9A] border-[#6A1B9A]' : 'border-[#d0d0d0]'
                      }`}>
                        {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════ MODAL AJOUTER CONTACT ══ */

function AddContactModal({ accepted, sent, dmLoading, onClose, onRequest, onDM, onToast }: {
  accepted: ContactItem[];
  sent: Contact[];
  dmLoading: string | null;
  onClose: () => void;
  onRequest: (userId: string, name: string) => Promise<void>;
  onDM: (userId: string) => void;
  onToast: (msg: string, ok: boolean) => void;
}) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<ContactUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { const r = await contactsApi.search(query); setResults(r.data); }
      catch { setResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const handleRequest = async (userId: string, name: string) => {
    setRequesting(userId);
    try {
      await onRequest(userId, name);
      onToast(`Demande envoyée à ${name} !`, true);
      setResults(prev => prev.filter(u => u.id !== userId));
    } catch {
      onToast('Impossible d\'envoyer la demande.', false);
    } finally {
      setRequesting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6A1B9A] to-[#3d1163] flex-shrink-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white/80 text-2xl leading-none">‹</button>
          <h2 className="flex-1 text-[16px] font-bold text-white">Ajouter un contact</h2>
        </div>

        {/* Barre de recherche */}
        <div className="px-3 pb-3">
          <div className="flex items-center bg-white/20 rounded-full px-3.5 py-2.5 gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.7">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher par nom ou matricule…"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/60 outline-none"
            />
            {query && <button onClick={() => { setQuery(''); setResults([]); }} className="text-white/60">✕</button>}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto bg-white">

        {/* Instruction */}
        {query.length < 2 && (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[#EDE7F6] flex items-center justify-center text-4xl mb-4">🔍</div>
            <p className="text-[15px] font-bold text-[#1F1B2E]">Trouver un contact</p>
            <p className="text-sm text-[#9b9ba8] mt-1 leading-relaxed">
              Tape au moins 2 caractères du nom ou du matricule pour lancer la recherche.
            </p>
          </div>
        )}

        {/* Chargement */}
        {searching && (
          <div className="flex items-center justify-center py-10 text-[#9b9ba8] text-sm animate-pulse">
            Recherche en cours…
          </div>
        )}

        {/* Résultats */}
        {!searching && results.length > 0 && (
          <>
            <div className="px-4 py-1.5 bg-[#F7F8FA] border-b border-[#f0f0f0]">
              <span className="text-[11px] text-[#9b9ba8] font-bold uppercase tracking-wider">
                {results.length} résultat{results.length > 1 ? 's' : ''}
              </span>
            </div>
            {results.map(u => {
              const isContact   = accepted.some(c => c.user.id === u.id);
              const alreadySent = sent.some(c => c.receiver.id === u.id);
              const isReq       = requesting === u.id;
              return (
                <ContactRow key={u.id} user={u} sub={u.parish?.nom ?? u.district?.nom}
                  action={
                    isContact ? (
                      <button onClick={() => { onDM(u.id); onClose(); }}
                        disabled={dmLoading === u.id}
                        className="text-[11px] bg-[#1F1B2E] text-white px-3 py-1.5 rounded-full font-bold disabled:opacity-50">
                        {dmLoading === u.id ? '…' : '💬 Message'}
                      </button>
                    ) : alreadySent ? (
                      <span className="text-[10px] bg-[#f3f3f5] text-[#6b6b78] px-2.5 py-1.5 rounded-full font-bold">
                        ✓ Envoyé
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRequest(u.id, `${u.prenoms} ${u.nom}`)}
                        disabled={isReq}
                        className="text-[11px] bg-[#6A1B9A] text-white px-3 py-1.5 rounded-full font-bold disabled:opacity-50">
                        {isReq ? '…' : '+ Ajouter'}
                      </button>
                    )
                  }
                />
              );
            })}
          </>
        )}

        {/* Aucun résultat */}
        {!searching && query.length >= 2 && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
            <div className="text-4xl mb-3">😶</div>
            <p className="text-[15px] font-bold text-[#1F1B2E]">Aucun résultat</p>
            <p className="text-sm text-[#9b9ba8] mt-1">Personne ne correspond à « {query} »</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════ COMPOSANTS PARTAGÉS ══ */

function ListDivider({ label }: { label: React.ReactNode }) {
  return (
    <div className="px-4 py-1.5 bg-[#F7F8FA]">
      <span className="text-[11px] text-[#9b9ba8] font-bold uppercase tracking-wider flex items-center gap-1">{label}</span>
    </div>
  );
}

function ConvRow({ conv, myId, msgsBase, onPin, onDelete }: {
  conv: Conversation; myId?: string; msgsBase: string; onPin: () => void; onDelete: () => void;
}) {
  const icon     = CONV_ICON[conv.type]     ?? '💬';
  const gradient = CONV_GRADIENT[conv.type] ?? 'from-[#6A1B9A] to-[#3d1163]';
  const lastMsg  = conv.messages?.[0];
  const timeStr  = convTimeLabel(conv.lastMessageAt);
  const preview  = lastMsg?.deletedAt ? '🚫 Message supprimé' : lastMsg?.contenu ?? '';

  /* Pour les convs privées : nom et avatar de l'interlocuteur */
  const otherMember = conv.type === 'PRIVE' && myId
    ? conv.members?.find(m => m.userId !== myId)
    : null;
  const displayName = convDisplayName(conv, myId);
  const otherAvatar = (otherMember as { user?: { avatarUrl?: string; nom: string; prenoms: string } } | null)?.user;

  const [swipeX,   setSwipeX]   = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const startX   = useRef(0);
  const ACTION_W = 140;

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchMove  = (e: React.TouchEvent) => {
    const delta = startX.current - e.touches[0].clientX;
    if (delta > 0) setSwipeX(Math.min(delta, ACTION_W));
    else if (swipeX > 0) setSwipeX(Math.max(0, swipeX - (-delta)));
  };
  const onTouchEnd = () => { setSwipeX(swipeX > ACTION_W / 2 ? ACTION_W : 0); };

  return (
    <div className="relative group/row">
      {/* Actions swipe */}
      <div className="absolute right-0 top-0 bottom-0 flex" style={{ width: ACTION_W }}>
        <button onClick={onPin} className="flex-1 flex flex-col items-center justify-center gap-1 bg-[#6A1B9A] text-white font-bold">
          <span className="text-xl">{conv.isPinned ? '📍' : '📌'}</span>
          <span className="text-[10px]">{conv.isPinned ? 'Retirer' : 'Épingler'}</span>
        </button>
        <button onClick={onDelete} className="flex-1 flex flex-col items-center justify-center gap-1 bg-[#C62828] text-white font-bold">
          <span className="text-xl">🗑️</span>
          <span className="text-[10px]">Supprimer</span>
        </button>
      </div>

      {/* Ligne principale */}
      <div className="overflow-hidden"
        style={{ transform: `translateX(-${swipeX}px)`, transition: swipeX === 0 || swipeX === ACTION_W ? 'transform 0.2s ease-out' : 'none' }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <Link href={`${msgsBase}/${conv.id}`}
          className="flex items-center px-3 py-2.5 bg-white hover:bg-[#F5F5F5] transition-colors pr-10">
          {/* Avatar : photo réelle pour PRIVE, icône pour les canaux */}
          {otherAvatar?.avatarUrl ? (
            <img src={otherAvatar.avatarUrl}
              className="w-[50px] h-[50px] rounded-full object-cover flex-shrink-0" alt="" />
          ) : otherAvatar ? (
            <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#1F1B2E] to-[#3a1d4d] flex items-center justify-center text-white font-bold flex-shrink-0">
              {otherAvatar.nom[0]}{otherAvatar.prenoms[0]}
            </div>
          ) : (
            <div className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-xl text-white bg-gradient-to-br ${gradient} flex-shrink-0 shadow-sm`}>
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0 ml-3 py-1 border-b border-[#F2F2F2]">
            <div className="flex justify-between items-baseline gap-2">
              <span className="font-semibold text-[15px] text-[#1F1B2E] truncate">{displayName}</span>
              {timeStr && <span className="text-[12px] text-[#9b9ba8] flex-shrink-0">{timeStr}</span>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[13px] text-[#9b9ba8] truncate flex-1 leading-snug">{preview}</span>
              {conv.isPinned && <span className="text-[11px] flex-shrink-0">📌</span>}
            </div>
          </div>
        </Link>
      </div>

      {/* Menu desktop ··· */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/row:opacity-100 transition-opacity">
        <button onClick={e => { e.preventDefault(); setMenuOpen(v => !v); }}
          className="w-7 h-7 rounded-full flex items-center justify-center text-[#9b9ba8] hover:bg-[#EBEBEB] text-sm font-bold">
          ···
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-8 bg-white rounded-xl shadow-xl border border-[#e6e6ea] z-30 min-w-[170px]"
            onClick={() => setMenuOpen(false)}>
            <button onClick={onPin} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#1F1B2E] hover:bg-[#F5F5F5] font-medium rounded-t-xl">
              {conv.isPinned ? '📍 Désépingler' : '📌 Épingler'}
            </button>
            <button onClick={onDelete} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#C62828] hover:bg-[#fff0f0] font-medium rounded-b-xl">
              🗑️ Supprimer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const ROLE_AVATAR: Record<string, string> = {
  ADMIN:      'from-[#D97706] to-[#92400E]',
  REGION:     'from-[#6A1B9A] to-[#3d1163]',
  SENTINELLE: 'from-[#1D4ED8] to-[#1e3a8a]',
  GUIDE:      'from-[#16A34A] to-[#14532D]',
  GARDIEN:    'from-[#C62828] to-[#8e1a1a]',
};

const ROLE_PILL: Record<string, string> = {
  ADMIN:      'bg-[#FEF3C7] text-[#D97706]',
  REGION:     'bg-[#EDE7F6] text-[#6A1B9A]',
  SENTINELLE: 'bg-[#DBEAFE] text-[#1D4ED8]',
  GUIDE:      'bg-[#DCFCE7] text-[#16A34A]',
  GARDIEN:    'bg-[#FEE2E2] text-[#C62828]',
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin', REGION: 'Région', SENTINELLE: 'Sentinelle', GUIDE: 'Guide', GARDIEN: 'Gardien',
};

function ContactRow({ user, sub, action, onClick }: {
  user: ContactUser; sub?: string; action: React.ReactNode; onClick?: () => void;
}) {
  const initials  = `${user.nom[0]}${user.prenoms[0]}`.toUpperCase();
  const avatarCls = ROLE_AVATAR[user.role] ?? 'from-[#1F1B2E] to-[#3a1d4d]';
  const pillCls   = ROLE_PILL[user.role]   ?? 'bg-[#f3f3f5] text-[#6b6b78]';
  const roleLabel = ROLE_LABEL[user.role]  ?? user.role;

  return (
    <div
      className={`flex items-center px-4 py-3 bg-white transition-colors ${onClick ? 'cursor-pointer hover:bg-[#F5F5F5] active:bg-[#EDEDF5]' : ''}`}
      onClick={onClick}
    >
      {(user as { avatarUrl?: string }).avatarUrl ? (
        <img src={(user as { avatarUrl?: string }).avatarUrl} alt={initials}
          className="w-[50px] h-[50px] rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br ${avatarCls} flex-shrink-0`}>
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0 ml-3 py-1 border-b border-[#F2F2F2]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="font-semibold text-[15px] text-[#1F1B2E] truncate">{user.prenoms} {user.nom}</div>
              <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pillCls}`}>{roleLabel}</span>
            </div>
            <div className="text-[13px] text-[#9b9ba8] truncate mt-0.5">
              {sub ?? user.parish?.nom ?? user.district?.nom ?? ''}
            </div>
          </div>
          <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>{action}</div>
        </div>
      </div>
    </div>
  );
}
