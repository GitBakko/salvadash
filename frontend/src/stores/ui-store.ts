import { create } from 'zustand';

interface UIState {
  // Modal management
  activeModal: string | null;
  modalData: unknown;
  openModal: (id: string, data?: unknown) => void;
  closeModal: () => void;

  // Bottom sheet
  activeSheet: string | null;
  sheetData: unknown;
  openSheet: (id: string, data?: unknown) => void;
  closeSheet: () => void;

  // Toast queue
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // PWA install
  deferredPrompt: BeforeInstallPromptEvent | null;
  showInstallBanner: boolean;
  setDeferredPrompt: (e: BeforeInstallPromptEvent | null) => void;
  dismissInstallBanner: () => void;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  modalData: null,
  openModal: (id, data) => set({ activeModal: id, modalData: data ?? null }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  activeSheet: null,
  sheetData: null,
  openSheet: (id, data) => set({ activeSheet: id, sheetData: data ?? null }),
  closeSheet: () => set({ activeSheet: null, sheetData: null }),

  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: `toast-${++toastCounter}` }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  deferredPrompt: null,
  showInstallBanner: false,
  setDeferredPrompt: (e) => set({ deferredPrompt: e, showInstallBanner: !!e }),
  dismissInstallBanner: () => set({ showInstallBanner: false }),
}));
