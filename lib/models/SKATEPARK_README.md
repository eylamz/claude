# Skatepark Model

## Overview

The `Skatepark` model provides a comprehensive skatepark management system with geospatial location support, operating hours, amenities tracking, and multi-language content for English and Hebrew.

## File Structure

```
lib/models/
├── Skatepark.ts     # Skatepark model with location features
└── index.ts         # Model exports
```

## Skatepark Schema

### Fields

#### Basic Information
- **slug** (String, unique, required)
  - Auto-converted to lowercase
  - Alphanumeric and hyphens only
  - Unique index for performance
  - Used for SEO-friendly URLs

- **name** (Localized, required)
  - English name (required)
  - Hebrew name (required)
  - Maximum 200 characters each

- **address** (Localized, required)
  - English address (required)
  - Hebrew address (required)
  - Maximum 300 characters each

#### Location
- **area** (Enum, required)
  - Values: `'north'`, `'center'`, `'south'`
  - Geographical region in Israel
  - Indexed for performance

- **location** (Geospatial Point, required)
  - Type: 'Point'
  - Coordinates: [longitude, latitude]
  - Uses 2dsphere index for geospatial queries
  - Validated: longitude [-180, 180], latitude [-90, 90]

#### Images
```typescript
interface ISkateparkImage {
  url: string;
  alt: {
    en: string;
    he: string;
  };
  order: number;
  publicId: string;
}
```
- Array of skatepark images
- Sorted by order field
- Supports alt text in multiple languages
- Includes publicId for cloud storage management

#### Operating Hours
```typescript
interface IOperatingHours {
  sunday?: IDayHours;
  monday?: IDayHours;
  tuesday?: IDayHours;
  wednesday?: IDayHours;
  thursday?: IDayHours;
  friday?: IDayHours;
  saturday?: IDayHours;
  holidays?: IDayHours;
}

interface IDayHours {
  open?: string;    // HH:mm format
  close?: string;  // HH:mm format
  closed?: boolean; // If true, closed all day
}
```
- Separate hours for each day of the week
- Special hours for holidays
- Time format: HH:mm (24-hour format)
- Closed flag for days when skatepark is not open

- **lightingUntil** (String, optional)
  - Time when lighting turns off after sunset
  - Format: HH:mm
  - Example: '22:00' (10 PM)

#### Amenities
```typescript
interface IAmenities {
  entryFee: boolean;              // Paid entry
  parking: boolean;                // Parking available
  shade: boolean;                 // Shade structures
  bathroom: boolean;              // Restroom facilities
  helmetRequired: boolean;        // Helmet mandatory
  guard: boolean;                 // Security guard present
  seating: boolean;               // Seating areas
  bombShelter: boolean;          // Bomb shelter nearby
  scootersAllowed: boolean;      // Scooters permitted
  bikesAllowed: boolean;         // Bikes permitted
  noWax: boolean;               // No wax policy
  nearbyRestaurants: boolean;    // Restaurants nearby
}
```
- Boolean flags for various amenities
- All default to false

#### Timeline
- **openingYear** (Number, optional)
  - Year the skatepark opened
  - Minimum: 1900
  - Maximum: Current year

- **closingYear** (Number, optional)
  - Year the skatepark closed permanently
  - Must be >= openingYear
  - Indicates if skatepark is closed

- **notes** (Localized)
  - Additional information in English and Hebrew
  - Maximum 1000 characters each

#### Status & Features
- **is24Hours** (Boolean, default: false)
  - Open 24/7
  - Skips operating hours check

- **isFeatured** (Boolean, default: false)
  - Featured skateparks
  - Indexed for performance

- **status** (Enum, default: 'active')
  - Values: `'active'`, `'inactive'`
  - Indexed for performance

#### Media
- **mediaLinks**
  - **youtube** (String, optional)
    - YouTube video URL
    - Must be valid YouTube URL
  - **googleMapsFrame** (String, optional)
    - Google Maps embed code

