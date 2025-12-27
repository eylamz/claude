import { Metadata } from 'next';
import { generateSkateparkMetadata } from '@/lib/seo/metadata-generators';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  return generateSkateparkMetadata({ slug, locale });
}

export default function SkateparkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

