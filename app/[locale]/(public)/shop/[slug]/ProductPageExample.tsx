'use client';

import { useState } from 'react';
import { ShoppingCart, Heart, Share2, Truck, Shield, RefreshCw } from 'lucide-react';
import ProductGallery from '@/components/shop/ProductGallery';
import VariantSelector from '@/components/shop/VariantSelector';
import { useCartStore } from '@/stores/cartStore';
import { formatCurrency, calculateDiscountPercentage } from '@/lib/cart-utils';

// Example product type
interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: Array<{ id: string; url: string; alt?: string }>;
  variants: Array<{
    id: string;
    color: string;
    colorHex: string;
    size: string;
    price?: number;
    stock: number;
    sku: string;
  }>;
  category: string;
  brand: string;
}

interface ProductPageExampleProps {
  product: Product;
}

export default function ProductPageExample({ product }: ProductPageExampleProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  const { addItem, openCart, error, setError } = useCartStore();

  const currentPrice = selectedVariant?.price || product.price;
  const currentDiscountPrice = product.discountPrice;
  const hasDiscount = !!currentDiscountPrice;
  const discountPercentage = hasDiscount
    ? calculateDiscountPercentage(currentPrice, currentDiscountPrice!)
    : 0;

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      setError('Please select color and size');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsAddingToCart(true);

    const success = await addItem(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: currentPrice,
        discountPrice: currentDiscountPrice,
        imageUrl: product.images[0]?.url || '/placeholder.jpg',
      },
      {
        id: selectedVariant.id,
        sku: selectedVariant.sku,
        color: selectedVariant.color,
        size: selectedVariant.size,
        stock: selectedVariant.stock,
        price: selectedVariant.price,
      },
      quantity
    );

    setIsAddingToCart(false);

    if (success) {
      openCart();
    }
  };

  const handleVariantChange = (variant: any, color: string | null, size: string | null) => {
    setSelectedVariant(variant);
    setSelectedColor(color);
    setSelectedSize(size);
    setError(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column - Gallery */}
        <div>
          <ProductGallery images={product.images} productName={product.name} />
        </div>

        {/* Right Column - Product Details */}
        <div className="space-y-6">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500">
            <a href="/shop" className="hover:text-gray-700">Shop</a>
            <span className="mx-2">/</span>
            <a href={`/shop?category=${product.category}`} className="hover:text-gray-700">
              {product.category}
            </a>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{product.name}</span>
          </nav>

          {/* Brand */}
          {product.brand && (
            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
              {product.brand}
            </div>
          )}

          {/* Product Name */}
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
            {product.name}
          </h1>

          {/* Price */}
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">
              {formatCurrency(currentDiscountPrice || currentPrice)}
            </span>
            {hasDiscount && (
              <>
                <span className="text-xl text-gray-500 line-through">
                  {formatCurrency(currentPrice)}
                </span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-sm font-semibold">
                  Save {discountPercentage}%
                </span>
              </>
            )}
          </div>

          {/* Description */}
          <p className="text-gray-700 leading-relaxed">
            {product.description}
          </p>

          {/* Variant Selector */}
          <div className="pt-6 border-t border-gray-200">
            <VariantSelector
              variants={product.variants}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
              onVariantChange={handleVariantChange}
            />
          </div>

          {/* Quantity Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                -
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-4 py-2 border border-gray-300 rounded-lg text-center"
                min="1"
                max={selectedVariant?.stock || 99}
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                disabled={!selectedVariant || quantity >= selectedVariant.stock}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <button
              onClick={handleAddToCart}
              disabled={isAddingToCart || !selectedVariant}
              className="w-full bg-gray-900 text-white py-4 px-6 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isAddingToCart ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button className="py-3 px-4 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <Heart className="w-5 h-5" />
                Wishlist
              </button>
              <button className="py-3 px-4 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <Share2 className="w-5 h-5" />
                Share
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="pt-6 space-y-3 border-t border-gray-200">
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <Truck className="w-5 h-5 text-gray-400" />
              <span>Free shipping on orders over $50</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <RefreshCw className="w-5 h-5 text-gray-400" />
              <span>Free returns within 30 days</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <Shield className="w-5 h-5 text-gray-400" />
              <span>1-year warranty included</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}











