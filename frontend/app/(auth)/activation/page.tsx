'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GardiensBlazon } from '@/components/layout/GardiensBlazon';
import { Button } from '@/components/ui';
import { authApi } from '@/lib/api';
import { getHomeForRole } from '@/lib/roles';
import { useAuthStore } from '@/store/auth';

type Step =
  | 'matricule'      // Étape 1 : saisie du matricule
  | 'inscription'    // Étape 2a : compléter le profil (nouveau membre)
  | 'login';         // Étape 2b : connexion (profil déjà renseigné)

export default function ActivationPage() {
  const router = useRouter();
  const { user, setTokens, setUser } = useAuthStore();

  const [step, setStep]             = useState<Step>('matricule');
  const [matricule, setMatricule]   = useState('');
  const [userId, setUserId]         = useState('');

  // Champs inscription
  const [nom, setNom]               = useState('');
  const [prenoms, setPrenoms]       = useState('');
  const [email, setEmail]           = useState('');
  const [telephone, setTelephone]   = useState('');

  // Champs connexion
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading]       = useState(false);
  const [message, setMessage]       = useState('');
  const [error, setError]           = useState('');

  useEffect(() => {
    if (user) router.replace(getHomeForRole(user.role));
  }, [router, user]);

  /* ── Étape 1 : vérifier le matricule ── */
  const handleVerifier = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.verifierMatricule(matricule);
      setUserId(data.userId);
      if (data.hasProfile) {
        // Profil déjà renseigné → connexion
        setMessage('Matricule trouvé ! Connectez-vous avec votre mot de passe.');
        setIdentifier(matricule);
        setStep('login');
      } else {
        // Nouveau membre → inscription
        setMessage('Matricule trouvé ! Complétez votre profil pour rejoindre la communauté.');
        setStep('inscription');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Matricule introuvable dans la base nationale');
    } finally {
      setLoading(false);
    }
  };

  /* ── Étape 2a : auto-inscription ── */
  const handleInscrire = async () => {
    if (!nom.trim() || !prenoms.trim()) {
      setError('Nom et prénom(s) sont obligatoires.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.inscrire({
        matricule,
        nom: nom.trim(),
        prenoms: prenoms.trim(),
        ...(email.trim() && { email: email.trim() }),
        ...(telephone.trim() && { telephone: telephone.trim() }),
        password,
      });
      setTokens(data.accessToken, data.refreshToken);
      const { data: me } = await authApi.me();
      setUser(me);
      router.push(getHomeForRole(me.role));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Une erreur est survenue lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  /* ── Étape 2b : connexion ── */
  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.login(identifier, password);
      setTokens(data.accessToken, data.refreshToken);
      const { data: me } = await authApi.me();
      setUser(me);
      router.push(getHomeForRole(me.role));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep('matricule');
    setMessage('');
    setError('');
    setPassword('');
    setNom('');
    setPrenoms('');
    setEmail('');
    setTelephone('');
    setUserId('');
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-white relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg,#FFB36B 0%,#F58A4B 35%,#E55A35 65%,#7A2820 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 75% 25%, rgba(255,240,200,.4),transparent 40%), radial-gradient(circle at 20% 90%, rgba(31,27,46,.4),transparent 50%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-5">
        <div className="rounded-full overflow-hidden shadow-2xl ring-4 ring-white/30 bg-white/10 backdrop-blur-sm">
          <GardiensBlazon size={180} className="rounded-full" />
        </div>
        <p
          className="text-xs opacity-90 italic text-center"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,.3)' }}
        >
          « Le camp est fini. La Route continue. »
        </p>

        {message && (
          <div className="w-full bg-white/20 rounded-xl px-4 py-3 text-sm text-center">
            {message}
          </div>
        )}
        {error && (
          <div className="w-full bg-red-900/40 rounded-xl px-4 py-3 text-sm text-center">
            {error}
          </div>
        )}

        {/* ── Étape 1 : matricule ── */}
        {step === 'matricule' && (
          <div className="w-full flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5 opacity-95">
                Matricule national
              </label>
              <input
                className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/15 text-white placeholder-white/55 text-lg font-bold tracking-widest text-center backdrop-blur outline-none"
                placeholder="0525247O"
                maxLength={8}
                value={matricule}
                onChange={(e) => setMatricule(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && matricule.length === 8 && handleVerifier()}
              />
              <p className="text-[11px] opacity-80 mt-1.5">
                7 chiffres + 1 lettre · délivré par la Nation
              </p>
            </div>
            <Button
              variant="nuit"
              onClick={handleVerifier}
              disabled={loading || matricule.length < 8}
            >
              {loading ? '…' : 'Vérifier mon matricule →'}
            </Button>
            <Button
              variant="ghost"
              className="bg-transparent text-black border-white/50 hover:bg-white/10"
              onClick={() => { setStep('login'); setMessage(''); setError(''); }}
            >
              Se connecter directement
            </Button>
          </div>
        )}

        {/* ── Étape 2a : inscription ── */}
        {step === 'inscription' && (
          <div className="w-full flex flex-col gap-3">
            <p className="text-center text-xs font-bold opacity-80 uppercase tracking-widest">
              Compléter mon profil
            </p>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-semibold mb-1.5 opacity-95">Nom *</label>
                <input
                  className={INPUT_CLS}
                  placeholder="KOUASSI"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold mb-1.5 opacity-95">Prénom(s) *</label>
                <input
                  className={INPUT_CLS}
                  placeholder="Jean"
                  value={prenoms}
                  onChange={(e) => setPrenoms(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 opacity-95">Email (optionnel)</label>
              <input
                className={INPUT_CLS}
                type="email"
                placeholder="jean@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 opacity-95">Téléphone (optionnel)</label>
              <input
                className={INPUT_CLS}
                placeholder="+225 07 00 00 00"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 opacity-95">Mot de passe *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={INPUT_CLS + ' pr-12'}
                  placeholder="8 caractères minimum"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors text-lg leading-none"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <Button
              variant="nuit"
              onClick={handleInscrire}
              disabled={loading || !nom.trim() || !prenoms.trim() || password.length < 8}
            >
              {loading ? '…' : 'Rejoindre la communauté →'}
            </Button>
            <button
              onClick={goBack}
              className="text-xs text-white/70 hover:text-white underline text-center transition-colors"
            >
              ‹ Changer de matricule
            </button>
          </div>
        )}

        {/* ── Étape 2b : connexion ── */}
        {step === 'login' && (
          <div className="w-full flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5">
                Matricule ou e-mail
              </label>
              <input
                className={INPUT_CLS}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="0525247O"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={INPUT_CLS + ' pr-12'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors text-lg leading-none"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <Button
              variant="nuit"
              onClick={handleLogin}
              disabled={loading || !identifier || !password}
            >
              {loading ? '…' : 'Se connecter →'}
            </Button>
            <button
              onClick={goBack}
              className="text-xs text-white/70 hover:text-white underline text-center transition-colors"
            >
              ‹ Vérifier un matricule
            </button>
          </div>
        )}

        {/* ── Séparateur ── */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-white/30" />
          <span className="text-[11px] opacity-70 uppercase tracking-widest">ou</span>
          <div className="flex-1 h-px bg-white/30" />
        </div>

        <Button
          variant="ghost"
          full
          className="bg-white/18 text-white border-white/35 backdrop-blur hover:bg-white/25"
          onClick={() => router.push('/')}
        >
          🔍 Continuer sans compte
        </Button>
        <p className="text-[10px] opacity-70 text-center">
          Découvre l&apos;imaginaire, les camps et le Mur du Codex
        </p>

        <p className="text-[10px] font-bold tracking-widest uppercase opacity-85 mt-2 text-center">
          Communauté Mahatma Gandhi · Région d&apos;Abidjan
        </p>
      </div>
    </div>
  );
}

const INPUT_CLS =
  'w-full px-4 py-3 rounded-xl border border-white/40 bg-white/15 text-white placeholder-white/55 outline-none';
