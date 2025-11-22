'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/stores/cartStore';
import CartDrawer from '@/components/cart/CartDrawer';

interface CartProviderProps {
  children?: React.ReactNode;
}

/**
 * CartProvider - Handles cart initialization and provides CartDrawer
 * 
 * Add this to your root layout to enable cart functionality across your app
 */
export default function CartProvider({ children }: CartProviderProps) {
  const { syncWithServer } = useCartStore();

  // Sync with server on mount (if user is logged in)
  useEffect(() => {
    syncWithServer();
  }, [syncWithServer]);

  return (
    <>
      {children}
      <CartDrawer />
    </>
  );
}











