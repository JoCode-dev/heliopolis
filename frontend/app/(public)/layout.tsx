import { SmartBottomNav } from '@/components/layout/SmartBottomNav';
import { PublicTopNav } from '@/components/layout/PublicTopNav';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <PublicTopNav />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      <div className="lg:hidden flex-shrink-0">
        <SmartBottomNav />
      </div>
    </div>
  );
}
