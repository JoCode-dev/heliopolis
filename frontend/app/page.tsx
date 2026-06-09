import { HeroSection } from '@/components/landing/HeroSection';
import { SmartBottomNav } from '@/components/layout/SmartBottomNav';

export default function AccueilPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <main className="flex-1 relative">
        <HeroSection />
      </main>
      <div className="lg:hidden flex-shrink-0">
        <SmartBottomNav />
      </div>
    </div>
  );
}
