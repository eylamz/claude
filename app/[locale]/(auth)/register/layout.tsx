import { Metadata } from 'next';
import { generateRegisterMetadata } from '@/lib/seo/metadata-generators';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return generateRegisterMetadata({ locale });
}

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

