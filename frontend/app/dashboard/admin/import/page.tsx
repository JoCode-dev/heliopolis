'use client';
import { useRef, useState } from 'react';
import { usersApi } from '@/lib/api';

type Erreur = { matricule: string; raison: string };

type ResultatImport = {
  importes: number;
  ignores: number;
  erreurs: Erreur[];
};

export default function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultat, setResultat] = useState<ResultatImport | null>(null);
  const [erreurGlobal, setErreurGlobal] = useState('');
  const [drag, setDrag] = useState(false);

  const choisirFichier = (f: File | null) => {
    if (!f) return;
    setFichier(f);
    setResultat(null);
    setErreurGlobal('');
  };

  const importer = async () => {
    if (!fichier) return;
    setLoading(true);
    setErreurGlobal('');
    setResultat(null);
    try {
      const { data } = await usersApi.importerMatricules(fichier);
      setResultat(data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setErreurGlobal(err.response?.data?.message ?? 'Erreur lors de l\'import.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8 max-w-2xl mx-auto w-full">

      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1F1B2E]">Import de membres</h1>
        <p className="text-sm text-[#6b6b78] mt-1">
          Chargez un fichier Excel (.xlsx) issu du registre national — colonnes attendues :
          <span className="font-semibold"> District, Groupe Scoute, Matricule, Nom, Prenom, Date de Naissance</span>.
        </p>
      </div>

      {/* Zone de dépôt */}
      <div
        className={`rounded-2xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 py-10 px-6 mb-4 ${
          drag
            ? 'border-[#E55A35] bg-orange-50'
            : fichier
            ? 'border-green-400 bg-green-50'
            : 'border-[#e0d6cc] bg-white hover:border-[#F58A4B]'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          choisirFichier(e.dataTransfer.files[0] ?? null);
        }}
      >
        <span className="text-3xl">{fichier ? '✅' : '📂'}</span>
        {fichier ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-[#1F1B2E]">{fichier.name}</p>
            <p className="text-xs text-[#6b6b78]">
              {(fichier.size / 1024).toFixed(1)} Ko · cliquez pour changer
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-semibold text-[#1F1B2E]">Glissez votre fichier Excel ici</p>
            <p className="text-xs text-[#6b6b78]">ou cliquez pour parcourir — .xlsx uniquement</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => choisirFichier(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Bouton */}
      <button
        onClick={importer}
        disabled={!fichier || loading}
        className="w-full py-3 rounded-xl font-bold text-white text-sm transition-opacity disabled:opacity-40"
        style={{ background: 'linear-gradient(90deg,#F58A4B,#E55A35)' }}
      >
        {loading ? 'Import en cours…' : 'Importer les membres'}
      </button>

      {/* Erreur globale */}
      {erreurGlobal && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {erreurGlobal}
        </div>
      )}

      {/* Résultats */}
      {resultat && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Importés" value={resultat.importes} color="green" />
            <StatCard label="Ignorés (doublons)" value={resultat.ignores} color="amber" />
            <StatCard label="Erreurs" value={resultat.erreurs.length} color="red" />
          </div>

          {resultat.erreurs.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#e0d6cc] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#e0d6cc] flex items-center gap-2">
                <span className="text-sm font-bold text-[#1F1B2E]">Lignes en erreur</span>
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                  {resultat.erreurs.length}
                </span>
              </div>
              <div className="divide-y divide-[#f0ece8] max-h-72 overflow-y-auto">
                {resultat.erreurs.map((e, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#1F1B2E] w-24 flex-shrink-0">
                      {e.matricule}
                    </span>
                    <span className="text-xs text-red-600">{e.raison}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resultat.importes > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              <span className="font-bold">{resultat.importes} membre{resultat.importes > 1 ? 's' : ''}</span> pré-enregistré{resultat.importes > 1 ? 's' : ''} avec succès.
              Ils pourront s&apos;inscrire sur la page d&apos;activation en saisissant leur matricule.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'green' | 'amber' | 'red' }) {
  const styles = {
    green: 'bg-green-50  border-green-200  text-green-700',
    amber: 'bg-amber-50  border-amber-200  text-amber-700',
    red:   'bg-red-50    border-red-200    text-red-700',
  };
  return (
    <div className={`rounded-xl border px-3 py-3 text-center ${styles[color]}`}>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide mt-0.5 opacity-80">{label}</div>
    </div>
  );
}
