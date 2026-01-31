import { Metadata } from 'next';
import { generateEventMetadata } from '@/lib/seo/metadata-generators';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  return generateEventMetadata({ slug, locale });
}

export default function EventSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
