import { Metadata } from 'next';
import { generateGrowthLabListingMetadata } from '@/lib/seo/metadata-generators';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return generateGrowthLabListingMetadata({ locale });
}

export default function GrowthLabLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
