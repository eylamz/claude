/**
 * Example usage of the Icon component
 * This file demonstrates how to use the Icon component with your custom SVG files
 */

import { Icon } from './Icon';

export function IconExamples() {
  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Icon Component Examples</h2>
      
      {/* Basic usage */}
      <div className="flex items-center gap-2">
        <Icon name="search" className="w-4 h-4 text-gray-500" />
        <span>Search icon with Tailwind classes</span>
      </div>

      {/* With size prop */}
      <div className="flex items-center gap-2">
        <Icon name="cart" size={24} />
        <span>Cart icon with size prop</span>
      </div>

      {/* Multiple sizes */}
      <div className="flex items-center gap-4">
        <Icon name="heart" size={16} className="text-red-500" />
        <Icon name="heart" size={24} className="text-red-500" />
        <Icon name="heart" size={32} className="text-red-500" />
        <span>Heart icons in different sizes</span>
      </div>

      {/* With custom styling */}
      <div className="flex items-center gap-2">
        <Icon 
          name="star" 
          className="w-6 h-6 text-yellow-500 hover:text-yellow-600 transition-colors cursor-pointer" 
        />
        <span>Star icon with hover effect</span>
      </div>

      {/* Icons with different colors */}
      <div className="flex items-center gap-4">
        <Icon name="location" className="w-5 h-5 text-blue-500" />
        <Icon name="map" className="w-5 h-5 text-green-500" />
        <Icon name="filter" className="w-5 h-5 text-purple-500" />
        <span>Icons with different colors</span>
      </div>
    </div>
  );
}

/**
 * Example: Replacing lucide-react icons
 * 
 * Before:
 * ```tsx
 * import { Search, Cart, Heart } from 'lucide-react';
 * 
 * <Search className="w-4 h-4" />
 * <Cart size={24} />
 * <Heart className="w-6 h-6 text-red-500" />
 * ```
 * 
 * After:
 * ```tsx
 * import { Icon } from '@/components/icons';
 * 
 * <Icon name="search" className="w-4 h-4" />
 * <Icon name="cart" size={24} />
 * <Icon name="heart" className="w-6 h-6 text-red-500" />
 * ```
 */








