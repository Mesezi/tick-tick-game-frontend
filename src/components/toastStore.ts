import { create } from 'zustand';
import type { GameToastVariant } from './GameToast';

interface ToastAction {
  label: string;
  onAction: () => void;
}

interface ToastState {
  message: string;
  variant: GameToastVariant;
  visible: boolean;
  _id: number; // bump to reset auto-dismiss timer on rapid calls
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastStore extends ToastState {
  show: (message: string, variant?: GameToastVariant, action?: ToastAction) => void;
  dismiss: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  message: '',
  variant: 'info',
  visible: false,
  _id: 0,
  actionLabel: undefined,
  onAction: undefined,

  show: (message, variant = 'info', action) =>
    set((s) => ({
      message,
      variant,
      visible: true,
      _id: s._id + 1,
      actionLabel: action?.label,
      onAction: action?.onAction,
    })),

  dismiss: () => set({ visible: false, actionLabel: undefined, onAction: undefined }),
}));

/**
 * Call this anywhere — no React context needed.
 * showToast('Room code copied!', 'join')
 */
export function showToast(
  message: string,
  variant: GameToastVariant = 'info',
  action?: ToastAction,
): void {
  useToastStore.getState().show(message, variant, action);
}
