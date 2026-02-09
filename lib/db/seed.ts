import mongoose from 'mongoose';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { connectDB, disconnectDB } from './mongodb';
import User, { IUser } from '../models/User';
import Product from '../models/Product';
import Event, { IEvent } from '../models/Event';
import EventSignup from '../models/EventSignup';
import Skatepark, { ISkatepark, IOperatingHours, IDaySchedule } from '../models/Skatepark';
import Trainer from '../models/Trainer';
import Guide from '../models/Guide';
import Order from './models/Order';
import Review from './models/Review';

type WithId<T> = T & { _id: mongoose.Types.ObjectId };

const closedDay: IDaySchedule = { isOpen: false };
const defaultOperatingHours: IOperatingHours = {
  sunday: closedDay,
  monday: closedDay,
  tuesday: closedDay,
  wednesday: closedDay,
  thursday: closedDay,
  friday: closedDay,
  saturday: closedDay,
  holidays: closedDay,
};
function mergeHours(partial: Partial<IOperatingHours>): IOperatingHours {
  return { ...defaultOperatingHours, ...partial };
}

// Load environment variables from .env.local (fallback to .env) if MONGODB_URI is missing
(() => {
  if (!process.env.MONGODB_URI) {
    try {
      const envLocal = path.resolve(process.cwd(), '.env.local');
      const envDefault = path.resolve(process.cwd(), '.env');
      // Prefer .env.local if present, else .env
      const targetEnv = fs.existsSync(envLocal) ? envLocal : fs.existsSync(envDefault) ? envDefault : undefined;
      if (targetEnv) {
        // Lazy require to avoid hard dependency if not installed
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('dotenv').config({ path: targetEnv });
        console.log(`🧪 Loaded environment from ${path.basename(targetEnv)}`);
      }
    } catch {
      // If dotenv not installed or any error, continue; connectDB will surface missing URI clearly
    }
  }
})();

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[(\)\[\]\.,!@#$%^&*+?"']/g, '')
    .replace(/\s+/g, '-');
}

function img(urlText: string, bg = '000000', fg = 'FFFFFF'): string {
  const txt = encodeURIComponent(urlText);
  return `https://placehold.co/800x800/${bg}/${fg}/png?text=${txt}`;
}

function nowPlus(days = 0, hours = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(d.getHours() + hours);
  return d;
}

async function confirmDestructive(prompt: string): Promise<boolean> {
  if (process.argv.includes('--yes') || process.argv.includes('--force')) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (q: string) => new Promise<string>((res) => rl.question(q, res));
  const answer = (await question(`${prompt} Type "yes" to continue: `)).trim().toLowerCase();
  rl.close();
  return answer === 'yes';
}

async function clearCollections(session?: mongoose.ClientSession) {
  console.log('🧹 Clearing existing data...');
  const models = [
    Review,
    Order,
    EventSignup,
    Guide,
    Trainer,
    Event,
    Skatepark,
    Product,
    User,
  ];
  for (const model of models) {
    if (session) {
      await (model as any).deleteMany({}, { session });
    } else {
      await (model as any).deleteMany({});
    }
  }
}