#### Ratings
- **rating** (Number, default: 0)
  - Average rating from users
  - Range: 0-5
  - Minimum: 0
  - Maximum: 5

- **totalReviews** (Number, default: 0)
  - Number of user reviews
  - Cannot be negative

#### Timestamps
- **createdAt** (Date, auto-generated)
- **updatedAt** (Date, auto-generated)

## Indexes

### Single Field Indexes
```typescript
// Slug index (unique)
{ slug: 1 }

// Area index
{ area: 1 }

// Featured + Status compound index
{ isFeatured: 1, status: 1 }
```

### Geospatial Index
```typescript
// 2dsphere index for location-based queries
{ location: '2dsphere' }
```

### Text Index
Full-text search across:
- English name
- Hebrew name
- English address
- Hebrew address
- English notes
- Hebrew notes
- Area

## Instance Methods

### `getLocationCoordinates(): [number, number]`

Get longitude and latitude coordinates.

**Example:**
```typescript
const skatepark = await Skatepark.findById(id);
const [lng, lat] = skatepark.getLocationCoordinates();
```

### `isOpenNow(): boolean`

Check if skatepark is currently open.

**Example:**
```typescript
const skatepark = await Skatepark.findById(id);
if (skatepark.isOpenNow()) {
  // Skatepark is open
}
```

### `getCurrentOperatingHours(): IDayHours | undefined`

Get operating hours for the current day.

**Example:**
```typescript
const skatepark = await Skatepark.findById(id);
const hours = skatepark.getCurrentOperatingHours();
if (hours && !hours.closed) {
  console.log(`Open: ${hours.open} - ${hours.close}`);
}
```

### `getDistanceFrom(lat: number, lng: number): number`

Calculate distance from a point in kilometers (using Haversine formula).

**Example:**
```typescript
const skatepark = await Skatepark.findById(id);
const distance = skatepark.getDistanceFrom(31.7683, 35.2137); // Jerusalem coordinates
console.log(`Distance: ${distance.toFixed(2)} km`);
```

## Static Methods

### `findBySlug(slug: string): Promise<ISkatepark | null>`

Find a skatepark by its slug.

**Example:**
```typescript
const skatepark = await Skatepark.findBySlug('tel-aviv-skatepark');
```

### `findActive(): Promise<ISkatepark[]>`

Find all active skateparks.

**Example:**
```typescript
const skateparks = await Skatepark.findActive();
```

### `findFeatured(): Promise<ISkatepark[]>`

Find all featured active skateparks.

**Example:**
```typescript
const skateparks = await Skatepark.findFeatured();
```

### `findNearby(lat: number, lng: number, radiusKm?: number): Promise<ISkatepark[]>`

Find skateparks within a radius from a location (default: 10km).

**Example:**
```typescript
// Find skateparks within 20km of Tel Aviv
const skateparks = await Skatepark.findNearby(32.0853, 34.7818, 20);
```

### `searchSkateparks(query: string): Promise<ISkatepark[]>`

Search skateparks by text query.

**Example:**
```typescript
const results = await Skatepark.searchSkateparks('indoor concrete');
```

### `findByArea(area: Area): Promise<ISkatepark[]>`

Find skateparks by area.

**Example:**
```typescript
const northSkateparks = await Skatepark.findByArea('north');
```

## Virtual Properties

### `primaryImage: ISkateparkImage | undefined`

Get the primary (first) skatepark image.

```typescript
const skatepark = await Skatepark.findById(id);
const primaryImage = skatepark.primaryImage;
```

### `latitude: number`

Get the latitude coordinate.

```typescript
const lat = skatepark.latitude;
```

### `longitude: number`

Get the longitude coordinate.

```typescript
const lng = skatepark.longitude;
```

### `isClosed: boolean`

Check if skatepark is permanently closed.

```typescript
const skatepark = await Skatepark.findById(id);
if (skatepark.isClosed) {
  // Skatepark is closed
}
```

