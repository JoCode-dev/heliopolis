'use client';
import React, { useCallback, useRef, useState } from 'react';
import { territoriesApi } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

type ParticipantRow = {
  nom: string;
  prenoms: string;
  matricule: string;
  district: string;
  paroisse: string;
  dateNaissance: string | null;
  ageEnAnnees: number | null;
  ageEnMois: number | null;
  ageFormate: string | null;
};

type TerritoireStats = {
  enBase: number;
  dansFichier: number;
  correspondance: number;
  seulementEnBase: string[];
  seulementDansFichier: string[];
};

type ArborescenceNode = {
  district: string;
  paroisses: string[];
  nbParticipants: number;
};

type Comparaison = {
  districts: TerritoireStats;
  paroisses: TerritoireStats;
  equipeRegionale: {
    total: number;
    libelles: string[];
  };
  participants: {
    total: number;
    liste: ParticipantRow[];
  };
  arborescence: ArborescenceNode[];
};

type AppliqueResultat = {
  sansMatricule: number;
  traites: number;
  misAJour: number;
  introuvables: string[];
  districtsSansMatch: string[];
  parissesSansMatch: string[];
  details: Array<{ matricule: string; champsModifies: string[] }>;
};

// ── Composants utilitaires ────────────────────────────────────────────────────

function Badge({ children, color }: { children: React.ReactNode; color: 'green' | 'red' | 'amber' | 'blue' | 'gray' }) {
  const styles: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    red:   'bg-red-100   text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    blue:  'bg-blue-100  text-blue-700',
    gray:  'bg-gray-100  text-gray-600',
  };
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${styles[color]}`}>
      {children}
    </span>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: 'green' | 'blue' | 'amber' | 'red' }) {
  const styles: Record<string, string> = {
    green: 'bg-green-50 border-green-200 text-green-700',
    blue:  'bg-blue-50  border-blue-200  text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red:   'bg-red-50   border-red-200   text-red-700',
  };
  return (
    <div className={`rounded-xl border px-3 py-3 text-center ${styles[color]}`}>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide mt-0.5 opacity-80">{label}</div>
      {sub && <div className="text-[10px] opacity-60 mt-0.5">{sub}</div>}
    </div>
  );
}

function ListeDiff({ titre, items, couleur }: { titre: string; items: string[]; couleur: 'red' | 'amber' }) {
  const [ouvert, setOuvert] = useState(false);
  if (!items.length) return null;
  const styles: Record<string, string> = {
    red:   'bg-red-50   border-red-200   text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
  };
  const pillStyles: Record<string, string> = {
    red:   'bg-red-100   text-red-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <div className={`rounded-xl border ${styles[couleur]} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOuvert(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold"
      >
        <span>{titre}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pillStyles[couleur]}`}>
          {items.length} {ouvert ? '▲' : '▼'}
        </span>
      </button>
      {ouvert && (
        <div className="border-t border-current border-opacity-10 max-h-48 overflow-y-auto px-4 py-2 flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${pillStyles[couleur]}`}>
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bloc de comparaison territoire ───────────────────────────────────────────