export async function seedDatabase() {
  console.log('🚀 Starting seed...');
  await connectDB();

  const proceed = await confirmDestructive('This will delete ALL data in key collections.');
  if (!proceed) {
    console.log('❎ Aborted by user');
    await disconnectDB();
    return;
  }

  const session = await mongoose.startSession();
  let counts = {
    users: 0,
    products: 0,
    skateparks: 0,
    events: 0,
    signups: 0,
    trainers: 0,
    guides: 0,
    orders: 0,
    reviews: 0,
  };

  try {
    // Clear upfront to ensure idempotency even if transaction rolls back later
    await clearCollections();
    await session.withTransaction(async () => {

      console.log('👤 Seeding users...');
      // Admin, Editor, and 3 Users
      const seedUsers: Array<Partial<IUser>> = [
        {
          email: 'admin@enboss.co',
          password: 'Admin123!',
          fullName: 'Admin User',
          role: 'admin' as const,
          addresses: [
            { type: 'home' as const, name: 'Home', street: '1 Admin St', city: 'Tel Aviv', zip: '61000', country: 'IL', isDefault: true },
            { type: 'work' as const, name: 'Office', street: '2 Work Ave', city: 'Ramat Gan', zip: '52000', country: 'IL', isDefault: false },
          ],
          preferences: { language: 'en', colorMode: 'system' as const, emailMarketing: false },
          emailVerified: true,
        },
        {
          email: 'editor@enboss.co',
          password: 'Editor123!',
          fullName: 'Editor User',
          role: 'editor' as const,
          addresses: [
            { type: 'home' as const, name: 'Home', street: '3 Editor Rd', city: 'Jerusalem', zip: '91000', country: 'IL', isDefault: true },
          ],
          preferences: { language: 'en', colorMode: 'light' as const, emailMarketing: true },
        },
        ...['user1@example.com', 'user2@example.com', 'user3@example.com'].map((email, i) => ({
          email,
          password: 'User123!',
          fullName: `Regular User ${i + 1}`,
          role: 'user' as const,
          addresses: [
            { type: 'home' as const, name: 'Home', street: `${10 + i} User St`, city: 'Haifa', zip: '33000', country: 'IL', isDefault: true },
          ],
          preferences: { language: i % 2 === 0 ? 'en' as const : 'he' as const, colorMode: 'system' as const, emailMarketing: i % 2 === 0 },
        })),
      ];
      // Use create() to trigger password hashing pre-save
      const createdUsers = (await Promise.all(seedUsers.map((u) => User.create(u)))).map((u) => u.toObject()) as Array<WithId<IUser>>;
      counts.users = createdUsers.length;

      const getUserByEmail = (email: string) => createdUsers.find((u) => u.email === email)!;

      console.log('🛹 Skipping products (use seed-products.ts to seed products separately)...');
      // Products are now seeded separately via seed-products.ts
      // Query existing products for use in orders
      const createdProducts = await Product.find({}).session(session).lean();
      counts.products = createdProducts.length;

      console.log('🏞️ Seeding skateparks...');
      const parks: Array<Partial<ISkatepark>> = [
        {
          slug: slugify('Tel Aviv Skatepark'),
          name: { en: 'Tel Aviv Skatepark', he: 'Tel Aviv Skatepark (Hebrew)' },
          address: { en: 'Charles Clore Park, Tel Aviv', he: 'Charles Clore Park, Tel Aviv (Hebrew)' },
          area: 'center',
          location: { type: 'Point', coordinates: [34.7618, 32.0853] },
          images: [{ url: img('Tel Aviv Skatepark','000000','FFFFFF'), isFeatured: false, orderNumber: 0 }],
          operatingHours: mergeHours({ sunday: { openingTime: '06:00', closingTime: '23:00', isOpen: true }, friday: { openingTime: '06:00', closingTime: '18:00', isOpen: true }, saturday: { openingTime: '08:00', closingTime: '23:00', isOpen: true } }),
          amenities: { entryFee: false, parking: true, shade: true, bathroom: true, helmetRequired: false, guard: false, seating: true, bombShelter: false, scootersAllowed: true, bikesAllowed: true, noWax: false, nearbyRestaurants: true },
          openingYear: 2018, lightingHours: { is24Hours: false, endTime: '23:00' }, isFeatured: true, status: 'active', notes: { en: ['Central location by the sea.'], he: ['מיקום מרכזי ליד הים (Hebrew)'] },
        },
        {
          slug: slugify('Jerusalem Skatepark'),
          name: { en: 'Jerusalem Skatepark', he: 'Jerusalem Skatepark (Hebrew)' },
          address: { en: 'Teddy Stadium, Jerusalem', he: 'Teddy Stadium, Jerusalem (Hebrew)' },
          area: 'center',
          location: { type: 'Point', coordinates: [35.1900, 31.7510] },
          images: [{ url: img('Jerusalem Skatepark','000000','FFFFFF'), isFeatured: false, orderNumber: 0 }],
          operatingHours: defaultOperatingHours,
          amenities: { entryFee: false, parking: true, shade: false, bathroom: true, helmetRequired: false, guard: false, seating: false, bombShelter: false, scootersAllowed: true, bikesAllowed: true, noWax: false, nearbyRestaurants: true },
          openingYear: 2017, lightingHours: { is24Hours: true, endTime: '23:59' }, isFeatured: false, status: 'active', notes: { en: ['Open 24/7 lighting.'], he: ['פתוח 24/7 עם תאורה (Hebrew)'] },
        },
        {
          slug: slugify('Haifa X-Park'),
          name: { en: 'Haifa X-Park', he: 'Haifa X-Park (Hebrew)' },
          address: { en: 'Hecht Park, Haifa', he: 'Hecht Park, Haifa (Hebrew)' },
          area: 'north',
          location: { type: 'Point', coordinates: [34.9554, 32.8140] },
          images: [{ url: img('Haifa X-Park','000000','FFFFFF'), isFeatured: false, orderNumber: 0 }],
          operatingHours: mergeHours({ sunday: { openingTime: '08:00', closingTime: '22:00', isOpen: true } }),
          amenities: { entryFee: false, parking: true, shade: false, bathroom: false, helmetRequired: true, guard: true, seating: false, bombShelter: false, scootersAllowed: true, bikesAllowed: true, noWax: false, nearbyRestaurants: false },
          openingYear: 2016, lightingHours: { is24Hours: false, endTime: '22:00' }, isFeatured: false, status: 'active', notes: { en: ['Helmet required.'], he: ['חובה קסדה (Hebrew)'] },
        },
        {
          slug: slugify('Eilat Desert Bowl'),
          name: { en: 'Eilat Desert Bowl', he: 'Eilat Desert Bowl (Hebrew)' },
          address: { en: 'Sport Center, Eilat', he: 'Sport Center, Eilat (Hebrew)' },
          area: 'south',
          location: { type: 'Point', coordinates: [34.9498, 29.5577] },
          images: [{ url: img('Eilat Desert Bowl','000000','FFFFFF'), isFeatured: false, orderNumber: 0 }],
          operatingHours: mergeHours({ sunday: { openingTime: '06:00', closingTime: '22:00', isOpen: true } }),
          amenities: { entryFee: false, parking: false, shade: true, bathroom: false, helmetRequired: false, guard: false, seating: true, bombShelter: false, scootersAllowed: true, bikesAllowed: true, noWax: false, nearbyRestaurants: true },
          openingYear: 2019, lightingHours: { is24Hours: false, endTime: '22:00' }, isFeatured: false, status: 'active', notes: { en: ['Desert vibes.'], he: ['אווירת מדבר (Hebrew)'] },
        },
        {
          slug: slugify('Netanya Coastal Park'),
          name: { en: 'Netanya Coastal Park', he: 'Netanya Coastal Park (Hebrew)' },
          address: { en: 'Netanya seafront', he: 'Netanya seafront (Hebrew)' },
          area: 'north',
          location: { type: 'Point', coordinates: [34.8599, 32.3215] },
          images: [{ url: img('Netanya Coastal Park','000000','FFFFFF'), isFeatured: false, orderNumber: 0 }],
          operatingHours: mergeHours({ sunday: { openingTime: '07:00', closingTime: '22:00', isOpen: true } }),
          amenities: { entryFee: false, parking: true, shade: false, bathroom: true, helmetRequired: false, guard: false, seating: false, bombShelter: true, scootersAllowed: true, bikesAllowed: true, noWax: false, nearbyRestaurants: true },
          openingYear: 2021, lightingHours: { is24Hours: false, endTime: '22:00' }, isFeatured: true, status: 'active', notes: { en: ['Coastal winds.'], he: ['רוחות חוף (Hebrew)'] },
        },
        {
          slug: slugify('Beer Sheva Urban Park'),
          name: { en: 'Beer Sheva Urban Park', he: 'Beer Sheva Urban Park (Hebrew)' },
          address: { en: 'Beer Sheva', he: 'Beer Sheva (Hebrew)' },
          area: 'south',
          location: { type: 'Point', coordinates: [34.7925, 31.2520] },
          images: [{ url: img('Beer Sheva Urban Park','000000','FFFFFF'), isFeatured: false, orderNumber: 0 }],
          operatingHours: mergeHours({ sunday: { openingTime: '08:00', closingTime: '23:00', isOpen: true } }),
          amenities: { entryFee: false, parking: false, shade: false, bathroom: false, helmetRequired: false, guard: false, seating: true, bombShelter: false, scootersAllowed: true, bikesAllowed: true, noWax: true, nearbyRestaurants: false },
          openingYear: 2020, lightingHours: { is24Hours: false, endTime: '23:00' }, isFeatured: false, status: 'active', notes: { en: ['No wax policy.'], he: ['אסור ווקס (Hebrew)'] },
        },
      ];
      const createdParks = await Skatepark.insertMany(parks, { session });
      counts.skateparks = createdParks.length;

      const parkBySlug = (slug: string) => createdParks.find((p) => p.slug === slugify(slug))!;

      console.log('📅 Seeding events...');
      const eventsData: Array<Partial<IEvent> & Record<string, unknown>> = [];
      // ENBOSS Summer Jam 2024 - 3 months from now, Tel Aviv
      eventsData.push({
        slug: slugify('ENBOSS Summer Jam 2024'),
        title: { en: 'ENBOSS Summer Jam 2024', he: 'ENBOSS Summer Jam 2024 (Hebrew)' },
        description: { en: 'Annual summer jam with games of SKATE and best trick.', he: 'ג׳אם קיץ שנתי עם משחקי SKATE וטריקים (Hebrew)' },
        shortDescription: { en: 'Big community meetup.', he: 'מפגש קהילה גדול (Hebrew)' },
        startDate: nowPlus(90, 0), endDate: nowPlus(90, 4), timezone: 'Asia/Jerusalem', isAllDay: false,
        location: {
          name: { en: 'Tel Aviv Skatepark', he: 'Tel Aviv Skatepark (Hebrew)' },
          address: parkBySlug('Tel Aviv Skatepark').address,
          coordinates: { lat: parkBySlug('Tel Aviv Skatepark').location.coordinates[1], lng: parkBySlug('Tel Aviv Skatepark').location.coordinates[0] },
        },
        images: [{ url: img('Summer Jam','00AAFF','FFFFFF'), alt: { en: 'Summer Jam', he: 'Summer Jam (Hebrew)' }, order: 0, publicId: 'placeholder:event-summerjam' }],
        featuredImage: { url: img('Summer Jam','00AAFF','FFFFFF'), altText: { en: 'Summer Jam', he: 'Summer Jam (Hebrew)' } },
        relatedSports: ['skateboarding','BMX'],
        category: 'jam',
        organizer: { name: 'ENBOSS', email: 'events@enboss.co' },
        isFree: true, registrationRequired: false, isFeatured: true, status: 'published', tags: ['community'],
      });
      // Beginner Workshop - 2 weeks from now, capacity 20, registration required
      eventsData.push({
        slug: slugify('Beginner Workshop'),
        title: { en: 'Beginner Workshop', he: 'Beginner Workshop (Hebrew)' },
        description: { en: 'Intro to pushing, turning, and stopping safely.', he: 'הקדמה לדחיפה, פניות ועצירה (Hebrew)' },
        shortDescription: { en: 'Perfect for first-timers.', he: 'מושלם למתחילים (Hebrew)' },
        startDate: nowPlus(14, 0), endDate: nowPlus(14, 2), timezone: 'Asia/Jerusalem', isAllDay: false,
        location: { name: { en: 'Tel Aviv Skatepark', he: 'Tel Aviv Skatepark (Hebrew)' }, address: parkBySlug('Tel Aviv Skatepark').address, coordinates: { lat: parkBySlug('Tel Aviv Skatepark').location.coordinates[1], lng: parkBySlug('Tel Aviv Skatepark').location.coordinates[0] } },
        images: [{ url: img('Beginner Workshop','00AAFF','FFFFFF'), alt: { en: 'Beginner Workshop', he: 'Beginner Workshop (Hebrew)' }, order: 0, publicId: 'placeholder:event-beginner' }],
        featuredImage: { url: img('Beginner Workshop','00AAFF','FFFFFF'), altText: { en: 'Beginner Workshop', he: 'Beginner Workshop (Hebrew)' } },
        relatedSports: ['skateboarding'], category: 'workshop', organizer: { name: 'ENBOSS', email: 'events@enboss.co' }, capacity: 20, isFree: true, registrationRequired: true, status: 'published',
      });
      // Night Session - tomorrow 20:00 at Jerusalem
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1); tomorrow.setHours(20,0,0,0);
      const tomorrowEnd = new Date(tomorrow.getTime()+2*60*60*1000);
      eventsData.push({
        slug: slugify('Night Session'),
        title: { en: 'Night Session', he: 'Night Session (Hebrew)' },
        description: { en: 'Chill night sesh under the lights.', he: 'סשן לילה רגוע תחת האורות (Hebrew)' },
        shortDescription: { en: 'All levels welcome.', he: 'לכל הרמות (Hebrew)' },
        startDate: tomorrow, endDate: tomorrowEnd, timezone: 'Asia/Jerusalem', isAllDay: false,
        location: { name: { en: 'Jerusalem Skatepark', he: 'Jerusalem Skatepark (Hebrew)' }, address: parkBySlug('Jerusalem Skatepark').address, coordinates: { lat: parkBySlug('Jerusalem Skatepark').location.coordinates[1], lng: parkBySlug('Jerusalem Skatepark').location.coordinates[0] } },
        images: [{ url: img('Night Session','222222','FFFFFF'), alt: { en: 'Night Session', he: 'Night Session (Hebrew)' }, order: 0, publicId: 'placeholder:event-night' }],
        featuredImage: { url: img('Night Session','222222','FFFFFF'), altText: { en: 'Night Session', he: 'Night Session (Hebrew)' } },
        relatedSports: ['skateboarding','rollerblading','BMX'], category: 'session', organizer: { name: 'ENBOSS', email: 'events@enboss.co' }, isFree: true, registrationRequired: false, status: 'published',
      });
      // ENBOSS Team Demo - 1 month from now
      eventsData.push({
        slug: slugify('ENBOSS Team Demo'),
        title: { en: 'ENBOSS Team Demo', he: 'ENBOSS Team Demo (Hebrew)' },
        description: { en: 'Watch the ENBOSS team throw down at the park.', he: 'צפו בצוות ENBOSS נותן הופעה (Hebrew)' },
        shortDescription: { en: 'Don’t miss it.', he: 'אל תפספסו (Hebrew)' },
        startDate: nowPlus(30, 0), endDate: nowPlus(30, 2), timezone: 'Asia/Jerusalem', isAllDay: false,
        location: { name: { en: 'Netanya Coastal Park', he: 'Netanya Coastal Park (Hebrew)' }, address: parkBySlug('Netanya Coastal Park').address, coordinates: { lat: parkBySlug('Netanya Coastal Park').location.coordinates[1], lng: parkBySlug('Netanya Coastal Park').location.coordinates[0] } },
        images: [{ url: img('Team Demo','AA00FF','FFFFFF'), alt: { en: 'Team Demo', he: 'Team Demo (Hebrew)' }, order: 0, publicId: 'placeholder:event-demo' }],
        featuredImage: { url: img('Team Demo','AA00FF','FFFFFF'), altText: { en: 'Team Demo', he: 'Team Demo (Hebrew)' } },
        relatedSports: ['skateboarding','rollerblading'], category: 'demo', organizer: { name: 'ENBOSS', email: 'events@enboss.co' }, isFree: true, registrationRequired: false, isFeatured: true, status: 'published',
      });

      const createdEvents = await Event.insertMany(eventsData, { session });
      counts.events = createdEvents.length;
      const workshop = createdEvents.find((e) => e.slug === slugify('Beginner Workshop'))!;

      console.log('📝 Seeding event signups...');
      const signupForm = (i: number) => ([
        { name: 'name', type: 'text', value: `Attendee ${i}`, label: 'Name' },
        { name: 'email', type: 'email', value: `attendee${i}@example.com`, label: 'Email' },
        { name: 'experience', type: 'select', value: i % 2 === 0 ? 'beginner' : 'first-time', label: 'Experience' },
      ]);
      const signups = Array.from({ length: 5 }, (_, i) => ({
        eventId: workshop._id,
        eventSlug: workshop.slug,
        formData: signupForm(i + 1),
        userEmail: `attendee${i + 1}@example.com`,
        submittedAt: new Date(),
        confirmationNumber: EventSignup.generateConfirmationNumber(),
        status: 'confirmed' as const,
      }));
      const createdSignups = await EventSignup.insertMany(signups, { session });
      counts.signups = createdSignups.length;

      console.log('🏋️ Seeding trainers...');
      const trainers = [
        {
          slug: slugify('David Cohen'),
          name: { en: 'David Cohen', he: 'David Cohen (Hebrew)' },
          description: { en: 'Skateboarding and rollerblading coach with 10+ years experience.', he: 'מאמן גלישה וסקייטבליידינג עם ניסיון מעל 10 שנים (Hebrew)' },
          shortDescription: { en: 'North area coach', he: 'מאמן באזור הצפון (Hebrew)' },
          profileImage: img('David Cohen','000000','FFFFFF'),
          galleryImages: [ { url: img('David Coaching','000000','FFFFFF'), alt: { en: 'Coaching', he: 'Coaching (Hebrew)' }, order: 0, publicId: 'placeholder:coach1' } ],
          area: 'north', relatedSports: ['skateboarding','rollerblading'],
          contactDetails: { phone: '+972-50-0000001', email: 'david@example.com', visible: true },
          linkedSkateparks: [parkBySlug('Haifa X-Park')._id],
          rating: 4.7, totalReviews: 0, approvedReviews: 0, reviews: [], status: 'active', isFeatured: false, tags: ['beginner','advanced'],
        },
        {
          slug: slugify('Sarah Levi'),
          name: { en: 'Sarah Levi', he: 'Sarah Levi (Hebrew)' },
          description: { en: 'Center area coach for skateboarding and BMX.', he: 'מאמנת סקייטבורד ובי־אם־אקס באזור המרכז (Hebrew)' },
          shortDescription: { en: 'Featured trainer', he: 'מאמנת מובחרת (Hebrew)' },
          profileImage: img('Sarah Levi','000000','FFFFFF'),
          galleryImages: [ { url: img('Sarah Coaching','000000','FFFFFF'), alt: { en: 'Coaching', he: 'Coaching (Hebrew)' }, order: 0, publicId: 'placeholder:coach2' } ],
          area: 'center', relatedSports: ['skateboarding','BMX'],
          contactDetails: { phone: '+972-50-0000002', email: 'sarah@example.com', visible: true },
          linkedSkateparks: [parkBySlug('Tel Aviv Skatepark')._id, parkBySlug('Jerusalem Skatepark')._id],
          rating: 4.9, totalReviews: 0, approvedReviews: 0, reviews: [], status: 'active', isFeatured: true, tags: ['kids','adults'],
        },
        {
          slug: slugify('Mike Johnson'),
          name: { en: 'Mike Johnson', he: 'Mike Johnson (Hebrew)' },
          description: { en: 'All-around extreme sports coach in the south.', he: 'מאמן לכל ענפי האקסטרים בדרום (Hebrew)' },
          shortDescription: { en: 'South area coach', he: 'מאמן בדרום (Hebrew)' },
          profileImage: img('Mike Johnson','000000','FFFFFF'),
          galleryImages: [ { url: img('Mike Coaching','000000','FFFFFF'), alt: { en: 'Coaching', he: 'Coaching (Hebrew)' }, order: 0, publicId: 'placeholder:coach3' } ],
          area: 'south', relatedSports: ['skateboarding','rollerblading','BMX'],
          contactDetails: { phone: '+972-50-0000003', email: 'mike@example.com', visible: true },
          linkedSkateparks: [parkBySlug('Eilat Desert Bowl')._id],
          rating: 4.5, totalReviews: 0, approvedReviews: 0, reviews: [], status: 'active', isFeatured: false, tags: ['all levels'],
        },
      ];
      const createdTrainers = await Trainer.insertMany(trainers, { session });
      counts.trainers = createdTrainers.length;

      console.log('📘 Seeding guides...');
      const author = getUserByEmail('editor@enboss.co');
      const guides = [
        {
          slug: slugify('How to Ollie - Complete Beginner Guide'),
          title: { en: 'How to Ollie - Complete Beginner Guide', he: 'How to Ollie - Complete Beginner Guide (Hebrew)' },
          description: { en: 'Learn to ollie with clear steps and tips.', he: 'למדו אולי בשלבים ברורים וטיפים (Hebrew)' },
          coverImage: img('Ollie Guide','000000','FFFFFF'),
          relatedSports: ['skateboarding'],
          contentBlocks: [
            { type: 'heading', order: 0, heading: { en: 'Introduction', he: 'Introduction (Hebrew)' }, headingLevel: 'h2' },
            { type: 'text', order: 1, text: { en: 'The ollie is the foundation of street skating...', he: 'האולי הוא הבסיס לרכיבה ברחוב... (Hebrew)' } },
          ],
          tags: ['beginner','ollie'], viewsCount: 0, likesCount: 0, rating: 5, ratingCount: 3, status: 'published', isFeatured: true, authorId: author._id, authorName: author.fullName,
        },
        {
          slug: slugify('Skateboard Maintenance 101'),
          title: { en: 'Skateboard Maintenance 101', he: 'Skateboard Maintenance 101 (Hebrew)' },
          description: { en: 'Keep your board in top shape.', he: 'שמרו על הסקייטבורד במצב מעולה (Hebrew)' },
          coverImage: img('Maintenance','000000','FFFFFF'), relatedSports: ['skateboarding'], contentBlocks: [ { type: 'list', order: 0, listType: 'numbered', listItems: [ { en: 'Clean bearings', he: 'ניקוי מיסבים (Hebrew)' }, { en: 'Tighten hardware', he: 'הידוק ברגים (Hebrew)' } ] } ], tags: ['maintenance'], status: 'published', isFeatured: false, authorId: author._id, authorName: author.fullName,
        },
        {
          slug: slugify('Choosing Your First Skateboard'),
          title: { en: 'Choosing Your First Skateboard', he: 'Choosing Your First Skateboard (Hebrew)' },
          description: { en: 'What to buy as a beginner.', he: 'מה לקנות למתחילים (Hebrew)' },
          coverImage: img('First Board','000000','FFFFFF'), relatedSports: ['skateboarding'], contentBlocks: [ { type: 'text', order: 0, text: { en: 'Deck width, trucks, and wheels matter...', he: 'רוחב דק, טרקס וגלגלים חשובים... (Hebrew)' } } ], tags: ['buyer-guide'], status: 'published', isFeatured: false, authorId: author._id, authorName: author.fullName,
        },
        {
          slug: slugify('Skatepark Etiquette'),
          title: { en: 'Skatepark Etiquette', he: 'Skatepark Etiquette (Hebrew)' },
          description: { en: 'Rules and tips for sharing the park.', he: 'כללים וטיפים לשיתוף הפארק (Hebrew)' },
          coverImage: img('Etiquette','000000','FFFFFF'), relatedSports: ['skateboarding','rollerblading','BMX'], contentBlocks: [ { type: 'text', order: 0, text: { en: 'Wait your turn, call your drop...', he: 'לחכות לתור, לקרוא כניסה... (Hebrew)' } } ], tags: ['rules'], status: 'published', isFeatured: false, authorId: author._id, authorName: author.fullName,
        },
      ];
      const createdGuides = await Guide.insertMany(guides, { session });
      counts.guides = createdGuides.length;

      console.log('🛒 Seeding orders...');
      const u1 = getUserByEmail('user1@example.com');
      const u2 = getUserByEmail('user2@example.com');
      const u3 = getUserByEmail('user3@example.com');
      
      // Find products by slug (products should be seeded separately via seed-products.ts)
      const pHoodie = createdProducts.find((p: any) => p.slug === slugify('ENBOSS Hoodie'));
      const pDeck = createdProducts.find((p: any) => p.slug === slugify('ENBOSS Skateboard Deck'));
      const pWax = createdProducts.find((p: any) => p.slug === slugify('ENBOSS Skate Wax'));
      
      // Skip orders if products don't exist
      if (!pHoodie || !pDeck || !pWax) {
        console.log('⚠️  Skipping orders - products not found. Please run seed-products.ts first.');
        counts.orders = 0;
      } else {

      const orderFrom = (user: WithId<IUser>, product: typeof pHoodie, colorHex: string, size: string, qty: number, status: any) => {
        const variant = product.variants.find((v) => v.color.hex === colorHex)!;
        const sizeVar = variant.sizes.find((s) => s.size === size)!;
        const itemSubtotal = (product.discountPrice ?? product.price) * qty;
        const shipping = 20; const tax = 0; const discount = 0; const subtotal = itemSubtotal; const total = subtotal + shipping + tax - discount;
        return {
          userId: String(user._id),
          customerInfo: { firstName: user.fullName.split(' ')[0] || 'User', lastName: user.fullName.split(' ')[1] || 'Test', email: user.email, phone: '+972-50-0000000' },
          items: [{ productId: String(product._id), productName: product.name.en, productSlug: product.slug, variantId: `${product.slug}-${variant.color.hex}`, sku: sizeVar.sku, color: variant.color.hex, size: sizeVar.size, price: product.price, discountPrice: product.discountPrice, quantity: qty, imageUrl: product.images[0]?.url || img(product.name.en), subtotal: itemSubtotal }],
          shippingAddress: { address1: user.addresses?.[0]?.street || 'Test 1', city: user.addresses?.[0]?.city || 'Tel Aviv', province: 'IL', country: 'IL', zip: user.addresses?.[0]?.zip || '00000' },
          paymentMethod: 'credit_card', status, subtotal, shipping, tax, discount, total,
        };
      };

        const orderData = [
          orderFrom(u1, pHoodie, '#000000', 'M', 1, 'pending'),
          orderFrom(u2, pDeck, '#FF6600', '8.0', 1, 'paid'),
          orderFrom(u3, pWax, '#CCCCCC', 'STD', 2, 'shipped'),
        ];
        const createdOrders = await Promise.all(orderData.map(async (d) => {
          const doc = new Order(d as any);
          if (!doc.orderNumber) {
            await (doc as any).generateOrderNumber();
          }
          await doc.save({ session });
          return doc;
        }));
        counts.orders = createdOrders.length;
      }

      console.log('⭐ Seeding reviews...');
      // Skatepark reviews using standalone Review model
      const reviewer = getUserByEmail('user1@example.com');
      const tlv = parkBySlug('Tel Aviv Skatepark');
      const jlm = parkBySlug('Jerusalem Skatepark');
      const reviews = [
        { entityType: 'skatepark' as const, entityId: tlv._id, slug: tlv.slug, userId: reviewer._id, userName: reviewer.fullName, rating: 5, comment: 'Amazing lines and perfect ledges. Love the sea breeze and the scene there for long evening sessions.', status: 'approved' as const },
        { entityType: 'skatepark' as const, entityId: tlv._id, slug: tlv.slug, userId: getUserByEmail('user2@example.com')._id, userName: getUserByEmail('user2@example.com').fullName, rating: 4, comment: 'Great park though it can get crowded. Best to come early mornings for space and flow.', status: 'approved' as const },
        { entityType: 'skatepark' as const, entityId: jlm._id, slug: jlm.slug, userId: getUserByEmail('user3@example.com')._id, userName: getUserByEmail('user3@example.com').fullName, rating: 3, comment: 'Fun at night with the lights but surface is a bit rough. Still a solid session spot.', status: 'approved' as const },
      ];
      const createdReviews = await Review.insertMany(reviews, { session });
      counts.reviews += createdReviews.length;

      // Trainer embedded reviews
      const trSarah = createdTrainers.find((t) => t.slug === slugify('Sarah Levi'))!;
      const trDavid = createdTrainers.find((t) => t.slug === slugify('David Cohen'))!;
      trSarah.reviews.push({ userId: reviewer._id, userName: reviewer.fullName, rating: 5, comment: 'Sarah is patient and super clear. Progressed fast!', isApproved: true, createdAt: new Date() } as any);
      trSarah.reviews.push({ userId: getUserByEmail('user2@example.com')._id, userName: getUserByEmail('user2@example.com').fullName, rating: 4, comment: 'Great coach, solid drills and tips.', isApproved: true, createdAt: new Date() } as any);
      trDavid.reviews.push({ userId: getUserByEmail('user3@example.com')._id, userName: getUserByEmail('user3@example.com').fullName, rating: 5, comment: 'David helped me land my first ollie!', isApproved: true, createdAt: new Date() } as any);
      await Promise.all([trSarah.save({ session }), trDavid.save({ session })]);
      counts.reviews += 3;

      console.log('✅ Seed data created successfully within transaction');
    });
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    throw err;
  } finally {
    await session.endSession();
    await disconnectDB();
  }

  console.log('🎉 Seed complete:');
  console.table(counts);
}

// Run if executed directly via CLI
if (require.main === module) {
  seedDatabase().catch((err) => {
    console.error('Seed exited with error:', err);
    process.exit(1);
  });
}


