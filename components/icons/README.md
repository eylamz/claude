# Icon Component

A flexible icon component that allows you to use your own SVG files instead of lucide-react.

## Usage

### Basic Usage

```tsx
import { Icon } from '@/components/icons';

// Simple usage
<Icon name="search" className="w-4 h-4 text-gray-500" />

// With size prop
<Icon name="cart" size={24} />

// With custom styling
<Icon name="heart" className="w-6 h-6 text-red-500 hover:text-red-700" />
```

### Adding New Icons

1. Add your SVG file to the `/components/icons` directory
2. Name the file using kebab-case or camelCase (e.g., `my-icon.svg` or `myIcon.svg`)
3. Add the icon name to the `IconName` type in `Icon.tsx`:

```tsx
export type IconName =
  | 'search'
  | 'cart'
  | 'my-icon'  // Add your new icon name here
  | // ... other icons
```

### Icon Naming

- Use kebab-case: `my-icon.svg` → name: `'my-icon'`
- Use camelCase: `myIcon.svg` → name: `'myIcon'`
- Icon names are case-sensitive

### Props

| Prop | Type | Description | Default |
|------|------|-------------|---------|
| `name` | `IconName` | The name of the icon (without `.svg` extension) | Required |
| `className` | `string` | CSS classes for styling (size, color, etc.) | `undefined` |
| `size` | `number \| string` | Icon size (width and height) | `undefined` |
| `...props` | `React.HTMLAttributes` | Any other HTML span attributes | - |

### Examples

```tsx
// Replace lucide-react icons
// Before:
import { Search } from 'lucide-react';
<Search className="w-4 h-4" />

// After:
import { Icon } from '@/components/icons';
<Icon name="search" className="w-4 h-4" />

// Multiple icons
<Icon name="menu" className="w-6 h-6" />
<Icon name="close" className="w-5 h-5 text-gray-600" />
<Icon name="cart" size={24} />
```

### SVG File Requirements

- SVG files should use `currentColor` for colors to allow CSS styling
- Ensure your SVG has a `viewBox` attribute
- The component automatically handles width/height attributes

### Migration from lucide-react

To migrate from lucide-react:

1. Replace imports:
   ```tsx
   // Old
   import { Search, Cart, Heart } from 'lucide-react';
   
   // New
   import { Icon } from '@/components/icons';
   ```

2. Update JSX:
   ```tsx
   // Old
   <Search className="w-4 h-4" />
   <Cart size={24} />
   
   // New
   <Icon name="search" className="w-4 h-4" />
   <Icon name="cart" size={24} />
   ```

### Error Handling

If an icon is not found, the component will:
- Display a placeholder icon with a warning symbol
- Log a warning to the console
- Continue to render without breaking the UI

## Technical Details

- Icons are loaded via an API route (`/api/icons/[name]`)
- SVGs are cached for optimal performance
- The component handles loading states automatically
- Supports all standard SVG attributes through className




