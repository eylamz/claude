import Guide from '@/lib/models/Guide';
import connectDB from '@/lib/db/mongodb';

export interface ILocalizedField {
  en: string;
  he: string;
}

export interface ILocalizedTags {
  en: string[];
  he: string[];
}

export interface GuideData {
  id: string;
  slug: string;
  title: ILocalizedField;
  description?: ILocalizedField;
  coverImage?: string;
  relatedSports?: string[];
  tags?: ILocalizedTags | string[]; // Support both localized object and array format
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

  // Search filter (title, description, and tags in both en and he)
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { 'title.en': { $regex: search, $options: 'i' } },
      { 'title.he': { $regex: search, $options: 'i' } },
      { 'description.en': { $regex: search, $options: 'i' } },
      { 'description.he': { $regex: search, $options: 'i' } },
      { 'tags.en': searchRegex },
      { 'tags.he': searchRegex },
      { tags: { $in: [searchRegex] } }, // legacy flat-array tags
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

  // Format guides data - return full localized objects
  const formattedGuides: GuideData[] = guides.map((guide: any) => {
    // Handle title - return full localized object
    const title: ILocalizedField = {
      en: guide.title?.en || 'Untitled',
      he: guide.title?.he || guide.title?.en || 'ללא כותרת',
    };

    // Handle description - return full localized object
    const description: ILocalizedField | undefined = guide.description
      ? {
          en: guide.description.en || '',
          he: guide.description.he || guide.description.en || '',
        }
      : undefined;

    // Handle tags - return full localized object if available, otherwise array
    let tags: ILocalizedTags | string[] = [];
    if (Array.isArray(guide.tags)) {
      // Old format: array - keep as array
      tags = guide.tags;
    } else if (guide.tags && typeof guide.tags === 'object' && 'en' in guide.tags) {
      // New format: localized object - return full object
      const tagsObj = guide.tags as { en?: string[]; he?: string[] };
      tags = {
        en: Array.isArray(tagsObj.en) ? tagsObj.en : [],
        he: Array.isArray(tagsObj.he) ? tagsObj.he : (Array.isArray(tagsObj.en) ? tagsObj.en : []),
      } as ILocalizedTags;
    }

    // Extract difficulty from tags
    const getDifficulty = (): string | null => {
      let tagsArray: string[] = [];
      if (Array.isArray(tags)) {
        tagsArray = tags;
      } else if (typeof tags === 'object' && 'en' in tags) {
        const localizedTags = tags as ILocalizedTags;
        tagsArray = localizedTags[locale as 'en' | 'he'] || localizedTags.en || [];
      }
      return tagsArray.find((tag: string) =>
        ['beginner', 'intermediate', 'advanced', 'expert'].includes(tag.toLowerCase())
      ) || null;
    };

    return {
      id: guide._id.toString(),
      slug: guide.slug,
      title,
      description,
      coverImage: guide.coverImage || '/placeholder-guide.jpg',
      relatedSports: guide.relatedSports || [],
      tags: tags as ILocalizedTags | string[],
      viewsCount: guide.viewsCount || 0,
      rating: guide.rating || 0,
      ratingCount: guide.ratingCount || 0,
      readTime: guide.readTime || 5,
      difficulty: getDifficulty(),
    } as GuideData;
  });

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
      let tagsArray: string[] = [];
      if (guide.tags && Array.isArray(guide.tags)) {
        // Old format: array
        tagsArray = guide.tags;
      } else if (guide.tags && typeof guide.tags === 'object' && 'en' in guide.tags) {
        // New format: localized object - combine both languages for filter extraction
        const enTags = guide.tags.en || [];
        const heTags = guide.tags.he || [];
        tagsArray = [...enTags, ...heTags];
      }
      
      tagsArray.forEach((tag: string) => {
        const lowerTag = tag.toLowerCase();
        if (difficultyKeywords.includes(lowerTag)) {
          difficultiesSet.add(lowerTag.charAt(0).toUpperCase() + lowerTag.slice(1));
        }
      });
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








