import { Metadata } from 'next';
import { generateSkateparksListingMetadata } from '@/lib/seo/metadata-generators';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return generateSkateparksListingMetadata({ locale });
}

export default function SkateparksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

