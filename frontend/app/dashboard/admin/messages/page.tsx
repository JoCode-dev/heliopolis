'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { messagingApi, contactsApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { Conversation, ContactItem, ContactUser, Contact, User } from '@/types';

type RowUser = { id: string; nom: string; prenoms: string; avatarUrl?: string; role: string; parish?: { nom: string }; district?: { nom: string } };

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
type FilterType = 'tous' | 'contacts' | 'demandes';

const QUICK_FILTERS: { key: FilterType; label: string }[] = [
  { key: 'tous',     label: 'Tous' },
  { key: 'contacts', label: '🤝 Contacts' },
  { key: 'demandes', label: '🔔 Demandes' },
];

function convTimeLabel(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function groupByFirstLetter<T>(items: T[], getKey: (item: T) => string): [string, T[]][] {
  const sorted = [...items].sort((a, b) =>
    getKey(a).localeCompare(getKey(b), 'fr', { sensitivity: 'base' })
  );
  const map = new Map<string, T[]>();
  for (const item of sorted) {
    const raw = getKey(item)[0]?.toUpperCase() ?? '#';
    const letter = raw.normalize('NFD').replace(/[̀-ͯ]/g, '') || '#';
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(item);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const msgBase = pathname.startsWith('/dashboard/region')
    ? '/dashboard/region/messages'
    : '/dashboard/admin/messages';
  const [tab, setTab] = useState<Tab>('messages');

  useEffect(() => {
    const saved = localStorage.getItem('messages-tab') as Tab;
    if (saved === 'messages' || saved === 'contacts') setTab(saved);
  }, []);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    localStorage.setItem('messages-tab', t);
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
          <button className="w-8 h-8 flex items-center justify-center text-white/70">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
          <button className="w-8 h-8 flex items-center justify-center text-white/70">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
          </button>
        </div>
        <div className="flex">
          {(['messages', 'contacts'] as Tab[]).map(t => (
            <button key={t} onClick={() => handleTabChange(t)}
              className={`flex-1 py-2.5 text-[12px] font-bold uppercase tracking-widest transition-colors relative ${tab === t ? 'text-white' : 'text-white/40'}`}
            >
              {t === 'messages' ? 'Messages' : 'Contacts'}
              {tab === t && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-t-sm" />}
            </button>
          ))}
        </div>
      </div>

      {tab === 'messages' ? <MessagesTab msgBase={msgBase} /> : <ContactsTab msgBase={msgBase} />}
    </div>
  );
}

function MessagesTab({ msgBase }: { msgBase: string }) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  const filtered = useCallback(
    (list: Conversation[]) =>
      search ? list.filter(c => c.nom?.toLowerCase().includes(search.toLowerCase())) : list,
    [search],
  );

  const pinned   = filtered(conversations.filter(c => c.isPinned));
  const channels = filtered(conversations.filter(c => !c.isPinned && c.type !== 'PRIVE' && c.type !== 'GROUPE'));
  const groups   = filtered(conversations.filter(c => !c.isPinned && c.type === 'GROUPE'));
  const privates = filtered(conversations.filter(c => !c.isPinned && c.type === 'PRIVE'));
  const isEmpty  = !loading && conversations.length === 0;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white relative">
      {/* Recherche */}
      <div className="px-3 py-2 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center bg-[#F0F2F5] rounded-full px-3.5 py-2 gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            className="flex-1 bg-transparent text-sm outline-none text-[#1F1B2E] placeholder:text-[#9b9ba8]"
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="text-[#9b9ba8] text-base leading-none">✕</button>}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-[#9b9ba8]">
          <div className="text-4xl mb-3 animate-pulse">💬</div>
          <p className="text-sm">Chargement…</p>
        </div>
      )}

      {pinned.length > 0 && (
        <>
          <ListDivider label="Épinglés" />
          {pinned.map(conv => (
            <ConvRow key={conv.id} conv={conv} msgBase={msgBase}
              onPin={() => handlePin(conv)}
              onDelete={() => setDeleteConfirmId(conv.id)}
            />
          ))}
        </>
      )}
      {channels.length > 0 && (
        <>
          <ListDivider label="Canaux" />
          {channels.map(conv => (
            <ConvRow key={conv.id} conv={conv} msgBase={msgBase}
              onPin={() => handlePin(conv)}
              onDelete={() => setDeleteConfirmId(conv.id)}
            />
          ))}
        </>
      )}
      {groups.length > 0 && (
        <>
          <ListDivider label="Groupes" />
          {groups.map(conv => (
            <ConvRow key={conv.id} conv={conv} msgBase={msgBase}
              onPin={() => handlePin(conv)}
              onDelete={() => setDeleteConfirmId(conv.id)}
            />
          ))}
        </>
      )}
      {privates.length > 0 && (
        <>
          <ListDivider label="Conversations privées" />
          {privates.map(conv => (
            <ConvRow key={conv.id} conv={conv} msgBase={msgBase}
              onPin={() => handlePin(conv)}
              onDelete={() => setDeleteConfirmId(conv.id)}
            />
          ))}
        </>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-[#EDE7F6] flex items-center justify-center text-4xl mb-4">💬</div>
          <p className="text-[15px] font-bold text-[#1F1B2E] mb-1">Aucune conversation</p>
          <p className="text-sm text-[#9b9ba8] leading-relaxed">Tes canaux apparaîtront ici dès que tu seras rattaché(e).</p>
        </div>
      )}

      {/* FAB — Nouvelle conversation (positionné au-dessus de la nav bar mobile) */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 w-13 h-13 w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#3d1163] shadow-lg flex items-center justify-center text-white z-30 active:scale-95 transition-transform"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          <line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/>
        </svg>
      </button>

      {/* Modal nouvelle conversation */}
      {showModal && (
        <NewConvModal
          onClose={() => setShowModal(false)}
          onCreated={(id) => { setShowModal(false); reload(); router.push(`${msgBase}/${id}`); }}
        />
      )}

      {/* Modal confirmation suppression */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 pb-8">
            <p className="text-[15px] font-bold text-[#1F1B2E] mb-1">Supprimer cette conversation ?</p>
            <p className="text-sm text-[#9b9ba8] mb-5">Elle disparaîtra de votre liste.</p>
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

// ── Modal nouvelle conversation ───────────────────────────────────────────────
function NewConvModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [mode, setMode] = useState<'pick' | 'individual' | 'group'>('pick');
  const [annuaire, setAnnuaire] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [filterDistrict, setFilterDistrict] = useState<string | null>(null);
  const [filterParish, setFilterParish] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'pick') return;
    setLoadingUsers(true);
    usersApi.list().then(r => setAnnuaire(r.data)).catch(() => {}).finally(() => setLoadingUsers(false));
  }, [mode]);

  // Listes uniques de districts et paroisses
  const districts = Array.from(
    new Map(annuaire.filter(u => u.district).map(u => [u.district!.id, u.district!])).values()
  ).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  const parishes = Array.from(
    new Map(
      annuaire
        .filter(u => u.parish && (!filterDistrict || u.district?.id === filterDistrict))
        .map(u => [u.parish!.id, u.parish!])
    ).values()
  ).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  // Filtrage combiné : recherche + district + paroisse
  const visible = annuaire.filter(u => {
    if (filterDistrict && u.district?.id !== filterDistrict) return false;
    if (filterParish  && u.parish?.id  !== filterParish)  return false;
    if (search) {
      const q = search.toLowerCase();
      return u.nom.toLowerCase().includes(q) || u.prenoms.toLowerCase().includes(q) || u.matricule?.toLowerCase().includes(q);
    }
    return true;
  });

  const allVisibleSelected = visible.length > 0 && visible.every(u => selected.includes(u.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelected(prev => prev.filter(id => !visible.some(u => u.id === id)));
    } else {
      const toAdd = visible.map(u => u.id).filter(id => !selected.includes(id));
      setSelected(prev => [...prev, ...toAdd]);
    }
  };

  const handleSelectIndividual = async (userId: string) => {
    setCreating(true);
    try {
      const { data } = await messagingApi.createPrivate(userId);
      onCreated(data.id);
    } catch { /* ignore */ }
    finally { setCreating(false); }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
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

  const resetFilters = () => { setFilterDistrict(null); setFilterParish(null); };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      {/* Drag handle */}
      <div className="bg-gradient-to-br from-[#C62828] to-[#8e1a1a] flex-shrink-0 pt-safe">
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            onClick={mode === 'pick' ? onClose : () => { setMode('pick'); setSelected([]); setSearch(''); resetFilters(); }}
            className="w-8 h-8 flex items-center justify-center text-white/80 text-2xl leading-none"
          >‹</button>
          <h2 className="flex-1 text-[16px] font-bold text-white">
            {mode === 'pick' ? 'Nouvelle conversation' : mode === 'individual' ? 'Message individuel' : 'Nouveau groupe'}
          </h2>
          {mode === 'group' && (
            <button onClick={handleCreateGroup} disabled={!groupName.trim() || selected.length === 0 || creating}
              className="text-[13px] font-bold text-white/90 bg-white/20 px-3 py-1 rounded-full disabled:opacity-40">
              {creating ? '…' : `Créer${selected.length > 0 ? ` (${selected.length})` : ''}`}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-white">

        {/* Choix du type */}
        {mode === 'pick' && (
          <div className="p-4 flex flex-col gap-3">
            {[
              { m: 'individual' as const, icon: '🤝', gradient: 'from-[#1F1B2E] to-[#3a1d4d]', title: 'Message individuel', sub: 'Conversation privée avec un utilisateur' },
              { m: 'group' as const,      icon: '👥', gradient: 'from-[#2E7D32] to-[#1a5021]', title: 'Groupe', sub: 'Conversation avec plusieurs personnes' },
            ].map(({ m, icon, gradient, title, sub }) => (
              <button key={m} onClick={() => setMode(m)}
                className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-[#e6e6ea] active:bg-[#F0F0F0] text-left">
                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-xl flex-shrink-0`}>{icon}</div>
                <div>
                  <p className="text-[14px] font-bold text-[#1F1B2E]">{title}</p>
                  <p className="text-[12px] text-[#9b9ba8] mt-0.5">{sub}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Liste utilisateurs */}
        {mode !== 'pick' && (
          <>
            {/* Nom du groupe */}
            {mode === 'group' && (
              <div className="px-4 pt-3 pb-2 flex-shrink-0 border-b border-[#f0f0f0]">
                <input
                  className="w-full bg-[#F0F2F5] rounded-xl px-4 py-2.5 text-sm outline-none"
                  placeholder="Nom du groupe…"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                />
              </div>
            )}

            {/* Recherche */}
            <div className="px-3 pt-2.5 pb-1.5 flex-shrink-0">
              <div className="flex items-center bg-[#F0F2F5] rounded-full px-3.5 py-2 gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#9b9ba8]" placeholder="Rechercher par nom ou matricule…" value={search} onChange={e => setSearch(e.target.value)} />
                {search && <button onClick={() => setSearch('')} className="text-[#9b9ba8]">✕</button>}
              </div>
            </div>

            {/* Filtres district */}
            {districts.length > 0 && (
              <div className="flex gap-2 px-3 pb-1.5 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
                <button
                  onClick={resetFilters}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[12px] font-semibold border transition-colors ${!filterDistrict ? 'bg-[#1F1B2E] text-white border-[#1F1B2E]' : 'bg-white text-[#6b6b78] border-[#e6e6ea]'}`}
                >Tous</button>
                {districts.map(d => (
                  <button
                    key={d.id}
                    onClick={() => { setFilterDistrict(filterDistrict === d.id ? null : d.id); setFilterParish(null); }}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-[12px] font-semibold border transition-colors ${filterDistrict === d.id ? 'bg-[#6A1B9A] text-white border-[#6A1B9A]' : 'bg-white text-[#6b6b78] border-[#e6e6ea]'}`}
                  >{d.nom}</button>
                ))}
              </div>
            )}

            {/* Filtres paroisse (si district sélectionné) */}
            {filterDistrict && parishes.length > 0 && (
              <div className="flex gap-2 px-3 pb-2 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
                <button
                  onClick={() => setFilterParish(null)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[12px] font-semibold border transition-colors ${!filterParish ? 'bg-[#6A1B9A] text-white border-[#6A1B9A]' : 'bg-white text-[#6b6b78] border-[#e6e6ea]'}`}
                >Toutes</button>
                {parishes.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setFilterParish(filterParish === p.id ? null : p.id)}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-[12px] font-semibold border transition-colors ${filterParish === p.id ? 'bg-[#C62828] text-white border-[#C62828]' : 'bg-white text-[#6b6b78] border-[#e6e6ea]'}`}
                  >{p.nom}</button>
                ))}
              </div>
            )}

            {/* Barre "tout sélectionner" (groupe uniquement) */}
            {mode === 'group' && visible.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#f0f0f0] flex-shrink-0">
                <span className="text-[12px] text-[#9b9ba8]">
                  {visible.length} utilisateur{visible.length > 1 ? 's' : ''}
                  {selected.length > 0 && ` · ${selected.length} sélectionné${selected.length > 1 ? 's' : ''}`}
                </span>
                <button onClick={toggleSelectAll} className="text-[12px] font-bold text-[#6A1B9A]">
                  {allVisibleSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>
            )}

            {/* Liste */}
            <div className="flex-1 overflow-y-auto pb-6">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12 text-[#9b9ba8] text-sm">Chargement…</div>
              ) : visible.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-[#9b9ba8] text-sm">Aucun résultat</div>
              ) : visible.map(u => {
                const isSelected = selected.includes(u.id);
                const avatarCls  = ROLE_AVATAR[u.role] ?? 'from-[#1F1B2E] to-[#3a1d4d]';
                const pillCls    = ROLE_PILL[u.role]   ?? 'bg-[#f3f3f5] text-[#6b6b78]';
                const roleLabel  = ROLE_LABEL[u.role]  ?? u.role;
                return (
                  <button
                    key={u.id}
                    disabled={creating}
                    onClick={() => mode === 'individual' ? handleSelectIndividual(u.id) : toggleSelect(u.id)}
                    className="flex items-center w-full px-4 py-3 hover:bg-[#F5F5F5] transition-colors"
                  >
                    <div className="relative flex-shrink-0">
                      {u.avatarUrl
                        ? <img src={u.avatarUrl} className="w-[50px] h-[50px] rounded-full object-cover" alt="" />
                        : <div className={`w-[50px] h-[50px] rounded-full bg-gradient-to-br ${avatarCls} flex items-center justify-center text-sm font-bold text-white`}>{u.nom[0]}{u.prenoms[0]}</div>
                      }
                      {mode === 'group' && isSelected && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#6A1B9A] border-2 border-white flex items-center justify-center text-white text-[10px] font-bold">✓</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 ml-3 border-b border-[#F2F2F2] py-1 text-left">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-[15px] text-[#1F1B2E] truncate">{u.prenoms} {u.nom}</p>
                        <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pillCls}`}>{roleLabel}</span>
                      </div>
                      <p className="text-[13px] text-[#9b9ba8] truncate">{u.parish?.nom ?? u.district?.nom ?? ''}</p>
                    </div>
                    {mode === 'group' && (
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ml-3 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#6A1B9A] border-[#6A1B9A]' : 'border-[#d0d0d0]'}`}>
                        {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>{/* flex-1 inner */}
    </div>
  );
}

function ContactsTab({ msgBase }: { msgBase: string }) {
  const router = useRouter();
  const { user: me } = useAuthStore();
  const [annuaire, setAnnuaire]   = useState<User[]>([]);
  const [accepted, setAccepted]   = useState<ContactItem[]>([]);
  const [received, setReceived]   = useState<Contact[]>([]);
  const [sent, setSent]           = useState<Contact[]>([]);
  const [searchQ, setSearchQ]     = useState('');
  const [loading, setLoading]     = useState(true);
  const [dmLoading, setDmLoading] = useState<string | null>(null);
  const [filter, setFilter]       = useState<FilterType>('tous');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleDM = async (userId: string) => {
    setDmLoading(userId);
    try {
      const { data } = await messagingApi.createPrivate(userId);
      router.push(`${msgBase}/${data.id}`);
    } catch { /* ignore */ }
    finally { setDmLoading(null); }
  };

  const reload = useCallback(() => {
    Promise.all([
      usersApi.list(),
      contactsApi.list(),
      contactsApi.received(),
      contactsApi.sent(),
    ]).then(([u, a, r, s]) => {
      setAnnuaire((u.data as User[]).filter(x => x.id !== me?.id));
      setAccepted(a.data);
      setReceived(r.data);
      setSent(s.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [me?.id]);

  useEffect(() => { reload(); }, [reload]);

  const handleAccept = async (id: string) => {
    await contactsApi.accept(id).catch(() => {});
    reload();
  };

  const handleDecline = async (id: string) => {
    await contactsApi.decline(id).catch(() => {});
    reload();
  };

  const handleRequest = async (userId: string) => {
    await contactsApi.request(userId).catch(() => {});
    reload();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f7f7fb]">
        <div className="text-center text-[#6b6b78] text-sm">
          <div className="text-3xl mb-3 animate-pulse">👥</div>
          <p>Chargement de l'annuaire…</p>
        </div>
      </div>
    );
  }

  const q = searchQ.toLowerCase();
  const filteredAnnuaire = q
    ? annuaire.filter(u =>
        u.nom.toLowerCase().includes(q) ||
        u.prenoms.toLowerCase().includes(q) ||
        u.matricule?.toLowerCase().includes(q)
      )
    : annuaire;

  const annuaireGroups = groupByFirstLetter(filteredAnnuaire, u => u.nom);
  const acceptedGroups = groupByFirstLetter(accepted, c => c.user.nom);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
      <div className="px-3 py-2 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center bg-[#F0F2F5] rounded-full px-3.5 py-2 gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            className="flex-1 bg-transparent text-sm outline-none text-[#1F1B2E] placeholder:text-[#9b9ba8]"
            placeholder="Rechercher par nom ou matricule…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
          />
          {searchQ && <button onClick={() => setSearchQ('')} className="text-[#9b9ba8] text-base leading-none">✕</button>}
        </div>
      </div>

      <div className="px-4 pb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {QUICK_FILTERS.map(f => {
          const isActive = filter === f.key;
          const badge = f.key === 'demandes' && received.length > 0 ? received.length : null;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                isActive
                  ? 'bg-[#1F1B2E] text-white border-[#1F1B2E]'
                  : 'bg-white text-[#6b6b78] border-[#e6e6ea]'
              }`}
            >
              {f.label}
              {badge !== null && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white text-[#C62828]' : 'bg-[#C62828] text-white'}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Demandes reçues — visibles dans "Tous" et "Demandes" */}
      {(filter === 'tous' || filter === 'demandes') && received.length > 0 && (
        <div className="px-4 mb-1">
          <SectionLabel>
            <span>🔔 Demandes reçues</span>
            <span className="ml-1.5 bg-[#C62828] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{received.length}</span>
          </SectionLabel>
          {received.map(c => (
            <ContactRow key={c.id} user={c.requester} action={
              <div className="flex gap-1.5">
                <button onClick={() => handleAccept(c.id)} className="text-[11px] bg-[#2E7D32] text-white px-3 py-1 rounded-full font-bold">✓ Accepter</button>
                <button onClick={() => handleDecline(c.id)} className="text-[11px] bg-white border border-[#e6e6ea] text-[#6b6b78] px-3 py-1 rounded-full font-bold">✕</button>
              </div>
            } />
          ))}
        </div>
      )}

      {filter === 'demandes' && received.length === 0 && (
        <div className="px-4 mt-4 text-center text-sm text-[#6b6b78]">Aucune demande reçue</div>
      )}

      {/* Contacts acceptés */}
      {filter === 'contacts' && (
        <div className="px-4 mb-1">
          {accepted.length > 0 ? (
            <>
              <SectionLabel>🤝 Mes contacts ({accepted.length})</SectionLabel>
              {acceptedGroups.map(([letter, contacts]) => {
                const gKey = `accepted-${letter}`;
                return (
                  <LetterGroup key={gKey} letter={letter} groupKey={gKey} count={contacts.length} collapsed={collapsedGroups.has(gKey)} onToggle={toggleGroup}>
                    {contacts.map(c => (
                      <ContactRow key={c.contactId} user={c.user} sub={c.user.parish?.nom} action={
                        <button onClick={() => handleDM(c.user.id)} disabled={dmLoading === c.user.id} className="text-[11px] bg-[#1F1B2E] text-white px-3 py-1 rounded-full font-bold disabled:opacity-50">
                          {dmLoading === c.user.id ? '…' : '💬'}
                        </button>
                      } />
                    ))}
                  </LetterGroup>
                );
              })}
            </>
          ) : (
            <div className="mt-4 text-center text-sm text-[#6b6b78]">Aucun contact accepté</div>
          )}
        </div>
      )}

      {/* Annuaire complet — filtre Tous */}
      {filter === 'tous' && (
        <div className="px-4 mb-1">
          <SectionLabel>
            <span>📋 Annuaire</span>
            <span className="ml-1.5 text-[#9b9ba8] font-medium normal-case tracking-normal">{filteredAnnuaire.length} utilisateur{filteredAnnuaire.length > 1 ? 's' : ''}</span>
          </SectionLabel>

          {annuaireGroups.length === 0 && searchQ && (
            <p className="text-xs text-center text-[#6b6b78] py-6">Aucun résultat pour « {searchQ} »</p>
          )}

          {annuaireGroups.map(([letter, users]) => {
            const gKey = `annuaire-${letter}`;
            const canDMDirectly = me?.role === 'ADMIN' || me?.role === 'REGION';
            return (
              <LetterGroup key={gKey} letter={letter} groupKey={gKey} count={users.length} collapsed={collapsedGroups.has(gKey)} onToggle={toggleGroup}>
                {users.map(u => {
                  const pendingReq = received.find(c => c.requester.id === u.id);
                  return (
                    <ContactRow key={u.id} user={u} sub={u.parish?.nom} action={
                      canDMDirectly ? (
                        <button onClick={() => handleDM(u.id)} disabled={dmLoading === u.id} className="text-[11px] bg-[#1F1B2E] text-white px-3 py-1 rounded-full font-bold disabled:opacity-50">
                          {dmLoading === u.id ? '…' : '💬'}
                        </button>
                      ) : pendingReq ? (
                        <div className="flex gap-1.5">
                          <button onClick={() => handleAccept(pendingReq.id)} className="text-[11px] bg-[#2E7D32] text-white px-3 py-1 rounded-full font-bold">✓</button>
                          <button onClick={() => handleDecline(pendingReq.id)} className="text-[11px] bg-white border border-[#e6e6ea] text-[#6b6b78] px-2 py-1 rounded-full font-bold">✕</button>
                        </div>
                      ) : accepted.some(c => c.user.id === u.id) ? (
                        <button onClick={() => handleDM(u.id)} disabled={dmLoading === u.id} className="text-[11px] bg-[#1F1B2E] text-white px-3 py-1 rounded-full font-bold disabled:opacity-50">
                          {dmLoading === u.id ? '…' : '💬'}
                        </button>
                      ) : sent.some(c => c.receiver.id === u.id) ? (
                        <span className="text-[10px] bg-[#f3f3f5] text-[#6b6b78] px-2.5 py-1 rounded-full font-bold">Envoyé</span>
                      ) : (
                        <button onClick={() => handleRequest(u.id)} className="text-[11px] bg-[#6A1B9A] text-white px-3 py-1 rounded-full font-bold">
                          + Ajouter
                        </button>
                      )
                    } />
                  );
                })}
              </LetterGroup>
            );
          })}
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}

function ListDivider({ label }: { label: string }) {
  return (
    <div className="px-4 py-1.5 bg-[#F7F8FA]">
      <span className="text-[11px] text-[#9b9ba8] font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-[#9b9ba8] font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
      {children}
    </div>
  );
}

function LetterGroup({
  letter, groupKey, count, collapsed, onToggle, children,
}: {
  letter: string; groupKey: string; count: number;
  collapsed: boolean; onToggle: (key: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="mb-0.5">
      <button
        onClick={() => onToggle(groupKey)}
        className="flex items-center gap-2 w-full py-1.5 text-left select-none"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6A1B9A] to-[#4a1370] text-white text-xs font-black flex items-center justify-center flex-shrink-0">
          {letter}
        </div>
        <span className="text-xs font-semibold text-[#6b6b78] flex-1">
          {count} contact{count > 1 ? 's' : ''}
        </span>
        <span className="text-[10px] text-[#6b6b78] mr-1 font-bold">
          {collapsed ? '▶' : '▼'}
        </span>
      </button>
      {!collapsed && <div>{children}</div>}
    </div>
  );
}

function ConvRow({ conv, onPin, onDelete, msgBase }: {
  conv: Conversation;
  onPin: () => void;
  onDelete: () => void;
  msgBase: string;
}) {
  const icon     = CONV_ICON[conv.type] ?? '💬';
  const gradient = CONV_GRADIENT[conv.type] ?? 'from-[#6A1B9A] to-[#3d1163]';
  const lastMsg  = conv.messages?.[0];
  const timeStr  = convTimeLabel(conv.lastMessageAt);
  const preview  = lastMsg?.deletedAt ? '🚫 Message supprimé' : lastMsg?.contenu ?? '';

  const [swipeX, setSwipeX] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const startX = useRef(0);
  const ACTION_W = 140; // px total des boutons d'action

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchMove  = (e: React.TouchEvent) => {
    const delta = startX.current - e.touches[0].clientX;
    if (delta > 0) setSwipeX(Math.min(delta, ACTION_W));
    else if (swipeX > 0) setSwipeX(Math.max(0, swipeX - (-delta)));
  };
  const onTouchEnd = () => {
    setSwipeX(swipeX > ACTION_W / 2 ? ACTION_W : 0);
  };

  return (
    <div className="relative group/row">
      {/* Boutons d'action révélés au swipe-left */}
      <div className="absolute right-0 top-0 bottom-0 flex" style={{ width: ACTION_W }}>
        <button onClick={onPin} className="flex-1 flex flex-col items-center justify-center gap-1 bg-[#6A1B9A] text-white font-bold">
          <span className="text-xl">{conv.isPinned ? '📍' : '📌'}</span>
          <span className="text-[10px] leading-tight">{conv.isPinned ? 'Retirer' : 'Épingler'}</span>
        </button>
        <button onClick={onDelete} className="flex-1 flex flex-col items-center justify-center gap-1 bg-[#C62828] text-white font-bold">
          <span className="text-xl">🗑️</span>
          <span className="text-[10px] leading-tight">Supprimer</span>
        </button>
      </div>

      {/* Contenu principal glissant — overflow-hidden ici uniquement pour le swipe */}
      <div
        className="overflow-hidden"
        style={{ transform: `translateX(-${swipeX}px)`, transition: swipeX === 0 || swipeX === ACTION_W ? 'transform 0.2s ease-out' : 'none' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <Link
          href={`${msgBase}/${conv.id}`}
          className="flex items-center px-3 py-2.5 bg-white hover:bg-[#F5F5F5] transition-colors pr-10"
        >
          <div className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-xl text-white bg-gradient-to-br ${gradient} flex-shrink-0 shadow-sm`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0 ml-3 py-1 border-b border-[#F2F2F2]">
            <div className="flex justify-between items-baseline gap-2">
              <span className="font-semibold text-[15px] text-[#1F1B2E] truncate">{conv.nom ?? 'Conversation'}</span>
              {timeStr && <span className="text-[12px] text-[#9b9ba8] flex-shrink-0">{timeStr}</span>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[13px] text-[#9b9ba8] truncate flex-1 leading-snug">{preview}</span>
              {conv.isPinned && <span className="text-[11px] flex-shrink-0">📌</span>}
            </div>
          </div>
        </Link>
      </div>

      {/* ··· menu desktop — en dehors du overflow-hidden, positionné en absolu */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/row:opacity-100 transition-opacity">
        <button
          onClick={e => { e.preventDefault(); setMenuOpen(v => !v); }}
          className="w-7 h-7 rounded-full flex items-center justify-center text-[#9b9ba8] hover:bg-[#EBEBEB] text-sm font-bold"
        >···</button>
        {menuOpen && (
          <div
            className="absolute right-0 top-8 bg-white rounded-xl shadow-xl border border-[#e6e6ea] z-30 min-w-[170px]"
            onClick={() => setMenuOpen(false)}
          >
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

function ContactRow({
  user,
  sub,
  action,
}: {
  user: RowUser;
  sub?: string;
  action: React.ReactNode;
}) {
  const initials  = `${user.nom[0]}${user.prenoms[0]}`.toUpperCase();
  const avatarCls = ROLE_AVATAR[user.role] ?? 'from-[#1F1B2E] to-[#3a1d4d]';
  const pillCls   = ROLE_PILL[user.role]   ?? 'bg-[#f3f3f5] text-[#6b6b78]';
  const roleLabel = ROLE_LABEL[user.role]  ?? user.role;

  return (
    <div className="flex items-center px-4 py-3 bg-white hover:bg-[#F5F5F5] transition-colors">
      {(user as { avatarUrl?: string }).avatarUrl ? (
        <img src={(user as { avatarUrl?: string }).avatarUrl} alt={initials} className="w-[50px] h-[50px] rounded-full object-cover flex-shrink-0" />
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
          <div className="flex-shrink-0">{action}</div>
        </div>
      </div>
    </div>
  );
}
