import { create } from 'zustand';
import type { Toast } from '@/types';
import { generateId } from '@/lib/utils';

interface UIState {
  sidebarCollapsed: boolean;
  toasts: Toast[];
  
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  toasts: [],

  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  
  setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),

  addToast: (toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    const newToast = { ...toast, id, duration: toast.duration || 3000 };
    set(s => ({ toasts: [...s.toasts.slice(-4), newToast] }));
    
    setTimeout(() => {
      get().removeToast(id);
    }, newToast.duration);
  },

  removeToast: (id: string) => {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
  },
}));
