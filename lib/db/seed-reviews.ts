import mongoose from 'mongoose';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { connectDB, disconnectDB } from './mongodb';
import Skatepark from '../models/Skatepark';
import Review from './models/Review';

// Load environment variables from .env.local (fallback to .env) if MONGODB_URI is missing
(() => {
  if (!process.env.MONGODB_URI) {
    try {
      const envLocal = path.resolve(process.cwd(), '.env.local');
      const envDefault = path.resolve(process.cwd(), '.env');
      const targetEnv = fs.existsSync(envLocal) ? envLocal : fs.existsSync(envDefault) ? envDefault : undefined;
      if (targetEnv) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('dotenv').config({ path: targetEnv });
        console.log(`🧪 Loaded environment from ${path.basename(targetEnv)}`);
      }
    } catch {
      // If dotenv not installed or any error, continue
    }
  }
})();

// Hebrew names (written in English)
const hebrewNames = [
  'Yossi Cohen', 'Shira Levi', 'Avi Ben-David', 'Noa Mizrahi', 'Eitan Rosen',
  'Tamar Goldstein', 'Daniel Shalom', 'Maya Avraham', 'Ronen Katz', 'Lior Barak',
  'Neta Dahan', 'Omer Shlomo', 'Hila Meir', 'Itay Peretz', 'Adi Yosef',
  'Roni Ashkenazi', 'Tal Friedman', 'Guy Biton', 'Shani Golan', 'Ido Carmi',
  'Noy Shapira', 'Yuval Dayan', 'Or Ben-Shalom', 'Raz Sharabi', 'Eden Harari',
  'Liav Shmueli', 'Nimrod Alon', 'Shay Cohen', 'Yael Baruch', 'Amir Shalev',
  'Dana Regev', 'Tom Ben-Ami', 'Galit Mor', 'Roi Segal', 'Michal Hadad',
  'Erez Kadosh', 'Sharon Givon', 'Nadav Tzur', 'Keren Shani', 'Oren Zohar',
  'Liran Shaked', 'Rotem Ben-Yehuda', 'Yarden Shalev', 'Barak Elazar', 'Tomer Avrahami',
  'Shiraz Cohen', 'Amitai Levi', 'Nitzan Bar-On', 'Ravid Shalom', 'Yonatan Mizrahi'
];

// English names
const englishNames = [
  'John Smith', 'Emily Johnson', 'Michael Brown', 'Sarah Davis', 'David Wilson',
  'Jessica Martinez', 'James Anderson', 'Ashley Taylor', 'Christopher Thomas', 'Amanda Jackson',
  'Matthew White', 'Lauren Harris', 'Joshua Martin', 'Stephanie Thompson', 'Daniel Garcia',
  'Nicole Rodriguez', 'Ryan Lewis', 'Michelle Walker', 'Kevin Hall', 'Rachel Young',
  'Brandon King', 'Samantha Wright', 'Justin Lopez', 'Brittany Hill', 'Tyler Scott',
  'Megan Green', 'Jordan Adams', 'Kayla Baker', 'Austin Nelson', 'Hannah Carter'
];

