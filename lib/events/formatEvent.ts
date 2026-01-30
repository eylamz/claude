/**
 * Shared formatter for full event detail (used by GET /api/events?full=true and GET /api/events/[slug])
 */

export interface FormatEventOptions {
  currentParticipants?: number;
  /** When true, viewCount is incremented by 1 (for detail page). When false, use stored viewCount. */
  incrementView?: boolean;
}

export function formatEventForDetail(
  event: any,
  options: FormatEventOptions = {}
): Record<string, unknown> {
  const { currentParticipants = 0, incrementView = false } = options;
  const viewCount = (event.viewCount || event.viewsCount || 0) + (incrementView ? 1 : 0);

  return {
    _id: event._id.toString(),
    slug: event.slug,
    category: event.category || 'roller',
    type: event.type || 'event',
    status: event.status || 'published',
    isFeatured: event.isFeatured || false,

    dateTime: event.dateTime || {
      startDate: event.startDate || new Date(),
      endDate: event.endDate,
      startTime: event.startTime,
      endTime: event.endTime,
      timezone: event.timezone
        ? typeof event.timezone === 'string'
          ? { he: event.timezone, en: event.timezone }
          : event.timezone
        : { he: 'אסיה/ירושלים', en: 'Asia/Jerusalem' },
    },

    location: event.location || {
      name: {
        he: event.location?.name?.he || '',
        en: event.location?.name?.en || '',
      },
      address: event.location?.address
        ? {
            he: event.location.address.he || '',
            en: event.location.address.en || '',
          }
        : undefined,
      url: event.location?.url || event.location?.venueUrl,
      coordinates: event.location?.coordinates
        ? {
            lat: event.location.coordinates.lat || event.location.coordinates.latitude,
            lng: event.location.coordinates.lng || event.location.coordinates.longitude,
          }
        : undefined,
    },

    viewCount,
    interestedCount: event.interestedCount || 0,
    attendingCount: event.attendingCount || currentParticipants || 0,

    content: event.content || {
      he: {
        title: event.title?.he || event.content?.he?.title || '',
        description: event.description?.he || event.content?.he?.description || '',
        tags: event.content?.he?.tags || event.tags || [],
        sections: event.content?.he?.sections || [],
      },
      en: {
        title: event.title?.en || event.content?.en?.title || '',
        description: event.description?.en || event.content?.en?.description || '',
        tags: event.content?.en?.tags || event.tags || [],
        sections: event.content?.en?.sections || [],
      },
    },

    media:
      event.media ||
      (event.images || []).map((img: any) => ({
        id: img._id?.toString() || Math.random().toString(),
        url: img.url,
        type: 'image',
        cloudinaryId: img.publicId || img.cloudinaryId,
        altText: {
          he: img.alt?.he || '',
          en: img.alt?.en || '',
        },
        caption: img.caption,
        usedInSections: [],
      })),

    featuredImage: event.featuredImage
      ? typeof event.featuredImage === 'string'
        ? {
            url: event.featuredImage,
            altText: {
              he: event.title?.he || '',
              en: event.title?.en || '',
            },
          }
        : event.featuredImage
      : {
          url: '',
          altText: { he: '', en: '' },
        },

    isOnline: event.isOnline || false,
    isFree: event.isFree !== undefined ? event.isFree : true,
    registrationRequired: event.registrationRequired || false,
    registrationUrl: event.registrationUrl,

    capacity: event.capacity,
    price: event.price,
    relatedSports: event.relatedSports || [],

    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

/**
 * Map a full event (detail format) to the list/card shape used by the events list page.
 */
export function fullEventToListEvent(full: any, locale: 'en' | 'he') {
  const startDate = full.dateTime?.startDate
    ? new Date(full.dateTime.startDate)
    : new Date();
  const endDate = full.dateTime?.endDate
    ? new Date(full.dateTime.endDate)
    : startDate;
  const now = new Date();
  const isHappeningNow = startDate <= now && endDate >= now;
  const isPast = endDate < now;

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  const formatDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const title =
    full.content?.[locale]?.title ||
    full.content?.en?.title ||
    '';
  const description =
    full.content?.[locale]?.description ||
    full.content?.en?.description ||
    '';
  const image =
    full.featuredImage?.url ||
    '';
  const location =
    full.location?.name?.[locale] ||
    full.location?.name?.en ||
    '';
  const address =
    full.location?.address?.[locale] ||
    full.location?.address?.en ||
    '';
  const startTime =
    full.dateTime?.startTime || formatTime(startDate);
  const endTime =
    full.dateTime?.endTime || formatTime(endDate);

  return {
    id: full._id,
    slug: full.slug,
    title,
    description,
    image,
    startDate: formatDateStr(startDate),
    endDate: formatDateStr(endDate),
    startTime,
    endTime,
    location,
    address,
    interestedCount: full.interestedCount ?? 0,
    maxParticipants: full.capacity,
    currentParticipants: full.attendingCount ?? 0,
    isFree: full.isFree !== undefined ? full.isFree : true,
    price: full.price,
    sports: full.relatedSports ?? [],
    isHappeningNow,
    isPast,
  };
}
