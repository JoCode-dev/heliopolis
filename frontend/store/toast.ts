'use client';
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  show: (type: ToastType, message: string) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: (type, message) => {
    set((s) => {
      if (s.toasts.some((t) => t.message === message)) return s;
      if (s.toasts.length >= 3) return s;
      const id = Math.random().toString(36).slice(2);
      setTimeout(() => {
        set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) }));
      }, 3500);
      return { toasts: [...s.toasts, { id, type, message }] };
    });
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (msg: string) => useToastStore.getState().show('success', msg),
  error:   (msg: string) => useToastStore.getState().show('error', msg),
  info:    (msg: string) => useToastStore.getState().show('info', msg),
};
