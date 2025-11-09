# Internationalization (i18n) Setup

## Overview

This Next.js application is fully configured for internationalization using `next-intl` with support for English and Hebrew, including RTL (Right-to-Left) support for Hebrew.

## Configuration Files

### Core Configuration

#### `i18n.ts`
- Defines supported locales: `['en', 'he']`
- Default locale: `he` (Hebrew)
- Loads multiple translation namespaces: `common`, `shop`, `admin`
- Validates locale and throws `notFound()` for invalid locales

#### `middleware.ts`
- Handles automatic locale detection
- Redirects users based on browser language preference
- Supports locale-based URL routing (`/en/...`, `/he/...`)
- Enables automatic locale detection

#### `app/[locale]/layout.tsx`
- Locale-specific layout wrapper
- Applies RTL/LTR direction based on locale
- Sets appropriate language and font classes
- Provides translation context to all child components

## Translation Files Structure

```
locales/
├── en/
│   ├── common.json  # Common UI elements, navigation, buttons
│   ├── shop.json    # Shop-specific translations
│   └── admin.json   # Admin dashboard translations
├── he/
│   ├── common.json  # Common UI elements (Hebrew)
│   ├── shop.json    # Shop-specific translations (Hebrew)
│   └── admin.json   # Admin dashboard translations (Hebrew)
```

### Translation Namespaces

1. **common**: General UI elements
   - Navigation items
   - Buttons and actions
   - Metadata
   - General messages

2. **shop**: E-commerce specific
   - Products
   - Categories
   - Cart and wishlist
   - Filters and sorting

3. **admin**: Admin dashboard
   - Admin actions
   - User management
   - Analytics and reports

## Usage

### Using Translations in Components

```tsx
import { useTranslation } from '@/hooks';

export function MyComponent() {
  const t = useTranslation('common');
  const tShop = useTranslation('shop');
  
  return (
    <>
      <h1>{t('welcome')}</h1>
      <button>{t('getStarted')}</button>
      <p>{tShop('addToCart')}</p>
    </>
  );
}
```

### Locale Information

```tsx
import { useLocaleInfo } from '@/hooks';

export function MyComponent() {
  const { locale, isRTL, dir, lang, fontClass } = useLocaleInfo();
  
  return (
    <div dir={dir} lang={lang} className={fontClass}>
      Current locale: {locale}
      Is RTL: {isRTL ? 'Yes' : 'No'}
    </div>
  );
}
```

### Direct next-intl Hooks

```tsx
import { useTranslations, useLocale } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('common');
  const locale = useLocale();
  
  return <div>{t('welcome')}</div>;
}
```

## Language Switcher

### Component with Flag Icons

```tsx
import { LanguageSwitcher } from '@/components/ui';

export function Header() {
  return (
    <header>
      <LanguageSwitcher />
    </header>
  );
}
```

### Features
- Flag icons for visual identification
- Cookie persistence for language preference
- Automatic URL routing
- Full RTL/LTR switching
- Mobile-responsive design

## RTL (Right-to-Left) Support

### Automatic RTL

The layout automatically applies RTL for Hebrew:

```tsx
// app/[locale]/layout.tsx
const htmlDir = locale === 'he' ? 'rtl' : 'ltr';
const htmlLang = locale === 'he' ? 'he' : 'en';
const fontClass = locale === 'he' ? 'font-hebrew' : 'font-sans';
```

### Manual RTL Control

```tsx
import { useLocaleInfo } from '@/hooks';

export function MyComponent() {
  const { dir, isRTL } = useLocaleInfo();
  
  return (
    <div dir={dir}>
      {isRTL && <p>This is in RTL mode</p>}
    </div>
  );
}
```

## URL Structure

### Locale-based URLs

- English: `/en/`, `/en/shop`, `/en/admin`
- Hebrew: `/he/`, `/he/shop`, `/he/admin`

### Middleware Behavior

