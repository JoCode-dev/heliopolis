import { PushNotificationManager } from '@/components/pwa/push-notification-manager';
import { InstallAppBanner } from '@/components/pwa/install-app-banner';
import { ToastContainer } from '@/components/ui/ToastContainer';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PushNotificationManager />
      {children}
      <InstallAppBanner />
      <ToastContainer />
    </>
  );
}
