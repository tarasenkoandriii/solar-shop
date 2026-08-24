'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { clientApi, getOrCreateSessionId } from './client-api';
import type { Cart } from './api';

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateItem: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const sessionId = getOrCreateSessionId();
      const data = await clientApi<Cart>(`/cart?sessionId=${sessionId}`);
      setCart(data);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (productId: string, quantity = 1) => {
      const sessionId = getOrCreateSessionId();
      const data = await clientApi<Cart>('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity, sessionId }),
      });
      setCart(data);
    },
    [],
  );

  const updateItem = useCallback(async (cartItemId: string, quantity: number) => {
    const data = await clientApi<Cart>(`/cart/items/${cartItemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
    setCart(data);
  }, []);

  const removeItem = useCallback(async (cartItemId: string) => {
    const data = await clientApi<Cart>(`/cart/items/${cartItemId}`, { method: 'DELETE' });
    setCart(data);
  }, []);

  const itemCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  return (
    <CartContext.Provider value={{ cart, loading, itemCount, addItem, updateItem, removeItem, refresh }}>
      {children}
    </CartContext.Provider>
  );
}
