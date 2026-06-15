'use client';

interface PaginationProps {
  page: number;
  totalItems: number;
  perPage: number;
  onChange: (page: number) => void;
}

function getPages(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  if (current > 3) out.push('…');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) out.push(i);
  if (current < total - 2) out.push('…');
  out.push(total);
  return out;
}

export function Pagination({ page, totalItems, perPage, onChange }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / perPage);
  if (totalPages <= 1) return null;

  const from = (page - 1) * perPage + 1;
  const to   = Math.min(page * perPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 select-none">
      <span className="text-xs text-[#6b6b78]">
        {from}–{to} sur {totalItems} résultat{totalItems > 1 ? 's' : ''}
      </span>

      <div className="flex items-center gap-1">
        {/* Précédent */}
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white border border-[#e0e0e8] text-[#6b6b78] hover:border-[#1F1B2E] hover:text-[#1F1B2E] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          ‹
        </button>

        {/* Pages */}
        {getPages(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-[#6b6b78]">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                p === page
                  ? 'bg-[#C62828] text-white border border-[#C62828]'
                  : 'bg-white border border-[#e0e0e8] text-[#6b6b78] hover:border-[#1F1B2E] hover:text-[#1F1B2E]'
              }`}
            >
              {p}
            </button>
          )
        )}

        {/* Suivant */}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white border border-[#e0e0e8] text-[#6b6b78] hover:border-[#1F1B2E] hover:text-[#1F1B2E] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          ›
        </button>
      </div>
    </div>
  );
}
