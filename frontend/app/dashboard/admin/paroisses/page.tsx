'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { territoriesApi, usersApi } from '@/lib/api';
import { deferEffect } from '@/lib/effects';
import { Select } from '@/components/ui';
import type { District, Parish, User } from '@/types';

function ParoissesContent() {
  const searchParams = useSearchParams();
  const initialDistrictId = searchParams.get('districtId') ?? '';

  const [districts, setDistricts] = useState<District[]>([]);
  const [parishes, setParishes] = useState<Parish[]>([]);
  const [guides, setGuides] = useState<User[]>([]);
  const [gardiens, setGardiens] = useState<User[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState(initialDistrictId);
  const [loading, setLoading] = useState(true);
  const [loadingParishes, setLoadingParishes] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalDistrictId, setModalDistrictId] = useState('');
  const [modalNom, setModalNom] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => deferEffect(async () => {
      try {
        const [d, g, gar] = await Promise.all([
          territoriesApi.districts(),
          usersApi.list({ role: 'GUIDE' }),
          usersApi.list({ role: 'GARDIEN' }),
        ]);
        setDistricts(d.data);
        setGuides(g.data);
        setGardiens(gar.data);
      } catch { /* ignore */ }
      finally { setLoading(false); }
  }), []);

  useEffect(() => {
    if (!selectedDistrictId) return deferEffect(() => setParishes([]));

    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setLoadingParishes(true);
      try {
        const { data } = await territoriesApi.parishes(selectedDistrictId);
        if (!cancelled) setParishes(data);
      } catch {
        if (!cancelled) setParishes([]);
      } finally {
        if (!cancelled) setLoadingParishes(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedDistrictId]);

  const guideByParish = new Map<string, User>();
  for (const g of guides) {
    if (g.parish?.id) guideByParish.set(g.parish.id, g);
  }

  const gardiensByParish = new Map<string, number>();
  for (const g of gardiens) {
    if (g.parish?.id) {
      gardiensByParish.set(g.parish.id, (gardiensByParish.get(g.parish.id) ?? 0) + 1);
    }
  }

  const adhesionsByParish = new Map<string, { total: number; aJour: number }>();
  for (const g of gardiens) {
    if (g.parish?.id) {
      const key = g.parish.id;
      const current = adhesionsByParish.get(key) ?? { total: 0, aJour: 0 };
      const aJour = g.adhesions?.some(a => a.statut === 'A_JOUR') ?? false;
      adhesionsByParish.set(key, { total: current.total + 1, aJour: current.aJour + (aJour ? 1 : 0) });
    }
  }

  function openModal() {
    setModalDistrictId(selectedDistrictId);
    setModalNom('');
    setSaveError('');
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const nom = modalNom.trim();
    if (!nom || !modalDistrictId) return;
    setSaving(true);
    setSaveError('');
    try {
      await territoriesApi.createParish({ nom, districtId: modalDistrictId });
      setShowModal(false);
      if (modalDistrictId === selectedDistrictId) {
        const { data } = await territoriesApi.parishes(selectedDistrictId);
        setParishes(data);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erreur lors de la création';
      setSaveError(msg);
    } finally { setSaving(false); }
  }

  async function handleDelete(parish: Parish) {
    if (!confirm(`Supprimer la paroisse « ${parish.nom} » ?`)) return;
    setDeletingId(parish.id);
    try {
      await territoriesApi.deleteParish(parish.id);
      setParishes(prev => prev.filter(p => p.id !== parish.id));
    } catch { /* ignore */ }
    finally { setDeletingId(null); }
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:p-6">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-5 border-b border-[#ececf0] pb-4">
        <h1 className="text-xl lg:text-2xl font-black text-[#1F1B2E]">Paroisses</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#6b6b78] hidden sm:block">
            {parishes.length} paroisse{parishes.length > 1 ? 's' : ''}
          </span>
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1F1B2E] text-white text-xs font-semibold shadow-sm shadow-[#1F1B2E]/20 hover:bg-[#2c2640] hover:shadow-md hover:shadow-[#1F1B2E]/25 hover:-translate-y-px transition-all duration-150 whitespace-nowrap"
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">Ajouter une paroisse</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        </div>
      </div>

      {/* Select district */}
      <div className="mb-5">
        {loading ? (
          <div className="h-10 bg-white border border-[#e6e6ea] rounded-xl animate-pulse" />
        ) : (
          <Select
            value={selectedDistrictId}
            onChange={e => setSelectedDistrictId(e.target.value)}
            className="w-full max-w-sm">
            <option value="">— Tous les districts —</option>
            {districts.map(d => (
              <option key={d.id} value={d.id}>{d.nom}</option>
            ))}
          </Select>
        )}
      </div>

      {loadingParishes && (
        <div className="flex items-center justify-center py-16 text-[#6b6b78] text-sm">Chargement…</div>
      )}

      {!loadingParishes && selectedDistrictId && parishes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[#6b6b78]">
          <div className="text-5xl mb-3">⛪</div>
          <p className="font-semibold">Aucune paroisse dans ce district</p>
        </div>
      )}

      {!selectedDistrictId && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-[#6b6b78]">
          <div className="text-5xl mb-3">🛡️</div>
          <p className="font-semibold">Sélectionnez un district pour voir ses paroisses</p>
        </div>
      )}

      {parishes.length > 0 && !loadingParishes && (
        <>
          {/* Mobile — cards */}
          <div className="flex flex-col gap-3 lg:hidden">
            {parishes.map(parish => {
              const guide = guideByParish.get(parish.id);
              const nbGardiens = gardiensByParish.get(parish.id) ?? 0;
              const adh = adhesionsByParish.get(parish.id);
              const adhStr = adh ? `${adh.aJour}/${adh.total}` : '—';

              return (
                <div key={parish.id} className="bg-white border border-[#ececf0] rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-bold text-[#1F1B2E] text-sm">{parish.nom}</p>
                      <p className="text-xs text-[#6b6b78] mt-0.5">{parish.district?.nom ?? '—'}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(parish)}
                      disabled={deletingId === parish.id}
                      className="text-xs text-red-400 enabled:hover:text-red-600 enabled:hover:bg-red-50 enabled:hover:border-red-200 enabled:hover:shadow-sm disabled:opacity-60 flex-shrink-0 px-2 py-1 rounded-lg border border-red-100 transition-all duration-150"
                    >
                      {deletingId === parish.id ? '…' : 'Suppr.'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-[#f9f9fc] rounded-lg p-2 text-center">
                      <p className="text-[#6b6b78] text-[10px] mb-0.5">Guide</p>
                      <p className="font-semibold text-[#1F1B2E] truncate">
                        {guide ? guide.nom : '—'}
                      </p>
                    </div>
                    <div className="bg-[#f9f9fc] rounded-lg p-2 text-center">
                      <p className="text-[#6b6b78] text-[10px] mb-0.5">Gardiens</p>
                      <p className="font-bold text-[#1F1B2E]">{nbGardiens}</p>
                    </div>
                    <div className="bg-[#f9f9fc] rounded-lg p-2 text-center">
                      <p className="text-[#6b6b78] text-[10px] mb-0.5">À jour</p>
                      <p className="font-semibold text-[#1F1B2E]">{adhStr}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop — table */}
          <div className="hidden lg:block bg-white border border-[#ececf0] rounded-2xl overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#f9f9fc] text-[#6b6b78] uppercase tracking-wide">
                  {['Paroisse', 'District', 'Guide', 'Gardiens', 'Adhésions à jour', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold border-b border-[#ececf0]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parishes.map(parish => {
                  const guide = guideByParish.get(parish.id);
                  const nbGardiens = gardiensByParish.get(parish.id) ?? 0;
                  const adh = adhesionsByParish.get(parish.id);
                  const adhStr = adh ? `${adh.aJour} / ${adh.total}` : '—';

                  return (
                    <tr key={parish.id} className="border-b border-[#f0f0f4] hover:bg-[#fafafc]">
                      <td className="px-4 py-3 font-semibold text-[#1F1B2E]">{parish.nom}</td>
                      <td className="px-4 py-3 text-[#6b6b78]">{parish.district?.nom ?? '—'}</td>
                      <td className="px-4 py-3 text-[#6b6b78]">
                        {guide ? `${guide.prenoms} ${guide.nom}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-[#1F1B2E]">{nbGardiens}</td>
                      <td className="px-4 py-3 text-[#6b6b78]">{adhStr}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(parish)}
                          disabled={deletingId === parish.id}
                          className="text-[#6b6b78] enabled:hover:text-red-500 enabled:hover:underline disabled:opacity-60 text-xs transition-all duration-150"
                        >
                          {deletingId === parish.id ? '…' : 'Supprimer'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal création — z-[60] pour passer au-dessus de la nav mobile */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 pb-16 sm:pb-4">
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-black text-[#1F1B2E] mb-5">Ajouter une paroisse</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#6b6b78] mb-1.5 uppercase tracking-wide">
                  District
                </label>
                <Select
                  value={modalDistrictId}
                  onChange={e => setModalDistrictId(e.target.value)}
                  required
                  className="w-full"
                >
                  <option value="">— Choisir un district —</option>
                  {districts.map(d => (
                    <option key={d.id} value={d.id}>{d.nom}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6b6b78] mb-1.5 uppercase tracking-wide">
                  Nom du groupe scout
                </label>
                <input
                  type="text"
                  value={modalNom}
                  onChange={e => setModalNom(e.target.value)}
                  placeholder="ex. LES DAUPHINS BLEUS"
                  required
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
                  disabled={saving || !modalNom.trim() || !modalDistrictId}
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

export default function AdminParoissesPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-[#6b6b78] text-sm">Chargement…</div>}>
      <ParoissesContent />
    </Suspense>
  );
}