function BlocTerritoire({ titre, stats, icone }: { titre: string; stats: TerritoireStats; icone: string }) {
  const ecart = stats.seulementDansFichier.length;
  return (
    <div className="bg-white rounded-2xl border border-[#e0d6cc] p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">{icone}</span>
        <h3 className="font-bold text-[#1F1B2E] text-base">{titre}</h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="En base" value={stats.enBase} color="blue" />
        <StatCard label="Dans fichier" value={stats.dansFichier} color="amber" />
        <StatCard label="Correspondances" value={stats.correspondance} color="green" />
      </div>

      {ecart > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">
          <span className="text-base">⚠️</span>
          <span><span className="font-bold">{ecart}</span> {titre.toLowerCase()} du fichier ne correspondent à aucun enregistrement en base.</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <ListeDiff
          titre={`${titre} uniquement en base (${stats.seulementEnBase.length})`}
          items={stats.seulementEnBase}
          couleur="amber"
        />
        <ListeDiff
          titre={`${titre} uniquement dans le fichier (${stats.seulementDansFichier.length})`}
          items={stats.seulementDansFichier}
          couleur="red"
        />
      </div>
    </div>
  );
}

// ── Tableau des participants ──────────────────────────────────────────────────

type TriColonne = 'nom' | 'age' | 'district' | 'paroisse' | 'district-paroisse';

function TableauParticipants({ participants }: { participants: ParticipantRow[] }) {
  const [recherche, setRecherche] = useState('');
  const [triColonne, setTriColonne] = useState<TriColonne>('nom');
  const [triOrdre, setTriOrdre] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const parPage = 25;

  const filtres = participants.filter(p => {
    const q = recherche.toLowerCase();
    return (
      p.nom?.toLowerCase().includes(q) ||
      p.prenoms?.toLowerCase().includes(q) ||
      p.matricule?.toLowerCase().includes(q) ||
      p.district?.toLowerCase().includes(q) ||
      p.paroisse?.toLowerCase().includes(q)
    );
  });

  const cmp = (va: string | number, vb: string | number, asc: boolean) => {
    if (va < vb) return asc ? -1 : 1;
    if (va > vb) return asc ? 1 : -1;
    return 0;
  };

  const tries = [...filtres].sort((a, b) => {
    const asc = triOrdre === 'asc';
    if (triColonne === 'district-paroisse') {
      const dA = a.district?.toLowerCase() ?? '';
      const dB = b.district?.toLowerCase() ?? '';
      const distCmp = cmp(dA, dB, asc);
      if (distCmp !== 0) return distCmp;
      // Tri secondaire par paroisse (toujours asc dans le même sens)
      const pA = a.paroisse?.toLowerCase() ?? '';
      const pB = b.paroisse?.toLowerCase() ?? '';
      return cmp(pA, pB, asc);
    }
    if (triColonne === 'age')      return cmp(a.ageEnAnnees ?? -1, b.ageEnAnnees ?? -1, asc);
    if (triColonne === 'nom')      return cmp(`${a.nom} ${a.prenoms}`.toLowerCase(), `${b.nom} ${b.prenoms}`.toLowerCase(), asc);
    if (triColonne === 'district') return cmp(a.district?.toLowerCase() ?? '', b.district?.toLowerCase() ?? '', asc);
    return cmp(a.paroisse?.toLowerCase() ?? '', b.paroisse?.toLowerCase() ?? '', asc);
  });

  const totalPages = Math.max(1, Math.ceil(tries.length / parPage));
  const pageCourante = Math.min(page, totalPages);
  const slice = tries.slice((pageCourante - 1) * parPage, pageCourante * parPage);

  const toggleTri = (col: TriColonne) => {
    if (triColonne === col) setTriOrdre(o => o === 'asc' ? 'desc' : 'asc');
    else { setTriColonne(col); setTriOrdre('asc'); }
    setPage(1);
  };

  const entete = (col: TriColonne, label: string, extra?: string) => {
    const actif = triColonne === col;
    return (
      <th
        key={col}
        onClick={() => toggleTri(col)}
        className={`px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap transition-colors ${
          actif ? 'text-[#E55A35]' : 'text-[#6b6b78] hover:text-[#1F1B2E]'
        } ${extra ?? ''}`}
      >
        {label} {actif ? (triOrdre === 'asc' ? '↑' : '↓') : ''}
      </th>
    );
  };

  const ageCouleur = (annees: number | null): 'green' | 'blue' | 'amber' | 'red' | 'gray' => {
    if (annees === null) return 'gray';
    if (annees < 15) return 'red';
    if (annees < 18) return 'amber';
    if (annees < 25) return 'green';
    return 'blue';
  };

  // Pré-calculer les indices où le district change (avant le rendu, sans mutation)
  const districtBreaks = new Set<number>();
  if (triColonne === 'district-paroisse') {
    let dernierDistrict = '\0';
    slice.forEach((p, i) => {
      if (p.district !== dernierDistrict) { districtBreaks.add(i); dernierDistrict = p.district; }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e0d6cc] overflow-hidden">
      {/* En-tête */}
      <div className="px-5 py-3.5 border-b border-[#e0d6cc] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-[#1F1B2E] text-base">Participants</h3>
          <span className="text-xs font-bold bg-[#FFB36B]/20 text-[#7A2820] px-2 py-0.5 rounded-full">
            {filtres.length}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bouton groupement territoire */}
          <button
            type="button"
            onClick={() => toggleTri('district-paroisse')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
              triColonne === 'district-paroisse'
                ? 'bg-[#E55A35] text-white border-[#E55A35]'
                : 'bg-white text-[#6b6b78] border-[#e0d6cc] hover:border-[#F58A4B] hover:text-[#E55A35]'
            }`}
          >
            🛡️ District → ⛪ Paroisse {triColonne === 'district-paroisse' ? (triOrdre === 'asc' ? '↑' : '↓') : ''}
          </button>
          <input
            type="text"
            placeholder="Rechercher…"
            value={recherche}
            onChange={e => { setRecherche(e.target.value); setPage(1); }}
            className="text-sm px-3 py-2 rounded-xl border border-[#e0d6cc] bg-white outline-none focus:border-[#F58A4B] w-52"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#faf8f5] border-b border-[#e0d6cc]">
            <tr>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold text-[#6b6b78] uppercase tracking-wide w-10">#</th>
              {entete('nom', 'Nom complet')}
              <th className="px-3 py-2.5 text-left text-[11px] font-bold text-[#6b6b78] uppercase tracking-wide">Matricule</th>
              {entete('district', 'District')}
              {entete('paroisse', 'Paroisse')}
              <th className="px-3 py-2.5 text-left text-[11px] font-bold text-[#6b6b78] uppercase tracking-wide">Date naiss.</th>
              {entete('age', 'Âge')}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ece8]">
            {slice.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#6b6b78]">
                  {recherche ? 'Aucun résultat pour cette recherche.' : 'Aucun participant.'}
                </td>
              </tr>
            ) : slice.map((p, i) => {
              const globalIndex = (pageCourante - 1) * parPage + i;
              return (
                <React.Fragment key={globalIndex}>
                  {districtBreaks.has(i) && (
                    <tr className="bg-[#f0ece8]">
                      <td colSpan={7} className="px-3 py-1.5">
                        <span className="text-[11px] font-black uppercase tracking-widest text-[#7A2820]">
                          🛡️ {p.district || '— Sans district —'}
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr className="hover:bg-[#faf8f5]">
                    <td className="px-3 py-2.5 text-xs text-[#6b6b78]">{globalIndex + 1}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-[#1F1B2E]">{p.nom || '—'}</span>
                      {p.prenoms && <span className="text-[#6b6b78] ml-1">{p.prenoms}</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs font-bold text-[#1F1B2E]">
                      {p.matricule || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[#6b6b78]">{p.district || '—'}</td>
                    <td className="px-3 py-2.5 text-[#6b6b78]">{p.paroisse || '—'}</td>
                    <td className="px-3 py-2.5 text-[#6b6b78] whitespace-nowrap">
                      {p.dateNaissance
                        ? new Date(p.dateNaissance).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {p.ageFormate
                        ? <Badge color={ageCouleur(p.ageEnAnnees)}>{p.ageFormate}</Badge>
                        : <span className="text-[#6b6b78]">—</span>}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-[#e0d6cc] flex items-center justify-between text-xs text-[#6b6b78]">
          <span>
            {(pageCourante - 1) * parPage + 1}–{Math.min(pageCourante * parPage, tries.length)} sur {tries.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={pageCourante <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-2 py-1 rounded-lg hover:bg-[#f0ece8] disabled:opacity-30"
            >‹</button>
            <span className="px-2">{pageCourante} / {totalPages}</span>
            <button
              disabled={pageCourante >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-2 py-1 rounded-lg hover:bg-[#f0ece8] disabled:opacity-30"
            >›</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function ComparaisonExcelPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [resultat, setResultat] = useState<Comparaison | null>(null);
  const [erreur, setErreur] = useState('');
  const [confirmOuvert, setConfirmOuvert] = useState(false);
  const [appliqueChargement, setAppliqueChargement] = useState(false);
  const [appliqueResultat, setAppliqueResultat] = useState<AppliqueResultat | null>(null);
  const [appliqueErreur, setAppliqueErreur] = useState('');

  const choisirFichier = useCallback((f: File | null) => {
    if (!f) return;
    setFichier(f);
    setResultat(null);
    setErreur('');
    setAppliqueResultat(null);
    setAppliqueErreur('');
  }, []);

  const appliquer = async () => {
    if (!fichier) return;
    setConfirmOuvert(false);
    setAppliqueChargement(true);
    setAppliqueErreur('');
    setAppliqueResultat(null);
    try {
      const { data } = await territoriesApi.appliquerExcel(fichier);
      setAppliqueResultat(data as AppliqueResultat);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setAppliqueErreur(err.response?.data?.message ?? "Erreur lors de l'application.");
    } finally {
      setAppliqueChargement(false);
    }
  };

  const analyser = async () => {
    if (!fichier) return;
    setChargement(true);
    setErreur('');
    setResultat(null);
    try {
      const { data } = await territoriesApi.compareExcel(fichier);
      setResultat(data as Comparaison);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setErreur(err.response?.data?.message ?? "Erreur lors de l'analyse.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 w-full">

      {/* ── En-tête ── */}
      <div>
        <h1 className="text-xl font-bold text-[#1F1B2E]">Comparaison Excel / Base de données</h1>
        <p className="text-sm text-[#6b6b78] mt-1">
          Importez un fichier Excel de participants pour visualiser les écarts avec les données enregistrées en base.
        </p>
      </div>

      {/* ── Zone d'upload ── */}
      <div className="max-w-2xl">
        <div
          className={`rounded-2xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 py-10 px-6 mb-4 ${
            drag      ? 'border-[#E55A35] bg-orange-50'
            : fichier ? 'border-green-400 bg-green-50'
            : 'border-[#e0d6cc] bg-white hover:border-[#F58A4B]'
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); choisirFichier(e.dataTransfer.files[0] ?? null); }}
        >
          <span className="text-4xl">{fichier ? '📊' : '📂'}</span>
          {fichier ? (
            <div className="text-center">
              <p className="text-sm font-semibold text-[#1F1B2E]">{fichier.name}</p>
              <p className="text-xs text-[#6b6b78]">{(fichier.size / 1024).toFixed(1)} Ko · cliquez pour changer</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-semibold text-[#1F1B2E]">Glissez votre fichier Excel ici</p>
              <p className="text-xs text-[#6b6b78]">ou cliquez pour parcourir — .xlsx, .xls</p>
              <p className="text-[11px] text-[#9b9ba8] mt-1">Colonnes attendues : District, Groupe Scoute, Matricule, Nom, Prenom, Date de Naissance</p>
            </div>
          )}
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={(e) => choisirFichier(e.target.files?.[0] ?? null)} />
        </div>

        <button
          onClick={analyser}
          disabled={!fichier || chargement}
          className="w-full py-3 rounded-xl font-bold text-white text-sm transition-opacity disabled:opacity-40"
          style={{ background: 'linear-gradient(90deg,#F58A4B,#E55A35)' }}
        >
          {chargement ? 'Analyse en cours…' : 'Analyser le fichier'}
        </button>

        {erreur && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {erreur}
          </div>
        )}
      </div>

      {/* ── Résultats ── */}
      {resultat && (
        <div className="space-y-6">

          {/* Résumé global */}
          <div className="bg-white rounded-2xl border border-[#e0d6cc] p-5">
            <h2 className="font-bold text-[#1F1B2E] text-base mb-4">Résumé de l'analyse</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Districts en base"    value={resultat.districts.enBase}       color="blue" />
              <StatCard label="Districts fichier"    value={resultat.districts.dansFichier}  color="amber" />
              <StatCard label="Paroisses en base"    value={resultat.paroisses.enBase}       color="blue" />
              <StatCard label="Paroisses fichier"    value={resultat.paroisses.dansFichier}  color="amber" />
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 text-center">
                <div className="text-2xl font-black">{resultat.participants.total}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Participants total</div>
              </div>
              <div className="rounded-xl bg-purple-50 border border-purple-200 px-4 py-3 text-sm text-purple-700 text-center">
                <div className="text-2xl font-black">{resultat.equipeRegionale.total}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Équipe régionale</div>
              </div>
              <div className="rounded-xl bg-[#fff7f0] border border-[#F58A4B]/30 px-4 py-3 text-sm text-[#7A2820] text-center">
                <div className="text-2xl font-black">{resultat.districts.seulementDansFichier.length}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Districts inconnus</div>
              </div>
              <div className="rounded-xl bg-[#fff7f0] border border-[#F58A4B]/30 px-4 py-3 text-sm text-[#7A2820] text-center">
                <div className="text-2xl font-black">{resultat.paroisses.seulementDansFichier.length}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Paroisses inconnues</div>
              </div>
            </div>

            {/* Équipe régionale — libellés */}
            {resultat.equipeRegionale.total > 0 && (
              <div className="mt-4 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">🌍</span>
                  <span className="text-sm font-bold text-purple-800">
                    Équipe régionale — {resultat.equipeRegionale.total} participant{resultat.equipeRegionale.total > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-purple-600 mb-2">
                  Ces participants appartiennent à l&apos;équipe régionale et ne sont rattachés à aucun district ni paroisse.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {resultat.equipeRegionale.libelles.map((l, i) => (
                    <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{l}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Détail par territoire */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BlocTerritoire
              titre="Districts"
              stats={resultat.districts}
              icone="🛡️"
            />
            <BlocTerritoire
              titre="Paroisses"
              stats={resultat.paroisses}
              icone="⛪"
            />
          </div>

          {/* Arborescence district → paroisses */}
          {resultat.arborescence.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#e0d6cc] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#e0d6cc] flex items-center gap-2">
                <span className="text-lg">🗂️</span>
                <h2 className="font-bold text-[#1F1B2E] text-base">Arborescence du fichier</h2>
                <span className="text-xs font-bold bg-[#FFB36B]/20 text-[#7A2820] px-2 py-0.5 rounded-full">
                  {resultat.arborescence.length} district{resultat.arborescence.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="divide-y divide-[#f0ece8]">
                {resultat.arborescence.map((node, i) => (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-black text-[#7A2820]">🛡️</span>
                      <span className="text-sm font-bold text-[#1F1B2E]">
                        {node.district || '— Sans district —'}
                      </span>
                      <span className="text-xs text-[#6b6b78]">
                        · {node.nbParticipants} participant{node.nbParticipants > 1 ? 's' : ''}
                        {node.paroisses.length > 0 && ` · ${node.paroisses.length} paroisse${node.paroisses.length > 1 ? 's' : ''}`}
                      </span>
                    </div>
                    {node.paroisses.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-5">
                        {node.paroisses.map((p, j) => (
                          <span
                            key={j}
                            className="text-xs bg-[#fff7f0] border border-[#F58A4B]/30 text-[#7A2820] px-2.5 py-1 rounded-full font-medium"
                          >
                            ⛪ {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tableau des participants */}
          {resultat.participants.liste.length > 0 && (
            <TableauParticipants participants={resultat.participants.liste} />
          )}

          {/* Bouton complétion + résultats */}
          <div className="bg-white rounded-2xl border border-[#e0d6cc] p-5 space-y-4">
            <div>
              <h2 className="font-bold text-[#1F1B2E] text-base">Compléter les données</h2>
              <p className="text-sm text-[#6b6b78] mt-1">
                Pour les utilisateurs trouvés par matricule, complète automatiquement les champs manquants&nbsp;:
                district, paroisse et date de naissance. Les données déjà présentes ne sont jamais écrasées.
              </p>
            </div>

            {!confirmOuvert && !appliqueResultat && (
              <button
                type="button"
                onClick={() => setConfirmOuvert(true)}
                disabled={appliqueChargement}
                className="py-3 px-6 rounded-xl font-bold text-white text-sm transition-opacity disabled:opacity-40"
                style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}
              >
                Compléter les données manquantes
              </button>
            )}

            {confirmOuvert && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 space-y-3">
                <p className="text-sm font-semibold text-amber-800">
                  Cette opération va mettre à jour les utilisateurs dont les champs district, paroisse ou date de
                  naissance sont vides en base. Continuer ?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void appliquer()}
                    className="py-2 px-5 rounded-xl font-bold text-white text-sm"
                    style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}
                  >
                    Oui, compléter
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmOuvert(false)}
                    className="py-2 px-5 rounded-xl font-bold text-[#6b6b78] text-sm border border-[#e0d6cc]"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {appliqueChargement && (
              <div className="text-sm text-[#6b6b78] animate-pulse">Application en cours…</div>
            )}

            {appliqueErreur && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {appliqueErreur}
              </div>
            )}

            {appliqueResultat && (
              <div className="space-y-4">
                {/* Cartes résumé */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Avec matricule" value={appliqueResultat.traites} color="blue" />
                  <StatCard label="Sans matricule" value={appliqueResultat.sansMatricule} color={appliqueResultat.sansMatricule > 0 ? 'amber' : 'green'} sub="non traitables" />
                  <StatCard label="Mis à jour" value={appliqueResultat.misAJour} color="green" />
                  <StatCard label="Non trouvés en BD" value={appliqueResultat.introuvables.length} color={appliqueResultat.introuvables.length > 0 ? 'red' : 'green'} />
                </div>

                {/* Matricules non trouvés en BD */}
                {appliqueResultat.introuvables.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-red-700 mb-2">
                      Matricules présents dans le fichier mais absents de la base ({appliqueResultat.introuvables.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {appliqueResultat.introuvables.map((m, i) => (
                        <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-mono">{m}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Districts du fichier sans correspondance DB */}
                {appliqueResultat.districtsSansMatch.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-amber-800 mb-1">
                      Districts du fichier sans correspondance en base ({appliqueResultat.districtsSansMatch.length})
                    </p>
                    <p className="text-xs text-amber-700 mb-2">
                      Ces noms de district n&apos;ont pas pu être associés à un district existant, même après correction orthographique.
                      Les utilisateurs correspondants n&apos;ont pas été mis à jour.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {appliqueResultat.districtsSansMatch.map((d, i) => (
                        <span key={i} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">{d}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Paroisses du fichier sans correspondance DB */}
                {appliqueResultat.parissesSansMatch.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-amber-800 mb-1">
                      Paroisses du fichier sans correspondance en base ({appliqueResultat.parissesSansMatch.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {appliqueResultat.parissesSansMatch.map((p, i) => (
                        <span key={i} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">{p}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Détail des mises à jour */}
                {appliqueResultat.details.length > 0 && (
                  <div className="border border-[#e0d6cc] rounded-xl overflow-hidden">
                    <div className="bg-[#faf8f5] px-4 py-2 border-b border-[#e0d6cc]">
                      <span className="text-xs font-bold text-[#1F1B2E] uppercase tracking-wide">
                        Détail des mises à jour ({appliqueResultat.details.length})
                      </span>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-[#f0ece8]">
                      {appliqueResultat.details.map((d, i) => (
                        <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                          <span className="font-mono text-xs font-bold text-[#1F1B2E] flex-shrink-0 mt-0.5">{d.matricule}</span>
                          <div className="flex flex-wrap gap-1">
                            {d.champsModifies.map((c, j) => (
                              <span key={j} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{c}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {appliqueResultat.misAJour === 0 && appliqueResultat.introuvables.length === 0 && appliqueResultat.districtsSansMatch.length === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                    Tous les utilisateurs trouvés par matricule avaient déjà leurs données complètes — aucune mise à jour nécessaire.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { setAppliqueResultat(null); setConfirmOuvert(false); }}
                  className="text-xs text-[#6b6b78] underline"
                >
                  Réinitialiser
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
