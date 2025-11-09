# Luxury Minimalist Design System

## Overview

This Next.js application uses a luxury minimalist design system with custom Tailwind CSS configuration, internationalization (i18n), and dark mode support.

## Color Palette

### Primary Colors
- **Black**: `#000000`
- **White**: `#FFFFFF`

### Gray Scale
- **50**: `#F9FAFB` - Almost white, subtle backgrounds
- **100**: `#F3F4F6` - Very light gray
- **200**: `#E5E7EB` - Light gray
- **300**: `#D1D5DB` - Medium light gray
- **400**: `#9CA3AF` - Medium gray
- **500**: `#6B7280` - Base gray
- **600**: `#4B5563` - Dark gray
- **700**: `#374151` - Very dark gray
- **800**: `#1F2937` - Almost black
- **900**: `#111827` - Deep black

## Typography

### Font Families
- **English (SF Pro Display)**: Sans-serif font optimized for English text
- **Hebrew (Heebo)**: Sans-serif font optimized for Hebrew text

### Usage
```tsx
// For English content
<div className="font-sans">English Text</div>

// For Hebrew content
<div className="font-hebrew" dir="rtl" lang="he">
  טקסט בעברית
</div>
```

## Responsive Breakpoints

- **xs**: `475px` - Extra small devices
- **sm**: `640px` - Small devices (phones)
- **md**: `768px` - Medium devices (tablets)
- **lg**: `1024px` - Large devices (desktops)
- **xl**: `1280px` - Extra large devices
- **2xl**: `1440px` - 2X large devices
- **3xl**: `1920px` - 3X large devices (large desktops)

### Usage
```tsx
<div className="text-base md:text-lg lg:text-xl">
  Responsive text
</div>
```

## Custom Animations

### Available Animations

1. **slide-up**: Content slides up from bottom
   - Duration: 0.6s
   - Easing: ease-out

2. **slide-up-delay**: Same as slide-up with 0.2s delay
   - Duration: 0.6s
   - Delay: 0.2s

3. **fade-in**: Content fades in
   - Duration: 0.8s
   - Easing: ease-out

4. **fade-in-delay**: Same as fade-in with 0.3s delay
   - Duration: 0.8s
   - Delay: 0.3s

5. **slide-in-right**: Content slides in from the right
   - Duration: 0.5s
   - Easing: ease-out

### Usage
```tsx
<div className="animate-slide-up">
  Animated content
</div>

<div className="animate-fade-in-delay">
  Delayed fade in
</div>
```

## Minimalist Shadows

### Shadow Utilities

- **shadow-minimal**: Subtle shadow for cards
- **shadow-minimal-md**: Medium shadow for elevated elements
- **shadow-minimal-lg**: Large shadow for modals
- **shadow-minimal-xl**: Extra large shadow for overlays

### Usage
```tsx
<div className="bg-white shadow-minimal p-4 rounded-lg">
  Card with minimal shadow
</div>
```

## Dark Mode

### Implementation
The design system supports dark mode using the **class strategy**.

### Toggle Theme
```tsx
import { ThemeToggle } from '@/components/ui';

<ThemeToggle />
```

### Dark Mode Classes
```tsx
<div className="bg-white dark:bg-black text-black dark:text-white">
  Adapts to theme
</div>
```

## RTL (Right-to-Left) Support

### For Hebrew Content
The design system automatically handles RTL layout for Hebrew:

```tsx
[dir='rtl'] {
  direction: rtl;
  text-align: right;
  font-family: var(--font-heebo);
}
```

### Usage
```tsx
<div dir="rtl" lang="he" className="font-hebrew">
  <h1>ברוכים הבאים</h1>
</div>
```

## Custom Utilities

### Luxury Gradient
```tsx
<div className="luxury-gradient">
  Luxury gradient background
</div>
```

### Text Balance
```tsx
<p className="text-balance">
  Balanced text wrapping
</p>
```

## Global Styles

### Smooth Scrolling
The entire app uses smooth scrolling:
```css
html {
  @apply scroll-smooth;
}
```

### Custom Scrollbar
- Webkit browsers: Thin, rounded scrollbar
- Firefox: Thin scrollbar with gray color

### Selection Colors
- Light mode: Gray background with black text
- Dark mode: Dark gray background with white text

## Form Elements

Using `@tailwindcss/forms` plugin:
```tsx
<input className="form-input" />
<select className="form-select" />
<textarea className="form-textarea" />
```

## Typography Plugin

Using `@tailwindcss/typography` plugin:
```tsx
<article className="prose prose-lg dark:prose-invert">
  <!-- Markdown content -->
</article>
```

## Examples

### Hero Section
```tsx
<section className="min-h-screen flex items-center justify-center luxury-gradient">
  <h1 className="text-4xl md:text-6xl font-bold animate-slide-up">
    Welcome
  </h1>
</section>
```

### Card Component
```tsx
<div className="bg-white dark:bg-black shadow-minimal-md rounded-lg p-6 animate-fade-in">
  <h2 className="text-2xl font-bold mb-4">Card Title</h2>
  <p className="text-gray-600 dark:text-gray-400">Card content</p>
</div>
```

### Button Component
```tsx
<button className="px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors duration-300 dark:bg-white dark:text-black dark:hover:bg-gray-100">
  Click Me
</button>
```

## Best Practices

1. **Use semantic HTML** with proper `dir` and `lang` attributes for RTL
2. **Always provide dark mode alternatives** using `dark:` prefix
3. **Use animations sparingly** for a minimal aesthetic
4. **Keep shadows subtle** using the minimal shadow utilities
5. **Maintain consistent spacing** using Tailwind's spacing scale
6. **Use the luxury gradient** for hero sections and backgrounds

## Color Usage Guidelines

- **Black/White**: Primary actions, text, backgrounds
- **Gray 50-200**: Subtle backgrounds, borders
- **Gray 300-500**: Secondary text, disabled states
- **Gray 600-900**: Dark mode backgrounds, emphasis
