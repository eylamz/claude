import { Metadata } from 'next';
import { generateEventsListingMetadata } from '@/lib/seo/metadata-generators';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return generateEventsListingMetadata({ locale });
}

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
