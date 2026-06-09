'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { GardiensBlazon } from '@/components/layout/GardiensBlazon';
import { PublicTopNav } from '@/components/layout/PublicTopNav';
import { useAuthStore } from '@/store/auth';
import { getHomeForRole } from '@/lib/roles';
import { territoriesApi } from '@/lib/api';
import type { Parish } from '@/types';

export default function RejoindrePage() {
  const router = useRouter();
  const { user } = useAuthStore();

  /* Refs */
  const formRef   = useRef<HTMLDivElement>(null);
  const prenomRef = useRef<HTMLInputElement>(null);
  const msgRef    = useRef<HTMLTextAreaElement>(null);

  /* Form state */
  const [prenom,  setPrenom]  = useState('');
  const [contact, setContact] = useState('');
  const [role,    setRole]    = useState('');
  const [msg,     setMsg]     = useState('');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  /* Parish finder state */
  const [showParishes,   setShowParishes]   = useState(false);
  const [parishes,       setParishes]       = useState<Parish[]>([]);
  const [loadingParishes,setLoadingParishes] = useState(false);
  const [parishSearch,   setParishSearch]   = useState('');

  useEffect(() => {
    if (user) router.replace(getHomeForRole(user.role));
  }, [user, router]);

  /* Scroll to form + optionally focus a field */
  const focusForm = (field: 'prenom' | 'msg' = 'prenom') => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      if (field === 'msg') msgRef.current?.focus();
      else prenomRef.current?.focus();
    }, 350);
  };

  /* Open parish finder — fetches once */
  const openParishFinder = async () => {
    setShowParishes(true);
    if (parishes.length > 0) return;
    setLoadingParishes(true);
    try {
      const { data } = await territoriesApi.parishes();
      setParishes(data as Parish[]);
    } catch { /* ignore */ }
    finally { setLoadingParishes(false); }
  };

  /* Form submit */
  const handleSend = async () => {
    if (!prenom.trim() || !contact.trim()) {
      setError('Merci de renseigner ton prénom et ton contact.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prenom, contact, role, message: msg }),
      });
      if (!res.ok) throw new Error('api_error');
      setSent(true);
    } catch {
      setError('Une erreur est survenue. Tu peux nous contacter directement sur WhatsApp.');
    } finally {
      setSending(false);
    }
  };

  /* Filtered parishes */
  const filteredParishes = parishes.filter(p => {
    const q = parishSearch.toLowerCase();
    return !q || p.nom.toLowerCase().includes(q) || p.district?.nom.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[#f6f6fa]">
      <PublicTopNav />

      {/* ── Hero ── */}
      <div className="relative bg-gradient-to-br from-[#1F1B2E] via-[#2d1f40] to-[#3a1d4d] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <div className="relative px-5 pt-6 pb-0 lg:hidden">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Retour
          </button>
        </div>

        <div className="relative flex flex-col items-center text-center px-6 pt-8 pb-12">
          <GardiensBlazon size={90} />
          <h1 className="text-2xl lg:text-3xl font-black mt-5 leading-tight">
            Tu es invité(e) à<br />marcher avec nous
          </h1>
          <p className="text-white/60 text-sm italic mt-2.5 max-w-xs">
            « Le camp est fini. La Route continue. »
          </p>
          <p className="text-white/80 text-sm mt-4 max-w-sm leading-relaxed">
            Rejoins la communauté des Gardiens d&apos;Héliopolis et continue l&apos;aventure scout.
          </p>
        </div>

        <div className="h-8 relative">
          <svg viewBox="0 0 1440 32" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path d="M0,32 C360,0 1080,32 1440,0 L1440,32 Z" fill="#f6f6fa"/>
          </svg>
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="max-w-4xl mx-auto px-4 py-6 lg:py-10 lg:grid lg:grid-cols-[1fr_380px] lg:gap-10 lg:items-start">

        {/* Colonne gauche */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#9b9ba8] mb-4">
            Trois façons de rejoindre
          </p>

          {/* Carte 1 — Matricule */}
          <OptionCard
            icon="🛡️" iconBg="bg-gradient-to-br from-[#C62828] to-[#8e1a1a]"
            accentColor="border-[#C62828]" title="J'ai déjà un matricule"
            description="Tu es déjà routier scout ? Active ton profil avec ton matricule national et retrouve ta communauté."
            cta={
              <Link href="/activation"
                className="inline-flex items-center gap-1.5 bg-[#C62828] hover:bg-[#b51d1d] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                Activer mon profil
                <ArrowIcon />
              </Link>
            }
          />

          {/* Carte 2 — Paroisse */}
          <OptionCard
            icon="⛪" iconBg="bg-gradient-to-br from-[#6A1B9A] to-[#4a1370]"
            accentColor="border-[#6A1B9A]" title="Je veux rejoindre une paroisse"
            description="Tu n'es pas encore inscrit ? Trouve une paroisse proche de chez toi et contacte son Guide pour t'intégrer."
            cta={
              <button onClick={openParishFinder}
                className="inline-flex items-center gap-1.5 bg-[#6A1B9A] hover:bg-[#5a1280] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                Trouver une paroisse
                <ArrowIcon />
              </button>
            }
          />

          {/* Carte 3 — Question */}
          <OptionCard
            icon="✉️" iconBg="bg-gradient-to-br from-[#D9A441] to-[#b8852e]"
            accentColor="border-[#D9A441]" title="J'ai une question"
            description="Envoie un message au Conseil d'Héliopolis. On te répond sous 48h et on t'oriente vers la meilleure option."
            cta={
              <button onClick={() => focusForm('msg')}
                className="inline-flex items-center gap-1.5 bg-[#D9A441] hover:bg-[#c49338] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                Écrire au Conseil
                <ArrowIcon />
              </button>
            }
          />

          <div className="flex items-center gap-3 bg-white rounded-2xl border border-[#ececf0] p-4 mt-2">
            <span className="text-2xl flex-shrink-0">🔒</span>
            <p className="text-xs text-[#6b6b78] leading-relaxed">
              Tes données personnelles sont protégées et ne seront utilisées que pour t&apos;accompagner dans ta démarche.
            </p>
          </div>
        </div>

        {/* Colonne droite — formulaire */}
        <div ref={formRef} className="mt-8 lg:mt-0">
          <div className="bg-white rounded-2xl border border-[#ececf0] overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-[#1F1B2E] to-[#3a1d4d] px-5 py-4">
              <h2 className="text-base font-black text-white">Laisse-nous un message</h2>
              <p className="text-xs text-white/60 mt-0.5">Réponse garantie sous 48h</p>
            </div>

            <div className="p-5">
              {sent ? (
                <SuccessState prenom={prenom} onReset={() => { setSent(false); setPrenom(''); setContact(''); setRole(''); setMsg(''); }} />
              ) : (
                <div className="flex flex-col gap-4">
                  <Field label="Ton prénom *">
                    <input ref={prenomRef} className={INPUT_CLS} placeholder="Ex : Marie"
                      value={prenom} onChange={e => setPrenom(e.target.value)} />
                  </Field>
                  <Field label="Ton email ou téléphone *">
                    <input className={INPUT_CLS} placeholder="marie@exemple.com ou +225 07 00 00 00"
                      value={contact} onChange={e => setContact(e.target.value)} />
                  </Field>
                  <Field label="Tu es…">
                    <select className={INPUT_CLS + ' bg-white'} value={role} onChange={e => setRole(e.target.value)}>
                      <option value="">Choisir…</option>
                      <option>Un jeune intéressé(e) par le scoutisme</option>
                      <option>Un parent</option>
                      <option>Un ancien routier</option>
                      <option>Un partenaire / autre</option>
                    </select>
                  </Field>
                  <Field label="Ton message">
                    <textarea ref={msgRef} className={INPUT_CLS + ' resize-none'} rows={4}
                      placeholder="Quelques mots sur ta situation, ta question…"
                      value={msg} onChange={e => setMsg(e.target.value)} />
                  </Field>

                  {error && <p className="text-xs text-[#C62828] font-medium -mt-2">{error}</p>}

                  <button onClick={handleSend} disabled={sending}
                    className="w-full bg-gradient-to-r from-[#C62828] to-[#8e1a1a] hover:from-[#b51d1d] hover:to-[#7d1616] text-white font-bold py-3 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2">
                    {sending ? (
                      <>
                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                        </svg>
                        Envoi en cours…
                      </>
                    ) : (
                      <><span>📩</span> Envoyer mon message</>
                    )}
                  </button>

                  <p className="text-[10px] text-[#9b9ba8] text-center -mt-1">
                    Données confidentielles · usage interne uniquement
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 justify-center">
            <span className="text-xs text-[#9b9ba8]">Tu as déjà un compte ?</span>
            <Link href="/activation" className="text-xs font-semibold text-[#6A1B9A] hover:underline">
              Se connecter →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Modal paroisse ── */}
      {showParishes && (
        <ParishModal
          parishes={filteredParishes}
          loading={loadingParishes}
          search={parishSearch}
          onSearch={setParishSearch}
          onClose={() => { setShowParishes(false); setParishSearch(''); }}
          onSelect={p => {
            setShowParishes(false);
            setParishSearch('');
            setMsg(`Je souhaite rejoindre la paroisse ${p.nom}${p.district ? ` (${p.district.nom})` : ''}.`);
            focusForm('prenom');
          }}
        />
      )}
    </div>
  );
}

/* ── Sous-composants ── */

const INPUT_CLS = 'w-full px-3.5 py-3 border border-[#e6e6ea] rounded-xl text-sm focus:outline-none focus:border-[#6A1B9A] focus:ring-2 focus:ring-[#6A1B9A]/10 transition-colors placeholder:text-[#b0b0be]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#1F1B2E] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  );
}

function OptionCard({ icon, iconBg, accentColor, title, description, cta }: {
  icon: string; iconBg: string; accentColor: string;
  title: string; description: string; cta: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-[#ececf0] border-l-4 ${accentColor} p-4 mb-3 flex gap-4`}>
      <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center text-xl flex-shrink-0 shadow-sm`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-[#1F1B2E] mb-1">{title}</p>
        <p className="text-xs text-[#6b6b78] leading-relaxed mb-3">{description}</p>
        {cta}
      </div>
    </div>
  );
}

function SuccessState({ prenom, onReset }: { prenom: string; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-8 gap-3">
      <div className="w-16 h-16 rounded-full bg-[#e1f4e3] flex items-center justify-center text-3xl">✅</div>
      <div>
        <p className="font-bold text-[#1F1B2E]">Message envoyé !</p>
        <p className="text-sm text-[#6b6b78] mt-1">
          Merci {prenom || 'ami(e)'}, nous te recontactons sous 48h.
        </p>
      </div>
      <button onClick={onReset} className="text-xs text-[#6A1B9A] font-semibold hover:underline mt-2">
        Envoyer un autre message
      </button>
    </div>
  );
}

function ParishModal({ parishes, loading, search, onSearch, onClose, onSelect }: {
  parishes: Parish[];
  loading: boolean;
  search: string;
  onSearch: (v: string) => void;
  onClose: () => void;
  onSelect: (p: Parish) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:justify-center lg:items-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-t-3xl lg:rounded-2xl w-full lg:max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f4] flex-shrink-0">
          <div>
            <h3 className="font-black text-[#1F1B2E]">Trouver une paroisse</h3>
            <p className="text-xs text-[#6b6b78] mt-0.5">{parishes.length} paroisses disponibles</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f0f0f4] flex items-center justify-center text-[#6b6b78] font-bold text-sm hover:bg-[#e6e6ea]">
            ✕
          </button>
        </div>

        {/* Recherche */}
        <div className="px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2 bg-[#f6f6fa] rounded-xl px-3 py-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search} onChange={e => onSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#9b9ba8]"
              placeholder="Chercher une paroisse ou un district…"
              autoFocus
            />
            {search && <button onClick={() => onSearch('')} className="text-[#9b9ba8] text-base">✕</button>}
          </div>
        </div>

        {/* Liste */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[#9b9ba8] text-sm">
              <span className="animate-pulse text-3xl">⛪</span>
            </div>
          ) : parishes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#9b9ba8]">
              <div className="text-3xl mb-2">🌿</div>
              <p className="text-sm">Aucune paroisse trouvée</p>
            </div>
          ) : (
            <div>
              {parishes.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-[#f7f7fb] transition-colors ${i > 0 ? 'border-t border-[#f0f0f4]' : ''}`}
                >
                  <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6A1B9A] to-[#4a1370] flex items-center justify-center text-base flex-shrink-0">⛪</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[#1F1B2E] truncate">{p.nom}</div>
                    {p.district && (
                      <div className="text-[11px] text-[#6b6b78] mt-0.5">🛡️ {p.district.nom}</div>
                    )}
                  </div>
                  {p.guide && (
                    <div className="text-[10px] text-[#6b6b78] text-right flex-shrink-0">
                      <div>Guide</div>
                      <div className="font-semibold">{p.guide.prenoms}</div>
                    </div>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c0c0cc" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