// Hebrew review comments
const hebrewComments = [
  '×¤××¨×§ ×ž×¢×•×œ×” ×¢× ××•×¨×•×ª ×˜×•×‘×™× ×‘×œ×™×œ×”. ×ž×’×™×¢×™× ×›×œ ×©×‘×•×¢ ×¢× ×”×—×‘×¨\'×”.',
  '×”×ž×©×˜×—×™× ×—×œ×§×™× ×•×”×¨×ž×¤×•×ª ×ž×§×¦×•×¢×™×•×ª. ×ž×•×ž×œ×¥ ×ž××•×“!',
  '×¤××¨×§ ×§×˜×Ÿ ××‘×œ × ×¢×™×. ×œ× ×ª×ž×™×“ ×™×© ×ž×§×•× ××‘×œ ×”××•×•×™×¨×” ×˜×•×‘×”.',
  '×”×’×¢× ×• ×¢× ×”×™×œ×“×™× ×•×”× ××”×‘×•. ×™×© ×ž×§×•×ž×•×ª ×™×©×™×‘×” ×œ×”×•×¨×™×.',
  '×¤××¨×§ ×—×“×© ×¢× ×¦×™×•×“ ×ž×•×“×¨× ×™. ×¢×“×™×™×Ÿ ×œ× ×›×œ ×›×š ×ž×•×›×¨ ××– ×™×© ×ž×§×•×.',
  '××™×Ÿ ×—× ×™×” ×§×¨×•×‘×” ××‘×œ ×©×•×•×” ××ª ×”×ž××ž×¥. ×¤××¨×§ ×ž×§×¦×•×¢×™.',
  '×”××•×•×™×¨×” ×›××Ÿ ×ž×“×”×™×ž×”. ×”×¨×‘×” ×¨×•×›×‘×™× ×ž×§×¦×•×¢×™×™× ×©×ž×¡×‘×™×¨×™× ×˜×¨×™×§×™×.',
  '×¤××¨×§ ×§×˜×Ÿ ××‘×œ ×ž×ª×•×—×–×§ ×”×™×˜×‘. ×¦×•×•×ª × ×™×§×™×•×Ÿ ×ž×’×™×¢ ×›×œ ×™×•×.',
  '×™×© ×¤×” ×›×œ ×ž×” ×©×¦×¨×™×š: ×¨×ž×¤×•×ª, ×¨×™×™×œ×™×, ×‘×•×§×¡×™×. ×ž×•×©×œ×!',
  '×”×’×¢× ×• ×‘×©×¢×•×ª ×”×¢×¨×‘ ×•×”×™×” ×ž×œ× ×× ×©×™×. ×¢×“×™×£ ×œ×”×’×™×¢ ×‘×‘×•×§×¨.',
  '×¤××¨×§ ×¢× × ×•×£ ×ž×“×”×™×. ×¨×•×›×‘×™× ×¢× ×”×™× ×‘×¨×§×¢ - ×—×•×•×™×” ×ž×™×•×—×“×ª.',
  '×”×ž×©×˜×— ×§×¦×ª ×ž×—×•×¡×¤×¡ ××‘×œ ×”×¨×ž×¤×•×ª ×˜×•×‘×•×ª. ×¦×¨×™×š ×œ×”×™×–×”×¨.',
  '×™×© ×¤×” ×ž×§×œ×˜ ××‘×œ ×œ× ×¦×¨×™×š ×œ×“××•×’ - ×”××•×•×™×¨×” ×¨×’×•×¢×”.',
  '×¤××¨×§ ×’×“×•×œ ×¢× ×”×¨×‘×” ××¤×©×¨×•×™×•×ª. ×ž×ª××™× ×œ×›×œ ×”×¨×ž×•×ª.',
  '×”×’×¢× ×• ×‘×™×•× ×©×™×©×™ ×•×”×™×” ×©×§×˜. ×ž×•×©×œ× ×œ×ž×™ ×©×¨×•×¦×” ×œ×”×ª××ž×Ÿ.',
  '××™×Ÿ ×¤×” ×©×™×¨×•×ª×™× ××‘×œ ×™×© ×ž×¡×¢×“×•×ª ×§×¨×•×‘×•×ª. ×¤××¨×§ × ×§×™.',
  '×”××•×¨×•×ª ×¢×•×‘×“×™× ×ž×¦×•×™×Ÿ ×‘×œ×™×œ×”. ××¤×©×¨ ×œ×¨×›×•×‘ ×¢×“ ×ž××•×—×¨.',
  '×¤××¨×§ ×¢× ×”×™×¡×˜×•×¨×™×”. ×”×¨×‘×” ×¨×•×›×‘×™× ×ž×¤×•×¨×¡×ž×™× ×¨×›×‘×• ×›××Ÿ.',
  '×”×ž×§×•× ×ž×ª×•×—×–×§ ×ž×¦×•×™×Ÿ. ×¦×•×•×ª ×¢×™×¨×•× ×™ ×¢×•×‘×“ ×§×©×” ×œ×©×ž×•×¨ ×¢×œ×™×•.',
  '×™×© ×¤×” ×ž×§×•× ×’× ×œ×¨×•×œ×¨×‘×œ×™×™×“×™× ×•×’× ×œ×¡×§×™×™×˜×‘×•×¨×“. ×›×•×œ× ×‘×™×—×“.',
  '×¤××¨×§ ×§×˜×Ÿ ××‘×œ ×¢× ××•×¤×™. ×”×§×”×™×œ×” ×›××Ÿ ×ž××•×“ ×ª×•×ž×›×ª.',
  '×”×’×¢× ×• ×‘×¡×•×£ ×”×©×‘×•×¢ ×•×”×™×” ×¦×¤×•×£. ×¢×“×™×£ ×‘×™×•× ×—×•×œ.',
  '×”×ž×©×˜×—×™× ×—×œ×§×™× ×›×ž×• ×§×¨×—. ×ž×•×©×œ× ×œ×˜×¨×™×§×™× ×ž×”×™×¨×™×.',
  '×™×© ×¤×” ×©×•×ž×¨ ××‘×œ ×”×•× ×ž××•×“ × ×—×ž×“. ×¢×•×–×¨ ×œ×ž×ª×—×™×œ×™×.',
  '×¤××¨×§ ×¢× ×”×¨×‘×” ×¦×œ. ×ž×•×©×œ× ×œ×¨×›×™×‘×” ×‘×§×™×¥.',
  '×”×’×¢× ×• ×¢× ×”×¡×§×™×™×˜×‘×•×¨×“ ×”×—×“×© ×•×–×” ×”×™×” ×ž×•×©×œ×. ×¤××¨×§ ×ž×§×¦×•×¢×™.',
  '×™×© ×¤×” ×’× ×ž×§×•× ×œ-BMX. ×ž×’×•×•×Ÿ ×¨×—×‘ ×©×œ ×¨×•×›×‘×™×.',
  '×”×¤××¨×§ × ×ž×¦× ×‘×ž×§×•× ×ž×¨×›×–×™. ×§×œ ×œ×”×’×™×¢ ×‘×ª×—×‘×•×¨×” ×¦×™×‘×•×¨×™×ª.',
  '×”××•×•×™×¨×” ×ž×©×¤×—×ª×™×ª. ×”×•×¨×™× ×•×™×œ×“×™× ×¨×•×›×‘×™× ×‘×™×—×“.',
  '×¤××¨×§ ×¢× ×”×¨×‘×” ××¤×©×¨×•×™×•×ª. ×›×œ ×¤×¢× ×ž×’×œ×™× ×ž×©×”×• ×—×“×©.',
  '×”×ž×§×•× × ×§×™ ×•×ž×¡×•×“×¨. ×™×© ×¤×—×™ ××©×¤×” ×‘×›×œ ×¤×™× ×”.',
  '×”×’×¢× ×• ×‘×©×¢×•×ª ×”×‘×•×§×¨ ×”×ž×•×§×“×ž×•×ª ×•×”×™×” ×©×§×˜. ×ž×•×©×œ× ×œ×”×ª××ž×Ÿ.',
  '×™×© ×¤×” ×¨×ž×¤×•×ª ×œ×›×œ ×”×¨×ž×•×ª. ×ž×ª×—×™×œ×™× ×•×ž×ª×§×“×ž×™× ×‘×™×—×“.',
  '×”×¤××¨×§ ×ž×ª×•×—×–×§ ×ž×¦×•×™×Ÿ. ×œ× ×¨×•××™× ×’×¨×¤×™×˜×™ ××• × ×–×§×™×.',
  '×”××•×¨×•×ª ×—×–×§×™× ×‘×œ×™×œ×”. ××¤×©×¨ ×œ×¨××•×ª ×”×›×œ ×‘×‘×™×¨×•×¨.',
  '×¤××¨×§ ×¢× × ×•×£ ×¢×™×¨×•× ×™. ×¨×•×›×‘×™× ×¢× ×”×¢×™×¨ ×‘×¨×§×¢.',
  '×™×© ×¤×” ×ž×§×•× ×’× ×œ×¨×•×œ×¨×‘×œ×™×™×“×™×. ×›×•×œ× ×ž×§×‘×œ×™× ×ž×§×•×.',
  '×”×ž×©×˜×—×™× ×—×œ×§×™× ×•×ž×§×¦×•×¢×™×™×. ×ž×•×©×œ× ×œ×˜×¨×™×§×™× ×˜×›× ×™×™×.',
  '×”×’×¢× ×• ×‘×¡×•×£ ×”×©×‘×•×¢ ×•×”×™×” ×›×™×£. ×”×¨×‘×” ×× ×©×™× ××‘×œ ×›×•×œ× × ×—×ž×“×™×.',
  '×¤××¨×§ ×¢× ×”×™×¡×˜×•×¨×™×” ××¨×•×›×”. ×—×œ×§ ×ž×”×§×”×™×œ×” ×”×ž×§×•×ž×™×ª.',
  '×™×© ×¤×” ×’× ×ž×§×•× ×œ-BMX. ×ž×’×•×•×Ÿ ×¨×—×‘ ×©×œ ×¤×¢×™×œ×•×™×•×ª.',
  '×”×¤××¨×§ × ×ž×¦× ×œ×™×“ ×”×™×. ×¨×•×— × ×¢×™×ž×” ×‘×§×™×¥.',
  '×”×ž×§×•× ×ž×ª×•×—×–×§ ×ž×¦×•×™×Ÿ. ×¦×•×•×ª ×¢×™×¨×•× ×™ ×¢×•×‘×“ ×§×©×”.',
  '×™×© ×¤×” ×ž×§×œ×˜ ××‘×œ ×œ× ×¦×¨×™×š ×œ×“××•×’. ×”××•×•×™×¨×” ×¨×’×•×¢×”.',
  '×”××•×¨×•×ª ×¢×•×‘×“×™× ×ž×¦×•×™×Ÿ. ××¤×©×¨ ×œ×¨×›×•×‘ ×¢×“ ×ž××•×—×¨ ×‘×œ×™×œ×”.',
  '×¤××¨×§ ×§×˜×Ÿ ××‘×œ ×¢× ××•×¤×™. ×”×§×”×™×œ×” ×›××Ÿ ×ª×•×ž×›×ª.',
  '×”×’×¢× ×• ×¢× ×”×™×œ×“×™× ×•×”× ××”×‘×•. ×ž×§×•× ×‘×˜×•×— ×•×ž×ª×•×—×–×§.',
  '×”×ž×©×˜×—×™× ×—×œ×§×™×. ×ž×•×©×œ× ×œ×˜×¨×™×§×™× ×ž×”×™×¨×™×.',
  '×™×© ×¤×” ×©×•×ž×¨ × ×—×ž×“. ×¢×•×–×¨ ×œ×ž×ª×—×™×œ×™× ×•×ž×¡×‘×™×¨.',
  '×¤××¨×§ ×¢× ×”×¨×‘×” ××¤×©×¨×•×™×•×ª. ×›×œ ×¤×¢× ×ž×’×œ×™× ×ž×©×”×• ×—×“×©.'
];