### `ratingDisplay: string`

Get formatted rating display string.

```typescript
const skatepark = await Skatepark.findById(id);
console.log(skatepark.ratingDisplay);
// Output: "4.5 (23 reviews)"
```

## Usage Examples

### Create a Skatepark

```typescript
import Skatepark from '@/lib/models/Skatepark';

const skatepark = new Skatepark({
  slug: 'tel-aviv-skatepark',
  name: {
    en: 'Tel Aviv Skatepark',
    he: 'סקייטפארק תל אביב',
  },
  address: {
    en: 'Hayarkon Park, Tel Aviv',
    he: 'פארק הירקון, תל אביב',
  },
  area: 'center',
  location: {
    type: 'Point',
    coordinates: [34.7818, 32.0853], // [longitude, latitude]
  },
  images: [
    {
      url: 'https://example.com/image1.jpg',
      alt: { en: 'Main entrance', he: 'כניסה ראשית' },
      order: 0,
      publicId: 'skateparks/tel-aviv-1',
    },
  ],
  operatingHours: {
    sunday: { open: '08:00', close: '22:00', closed: false },
    monday: { open: '08:00', close: '22:00', closed: false },
    tuesday: { open: '08:00', close: '22:00', closed: false },
    wednesday: { open: '08:00', close: '22:00', closed: false },
    thursday: { open: '08:00', close: '22:00', closed: false },
    friday: { open: '08:00', close: '18:00', closed: false },
    saturday: { open: '09:00', close: '20:00', closed: false },
    holidays: { open: '09:00', close: '20:00', closed: false },
  },
  lightingUntil: '23:00',
  amenities: {
    entryFee: false,
    parking: true,
    shade: true,
    bathroom: true,
    helmetRequired: false,
    guard: false,
    seating: true,
    bombShelter: true,
    scootersAllowed: true,
    bikesAllowed: false,
    noWax: true,
    nearbyRestaurants: true,
  },
  openingYear: 2010,
  notes: {
    en: 'Popular skatepark with diverse obstacles and good lighting.',
    he: 'סקייטפארק פופולרי עם מכשולים מגוונים ותאורה טובה.',
  },
  is24Hours: false,
  isFeatured: true,
  status: 'active',
  mediaLinks: {
    youtube: 'https://www.youtube.com/watch?v=example',
    googleMapsFrame: '<iframe src="..."></iframe>',
  },
  rating: 4.5,
  totalReviews: 127,
});

await skatepark.save();
```

### Find Nearby Skateparks

```typescript
// Find skateparks within 15km of Jerusalem
const skateparks = await Skatepark.findNearby(31.7683, 35.2137, 15);

// Sort by distance
const sorted = skateparks.sort((a, b) => {
  const distA = a.getDistanceFrom(31.7683, 35.2137);
  const distB = b.getDistanceFrom(31.7683, 35.2137);
  return distA - distB;
});
```

### Check if Open

```typescript
const skatepark = await Skatepark.findBySlug('tel-aviv-skatepark');

if (skatepark.isOpenNow()) {
  console.log('Skatepark is currently open!');
} else {
  const hours = skatepark.getCurrentOperatingHours();
  console.log(`Next open time: ${hours?.open}`);
}
```

### Filter by Amenities

```typescript
// Find skateparks with parking and bathrooms
const skateparks = await Skatepark.find({
  'amenities.parking': true,
  'amenities.bathroom': true,
  status: 'active',
});
```

### Geospatial Query (Advanced)

```typescript
// Find skateparks within a bounding box
const skateparks = await Skatepark.find({
  location: {
    $geoWithin: {
      $box: [
        [34.5, 31.7], // Southwest corner [lng, lat]
        [34.9, 32.3], // Northeast corner [lng, lat]
      ],
    },
  },
  status: 'active',
});
```

### Update Rating

