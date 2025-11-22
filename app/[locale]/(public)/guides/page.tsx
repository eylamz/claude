import { Suspense } from 'react';
import GuidesPageClient from './guides-page-client';
import { fetchGuidesData } from '@/lib/api/guides';
import { getLocale } from 'next-intl/server';

interface GuidesPageProps {
  searchParams: Promise<{
    sports?: string;
    difficulty?: string;
    minRating?: string;
    search?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function GuidesPage({ searchParams }: GuidesPageProps) {
  const locale = await getLocale();
  const params = await searchParams;

  const sports = params.sports?.split(',').filter(Boolean) || [];
  const page = parseInt(params.page || '1', 10);
  const minRating = parseFloat(params.minRating || '0');

  // Fetch initial data server-side
  const initialData = await fetchGuidesData({
    locale,
    page,
    search: params.search || '',
    sports,
    difficulty: params.difficulty || '',
    minRating,
    sort: params.sort || 'newest',
    includeFilters: true,
  });

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GuidesPageClient initialData={initialData} />
    </Suspense>
  );
}








