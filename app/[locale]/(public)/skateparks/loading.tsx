import { Skeleton } from '@/components/ui/skeleton';

export default function SkateparksLoading() {
  return (
    <div className="min-h-screen bg-background dark:bg-background-dark">
      {/* Hero Section - matches page structure */}
      <div className="relative pt-14 md:pt-14 bg-gradient-to-br from-brand-purple/10 via-transparent to-brand-main/10 dark:from-brand-purple/5 dark:to-brand-dark/5 z-10">
        <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
              Find Your Park
            </h1>
            <h2 className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Where wheels meet concrete, community happens.
            </h2>
            {/* Stats bar placeholder */}
            <div className="flex items-center justify-center min-h-[2.5rem] pt-4">
              <div className="flex items-center gap-6">
                <Skeleton className="h-5 w-24 rounded" />
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />
                <Skeleton className="h-5 w-32 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar placeholder */}
      <div className="sticky top-0 z-20 bg-background dark:bg-background-dark border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 flex-1 min-w-[200px] max-w-md rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Main content - skeleton grid */}
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8 overflow-x-hidden md:overflow-x-visible">
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
          aria-hidden
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-fit cursor-pointer relative group select-none transform-gpu transition-all duration-300"
            >
              <div className="relative h-[12rem] lg:h-[14rem] overflow-hidden rounded-2xl opacity-60">
                <Skeleton className="absolute inset-0 w-full h-full rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
