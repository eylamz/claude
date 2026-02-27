import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';

type SearchParams = {
  callbackUrl?: string;
};

export default function LoginRedirectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const cookieStore = cookies();
  const requestHeaders = headers();

  // Prefer locale from callbackUrl path, then NEXT_LOCALE cookie, then Accept-Language, fallback to 'en'
  let locale: 'en' | 'he' = 'en';

  const callbackUrl = searchParams?.callbackUrl;
  if (callbackUrl) {
    try {
      const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const url = new URL(callbackUrl, base);
      const firstSegment = url.pathname.split('/').filter(Boolean)[0];
      if (firstSegment === 'en' || firstSegment === 'he') {
        locale = firstSegment;
      }
    } catch {
      // ignore parse errors and fall back to other signals
    }
  }

  if (!callbackUrl) {
    const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
    if (cookieLocale === 'en' || cookieLocale === 'he') {
      locale = cookieLocale;
    } else {
      const acceptLanguage = requestHeaders.get('accept-language') || '';
      if (acceptLanguage.toLowerCase().includes('he')) {
        locale = 'he';
      }
    }
  }

  const target = `/${locale}/login${
    callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''
  }`;

  redirect(target);
}

