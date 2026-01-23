import { Metadata } from 'next';
import { generateFormMetadata } from '@/lib/seo/metadata-generators';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  return generateFormMetadata({ slug, locale });
}

export default function FormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
