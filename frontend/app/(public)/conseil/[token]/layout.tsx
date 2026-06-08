import { generateMetadata as genMeta } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'Inscription au conseil',
  description: 'Inscrivez-vous au conseil de communauté via le QR code.',
  path: '/conseil',
  noIndex: true,
});

export default function ConseilLayout({ children }: { children: React.ReactNode }) {
  return children;
}
