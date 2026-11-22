'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Sepet istemci tarafında tutulur (yalnızca teklif kimliği + miktar).
 * Fiyatlar her zaman sunucudan taze hesaplanır; sepet fiyat saklamaz.
 */
export type CartMode = 'wave' | 'direct';

interface CartState {
  lines: Record<string, number>;
  mode: CartMode;
  add: (offerId: string, qty?: number) => void;
  setQty: (offerId: string, qty: number) => void;
  remove: (offerId: string) => void;
  clear: () => void;
  setMode: (m: CartMode) => void;
}

const safeStorage = createJSONStorage(() => {
  try {
    const k = '__havuz_probe';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    const mem = new Map<string, string>();
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
  }
});

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: {},
      mode: 'wave',
      add: (offerId, qty = 1) => set((s) => ({ lines: { ...s.lines, [offerId]: Math.min(10_000, (s.lines[offerId] ?? 0) + qty) } })),
      setQty: (offerId, qty) =>
        set((s) => {
          const lines = { ...s.lines };
          if (qty <= 0) delete lines[offerId];
          else lines[offerId] = Math.min(10_000, Math.floor(qty));
          return { lines };
        }),
      remove: (offerId) =>
        set((s) => {
          const lines = { ...s.lines };
          delete lines[offerId];
          return { lines };
        }),
      clear: () => set({ lines: {} }),
      setMode: (mode) => set({ mode }),
    }),
    { name: 'havuz-cart', storage: safeStorage, version: 1 },
  ),
);

export const useCartCount = () => useCart((s) => Object.keys(s.lines).length);
