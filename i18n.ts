import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['en', 'he'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale = 'he' as const;

export default getRequestConfig(async ({ locale }) => {
  const currentLocale = locale || defaultLocale;
  
  if (!locales.includes(currentLocale as Locale)) {
    notFound();
  }

  // Load all translation namespaces
  const [common, shop, admin, auth, events, skateparks, guides, about, accessibility] = await Promise.all([
    import(`./locales/${currentLocale}/common.json`).then((m) => m.default),
    import(`./locales/${currentLocale}/shop.json`).then((m) => m.default),
    import(`./locales/${currentLocale}/admin.json`).then((m) => m.default),
    import(`./locales/${currentLocale}/auth.json`).then((m) => m.default),
    import(`./locales/${currentLocale}/events.json`).then((m) => m.default),
    import(`./locales/${currentLocale}/skateparks.json`).then((m) => m.default),
    import(`./locales/${currentLocale}/guides.json`).then((m) => m.default),
    import(`./locales/${currentLocale}/about.json`).then((m) => m.default),
    import(`./locales/${currentLocale}/accessibility.json`).then((m) => m.default),
  ]);

  return {
    locale: currentLocale,
    messages: {
      common,
      shop,
      admin,
      auth,
      events,
      skateparks,
      guides,
      about,
      accessibility,
    },
  };
});