```typescript
const skatepark = await Skatepark.findById(id);

// Calculate new rating after review
const newRating = 4.5;
skatepark.rating = (skatepark.rating * skatepark.totalReviews + newRating) / (skatepark.totalReviews + 1);
skatepark.totalReviews += 1;

await skatepark.save();
```

## TypeScript Interfaces

### Localized Field
```typescript
interface ILocalizedField {
  en: string;
  he: string;
}
```

### Skatepark Image
```typescript
interface ISkateparkImage {
  url: string;
  alt: ILocalizedField;
  order: number;
  publicId: string;
}
```

### Day Hours
```typescript
interface IDayHours {
  open?: string;
  close?: string;
  closed?: boolean;
}
```

### Operating Hours
```typescript
interface IOperatingHours {
  sunday?: IDayHours;
  monday?: IDayHours;
  tuesday?: IDayHours;
  wednesday?: IDayHours;
  thursday?: IDayHours;
  friday?: IDayHours;
  saturday?: IDayHours;
  holidays?: IDayHours;
}
```

### Amenities
```typescript
interface IAmenities {
  entryFee: boolean;
  parking: boolean;
  shade: boolean;
  bathroom: boolean;
  helmetRequired: boolean;
  guard: boolean;
  seating: boolean;
  bombShelter: boolean;
  scootersAllowed: boolean;
  bikesAllowed: boolean;
  noWax: boolean;
  nearbyRestaurants: boolean;
}
```

### Media Links
```typescript
interface IMediaLinks {
  youtube?: string;
  googleMapsFrame?: string;
}
```

### Location
```typescript
interface ILocation {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}
```

### Skatepark Interface
```typescript
interface ISkatepark extends Document {
  slug: string;
  name: ILocalizedField;
  address: ILocalizedField;
  area: Area;
  location: ILocation;
  images: ISkateparkImage[];
  operatingHours: IOperatingHours;
  lightingUntil?: string;
  amenities: IAmenities;
  openingYear?: number;
  closingYear?: number;
  notes: ILocalizedField;
  is24Hours: boolean;
  isFeatured: boolean;
  status: SkateparkStatus;
  mediaLinks: IMediaLinks;
  rating: number;
  totalReviews: number;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getLocationCoordinates(): [number, number];
  isOpenNow(): boolean;
  getCurrentOperatingHours(): IDayHours | undefined;
  getDistanceFrom(lat: number, lng: number): number;
}
```

### Type Definitions
```typescript
type Area = 'north' | 'center' | 'south';
type SkateparkStatus = 'active' | 'inactive';
```

## Validation

### Slug Validation
- Must be lowercase
- Can contain only letters, numbers, and hyphens
- Must be unique

### Location Validation
- Coordinates must be valid: longitude [-180, 180], latitude [-90, 90]
- Must be in [longitude, latitude] format

### Time Format Validation
- All time fields must be in HH:mm format
- 24-hour format only
- Example: '09:30', '22:00'

### YouTube URL Validation
- Must be a valid YouTube URL
- Supports youtube.com and youtu.be

### Year Validation
- Opening year: 1900 to current year
- Closing year: Must be >= opening year

### Rating Validation
- Range: 0-5
- Cannot be negative
- Cannot exceed 5

## Middleware

### Pre-save: Sort Images
Images are automatically sorted by order field before saving.

## Best Practices

### 1. Always Use Valid Coordinates
```typescript
// Good: [longitude, latitude]
const location = {
  type: 'Point',
  coordinates: [34.7818, 32.0853], // Tel Aviv
};

// Bad: [latitude, longitude]
const location = {
  type: 'Point',
  coordinates: [32.0853, 34.7818], // Wrong order!
};
```

### 2. Check if Open Before Display
```typescript
const skatepark = await Skatepark.findById(id);
if (skatepark.isOpenNow()) {
  // Show as open
} else {
  const hours = skatepark.getCurrentOperatingHours();
  // Display next open time
}
```

### 3. Use Projection for Large Queries
```typescript
const skateparks = await Skatepark.find({ status: 'active' })
  .select('name location amenities rating');
```

