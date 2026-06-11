'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { territoriesApi, usersApi } from '@/lib/api';
import { Pill } from '@/components/ui';
import type { District, User } from '@/types';

interface Region { id: string; nom: string; }

export default function AdminDistrictsPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [sentinelles, setSentinelles] = useState<User[]>([]);
  const [gardiens, setGardiens] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalNom, setModalNom] = useState('');
  const [modalCode, setModalCode] = useState('');
  const [modalRegionId, setModalRegionId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Suppression
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [d, r, s, g] = await Promise.all([
          territoriesApi.districts(),
          territoriesApi.regions(),
          usersApi.list({ role: 'SENTINELLE' }),
          usersApi.list({ role: 'GARDIEN' }),
        ]);
        setDistricts(d.data);
        setRegions(r.data);
        setSentinelles(s.data);
        setGardiens(g.data);
        if (r.data.length === 1) setModalRegionId(r.data[0].id);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const sentinelleByDistrict = new Map<string, User>();
  for (const s of sentinelles) {
    if (s.district?.id) sentinelleByDistrict.set(s.district.id, s);
  }

  const gardienCountByDistrict = new Map<string, number>();
  const adhesionsByDistrict = new Map<string, { total: number; aJour: number }>();
  for (const g of gardiens) {
    if (!g.district?.id) continue;
    const id = g.district.id;
    gardienCountByDistrict.set(id, (gardienCountByDistrict.get(id) ?? 0) + 1);
    const current = adhesionsByDistrict.get(id) ?? { total: 0, aJour: 0 };
    const aJour = g.adhesions?.some(a => a.statut === 'A_JOUR') ?? false;
    adhesionsByDistrict.set(id, { total: current.total + 1, aJour: current.aJour + (aJour ? 1 : 0) });
  }

  function openModal() {
    setModalNom('');
    setModalCode('');
    setSaveError('');
    if (regions.length === 1) setModalRegionId(regions[0].id);
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const nom = modalNom.trim();
    const code = modalCode.trim() || undefined;
    if (!nom || !modalRegionId) return;
    setSaving(true);
    setSaveError('');
    try {
      const { data } = await territoriesApi.createDistrict({ nom, code, regionId: modalRegionId });
      setDistricts(prev => [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom)));
      setShowModal(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erreur lors de la création';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(district: District) {
    const nbParoisses = district._count?.parishes ?? 0;
    const warning = nbParoisses > 0
      ? `Ce district contient ${nbParoisses} paroisse(s). `
      : '';
    if (!confirm(`${warning}Supprimer le district « ${district.nom} » ?`)) return;
    setDeletingId(district.id);
    try {
      await territoriesApi.deleteDistrict(district.id);
      setDistricts(prev => prev.filter(d => d.id !== district.id));
    } catch { /* ignore */ }
    finally { setDeletingId(null); }
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-5 border-b border-[#ececf0] pb-4">
        <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E]">Districts</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#6b6b78]">{districts.length} district{districts.length > 1 ? 's' : ''}</span>
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1F1B2E] text-white text-xs font-semibold shadow-sm shadow-[#1F1B2E]/20 hover:bg-[#2c2640] hover:shadow-md hover:shadow-[#1F1B2E]/25 hover:-translate-y-px transition-all duration-150"
          >
            <span className="text-base leading-none">+</span>
            Ajouter un district
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-[#6b6b78] text-sm">Chargement…</div>
      )}

      {!loading && districts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[#6b6b78]">
          <div className="text-5xl mb-3">🛡️</div>
          <p className="font-semibold">Aucun district trouvé</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {districts.map(district => {
          const sentinelle = sentinelleByDistrict.get(district.id);
          const nbGardiens = gardienCountByDistrict.get(district.id) ?? 0;
          const nbParoisses = district._count?.parishes ?? 0;
          const adh = adhesionsByDistrict.get(district.id) ?? { total: 0, aJour: 0 };
          const pct = adh.total > 0 ? Math.round((adh.aJour / adh.total) * 100) : 0;

          return (
            <div key={district.id} className="bg-white border border-[#ececf0] rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[#1F1B2E]">{district.nom}</h2>
                  <p className="text-xs text-[#6b6b78] mt-0.5">{district.region?.nom ?? '—'}</p>
                </div>
                {sentinelle
                  ? <Pill variant="vert">✓ Actif</Pill>
                  : <Pill variant="or">⏳ Sans sentinelle</Pill>
                }
              </div>

              <div className="border-t border-[#f0f0f4] pt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6b6b78]">Sentinelle</span>
                  <span className="font-semibold text-[#1F1B2E]">
                    {sentinelle ? `${sentinelle.prenoms} ${sentinelle.nom}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b6b78]">Paroisses</span>
                  <span className="font-semibold text-[#1F1B2E]">{nbParoisses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b6b78]">Gardiens</span>
                  <span className="font-semibold text-[#1F1B2E]">{nbGardiens}</span>
                </div>

                <div className="pt-2 border-t border-[#f0f0f4]">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[#6b6b78]">Adhésions à jour</span>
                    <span className={`font-bold text-xs ${pct >= 80 ? 'text-[#2E7D32]' : pct >= 50 ? 'text-[#D9A441]' : 'text-[#E55A35]'}`}>
                      {adh.aJour}/{adh.total} — {pct}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#f0f0f4] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 80 ? '#2E7D32' : pct >= 50 ? '#D9A441' : '#E55A35',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-auto">
                <Link
                  href={`/dashboard/admin/paroisses?districtId=${district.id}`}
                  className="flex-1 text-center text-xs border border-[#e0e0ea] text-[#1F1B2E] rounded-lg px-3 py-2 font-semibold hover:bg-[#f5f5fb] hover:border-[#c8c8d8] hover:shadow-sm transition-all duration-150">
                  Voir paroisses →
                </Link>
                <button
                  onClick={() => handleDelete(district)}
                  disabled={deletingId === district.id}
                  className="text-xs border border-[#fce8e8] text-red-400 rounded-lg px-3 py-2 font-semibold enabled:hover:bg-red-50 enabled:hover:border-red-200 enabled:hover:shadow-sm disabled:opacity-60 transition-all duration-150"
                >
                  {deletingId === district.id ? '…' : 'Suppr.'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal création — z-[60] pour passer au-dessus de la nav mobile */}
      {showModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 pb-16 sm:pb-4"
          onClick={() => setShowModal(false)}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-black text-[#1F1B2E] mb-5">Ajouter un district</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              {regions.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-[#6b6b78] mb-1.5 uppercase tracking-wide">
                    Région
                  </label>
                  <select
                    value={modalRegionId}
                    onChange={e => setModalRegionId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-[#e6e6ea] rounded-xl focus:outline-none focus:border-[#1F1B2E] transition-colors bg-white"
                  >
                    <option value="">— Choisir une région —</option>
                    {regions.map(r => (
                      <option key={r.id} value={r.id}>{r.nom}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#6b6b78] mb-1.5 uppercase tracking-wide">
                  Nom du district
                </label>
                <input
                  type="text"
                  value={modalNom}
                  onChange={e => setModalNom(e.target.value)}
                  placeholder="ex. Requin Lumière"
                  required
                  className="w-full px-3 py-2 text-sm border border-[#e6e6ea] rounded-xl focus:outline-none focus:border-[#1F1B2E] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6b6b78] mb-1.5 uppercase tracking-wide">
                  Code <span className="normal-case font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={modalCode}
                  onChange={e => setModalCode(e.target.value)}
                  placeholder="ex. DIST-RLU"
                  className="w-full px-3 py-2 text-sm border border-[#e6e6ea] rounded-xl focus:outline-none focus:border-[#1F1B2E] transition-colors"
                />
              </div>
              {saveError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {saveError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#e0e0ea] text-[#6b6b78] hover:bg-[#f5f5fb] hover:border-[#c8c8d8] hover:shadow-sm transition-all duration-150"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || !modalNom.trim() || !modalRegionId}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#1F1B2E] text-white shadow-sm shadow-[#1F1B2E]/20 enabled:hover:bg-[#2c2640] enabled:hover:shadow-md enabled:hover:shadow-[#1F1B2E]/25 enabled:hover:-translate-y-px disabled:opacity-60 transition-all duration-150"
                >
                  {saving ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