// English review comments
const englishComments = [
  'Great park with excellent lighting at night. We come here every week with the crew.',
  'Smooth surfaces and professional ramps. Highly recommended!',
  'Small but nice park. Not always space but the vibe is good.',
  'Came with the kids and they loved it. There are seating areas for parents.',
  'New park with modern equipment. Still not very known so there\'s space.',
  'No nearby parking but worth the effort. Professional park.',
  'The atmosphere here is amazing. Lots of pro riders explaining tricks.',
  'Small park but well maintained. Cleaning crew comes every day.',
  'Has everything you need: ramps, rails, boxes. Perfect!',
  'Came in the evening and it was packed. Better to come in the morning.',
  'Park with amazing views. Riding with the sea in the background - special experience.',
  'Surface is a bit rough but the ramps are good. Need to be careful.',
  'There\'s a bomb shelter here but no need to worry - the atmosphere is relaxed.',
  'Big park with lots of options. Suitable for all levels.',
  'Came on Friday and it was quiet. Perfect for those who want to practice.',
  'No bathrooms here but there are nearby restaurants. Clean park.',
  'The lights work great at night. Can ride until late.',
  'Park with history. Many famous riders skated here.',
  'The place is well maintained. City crew works hard to keep it up.',
  'There\'s space for both rollerblades and skateboards. Everyone together.',
  'Small park but with character. The community here is very supportive.',
  'Came on the weekend and it was crowded. Better on weekdays.',
  'Surfaces are smooth as ice. Perfect for fast tricks.',
  'There\'s a guard here but he\'s very nice. Helps beginners.',
  'Park with lots of shade. Perfect for summer riding.',
  'Came with the new skateboard and it was perfect. Professional park.',
  'There\'s also space for BMX. Wide variety of riders.',
  'The park is in a central location. Easy to reach by public transport.',
  'Family atmosphere. Parents and kids ride together.',
  'Park with lots of options. Every time you discover something new.',
  'The place is clean and organized. Trash cans in every corner.',
  'Came in the early morning hours and it was quiet. Perfect for training.',
  'There are ramps for all levels. Beginners and advanced together.',
  'The park is well maintained. No graffiti or damage visible.',
  'The lights are strong at night. Can see everything clearly.',
  'Park with urban views. Riding with the city in the background.',
  'There\'s space for rollerblades too. Everyone gets a spot.',
  'Surfaces are smooth and professional. Perfect for technical tricks.',
  'Came on the weekend and it was fun. Lots of people but everyone is nice.',
  'Park with long history. Part of the local community.',
  'There\'s also space for BMX. Wide variety of activities.',
  'The park is near the sea. Nice breeze in summer.',
  'The place is well maintained. City crew works hard.',
  'There\'s a bomb shelter but no need to worry. The atmosphere is relaxed.',
  'The lights work great. Can ride until late at night.',
  'Small park but with character. The community here is supportive.',
  'Came with the kids and they loved it. Safe and well-maintained place.',
  'Surfaces are smooth. Perfect for fast tricks.',
  'There\'s a nice guard here. Helps beginners and explains.',
  'Park with lots of options. Every time you discover something new.'
];

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(daysAgo: number = 365): Date {
  const now = new Date();
  const daysBack = getRandomInt(0, daysAgo);
  const hoursBack = getRandomInt(0, 23);
  const minutesBack = getRandomInt(0, 59);
  const date = new Date(now);
  date.setDate(date.getDate() - daysBack);
  date.setHours(hoursBack, minutesBack, 0, 0);
  return date;
}

