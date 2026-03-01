import { Metadata } from 'next';
import { generateGuideMetadata } from '@/lib/seo/metadata-generators';
import connectDB from '@/lib/db/mongodb';
import Guide from '@/lib/models/Guide';
import { locales } from '@/i18n';

export async function generateStaticParams() {
  try {
    await connectDB();

    const guides = await Guide.find({ status: 'published' })
      .select('slug')
      .lean();

    const params = [];
    for (const locale of locales) {
      for (const guide of guides) {
        params.push({
          locale,
          slug: guide.slug,
        });
      }
    }

    return params;
  } catch (error) {
    console.error('Error generating static params for guides', error);
    return [];
  }
}

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  return generateGuideMetadata({ slug, locale });
}

export default function GuideSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
