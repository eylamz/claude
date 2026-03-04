import { Skeleton, Card } from '@/components/ui';

export default function SkateparkSlugLoading() {
  return (
    <div className="pt-[4.3rem] min-h-screen">
      <div className="max-w-6xl mx-auto p-2 lg:p-4 space-y-6 overflow-visible">
        {/* Breadcrumb Skeleton */}
        <div className="mb-4 opacity-40">
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Header Skeleton - only on sm+ (page hides centered title on mobile) */}
        <div className="hidden sm:flex justify-center -mb-5 mt-5 opacity-90">
          <Skeleton className="h-10 w-64 sm:w-96" />
        </div>

        {/* Image Gallery Skeleton - can show skeleton while image loads */}
        <div className="w-full opacity-60">
          <div className="-overflow-hidden">
            <div className="hidden md:flex md:flex-row gap-2 p-2">
              <Skeleton className="w-2/3 aspect-[4/3] rounded-xl" />
              <div className="flex flex-col w-1/3 gap-2">
                <Skeleton className="flex-1 rounded-xl" />
                <Skeleton className="flex-1 rounded-xl" />
              </div>
            </div>

            <div className="md:hidden relative">
              <div
                className="relative w-full flex overflow-hidden"
                style={{ height: 'calc(70vh - 200px)' }}
              >
                <Skeleton className="flex-shrink-0 w-full h-full rounded-none" />
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="w-1.5 h-1.5 rounded-full flex-shrink-0" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards Skeleton - Hours + Amenities */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 opacity-50">
          <Card className="md:p-4 rounded-lg shadow-none">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="ml-6 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-40" />
              </div>
              <div className="mt-6 pt-4 border-t border-border-dark/20 dark:border-text-dark/20">
                <div className="flex items-center gap-2 mb-3">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="mt-6 pt-4 border-t border-border-dark/20 dark:border-text-dark/20">
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </Card>

          <Card className="md:p-4 rounded-lg shadow-none">
            <div className="flex items-center md:justify-center gap-2 mb-3">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="flex flex-wrap -mx-1">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-1/4 px-1 mb-2">
                  <Skeleton className="h-20 w-full rounded-md" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Notes and Get Directions Combined Section Skeleton */}
        <div className="max-w-6xl mx-auto mb-8 opacity-30">
          <Card className="!overflow-visible !p-0 shadow-none grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-6">
            <div className="md:p-4">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-md" />
                <Skeleton className="h-12 w-3/4 rounded-md" />
              </div>
            </div>

            <div className="md:p-4 space-y-4">
              <div className="flex items-center gap-2 justify-start md:justify-center">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="mx-auto w-full max-w-[380px] grid grid-cols-4 gap-4 items-center">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="w-16 h-16 rounded-xl" />
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
