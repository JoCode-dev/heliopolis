import { PushNotificationManager } from '@/components/pwa/push-notification-manager';
import { InstallAppBanner } from '@/components/pwa/install-app-banner';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <PushNotificationManager />
      {children}
      <InstallAppBanner />
      <ToastContainer />
    </ErrorBoundary>
  );
}