1. User visits `/` → Redirected to `/he/` (default locale)
2. User visits `/shop` → Redirected to `/he/shop`
3. User switches language → URL changes to `/en/shop`
4. Cookie `NEXT_LOCALE` is set for persistence

## Cookie Persistence

The language preference is persisted in a cookie:

```javascript
// Set by LanguageSwitcher component
document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
```

### Cookie Details
- **Name**: `NEXT_LOCALE`
- **Max Age**: 1 year (31536000 seconds)
- **Path**: `/` (entire site)
- **SameSite**: Lax (security)

## Adding New Translations

### Step 1: Add Translation Keys

Edit the appropriate JSON file:
```json
// locales/en/common.json
{
  "myNewKey": "My New Translation"
}
```

```json
// locales/he/common.json
{
  "myNewKey": "התרגום החדש שלי"
}
```

### Step 2: Use in Component

```tsx
const t = useTranslation('common');
return <p>{t('myNewKey')}</p>;
```

### Step 3: Type Safety

Add TypeScript types in `types/translations.d.ts` (optional):

```typescript
// types/translations.d.ts
export interface CommonTranslations {
  welcome: string;
  hello: string;
  // ... your keys
}
```

## Adding a New Locale

1. Create locale directory:
   ```
   locales/fr/
   ├── common.json
   ├── shop.json
   └── admin.json
   ```

2. Add to `i18n.ts`:
   ```typescript
   export const locales = ['en', 'he', 'fr'] as const;
   ```

3. Update `LanguageSwitcher`:
   ```typescript
   const localeFlags: Record<Locale, string> = {
     en: '🇬🇧',
     he: '🇮🇱',
     fr: '🇫🇷', // Add flag
   };
   ```

4. Add RTL support if needed:
   ```typescript
   // In layout.tsx
   const htmlDir = ['he', 'ar'].includes(locale) ? 'rtl' : 'ltr';
   ```

## Server Components

For server components:

```tsx
import { getTranslations } from 'next-intl/server';

export async function ServerComponent() {
  const t = await getTranslations('common');
  
  return <h1>{t('welcome')}</h1>;
}
```

## Advanced Features

### Pluralization

```json
// locales/en/common.json
{
  "items": {
    "one": "{count} item",
    "other": "{count} items"
  }
}
```

Usage:
```tsx
const t = useTranslations('common');
return <p>{t('items', { count: 5 })}</p>; // "5 items"
```

### Nested Translations

```json
// locales/en/shop.json
{
  "filterBy": {
    "category": "Category",
    "priceRange": "Price Range"
  }
}
```

Usage:
```tsx
const t = useTranslations('shop');
return <p>{t('filterBy.category')}</p>;
```

### Rich Text Formatting

```json
// locales/en/common.json
{
  "welcome": "Welcome, <strong>{name}</strong>!"
}
```

Usage:
```tsx
const t = useTranslations('common');
return <p dangerouslySetInnerHTML={{ __html: t('welcome', { name: 'User' }) }} />;
```

## Best Practices

1. **Always provide translations for all namespaces**
2. **Keep translations consistent across locales**
3. **Test RTL layouts thoroughly for Hebrew**
4. **Use semantic keys** (e.g., `addToCart` not `btn1`)
5. **Group related translations** by namespace
6. **Avoid hardcoding text** in components
7. **Test cookie persistence** across page refreshes
8. **Use TypeScript for type safety** when possible

## Troubleshooting

### Translations not loading
- Check file path matches locale structure
- Verify JSON syntax is valid
- Clear `.next` cache and rebuild

### RTL not working
- Ensure layout has `dir` attribute
- Check `globals.css` has RTL styles
- Verify Tailwind RTL classes are applied

### Language switcher not working
- Check middleware configuration
- Verify cookie is being set
- Test with browser dev tools

### Page not found
- Ensure locale is in `locales` array
- Check URL structure matches locale pattern
- Verify middleware matcher includes all routes