async function confirmDestructive(prompt: string): Promise<boolean> {
  if (process.argv.includes('--yes') || process.argv.includes('--force')) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (q: string) => new Promise<string>((res) => rl.question(q, res));
  const answer = (await question(`${prompt} Type "yes" to continue: `)).trim().toLowerCase();
  rl.close();
  return answer === 'yes';
}

export async function seedReviews() {
  console.log('🚀 Starting review seed...');
  await connectDB();

  const proceed = await confirmDestructive('This will add reviews to skateparks. Existing reviews will remain.');
  if (!proceed) {
    console.log('❎ Aborted by user');
    await disconnectDB();
    return;
  }

  const session = await mongoose.startSession();
  let totalReviews = 0;
  const parkCounts: Record<string, number> = {};

  try {
    await session.withTransaction(async () => {
      const skateparkSlugs = [
        'dimona',
        'mitzpe-ramon',
        'raanana',
        'jerusalem-gan-sacher',
        'haifa',
        'kfar-yona',
        'modiin-buchman',
        'modiin-moriah',
        'ashdod',
        'petah-tikva-kfar-ganim-c',
        'gedera',
        'rishon-lezion',
        'netanya',
        'sderot',
        'eilat',
        'ramat-gan-kiryat-krinitsi',
        'ramla',
        'nahariya',
        'zichron-yaakov',
        'kidron',
        'givatayim',
        'hadera',
        'herzliya',
        'ramat-gan-national-park',
        'jerusalem-har-homa',
        'holon',
        'tel-aviv-ramat-hahayal',
        'tel-aviv',
        'beer-sheva',
        'beer-sheva-bike',
        'yehud',
        'kiryat-gat',
        'tzur-yigal',
        'rosh-haayin',
        'ariel',
        'caesarea',
        'petah-tikva-kiryat-arye',
        'kfar-saba',
        'kiryat-ata',
        'bat-yam',
        'jerusalem-gan-hapaamon',
        'kadima-zoran',
        'lod',
        'hod-hasharon',
        'ness-ziona'
      ];

      console.log(`ðŸ“ 📝 Seeding reviews for ${skateparkSlugs.length} skateparks...`);

      for (const slug of skateparkSlugs) {
        const skatepark = await Skatepark.findOne({ slug: slug.toLowerCase() }).session(session);
        
        if (!skatepark) {
          console.log(`âš ï¸  ⚠️  Skatepark "${slug}" not found, skipping...`);
          continue;
        }

        // Random number of reviews between 1 and 30
        const numReviews = getRandomInt(1, 30);
        const reviews: any[] = [];

        for (let i = 0; i < numReviews; i++) {
          // 75% chance of Hebrew review, 25% English
          const isHebrew = Math.random() < 0.75;
          const name = isHebrew ? getRandomElement(hebrewNames) : getRandomElement(englishNames);
          const comment = isHebrew ? getRandomElement(hebrewComments) : getRandomElement(englishComments);
          const rating = getRandomInt(1, 5);
          const createdAt = getRandomDate(365);

          // Create a random ObjectId for userId
          const userId = new mongoose.Types.ObjectId();

          reviews.push({
            entityType: 'skatepark' as const,
            entityId: skatepark._id,
            slug: skatepark.slug,
            userId: userId,
            userName: name,
            rating: rating,
            comment: comment,
            helpfulCount: getRandomInt(0, 15),
            reportsCount: 0,
            status: 'approved' as const,
            createdAt: createdAt,
            updatedAt: createdAt,
          });
        }

        if (reviews.length > 0) {
          await Review.insertMany(reviews, { session });
          parkCounts[slug] = reviews.length;
          totalReviews += reviews.length;
          console.log(`  âœ“ ✓ ${slug}: ${reviews.length} reviews`);
        }
      }

      console.log('✅ Reviews seeded successfully');
    });
  } catch (err) {
    console.error('❌ Seeding reviews failed:', err);
    throw err;
  } finally {
    await session.endSession();
    await disconnectDB();
  }

  console.log('\n🎉 Review seed complete!');
  console.log(`Total reviews created: ${totalReviews}`);
}
