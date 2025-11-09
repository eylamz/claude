# Guide Model

## Overview

The Guide model manages comprehensive guides and tutorials for the platform, featuring a flexible content builder system.

## Key Features

### Content Block Types

1. **Text** - Rich text paragraphs
2. **Heading** - H2, H3, or H4 headings
3. **List** - Bullet or numbered lists with multiple items
4. **Image** - Images with caption and alt text
5. **Video** - Video embeds (YouTube, Vimeo, etc.)
6. **Link** - Internal or external links
7. **Code Block** - Code snippets with syntax highlighting
8. **Divider** - Visual separator

### Guide Attributes

- **Title & Description** - Bilingual (EN/HE) localization
- **Cover Image** - Featured cover image for listings
- **Related Sports** - Multiple sports associations
- **Tags** - Flexible tagging system
- **Rating System** - Average rating from user reviews
- **Views Counter** - Track guide popularity
- **Likes Counter** - User engagement tracking
- **Content Blocks** - Dynamic, flexible content builder
- **SEO Settings** - Meta title, description, and keywords
- **Status Management** - Draft, Published, Archived
- **Featured Flag** - Highlight guides on homepage
- **Author Tracking** - Link to user who created guide

## Usage

### Creating a Guide

```typescript
import Guide from '@/lib/models/Guide';

const newGuide = new Guide({
  slug: 'skateboarding-basics',
  title: {
    en: 'Skateboarding Basics',
    he: 'יסודות הסקייטבורדינג'
  },
  description: { /* ... */ },
  coverImage: 'https://...',
  relatedSports: ['skateboarding'],
  tags: ['beginner', 'tutorial'],
  contentBlocks: [
    {
      type: 'heading',
      order: 0,
      heading: { en: 'Introduction', he: 'מבוא' },
      headingLevel: 'h2'
    },
    {
      type: 'text',
      order: 1,
      text: { en: '...', he: '...' }
    },
    // ... more blocks
  ],
  status: 'published',
  authorId: userId,
  authorName: 'John Doe'
});

await newGuide.save();
```

### Finding Guides

```typescript
// Find all published guides
const guides = await Guide.findPublished();

// Find featured guides
const featured = await Guide.findFeatured();

// Find by sport
const skateboardingGuides = await Guide.findBySport('skateboarding');

// Find by tag
const beginnerGuides = await Guide.findByTag('beginner');

// Search guides
const results = await Guide.searchGuides('basics');
```

## Content Block Structure

```typescript
interface ContentBlock {
  type: 'text' | 'heading' | 'list' | 'image' | 'video' | 'link' | 'code' | 'divider';
  order: number;
  
  // Text block
  text?: { en: string; he: string };
  
  // Heading block
  heading?: { en: string; he: string };
  headingLevel?: 'h2' | 'h3' | 'h4';
  
  // List block
  listType?: 'bullet' | 'numbered';
  listItems?: { en: string[]; he: string[] };
  
  // Image block
  imageUrl?: string;
  imageCaption?: { en: string; he: string };
  imageAlt?: { en: string; he: string };
  
  // Video block
  videoUrl?: string;
  videoTitle?: { en: string; he: string };
  
  // Link block
  linkText?: { en: string; he: string };
  linkUrl?: string;
  linkExternal?: boolean;
  
  // Code block
  code?: string;
  language?: string;
}
```

## Admin Interface

### List Page (`/admin/guides`)
- View all guides with filters
- Display cover image, title, sports, tags, rating, views
- Status badges and featured indicators
- Bulk actions and individual actions
- Sortable columns and pagination
- Search functionality

### Form Page (`/admin/guides/new`)
- Bilingual form (EN/HE tabs)
- Dynamic content builder with drag-and-drop
- 8 content block types
- Related sports selection
- Tagging system
- Cover image upload
- SEO settings panel
- Status and featured toggles
- Preview mode
- Auto-save draft functionality

## API Routes

### GET `/api/admin/guides`
Returns paginated list of guides with filtering:
- Query params: `page`, `limit`, `search`, `status`, `sport`, `sortBy`, `sortOrder`

### POST `/api/admin/guides`
Creates a new guide:
- Requires admin authentication
- Validates required fields
- Sets author information automatically

## Future Enhancements

- User reviews and ratings
- Guide versions and revisions
- Export to PDF
- Guide templates
- Analytics tracking
- A/B testing for guides
- Related guides suggestions
- User favorites/bookmarks
- Comments and discussions
- Print-friendly versions



