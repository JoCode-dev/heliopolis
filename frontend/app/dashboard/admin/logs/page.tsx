"use client";

import { logsApi } from "@/lib/api";
import type { ActionLogCategory, ActionLogEntry, AuditAction } from "@/types";
import { useCallback, useEffect, useState } from "react";

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
  LOGIN: "Connexion",
  LOGOUT: "Déconnexion",
  EXPORT: "Export",
  STATUS_CHANGE: "Changement statut",
  VALIDATE: "Validation",
  REJECT: "Rejet",
};

const ACTION_COLORS: Record<AuditAction, string> = {
  CREATE: "bg-[#e8f5e9] text-[#2E7D32]",
  UPDATE: "bg-[#EDE7F6] text-[#6A1B9A]",
  DELETE: "bg-[#fff8f3] text-[#E55A35]",
  LOGIN: "bg-[#e3f2fd] text-[#1565C0]",
  LOGOUT: "bg-[#f5f5f5] text-[#6b6b78]",
  EXPORT: "bg-[#fff8e1] text-[#D9A441]",
  STATUS_CHANGE: "bg-[#fff3e0] text-[#E65100]",
  VALIDATE: "bg-[#e8f5e9] text-[#2E7D32]",
  REJECT: "bg-[#fff8f3] text-[#E55A35]",
};

const CATEGORIES: { value: ActionLogCategory | ""; label: string }[] = [
  { value: "", label: "Toutes catégories" },
  { value: "auth", label: "Authentification" },
  { value: "user", label: "Utilisateurs" },
  { value: "camp", label: "Camps" },
  { value: "challenge", label: "Défis" },
  { value: "codex", label: "Codex" },
  { value: "council", label: "Conseils" },
  { value: "badge", label: "Artefacts" },
  { value: "export", label: "Exports" },
  { value: "settings", label: "Paramètres" },
];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminLogsPage() {
  const [dates, setDates] = useState<string[]>([]);
  const [date, setDate] = useState(todayKey());
  const [action, setAction] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ActionLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    logsApi
      .dates()
      .then((r) => {
        const list = r.data as string[];
        setDates(list);
        if (list.length > 0 && !list.includes(date)) {
          setDate(list[0]);
        }
      })
      .catch(() => {});
  }, [date]);

  const load = useCallback(() => {
    setLoading(true);
    logsApi
      .list({
        date,
        action: action || undefined,
        category: category || undefined,
        search: search.trim() || undefined,
        page,
        limit,
      })
      .then((r) => {
        const data = r.data as { items: ActionLogEntry[]; total: number };
        setItems(data.items);
        setTotal(data.total);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [date, action, category, search, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-[#ececf0] px-4 pt-4 pb-3 flex-shrink-0">
        <h1 className="text-base font-black text-[#1F1B2E]">
          📋 Journal d&apos;actions
        </h1>
        <p className="text-[11px] text-[#9b9ba8] mt-0.5">
          {total} entrée{total !== 1 ? "s" : ""} · {date}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f6f6fa] px-3 py-3 lg:px-6 lg:py-4">
        {/* Filtres */}
        <div className="bg-white rounded-2xl border border-[#ececf0] p-4 mb-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#9b9ba8] mb-1">
                Date
              </label>
              <select
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-[#e0e0e8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6A1B9A]"
              >
                {!dates.includes(date) && <option value={date}>{date}</option>}
                {dates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#9b9ba8] mb-1">
                Action
              </label>
              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#6A1B9A]"
              >
                <option value="">Toutes actions</option>
                {(Object.keys(ACTION_LABELS) as AuditAction[]).map((a) => (
                  <option key={a} value={a}>
                    {ACTION_LABELS[a]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#9b9ba8] mb-1">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#6A1B9A]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#9b9ba8] mb-1">
                Recherche
              </label>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Résumé, acteur…"
                className="w-full border border-[#e0e0e8] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#6A1B9A]"
              />
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-16 text-[#9b9ba8]">
            <div className="text-3xl animate-pulse mb-2">📋</div>
            <p className="text-sm">Chargement…</p>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-16 text-[#9b9ba8]">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm font-semibold text-[#1F1B2E]">
              Aucune entrée pour cette date
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="flex flex-col gap-2">
            {items.map((entry) => {
              const isOpen = expanded === entry.id;
              return (
                <div
                  key={entry.id}
                  className="bg-white rounded-xl border border-[#ececf0] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : entry.id)}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#fafafa] transition"
                  >
                    <span className="text-[11px] text-[#9b9ba8] font-mono flex-shrink-0 pt-0.5">
                      {fmtTime(entry.timestamp)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${ACTION_COLORS[entry.action]}`}
                    >
                      {ACTION_LABELS[entry.action]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1F1B2E] leading-snug">
                        {entry.summary}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-[#9b9ba8]">
                        {entry.actor && (
                          <span>
                            👤 {entry.actor.label} ({entry.actor.role})
                          </span>
                        )}
                        <span>🏷 {entry.category}</span>
                        <span>
                          {entry.target.entityType} ·{" "}
                          {entry.target.entityId.slice(0, 8)}…
                        </span>
                        {entry.ip && <span>🌐 {entry.ip}</span>}
                      </div>
                    </div>
                    <span className="text-[#9b9ba8] text-xs flex-shrink-0">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </button>
                  {isOpen && entry.metadata && (
                    <div className="px-4 pb-3 border-t border-[#f0f0f0]">
                      <pre className="mt-2 text-[10px] bg-[#f6f6fa] rounded-lg p-3 overflow-x-auto text-[#6b6b78]">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#ececf0] disabled:opacity-40"
            >
              ← Précédent
            </button>
            <span className="text-xs text-[#9b9ba8]">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#ececf0] disabled:opacity-40"
            >
              Suivant →
            </button>
          </div>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}
