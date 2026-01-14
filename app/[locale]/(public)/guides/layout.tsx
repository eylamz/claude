import { Metadata } from 'next';
import { generateGuidesListingMetadata } from '@/lib/seo/metadata-generators';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return generateGuidesListingMetadata({ locale });
}

export default function GuidesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

