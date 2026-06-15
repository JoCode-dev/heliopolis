'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore, useAuthHydrated } from '@/store/auth';
import { notificationsApi } from '@/lib/api';
import { deferEffect } from '@/lib/effects';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getVapidPublicKey(): Promise<string | null> {
  const fromEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (fromEnv) return fromEnv;
  try {
    const { data } = await notificationsApi.getVapidPublicKey();
    return data.publicKey ?? null;
  } catch {
    return null;
  }
}

async function unsubscribePush() {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  try {
    await notificationsApi.unsubscribe(endpoint);
  } catch {
    /* ignore */
  }
  await subscription.unsubscribe();
}

async function subscribePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (Notification.permission === 'denied') return;

  const publicKey = await getVapidPublicKey();
  if (!publicKey) return;

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

  await notificationsApi.subscribe({
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    userAgent: navigator.userAgent,
  });
}

export function PushNotificationManager() {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((s) => s.user);
  const prevUserId = useRef<string | null>(null);

  useEffect(() => deferEffect(() => {
    if (!hydrated) return;

    const sync = async () => {
      if (!user) {
        if (prevUserId.current) {
          await unsubscribePush();
          prevUserId.current = null;
        }
        return;
      }

      prevUserId.current = user.id;

      if (user.notifPush === false) {
        await unsubscribePush();
        return;
      }

      try {
        await subscribePush();
      } catch {
        /* permission denied or unsupported */
      }
    };

    void sync();
  }), [hydrated, user?.id, user?.notifPush]);

  return null;
}
