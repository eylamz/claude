# Next.js 14 App with TypeScript, Tailwind CSS, and i18n

A luxury minimalist Next.js application with internationalization support for English and Hebrew.

## Features

- ✅ Next.js 14 with App Router
- ✅ TypeScript with strict mode
- ✅ Tailwind CSS 4 with luxury minimalist design system
- ✅ Internationalization (i18n) with English and Hebrew
- ✅ RTL (Right-to-Left) support for Hebrew
- ✅ Dark mode with class-based strategy
- ✅ Custom animations (slide-up, fade-in, slide-in-right)
- ✅ Custom luxury color palette (black, white, gray scale)
- ✅ Font families: SF Pro Display (English), Heebo (Hebrew)
- ✅ @tailwindcss/forms and @tailwindcss/typography plugins
- ✅ Mobile-first responsive design
- ✅ ESLint and Prettier configuration
- ✅ Path aliases (@/ for root)
- ✅ Railway deployment ready
- ✅ Structured folders for components, lib, hooks, stores, and types

## Project Structure

```
nextjs-app/
├── app/
│   ├── [locale]/          # Locale-based routing
│   │   ├── (public)/      # Public routes
│   │   ├── (protected)/   # Protected routes
│   │   ├── (admin)/       # Admin routes
│   │   └── (auth)/        # Auth routes
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Root page
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # UI components
│   ├── layout/            # Layout components
│   ├── shop/              # Shop components
│   └── admin/             # Admin components
├── lib/
│   ├── db/                # Database utilities
│   ├── utils/             # Utility functions
│   └── email/             # Email utilities
├── hooks/                 # Custom React hooks
├── stores/                # State management (Zustand)
├── types/                 # TypeScript types
├── locales/               # Translation files
│   ├── en.json
│   └── he.json
├── middleware.ts          # Next.js middleware
├── i18n.ts                # i18n configuration
└── railway.toml           # Railway deployment config
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file and add your environment variables:
```bash
# Database
MONGODB_URI=your_mongodb_connection_string_here

# Redis
REDIS_URL=your_redis_url_here

# NextAuth.js
NEXTAUTH_SECRET=generate_a_random_secret_here
NEXTAUTH_URL=http://localhost:3000

# Shopify
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_WEBHOOK_SECRET=your_shopify_webhook_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# EmailJS
EMAILJS_SERVICE_ID=your_emailjs_service_id
EMAILJS_TEMPLATE_ID=your_emailjs_template_id
EMAILJS_PUBLIC_KEY=your_emailjs_public_key
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Deployment to Railway

1. Push your code to a Git repository
2. Connect your repository to Railway
3. Add environment variables in Railway dashboard (see below)
4. Railway will automatically build and deploy your app

### Required Environment Variables

- Application
  - `NEXT_PUBLIC_SITE_URL` = https://your-domain.com
  - `NEXTAUTH_URL` = https://your-domain.com
  - `NEXTAUTH_SECRET` = random 32+ chars
  - `NODE_ENV` = production
- Database
  - `MONGODB_URI` = mongodb+srv://...
- Redis (optional)
  - `REDIS_URL` = redis://:password@host:port
- Cloudinary
  - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- Shopify (optional)
  - `SHOPIFY_STORE_DOMAIN`
  - `SHOPIFY_API_KEY`
  - `SHOPIFY_API_SECRET`
  - `SHOPIFY_WEBHOOK_SECRET`
- Email
  - SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
  - or EmailJS: `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY`, `NEXT_PUBLIC_EMAILJS_SERVICE_ID`
