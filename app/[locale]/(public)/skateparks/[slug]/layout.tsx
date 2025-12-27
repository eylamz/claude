import { Metadata } from 'next';
import { generateSkateparkMetadata } from '@/lib/seo/metadata-generators';
import connectDB from '@/lib/db/mongodb';
import Skatepark from '@/lib/models/Skatepark';
import { locales } from '@/i18n';

export async function generateStaticParams() {
  try {
    await connectDB();
    
    // Fetch all active skateparks
    const skateparks = await Skatepark.find({ status: 'active' })
      .select('slug')
      .lean();
    
    // Generate params for all skateparks × all locales
    const params = [];
    for (const locale of locales) {
      for (const skatepark of skateparks) {
        params.push({
          locale,
          slug: skatepark.slug,
        });
      }
    }
    
    return params;
  } catch (error) {
    console.error('Error generating static params for skateparks:', error);
    return [];
  }
}

// Allow on-demand revalidation - pages are static but can be regenerated
export const dynamicParams = true; // Allow new pages to be generated on first request
// Don't use force-static - this allows revalidation

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

