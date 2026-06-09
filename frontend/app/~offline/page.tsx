import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
      <div className="text-5xl mb-4">📡</div>
      <h1 className="text-xl font-bold text-[#1F1B2E] mb-2">Vous êtes hors ligne</h1>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Le Codex des Gardiens nécessite une connexion internet pour afficher vos données.
        Reconnectez-vous pour continuer.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-xl bg-[#C62828] px-5 py-2.5 text-sm font-semibold text-white"
      >
        Réessayer
      </Link>
    </div>
  );
}
