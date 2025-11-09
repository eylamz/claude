'use client';

import { ShoppingCart } from 'lucide-react';
import { useCartStore, useCartItemCount } from '@/stores/cartStore';

export default function CartButton() {
  const itemCount = useCartItemCount();
  const { toggleCart } = useCartStore();

  return (
    <button
      onClick={toggleCart}
      className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
      aria-label={`Shopping cart with ${itemCount} items`}
    >
      <ShoppingCart className="w-6 h-6 text-gray-700" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-in zoom-in-50">
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      )}
    </button>
  );
}