- Analytics & Error Webhook (optional)
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID`
  - `NEXT_PUBLIC_ERROR_WEBHOOK_URL`

### Domains & SSL

- Add custom domain in Railway → Domains → Add Domain.
- Create CNAME record to Railway provided domain.
- SSL certificates are auto‑provisioned and renewed by Railway.

### Monitoring

- Health: `/api/health` endpoint returns DB status and timestamp.
- Performance: Lighthouse CI workflow enforces budgets on PRs.
- External uptime: UptimeRobot/BetterStack monitoring on `/` and `/api/health`.

---

## Database Setup (MongoDB Atlas)

- Create Atlas cluster, network access, and application user; set `MONGODB_URI` in Railway.
- Suggested Indexes (adjust to schema):
  - Products: `{ slug: 1 }` (unique), `{ category: 1, relatedSports: 1 }`
  - Skateparks: `{ slug: 1 }`, `{ area: 1 }`
  - Events: `{ slug: 1 }`, `{ startDate: -1 }`
- Backups: Enable Atlas backups and test restore monthly.
- Migrations: keep idempotent `mongosh` scripts (indexes, schema normalization).

---

## Third‑Party Services

- Shopify: Configure app credentials and webhooks; set envs above.
- Cloudinary: Set cloud and keys; use `OptimizedImage` for responsive images.
- Redis: Provision and set `REDIS_URL` for caching, rate limiting, and sessions.
- Email: SMTP via Nodemailer or EmailJS. Ensure SPF/DKIM for your domain.

---

## Maintenance & Operations

- Updates: Branch → PR → CI (tests + Lighthouse) → Merge → Railway deploy.
- Backups: Atlas (continuous/daily). Export Railway variables periodically.
- Monitoring: `/api/health`, `npm run perf:lhci`, `npm run perf:load`, client perf overlay.
- Logs: Use Railway logs; consider external log aggregation; redact PII.

### Troubleshooting

- Build fails: Check Node/Next versions, env vars, or retry deploy with clean cache.
- 500 errors: Inspect logs; verify DB/Redis network and credentials.
- Domain/SSL: Verify DNS CNAME and allow propagation.
- Performance: Review Lighthouse budgets, run `npm run perf:bundle`, optimize images and code splitting.
- DB timeouts: Add indexes; scale Atlas tier; review slow queries.
- Email: Validate SMTP/EmailJS credentials; check SPF/DKIM; inspect webhook/logs.

## Internationalization

The app supports English and Hebrew languages. The locale is automatically detected from the URL:
- `/` - English (default)
- `/he` - Hebrew

## Technologies

- Next.js 14
- React 19
- TypeScript
- Tailwind CSS 4 with custom design system
- next-intl for i18n
- ESLint
- Prettier
- Zustand for state management
- ioredis for Redis
- nodemailer for emails
- MongoDB for database

## Design System

### Color Palette
- **Black**: `#000000`
- **White**: `#FFFFFF`
- **Gray Scale**: 50-900 (as defined in Tailwind config)

### Custom Animations
- `animate-slide-up`: Slide content from bottom to top
- `animate-fade-in`: Fade in content
- `animate-slide-in-right`: Slide content from left to right
- `animate-slide-up-delay`: Slide up with delay
- `animate-fade-in-delay`: Fade in with delay

### Breakpoints
- `xs`: 475px
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1440px
- `3xl`: 1920px

### Utilities
- `.luxury-gradient`: Luxury gradient background
- `.text-balance`: Balanced text wrapping
- Minimal shadow utilities: `.shadow-minimal`, `.shadow-minimal-md`, `.shadow-minimal-lg`, `.shadow-minimal-xl`

## Usage Examples

### Theme Toggle
```tsx
import { ThemeToggle } from '@/components/ui';

<ThemeToggle />
```

### Using Animations
```tsx
<div className="animate-slide-up">Content slides up</div>
<div className="animate-fade-in">Content fades in</div>
<div className="animate-slide-in-right">Content slides from right</div>
```

### Dark Mode
The app supports dark mode using the class strategy. Toggle it with the ThemeToggle component.

### RTL Support
RTL is automatically applied for Hebrew locale. Use `dir="rtl"` or `dir="ltr"` attributes.

```tsx
<div dir="rtl" lang="he" className="font-hebrew">
  Hebrew content
</div>
```
