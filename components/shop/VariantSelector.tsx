'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

interface Variant {
  id: string;
  color: string;
  colorHex: string;
  size: string;
  price?: number;
  stock: number;
  sku: string;
}

interface VariantSelectorProps {
  variants: Variant[];
  onVariantChange: (variant: Variant | null, color: string | null, size: string | null) => void;
  selectedColor: string | null;
  selectedSize: string | null;
}

export default function VariantSelector({
  variants,
  onVariantChange,
  selectedColor,
  selectedSize
}: VariantSelectorProps) {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  // Get unique colors from variants
  const colors = Array.from(
    new Map(
      variants.map(v => [v.color, { name: v.color, hex: v.colorHex }])
    ).values()
  );

  // Get available sizes for selected color
  const getAvailableSizes = (color: string | null) => {
    if (!color) {
      // If no color selected, show all unique sizes
      return Array.from(new Set(variants.map(v => v.size))).sort((a, b) => {
        // Sort sizes: XS, S, M, L, XL, XXL, or numerically
        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
        const aIndex = sizeOrder.indexOf(a.toUpperCase());
        const bIndex = sizeOrder.indexOf(b.toUpperCase());
        
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        
        // Try numeric sort
        const aNum = parseFloat(a);
        const bNum = parseFloat(b);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        
        // Fallback to alphabetical
        return a.localeCompare(b);
      });
    }
    
    const colorVariants = variants.filter(v => v.color === color);
    return Array.from(new Set(colorVariants.map(v => v.size))).sort((a, b) => {
      const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
      const aIndex = sizeOrder.indexOf(a.toUpperCase());
      const bIndex = sizeOrder.indexOf(b.toUpperCase());
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      const aNum = parseFloat(a);
      const bNum = parseFloat(b);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      
      return a.localeCompare(b);
    });
  };

  // Check if a color has any stock
  const isColorAvailable = (color: string) => {
    return variants.some(v => v.color === color && v.stock > 0);
  };

  // Check if a size is available for selected color
  const isSizeAvailable = (size: string, color: string | null) => {
    if (!color) return false;
    const variant = variants.find(v => v.color === color && v.size === size);
    return variant ? variant.stock > 0 : false;
  };

  // Get stock count for a specific size and color
  const getStockCount = (size: string, color: string | null) => {
    if (!color) return 0;
    const variant = variants.find(v => v.color === color && v.size === size);
    return variant?.stock || 0;
  };

  // Get current variant based on selections
  const getCurrentVariant = (color: string | null, size: string | null) => {
    if (!color || !size) return null;
    return variants.find(v => v.color === color && v.size === size) || null;
  };

  // Handle color selection
  const handleColorSelect = (color: string) => {
    if (!isColorAvailable(color)) return;
    
    // Reset size selection when color changes
    const availableSizes = getAvailableSizes(color);
    const newSize = availableSizes.length === 1 && isSizeAvailable(availableSizes[0], color)
      ? availableSizes[0]
      : null;
    
    const variant = getCurrentVariant(color, newSize);
    onVariantChange(variant, color, newSize);
  };

  // Handle size selection
  const handleSizeSelect = (size: string) => {
    if (!selectedColor || !isSizeAvailable(size, selectedColor)) return;
    
    const variant = getCurrentVariant(selectedColor, size);
    onVariantChange(variant, selectedColor, size);
  };

  // Auto-select if only one color or size available
  useEffect(() => {
    if (colors.length === 1 && !selectedColor) {
      const color = colors[0].name;
      if (isColorAvailable(color)) {
        handleColorSelect(color);
      }
    }
  }, [variants]);

  if (!variants || variants.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No variants available
      </div>
    );
  }

  const availableSizes = getAvailableSizes(selectedColor);
  const currentVariant = getCurrentVariant(selectedColor, selectedSize);

  return (
    <div className="space-y-6">
      {/* Color Selector */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-900">
            Color
            {selectedColor && (
              <span className="ml-2 text-gray-600 font-normal">
                {hoveredColor || selectedColor}
              </span>
            )}
          </label>
          {selectedColor && !isColorAvailable(selectedColor) && (
            <span className="text-xs text-red-600">Out of stock</span>
          )}
        </div>
        
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => {
            const isAvailable = isColorAvailable(color.name);
            const isSelected = selectedColor === color.name;
            
            return (
              <button
                key={color.name}
                onClick={() => handleColorSelect(color.name)}
                onMouseEnter={() => setHoveredColor(color.name)}
                onMouseLeave={() => setHoveredColor(null)}
                disabled={!isAvailable}
                className={`relative group ${
                  !isAvailable ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
                aria-label={`Select ${color.name} color${!isAvailable ? ' (out of stock)' : ''}`}
                aria-pressed={isSelected}
                aria-disabled={!isAvailable}
              >
                <div
                  className={`w-12 h-12 rounded-full transition-all ${
                    isSelected
                      ? 'ring-2 ring-offset-2 ring-blue-500'
                      : 'ring-1 ring-gray-300'
                  } ${
                    !isAvailable
                      ? 'opacity-30'
                      : 'hover:ring-2 hover:ring-gray-400'
                  }`}
                  style={{ backgroundColor: color.hex }}
                >
                  {/* Check mark for selected color */}
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white rounded-full p-0.5">
                        <Check className="w-5 h-5 text-gray-900" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                  
                  {/* Diagonal line for out of stock */}
                  {!isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-red-500 rotate-45" />
                    </div>
                  )}
                </div>
                
                {/* Tooltip on hover */}
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
                  !isAvailable ? 'hidden' : ''
                }`}>
                  {color.name}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Size Selector */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-900">
            Size
            {selectedSize && (
              <span className="ml-2 text-gray-600 font-normal">
                {selectedSize}
              </span>
            )}
          </label>
          {selectedColor && selectedSize && (
            <span className="text-xs text-gray-600">
              {getStockCount(selectedSize, selectedColor)} in stock
            </span>
          )}
        </div>
        
        {!selectedColor ? (
          <p className="text-sm text-gray-500">Please select a color first</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((size) => {
              const isAvailable = isSizeAvailable(size, selectedColor);
              const isSelected = selectedSize === size;
              const stock = getStockCount(size, selectedColor);
              const isLowStock = stock > 0 && stock <= 5;
              
              return (
                <button
                  key={size}
                  onClick={() => handleSizeSelect(size)}
                  disabled={!isAvailable}
                  className={`relative min-w-[4rem] px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    isSelected
                      ? 'bg-gray-900 text-white ring-2 ring-gray-900 ring-offset-2'
                      : isAvailable
                      ? 'bg-white text-gray-900 ring-1 ring-gray-300 hover:ring-gray-400 hover:bg-gray-50'
                      : 'bg-gray-100 text-gray-400 ring-1 ring-gray-200 cursor-not-allowed'
                  }`}
                  aria-label={`Select size ${size}${!isAvailable ? ' (out of stock)' : ''}`}
                  aria-pressed={isSelected}
                  aria-disabled={!isAvailable}
                >
                  {size}
                  
                  {/* Out of stock indicator */}
                  {!isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-gray-300 rotate-[-20deg]" />
                    </div>
                  )}
                  
                  {/* Low stock indicator */}
                  {isAvailable && isLowStock && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Variant Information */}
      {currentVariant && (
        <div className="pt-4 border-t border-gray-200 space-y-2">
          {/* SKU */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">SKU:</span>
            <span className="font-mono text-gray-900">{currentVariant.sku}</span>
          </div>
          
          {/* Stock Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Availability:</span>
            <span className={`font-medium ${
              currentVariant.stock > 10
                ? 'text-green-600'
                : currentVariant.stock > 0
                ? 'text-orange-600'
                : 'text-red-600'
            }`}>
              {currentVariant.stock > 10
                ? 'In Stock'
                : currentVariant.stock > 0
                ? `Only ${currentVariant.stock} left`
                : 'Out of Stock'}
            </span>
          </div>
          
          {/* Variant Price (if different) */}
          {currentVariant.price !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Price for this variant:</span>
              <span className="font-semibold text-gray-900">
                ${currentVariant.price.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Selection prompt */}
      {!currentVariant && selectedColor && (
        <div className="text-sm text-gray-500 text-center py-2 bg-gray-50 rounded-lg">
          {availableSizes.length > 0
            ? 'Please select a size'
            : 'No sizes available for this color'}
        </div>
      )}
      
      {!selectedColor && (
        <div className="text-sm text-gray-500 text-center py-2 bg-gray-50 rounded-lg">
          Please select a color to continue
        </div>
      )}
    </div>
  );
}




