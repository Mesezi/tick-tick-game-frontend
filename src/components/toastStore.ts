import { create } from 'zustand';
import type { GameToastVariant } from './GameToast';

interface ToastState {
  message: string;
  variant: GameToastVariant;
  visible: boolean;
  _id: number; // bump to reset auto-dismiss timer on rapid calls
}

interface ToastStore extends ToastState {
  show: (message: string, variant?: GameToastVariant) => void;
  dismiss: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  message: '',
  variant: 'info',
  visible: false,
  _id: 0,

  show: (message, variant = 'info') =>
    set((s) => ({ message, variant, visible: true, _id: s._id + 1 })),

  dismiss: () => set({ visible: false }),
}));

/**
 * Call this anywhere — no React context needed.
 * showToast('Room code copied!', 'join')
 */
export function showToast(message: string, variant: GameToastVariant = 'info'): void {
  useToastStore.getState().show(message, variant);
}
