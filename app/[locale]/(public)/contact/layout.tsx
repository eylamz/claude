import { Metadata } from 'next';
import { generateContactMetadata } from '@/lib/seo/metadata-generators';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return generateContactMetadata({ locale });
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

