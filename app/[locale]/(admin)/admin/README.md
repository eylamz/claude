# Admin Layout

A comprehensive admin layout with sidebar navigation and main content area.

## Features

### Sidebar Navigation
- **Logo**: Brand logo at the top
- **Navigation Items**: Dashboard, Products, Orders, Users, Skateparks, Events, Trainers, Guides, Settings
- **Active Link Highlighting**: Current page is highlighted
- **Role-based Menu**: Menu items can be filtered by user role
- **Collapsible**: Sidebar can be collapsed on desktop
- **Mobile Responsive**: Overlay sidebar on mobile devices

### Main Content Area
- **Header**: Page title and breadcrumbs
- **User Profile**: User info and avatar
- **Mobile Menu Toggle**: Hamburger menu for mobile
- **Breadcrumbs**: Dynamic breadcrumb navigation

### Design
- **Dark Sidebar**: Black background with white text
- **White Content**: Clean white background for content
- **Minimal Style**: Clean, professional appearance
- **Responsive**: Works on all screen sizes

## File Structure

```
app/[locale]/(admin)/admin/
├── layout.tsx          # Main admin layout
└── page.tsx           # Dashboard page
```

## Usage

The admin layout is automatically applied to all routes under `/admin`. It provides:

1. **Sidebar Navigation**: Fixed sidebar with navigation items
2. **Main Content**: Scrollable content area with header
3. **Responsive Design**: Mobile-friendly with overlay sidebar
4. **User Management**: User profile display and logout functionality

## Navigation Items

- **Dashboard**: Main admin dashboard
- **Products**: Product management
- **Orders**: Order management
- **Users**: User management
- **Skateparks**: Skatepark management
- **Events**: Event management
- **Trainers**: Trainer management
- **Guides**: Guide management
- **Settings**: System settings

## Customization

### Adding New Menu Items

Add items to the `sidebarItems` array in `layout.tsx`:

```typescript
{
  href: `/${locale}/admin/new-page`,
  label: 'New Page',
  icon: <YourIcon />,
  roles: ['admin'] // Optional: restrict to specific roles
}
```

### Role-based Access

Menu items can be restricted by user role:

```typescript
{
  href: `/${locale}/admin/super-admin`,
  label: 'Super Admin',
  icon: <AdminIcon />,
  roles: ['super-admin'] // Only super-admin can see this
}
```

### Styling

The layout uses Tailwind CSS classes:
- **Sidebar**: `bg-black text-white`
- **Content**: `bg-white`
- **Active Links**: `bg-gray-800`
- **Hover States**: `hover:bg-gray-800`

## Responsive Behavior

- **Desktop**: Fixed sidebar with collapse toggle
- **Mobile**: Overlay sidebar with backdrop
- **Tablet**: Responsive grid layout

## Dependencies

- **Next.js**: App router
- **NextAuth.js**: Authentication
- **next-intl**: Internationalization
- **Tailwind CSS**: Styling
- **React**: UI components

## Security

- **Authentication Required**: All admin routes require authentication
- **Role-based Access**: Menu items can be restricted by role
- **Session Management**: User session is managed by NextAuth.js

## Internationalization

The layout supports multiple languages:
- **English**: Default language
- **Hebrew**: RTL support
- **Extensible**: Easy to add more languages

## Performance

- **Client-side Navigation**: Fast page transitions
- **Optimized Images**: SVG icons for performance
- **Minimal Bundle**: Only necessary dependencies
- **Lazy Loading**: Components loaded as needed

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: Proper ARIA labels
- **Focus Management**: Clear focus indicators
- **Color Contrast**: High contrast ratios

## Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Browsers**: iOS Safari, Chrome Mobile
- **Progressive Enhancement**: Works without JavaScript

## Future Enhancements

- **Dark Mode**: Toggle between light and dark themes
- **Customizable Sidebar**: User can customize menu items
- **Notifications**: Real-time notifications
- **Search**: Global search functionality
- **Shortcuts**: Keyboard shortcuts for common actions
