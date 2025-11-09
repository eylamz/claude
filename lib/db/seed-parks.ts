import mongoose from 'mongoose';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { connectDB, disconnectDB } from './mongodb';
import Skatepark, { ISkatepark } from '../models/Skatepark';

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

async function confirmDestructive(prompt: string): Promise<boolean> {
  if (process.argv.includes('--yes') || process.argv.includes('--force')) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (q: string) => new Promise<string>((res) => rl.question(q, res));
  const answer = (await question(`${prompt} Type "yes" to continue: `)).trim().toLowerCase();
  rl.close();
  return answer === 'yes';
}

export async function seedParks() {
  console.log('🏞️ Starting park seed...');
  await connectDB();

  const proceed = await confirmDestructive('This will delete ALL skatepark data in the database.');
  if (!proceed) {
    console.log('❎ Aborted by user');
    await disconnectDB();
    return;
  }

  const session = await mongoose.startSession();
  let count = 0;

  try {
    // Delete all existing parks
    console.log('🧹 Clearing existing skatepark data...');
    await Skatepark.deleteMany({});

    await session.withTransaction(async () => {
      console.log('🏞️ Seeding park template...');

      // Create comprehensive park template with all fields
      const parkTemplate: Partial<ISkatepark> = {
        slug: slugify('ENBOSS Premium Skatepark'),
        name: {
          en: 'ENBOSS Premium Skatepark',
          he: 'ENBOSS פארק סקייטבורד פרימיום',
        },
        status: 'active',
        address: {
          en: '123 Skatepark Boulevard, Tel Aviv, Israel',
          he: 'רחוב פארק סקייטבורד 123, תל אביב, ישראל',
        },
        area: 'center',
        location: {
          type: 'Point',
          coordinates: [34.7618, 32.0853], // [longitude, latitude] - Tel Aviv coordinates
        },
        images: [
          // 17 images with different order numbers and featured status
          { url: img('Park Entrance', '000000', 'FFFFFF'), isFeatured: true, orderNumber: 0 },
          { url: img('Main Bowl', '111111', 'FFFFFF'), isFeatured: false, orderNumber: 1 },
          { url: img('Street Section', '222222', 'FFFFFF'), isFeatured: false, orderNumber: 2 },
          { url: img('Mini Ramp', '333333', 'FFFFFF'), isFeatured: false, orderNumber: 3 },
          { url: img('Vert Ramp', '444444', 'FFFFFF'), isFeatured: false, orderNumber: 4 },
          { url: img('Ledges Area', '555555', 'FFFFFF'), isFeatured: false, orderNumber: 5 },
          { url: img('Rails Section', '666666', 'FFFFFF'), isFeatured: false, orderNumber: 6 },
          { url: img('Gap Jump', '777777', 'FFFFFF'), isFeatured: false, orderNumber: 7 },
          { url: img('Quarter Pipe', '888888', 'FFFFFF'), isFeatured: false, orderNumber: 8 },
          { url: img('Viewing Area', '999999', 'FFFFFF'), isFeatured: false, orderNumber: 9 },
          { url: img('Parking Lot', 'AAAAAA', 'FFFFFF'), isFeatured: false, orderNumber: 10 },
          { url: img('Seating Area', 'BBBBBB', 'FFFFFF'), isFeatured: false, orderNumber: 11 },
          { url: img('Night View', 'CCCCCC', 'FFFFFF'), isFeatured: false, orderNumber: 12 },
          { url: img('Aerial View', 'DDDDDD', 'FFFFFF'), isFeatured: false, orderNumber: 13 },
          { url: img('Skate Session', 'EEEEEE', 'FFFFFF'), isFeatured: false, orderNumber: 14 },
          { url: img('Facilities', 'FFFFFF', '000000'), isFeatured: false, orderNumber: 15 },
          { url: img('Community Area', 'FF0000', 'FFFFFF'), isFeatured: false, orderNumber: 16 },
          { url: img('Community Area', 'FF0000', 'FFFFFF'), isFeatured: false, orderNumber: 17 },
        ],
        operatingHours: {
          sunday: {
            openingTime: '06:00',
            closingTime: '23:00',
            isOpen: true,
          },
          monday: {
            openingTime: '06:00',
            closingTime: '23:00',
            isOpen: true,
          },
          tuesday: {
            openingTime: '06:00',
            closingTime: '23:00',
            isOpen: true,
          },
          wednesday: {
            openingTime: '06:00',
            closingTime: '23:00',
            isOpen: true,
          },
          thursday: {
            openingTime: '06:00',
            closingTime: '23:00',
            isOpen: true,
          },
          friday: {
            openingTime: '06:00',
            closingTime: '18:00',
            isOpen: true,
          },
          saturday: {
            openingTime: '08:00',
            closingTime: '23:00',
            isOpen: true,
          },
          holidays: {
            openingTime: '08:00',
            closingTime: '22:00',
            isOpen: true,
          },
        },
        lightingHours: {
          endTime: '23:00',
          is24Hours: false,
        },
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
          bikesAllowed: true,
          noWax: false,
          nearbyRestaurants: true,
        },
        openingYear: 2020,
        closingYear: undefined, // Not closed
        notes: {
          en: [
            'Premium skatepark featuring world-class facilities including multiple bowls, street sections, vert ramps, and dedicated areas for all skill levels.',
            'Open year-round with excellent lighting for night sessions.',
            'Community-focused with regular events and competitions.',
            'Located in the heart of Tel Aviv with easy access to public transportation and nearby amenities.',
          ],
          he: [
            'פארק סקייטבורד פרימיום עם מתקנים ברמה עולמית כולל מספר קערות, אזורי רחוב, רמפות ורט ואזורים ייעודיים לכל הרמות.',
            'פתוח כל השנה עם תאורה מעולה לסשנים ליליים.',
            'מתמקד בקהילה עם אירועים ותחרויות קבועים.',
            'ממוקם בלב תל אביב עם גישה קלה לתחבורה ציבורית ואמנות קרובות.',
          ],
        },
        isFeatured: true,
        status: 'active',
        mediaLinks: {
          youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          googleMapsFrame: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3381.1234567890!2d34.7618!3d32.0853!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzLCsDA1JzA3LjEiTiAzNMKwNDUnMzQuNSJF!5e0!3m2!1sen!2sil!4v1234567890123!5m2!1sen!2sil" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>',
        },
        rating: 4.8,
        totalReviews: 127,
      };

      const createdPark = await Skatepark.create([parkTemplate], { session });
      count = createdPark.length;

      console.log('✅ Park template created successfully within transaction');
    });
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    throw err;
  } finally {
    await session.endSession();
    await disconnectDB();
  }

  console.log('🎉 Park seed complete:');
  console.log(`   Created ${count} park(s)`);
}

// Run if executed directly via CLI
if (require.main === module) {
  seedParks().catch((err) => {
    console.error('Park seed exited with error:', err);
    process.exit(1);
  });
}

