import Guide from '@/lib/models/Guide';
import connectDB from '@/lib/db/mongodb';

export interface GuideData {
  id: string;
  slug: string;
  title: string;
  description?: string;
  coverImage?: string;
  relatedSports?: string[];
  tags?: string[];
  rating?: number;
  ratingCount?: number;
  viewsCount?: number;
  readTime?: number;
  difficulty?: string | null;
}

export interface FiltersData {
  sports: string[];
  difficulties: string[];
}

export interface GuidesResponse {
  guides: GuideData[];
  pagination: {
    currentPage: number;
    totalPages: number;
    total: number;
    limit: number;
  };
  filters: FiltersData;
}

export async function fetchGuidesData(params: {
  locale: string;
  page?: number;
  limit?: number;
  search?: string;
  sports?: string[];
  difficulty?: string;
  minRating?: number;
  sort?: string;
  includeFilters?: boolean;
}): Promise<GuidesResponse> {
  await connectDB();

  const {
    locale = 'en',
    page = 1,
    limit = 12,
    search = '',
    sports = [],
    difficulty = '',
    minRating = 0,
    sort = 'newest',
    includeFilters = false,
  } = params;

  // Build filter - only published guides
  const filter: any = {
    status: 'published',
  };

  // Search filter
  if (search) {
    filter.$or = [
      { 'title.en': { $regex: search, $options: 'i' } },
      { 'title.he': { $regex: search, $options: 'i' } },
      { 'description.en': { $regex: search, $options: 'i' } },
      { 'description.he': { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  // Sports filter
  if (sports.length > 0) {
    filter.relatedSports = { $in: sports };
  }

  // Difficulty filter (assuming difficulty is stored in tags)
  if (difficulty) {
    filter.tags = { $in: [difficulty] };
  }

  // Rating filter
  if (minRating > 0) {
    filter.rating = { $gte: minRating };
  }

  // Sort configuration
  const sortConfig: any = {};
  switch (sort) {
    case 'newest':
      sortConfig.createdAt = -1;
      break;
    case 'rating':
      sortConfig.rating = -1;
      sortConfig.ratingCount = -1;
      break;
    case 'views':
      sortConfig.viewsCount = -1;
      break;
    case 'title':
      sortConfig[`title.${locale}`] = 1;
      break;
    default:
      sortConfig.createdAt = -1;
  }

  // Calculate pagination
  const totalCount = await Guide.countDocuments(filter);
  const skip = (page - 1) * limit;

  // Fetch guides
  const guides = await Guide.find(filter)
    .sort(sortConfig)
    .skip(skip)
    .limit(limit)
    .lean();

  // Format guides data
  const formattedGuides: GuideData[] = guides.map((guide: any) => ({
    id: guide._id.toString(),
    slug: guide.slug,
    title: guide.title?.[locale as 'en' | 'he'] || guide.title?.en || 'Untitled',
    description: guide.description?.[locale as 'en' | 'he'] || guide.description?.en || '',
    coverImage: guide.coverImage || '/placeholder-guide.jpg',
    relatedSports: guide.relatedSports || [],
    tags: guide.tags || [],
    viewsCount: guide.viewsCount || 0,
    rating: guide.rating || 0,
    ratingCount: guide.ratingCount || 0,
    readTime: guide.readTime || 5,
    difficulty: guide.tags?.find((tag: string) =>
      ['beginner', 'intermediate', 'advanced', 'expert'].includes(tag.toLowerCase())
    ) || null,
  }));

  // Get filters data if requested
  let filters: FiltersData = { sports: [], difficulties: [] };
  if (includeFilters || page === 1) {
    const allPublishedGuides = await Guide.find({ status: 'published' })
      .select('relatedSports tags')
      .lean();

    // Extract unique sports
    const sportsSet = new Set<string>();
    allPublishedGuides.forEach((guide: any) => {
      if (guide.relatedSports && Array.isArray(guide.relatedSports)) {
        guide.relatedSports.forEach((sport: string) => {
          if (sport) sportsSet.add(sport);
        });
      }
    });

    // Extract unique difficulties from tags
    const difficultiesSet = new Set<string>();
    const difficultyKeywords = ['beginner', 'intermediate', 'advanced', 'expert'];

    allPublishedGuides.forEach((guide: any) => {
      if (guide.tags && Array.isArray(guide.tags)) {
        guide.tags.forEach((tag: string) => {
          const lowerTag = tag.toLowerCase();
          if (difficultyKeywords.includes(lowerTag)) {
            difficultiesSet.add(lowerTag.charAt(0).toUpperCase() + lowerTag.slice(1));
          }
        });
      }
    });

    // Convert sets to sorted arrays
    const sports = Array.from(sportsSet).sort();
    const difficulties = Array.from(difficultiesSet).sort((a, b) => {
      const order = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
      return order.indexOf(a) - order.indexOf(b);
    });

    filters = { sports, difficulties };
  }

  return {
    guides: formattedGuides,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      total: totalCount,
      limit,
    },
    filters,
  };
}








