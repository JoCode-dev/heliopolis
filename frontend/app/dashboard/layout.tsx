import { PushNotificationManager } from '@/components/pwa/push-notification-manager';
import { InstallAppBanner } from '@/components/pwa/install-app-banner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PushNotificationManager />
      {children}
      <InstallAppBanner />
    </>
  );
}