### 4. Leverage Geospatial Index
```typescript
// Uses 2dsphere index for fast location queries
const nearby = await Skatepark.findNearby(32.0853, 34.7818, 10);
```

### 5. Update Ratings Properly
```typescript
// When adding a review
const newRating = 4;
const currentAvg = skatepark.rating;
const currentCount = skatepark.totalReviews;

skatepark.rating = ((currentAvg * currentCount) + newRating) / (currentCount + 1);
skatepark.totalReviews = currentCount + 1;
await skatepark.save();
```

## Query Performance Tips

### 1. Use Lean for Read Operations
```typescript
const skateparks = await Skatepark.find({ status: 'active' })
  .lean(); // Faster, no instance methods
```

### 2. Limit Results
```typescript
const skateparks = await Skatepark.find({ status: 'active' })
  .limit(50)
  .skip(page * 50);
```

### 3. Sort by Indexed Fields
```typescript
const skateparks = await Skatepark.find({ status: 'active' })
  .sort({ createdAt: -1 });
```

### 4. Use Compound Queries
```typescript
const skateparks = await Skatepark.find({
  area: 'center',
  'amenities.parking': true,
  status: 'active',
}).sort({ rating: -1 });
```

## Related Files

- `lib/db/mongodb.ts` - Database connection utility
- `lib/models/Product.ts` - Product model
- `lib/models/User.ts` - User model

## Migration Notes

When migrating from an existing database:

1. **Generate Slugs**
   ```typescript
   const skateparks = await Skatepark.find({ slug: { $exists: false } });
   for (const skatepark of skateparks) {
     skatepark.slug = skatepark.name.en.toLowerCase().replace(/\s+/g, '-');
     await skatepark.save();
   }
   ```

2. **Add Geospatial Index**
   ```typescript
   await Skatepark.createIndex({ location: '2dsphere' });
   ```

3. **Set Default Values**
   ```typescript
   await Skatepark.updateMany(
     { status: { $exists: false } },
     { $set: { status: 'active' } }
   );
   ```

## Testing Example

```typescript
import Skatepark from '@/lib/models/Skatepark';
import { connectDB, disconnectDB } from '@/lib/db/mongodb';

describe('Skatepark Model', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('should create a skatepark with location', async () => {
    const skatepark = new Skatepark({
      slug: 'test-skatepark',
      name: { en: 'Test Park', he: 'פארק בדיקה' },
      address: { en: 'Test St 123', he: 'רחוב בדיקה 123' },
      area: 'center',
      location: {
        type: 'Point',
        coordinates: [34.7818, 32.0853],
      },
      operatingHours: {
        monday: { open: '09:00', close: '18:00', closed: false },
      },
      amenities: {
        entryFee: false,
        parking: true,
        shade: false,
        bathroom: false,
        helmetRequired: false,
        guard: false,
        seating: false,
        bombShelter: false,
        scootersAllowed: true,
        bikesAllowed: false,
        noWax: true,
        nearbyRestaurants: true,
      },
      notes: { en: 'Test notes', he: 'הערות בדיקה' },
      is24Hours: false,
      isFeatured: false,
      status: 'active',
      mediaLinks: {},
      rating: 0,
      totalReviews: 0,
    });

    await skatepark.save();
    expect(skatepark.slug).toBe('test-skatepark');
    expect(skatepark.location.coordinates).toEqual([34.7818, 32.0853]);
  });

  it('should calculate distance correctly', async () => {
    const skatepark = await Skatepark.findBySlug('test-skatepark');
    const distance = skatepark.getDistanceFrom(32.0853, 34.7818); // Same location
    expect(distance).toBeCloseTo(0, 0);
  });

  it('should check if skatepark is open', async () => {
    const skatepark = await Skatepark.findBySlug('test-skatepark');
    // This test depends on the current time
    const isOpen = skatepark.isOpenNow();
    expect(typeof isOpen).toBe('boolean');
  });
});
```

