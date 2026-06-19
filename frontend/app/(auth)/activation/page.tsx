"use client";
import { GardiensBlazon } from "@/components/layout/GardiensBlazon";
import { Button } from "@/components/ui";
import { authApi } from "@/lib/api";
import { getHomeForRole } from "@/lib/roles";
import { useAuthStore } from "@/store/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

type Mode = "inscription" | "connexion";

export default function ActivationPage() {
  return (
    <Suspense fallback={null}>
      <ActivationContent />
    </Suspense>
  );
}

function ActivationContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, setTokens, setUser } = useAuthStore();

  const [mode, setMode] = useState<Mode>(
    params.get("login") === "1" ? "connexion" : "inscription",
  );

  // ── Inscription — 5 champs ──
  const [nom, setNom] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [matricule, setMatricule] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);

  // ── Connexion ──
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const formContentRef = useRef<HTMLDivElement>(null);
  const [formHeight, setFormHeight] = useState<number>();

  useEffect(() => {
    if (user) router.replace(getHomeForRole(user.role));
  }, [router, user]);

  useEffect(() => {
    const formContent = formContentRef.current;
    if (!formContent) return;

    const updateFormHeight = () => setFormHeight(formContent.offsetHeight);
    updateFormHeight();

    const resizeObserver = new ResizeObserver(updateFormHeight);
    resizeObserver.observe(formContent);

    return () => resizeObserver.disconnect();
  }, [mode]);

  const clearErrors = () => setError("");

  /* ── Pré-remplissage matricule ── */
  const handleMatriculeChange = (val: string) => {
    const upper = val.toUpperCase();
    setMatricule(upper);
    if (prefilled) {
      setPrefilled(false);
      setNom("");
      setPrenoms("");
    }
    if (/^\d{7}[A-Z]$/.test(upper)) {
      setPrefillLoading(true);
      authApi.verifierMatricule(upper)
        .then(({ data }) => {
          if (data.nom && data.prenoms) {
            setNom(data.nom);
            setPrenoms(data.prenoms);
            setPrefilled(true);
          }
        })
        .catch(() => {})
        .finally(() => setPrefillLoading(false));
    }
  };

  /* ── Inscription ── */
  const handleInscrire = async () => {
    if (!nom.trim() || !prenoms.trim()) {
      setError("Nom et prénom(s) sont obligatoires.");
      return;
    }
    if (!/^\d{7}[A-Z]$/.test(matricule)) {
      setError(
        "Matricule invalide — format attendu : 7 chiffres + 1 lettre (ex : 0525247O).",
      );
      return;
    }
    if (!dateNaissance) {
      setError("Date de naissance obligatoire.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }
    setLoading(true);
    clearErrors();
    try {
      const { data } = await authApi.inscrire({
        nom: nom.trim(),
        prenoms: prenoms.trim(),
        matricule,
        dateNaissance, // YYYY-MM-DD (valeur native du champ date HTML)
        password,
      });
      setTokens(data.accessToken, data.refreshToken);
      const { data: me } = await authApi.me();
      setUser(me);
      router.push(getHomeForRole(me.role));
    } catch (e: unknown) {
      const err = e as { code?: string; response?: { data?: { message?: string } } };
      if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
        setError("Serveur temporairement indisponible. Réessayez dans quelques secondes.");
      } else {
        setError(err.response?.data?.message ?? "Une erreur est survenue lors de l'inscription.");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Connexion ── */
  const handleLogin = async () => {
    setLoading(true);
    clearErrors();
    try {
      const { data } = await authApi.login(identifier, loginPassword);
      setTokens(data.accessToken, data.refreshToken);
      const { data: me } = await authApi.me();
      setUser(me);
      router.push(getHomeForRole(me.role));
    } catch (e: unknown) {
      const err = e as { code?: string; response?: { data?: { message?: string } } };
      if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
        setError("Serveur temporairement indisponible. Réessayez dans quelques secondes.");
      } else {
        setError(err.response?.data?.message ?? "Identifiants invalides.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    router.replace(m === "connexion" ? "/activation?login=1" : "/activation");
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-white relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg,#FFB36B 0%,#F58A4B 35%,#E55A35 65%,#7A2820 100%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 75% 25%, rgba(255,240,200,.4),transparent 40%), radial-gradient(circle at 20% 90%, rgba(31,27,46,.4),transparent 50%)",
        }}
      />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-5 py-10">
        {/* Logo */}
        <div className="rounded-full overflow-hidden shadow-2xl ring-4 ring-white/30 bg-white/10 backdrop-blur-sm">
          <GardiensBlazon size={100} className="rounded-full" />
        </div>

        {/* Onglets mode */}
        <div className="flex w-full rounded-2xl overflow-hidden border border-white/25 bg-white/10 backdrop-blur-sm">
          {(["inscription", "connexion"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className="flex-1 py-2.5 text-sm font-bold tracking-wide transition-colors"
              style={{
                background:
                  mode === m ? "rgba(255,255,255,.25)" : "transparent",
                color: "#fff",
                textShadow: "0 1px 4px rgba(0,0,0,.3)",
              }}
            >
              {m === "inscription" ? "Inscription" : "Connexion"}
            </button>
          ))}
        </div>

        {/* Erreur */}
        {error && (
          <div className="w-full bg-red-900/40 rounded-xl px-4 py-3 text-sm text-center">
            {error}
          </div>
        )}

        <div
          className="w-full overflow-hidden transition-[height] duration-500 ease-in-out"
          style={{ height: formHeight ? `${formHeight}px` : undefined }}
        >
          <div
            key={mode}
            ref={formContentRef}
            className="w-full"
            style={{ animation: "form-fade 300ms ease-in-out" }}
          >
            {/* ── FORMULAIRE INSCRIPTION ── */}
            {mode === "inscription" && (
              <div className="w-full flex flex-col gap-4">
                {/* Section 1 — Identité */}
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-black tracking-[.22em] uppercase opacity-70 mb-1">
                    Identité
                  </p>
                  {prefilled && (
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-white/80 bg-white/10 rounded-lg px-3 py-1.5 mb-1">
                      <span>✓</span>
                      <span>Identité récupérée depuis la base nationale</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className={LABEL_CLS}>Nom *</label>
                      <input
                        className={INPUT_CLS + (prefilled ? " opacity-75 cursor-default" : "")}
                        placeholder="KOUASSI"
                        value={nom}
                        readOnly={prefilled}
                        onChange={(e) => !prefilled && setNom(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className={LABEL_CLS}>Prénom(s) *</label>
                      <input
                        className={INPUT_CLS + (prefilled ? " opacity-75 cursor-default" : "")}
                        placeholder="Jean"
                        value={prenoms}
                        readOnly={prefilled}
                        onChange={(e) => !prefilled && setPrenoms(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Séparateur */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/25" />
                  <span className="text-[10px] opacity-60 uppercase tracking-widest">
                    Vérification
                  </span>
                  <div className="flex-1 h-px bg-white/25" />
                </div>

                {/* Section 2 — Vérification */}
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-black tracking-[.22em] uppercase opacity-70 mb-1">
                    Données nationales
                  </p>

                  <div>
                    <label className={LABEL_CLS}>Matricule national *</label>
                    <div className="relative">
                      <input
                        className={
                          INPUT_CLS +
                          " tracking-widest text-center font-bold text-lg" +
                          (prefillLoading ? " pr-10" : "")
                        }
                        placeholder="0525247O"
                        maxLength={8}
                        value={matricule}
                        onChange={(e) => handleMatriculeChange(e.target.value)}
                      />
                      {prefillLoading && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 text-sm animate-spin">
                          ◌
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] opacity-65 mt-1">
                      7 chiffres + 1 lettre · délivré par la Nation
                    </p>
                  </div>

                  <div>
                    <label className={LABEL_CLS}>Date de naissance *</label>
                    <input
                      type="date"
                      className={INPUT_CLS}
                      value={dateNaissance}
                      onChange={(e) => setDateNaissance(e.target.value)}
                      style={{ colorScheme: "dark" }}
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLS}>Mot de passe *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className={INPUT_CLS + " pr-12"}
                        placeholder="8 caractères minimum"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleInscrire()
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors text-lg leading-none"
                        tabIndex={-1}
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  variant="nuit"
                  onClick={handleInscrire}
                  disabled={
                    loading ||
                    !nom.trim() ||
                    !prenoms.trim() ||
                    matricule.length < 8 ||
                    !dateNaissance ||
                    password.length < 8
                  }
                >
                  {loading ? "…" : "Créer mon compte →"}
                </Button>
              </div>
            )}

            {/* ── FORMULAIRE CONNEXION ── */}
            {mode === "connexion" && (
              <div className="w-full flex flex-col gap-3">
                <div>
                  <label className={LABEL_CLS}>Matricule ou e-mail</label>
                  <input
                    className={INPUT_CLS}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="0525247O"
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showLoginPwd ? "text" : "password"}
                      className={INPUT_CLS + " pr-12"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors text-lg leading-none"
                      tabIndex={-1}
                    >
                      {showLoginPwd ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>
                <Button
                  variant="nuit"
                  onClick={handleLogin}
                  disabled={loading || !identifier || !loginPassword}
                >
                  {loading ? "…" : "Se connecter →"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <p className="text-[10px] font-bold tracking-widest uppercase opacity-70 mt-2 text-center">
          Communauté Mahatma Gandhi · Région d&apos;Abidjan
        </p>
      </div>

      <style>{`
        @keyframes form-fade {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

const LABEL_CLS = "block text-xs font-semibold mb-1.5 opacity-95";
const INPUT_CLS =
  "w-full px-4 py-3 rounded-xl border border-white/40 bg-white/15 text-white placeholder-white/55 outline-none";
