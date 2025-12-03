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
  'פארק מעולה עם אורות טובים בלילה. מגיעים כל שבוע עם החבר\'ה.',
  'המשטחים חלקים והרמפות מקצועיות. מומלץ מאוד!',
  'פארק קטן אבל נעים. לא תמיד יש מקום אבל האווירה טובה.',
  'הגענו עם הילדים והם אהבו. יש מקומות ישיבה להורים.',
  'פארק חדש עם ציוד מודרני. עדיין לא כל כך מוכר אז יש מקום.',
  'אין חניה קרובה אבל שווה את המאמץ. פארק מקצועי.',
  'האווירה כאן מדהימה. הרבה רוכבים מקצועיים שמסבירים טריקים.',
  'פארק קטן אבל מתוחזק היטב. צוות ניקיון מגיע כל יום.',
  'יש פה כל מה שצריך: רמפות, ריילים, בוקסים. מושלם!',
  'הגענו בשעות הערב והיה מלא אנשים. עדיף להגיע בבוקר.',
  'פארק עם נוף מדהים. רוכבים עם הים ברקע - חוויה מיוחדת.',
  'המשטח קצת מחוספס אבל הרמפות טובות. צריך להיזהר.',
  'יש פה מקלט אבל לא צריך לדאוג - האווירה רגועה.',
  'פארק גדול עם הרבה אפשרויות. מתאים לכל הרמות.',
  'הגענו ביום שישי והיה שקט. מושלם למי שרוצה להתאמן.',
  'אין פה שירותים אבל יש מסעדות קרובות. פארק נקי.',
  'האורות עובדים מצוין בלילה. אפשר לרכוב עד מאוחר.',
  'פארק עם היסטוריה. הרבה רוכבים מפורסמים רכבו כאן.',
  'המקום מתוחזק מצוין. צוות עירוני עובד קשה לשמור עליו.',
  'יש פה מקום גם לרולרבליידים וגם לסקייטבורד. כולם ביחד.',
  'פארק קטן אבל עם אופי. הקהילה כאן מאוד תומכת.',
  'הגענו בסוף השבוע והיה צפוף. עדיף ביום חול.',
  'המשטחים חלקים כמו קרח. מושלם לטריקים מהירים.',
  'יש פה שומר אבל הוא מאוד נחמד. עוזר למתחילים.',
  'פארק עם הרבה צל. מושלם לרכיבה בקיץ.',
  'הגענו עם הסקייטבורד החדש וזה היה מושלם. פארק מקצועי.',
  'יש פה גם מקום ל-BMX. מגוון רחב של רוכבים.',
  'הפארק נמצא במקום מרכזי. קל להגיע בתחבורה ציבורית.',
  'האווירה משפחתית. הורים וילדים רוכבים ביחד.',
  'פארק עם הרבה אפשרויות. כל פעם מגלים משהו חדש.',
  'המקום נקי ומסודר. יש פחי אשפה בכל פינה.',
  'הגענו בשעות הבוקר המוקדמות והיה שקט. מושלם להתאמן.',
  'יש פה רמפות לכל הרמות. מתחילים ומתקדמים ביחד.',
  'הפארק מתוחזק מצוין. לא רואים גרפיטי או נזקים.',
  'האורות חזקים בלילה. אפשר לראות הכל בבירור.',
  'פארק עם נוף עירוני. רוכבים עם העיר ברקע.',
  'יש פה מקום גם לרולרבליידים. כולם מקבלים מקום.',
  'המשטחים חלקים ומקצועיים. מושלם לטריקים טכניים.',
  'הגענו בסוף השבוע והיה כיף. הרבה אנשים אבל כולם נחמדים.',
  'פארק עם היסטוריה ארוכה. חלק מהקהילה המקומית.',
  'יש פה גם מקום ל-BMX. מגוון רחב של פעילויות.',
  'הפארק נמצא ליד הים. רוח נעימה בקיץ.',
  'המקום מתוחזק מצוין. צוות עירוני עובד קשה.',
  'יש פה מקלט אבל לא צריך לדאוג. האווירה רגועה.',
  'האורות עובדים מצוין. אפשר לרכוב עד מאוחר בלילה.',
  'פארק קטן אבל עם אופי. הקהילה כאן תומכת.',
  'הגענו עם הילדים והם אהבו. מקום בטוח ומתוחזק.',
  'המשטחים חלקים. מושלם לטריקים מהירים.',
  'יש פה שומר נחמד. עוזר למתחילים ומסביר.',
  'פארק עם הרבה אפשרויות. כל פעם מגלים משהו חדש.'
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

      console.log(`📝 Seeding reviews for ${skateparkSlugs.length} skateparks...`);

      for (const slug of skateparkSlugs) {
        const skatepark = await Skatepark.findOne({ slug: slug.toLowerCase() }).session(session);
        
        if (!skatepark) {
          console.log(`⚠️  Skatepark "${slug}" not found, skipping...`);
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
          console.log(`  ✓ ${slug}: ${reviews.length} reviews`);
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
  console.log(`Total reviews created: ${totalReviews}`);import mongoose from 'mongoose';
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
  
  // Hebrew review comments (Conversational, fewer commas/dots)
  const hebrewComments = [
    'פארק מעולה עם אורות טובים בלילה מגיעים כל שבוע',
    'הרצפה חלקה והרמפות כיפיות ממש',
    'פארק קטן אבל נעים לא תמיד יש מקום אבל האווירה טובה',
    'הילדים נהנו מאוד יש מקום ישיבה להורים זה פלוס',
    'חדש ומודרני עדיין לא מפוצץ אז יש מקום להתאמן',
    'אין חניה קרובה אבל שווה את הטרחה פארק רמה',
    'הווייב פה מטורף רוכבים ותיקים עוזרים למתחילים',
    'מתוחזק היטב צוות ניקיון מגיע יום כן יום לא',
    'יש פה רמפות ריילים בוקסים מושלם לכל טריק',
    'באנו בערב היה עמוס בטירוף עדיף לבוא בבוקר מוקדם',
    'נוף יפה רכיבה מול הים חוויה מיוחדת במינה',
    'המשטח קצת שחוק אבל הרמפות עדיין מחזיקות צריך להיזהר',
    'יש פה גם מקלט שזה חשוב אבל האווירה תמיד רגועה',
    'ענק עם מלא אופציות מתאים לכל רמה',
    'יום שישי בבוקר שקט וטוב לאימונים רציניים',
    'אין שירותים בסביבה זה מינוס אבל יש מסעדות קרובות',
    'התאורה חזקה אפשר לרכוב עד מאוחר בלי בעיה',
    'פארק ותיק חלק מהנוף המקומי הרבה אגדות גדלו פה',
    'העירייה עושה עבודה טובה בשמירה על המקום',
    'יש איזור נפרד לקורקינטים וסקייטבורדים כולם מסתדרים',
    'קל להגיע בתחבצ',
    'הכל נקי ומסודר',
    'צריך עוד מקום לשבת אבל חוץ מזה הכל מושלם',
    'באמת אחד הפארקים הכי טובים שראיתי בארץ',
    'הרמפות גדולות בזוויות תענוג',
  ];
  
  // English review comments (Conversational, fewer commas/dots)
  const englishComments = [
    'Great park good lights at night come here every week',
    'Surfaces are smooth ramps are pro highly recommend it',
    'Small but nice not always space but the vibe is cool',
    'Kids loved it lots of seating for parents which is great',
    'New modern gear not too crowded yet plenty of space to skate',
    'No parking close by but totally worth the walk pro park',
    'The atmosphere here is insane pro riders showing tricks',
    'Well maintained cleaning crew comes almost daily',
    'Got all the obstacles ramps rails boxes perfect spot',
    'Came at night was super packed better hit it early morning',
    'Amazing ocean view riding with the sunset felt special',
    'Surface is a bit worn out but the ramps are okay careful though',
    'They even have a bomb shelter but the atmosphere is always chill',
    'Huge park so many lines to try great for all skill levels',
    'Friday morning was quiet perfect for serious practice',
    'No public restrooms bummer but many nearby cafes',
    'Lights are super strong can ride past midnight easily',
    'Old school park legends skated here part of the history',
    'City council keeps the place clean good job guys',
    'Separate area for scooters and skateboards everyone gets along',
    'Very central easy to get to by bus',
    'The city crew is awesome keeping everything tidy',
    'Could use more benches but otherwise everything is perfect',
    'Seriously one of the best parks I have seen in Israel',
    'The ramps are big and fast a real pleasure',
  ];
  
  /**
   * Interface for a fixed review object.
   */
  interface FixedReview {
    userName: string;
    comment: string;
    rating: number;
    // How many days ago the review was posted (makes date generation deterministic)
    daysAgo: number;
    // Optional: set a specific helpful count
    helpfulCount?: number;
  }
  
  /**
   * 💥 נתוני ביקורות קבועים (לא אקראיים) 💥
   *
   * כדי לערוך ביקורות ספציפיות, שנה את הנתונים ישירות כאן.
   * ניתן להשתמש ברשימות השמות והתגובות הקיימות (hebrewNames[i], englishComments[j])
   * או להזין טקסט חופשי.
   */
  const FIXED_REVIEWS_DATA: Record<string, FixedReview[]> = {
    'dimona': [
      {
        userName: hebrewNames[0], // יוסי כהן
        comment: hebrewComments[0], // פארק מעולה עם אורות טובים בלילה מגיעים כל שבוע עם החבר\'ה
        rating: 5,
        daysAgo: 10,
        helpfulCount: 8,
      },
      {
        userName: englishNames[2], // Michael Brown
        comment: englishComments[5], // No nearby parking but worth the walk pro park
        rating: 4,
        daysAgo: 120,
        helpfulCount: 1,
      },
      {
        userName: hebrewNames[45], // שירז כהן
        comment: hebrewComments[11], // המשטח קצת שחוק אבל הרמפות עדיין מחזיקות צריך להיזהר
        rating: 3,
        daysAgo: 30,
        helpfulCount: 3,
      },
      {
        userName: hebrewNames[10],
        comment: 'קטן אבל מספיק בשביל כמה שעות של הנאה',
        rating: 4,
        daysAgo: 50,
        helpfulCount: 0,
      },
    ],
    'raanana': [
      {
        userName: hebrewNames[3], // נועה מזרחי
        comment: hebrewComments[3], // הילדים נהנו מאוד יש מקום ישיבה להורים זה פלוס
        rating: 5,
        daysAgo: 5,
        helpfulCount: 12,
      },
      {
        userName: englishNames[0], // John Smith
        comment: englishComments[9], // Came at night was super packed better hit it early morning
        rating: 3,
        daysAgo: 60,
        helpfulCount: 0,
      },
      {
        userName: hebrewNames[1], // שירה לוי
        comment: hebrewComments[1], // המשטחים חלקים והרמפות מקצועיות מומלץ מאוד
        rating: 5,
        daysAgo: 20,
        helpfulCount: 15,
      },
      {
        userName: englishNames[18],
        comment: englishComments[23], // Seriously one of the best parks I have seen in Israel
        rating: 5,
        daysAgo: 100,
        helpfulCount: 20,
      },
      {
        userName: hebrewNames[7],
        comment: hebrewComments[22], // צריך עוד מקום לשבת אבל חוץ מזה הכל מושלם
        rating: 4,
        daysAgo: 2,
        helpfulCount: 7,
      },
    ],
    'jerusalem-gan-sacher': [
      {
        userName: hebrewNames[12], // הילה מאיר
        comment: hebrewComments[13], // ענק עם מלא אופציות מתאים לכל רמה
        rating: 5,
        daysAgo: 15,
        helpfulCount: 18,
      },
      {
        userName: hebrewNames[29], // עמיר שליו
        comment: hebrewComments[17], // פארק ותיק חלק מהנוף המקומי הרבה אגדות גדלו פה
        rating: 4,
        daysAgo: 300,
        helpfulCount: 11,
      },
      {
        userName: englishNames[4], // David Wilson
        comment: englishComments[19], // Separate area for scooters and skateboards everyone gets along
        rating: 4,
        daysAgo: 45,
        helpfulCount: 4,
      },
      {
        userName: hebrewNames[35],
        comment: 'המקום מתוחזק אבל יש חלקים שדורשים שיפוץ קל עדיין שווה ביקור',
        rating: 3,
        daysAgo: 90,
        helpfulCount: 6,
      },
    ],
    'tel-aviv': [
      {
        userName: englishNames[10], // Matthew White
        comment: englishComments[10], // Amazing ocean view riding with the sunset felt special
        rating: 5,
        daysAgo: 8,
        helpfulCount: 30,
      },
      {
        userName: hebrewNames[27], // שי כהן
        comment: hebrewComments[20], // במקום מרכזי קל להגיע בתחבורה ציבורית
        rating: 5,
        daysAgo: 15,
        helpfulCount: 15,
      },
      {
        userName: englishNames[8],
        comment: englishComments[16], // Lights are super strong can ride past midnight easily
        rating: 5,
        daysAgo: 50,
        helpfulCount: 22,
      },
      {
        userName: hebrewNames[16],
        comment: 'האמת די צפוף רוב הזמן אבל האווירה מחשמלת',
        rating: 4,
        daysAgo: 1,
        helpfulCount: 9,
      },
    ],
    
    // סט ביקורות ברירת מחדל לכל פארק שאין לו הגדרה ספציפית למעלה
    '_default': [
      {
        userName: hebrewNames[10], // נטע דהן
        comment: hebrewComments[10], // נוף יפה רכיבה מול הים חוויה מיוחדת במינה
        rating: 4,
        daysAgo: 30,
        helpfulCount: 5,
      },
      {
        userName: englishNames[15], // Nicole Rodriguez
        comment: englishComments[14], // Friday morning was quiet perfect for serious practice
        rating: 5,
        daysAgo: 15,
        helpfulCount: 2,
      },
      {
        userName: hebrewNames[20],
        comment: hebrewComments[6], // הווייב פה מטורף רוכבים ותיקים עוזרים למתחילים
        rating: 5,
        daysAgo: 90,
        helpfulCount: 14,
      }
    ]
  };
  
  /**
   * Calculates a date based on how many days ago it was.
   * @param daysAgo - The number of days in the past.
   * @returns A Date object.
   */
  function getDateFromDaysAgo(daysAgo: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    // Set a fixed time for consistency (e.g., 10:00 AM)
    date.setHours(10, 0, 0, 0);
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
    console.log('🚀 Starting fixed review seed...');
    await connectDB();
  
    // שינוי הודעת האזהרה כדי שתשקף שמדובר בביקורות קבועות
    const proceed = await confirmDestructive('This will add fixed, non-random reviews to skateparks. Existing reviews will remain.');
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
  
        console.log(`📝 Seeding fixed reviews for ${skateparkSlugs.length} skateparks...`);
  
        for (const slug of skateparkSlugs) {
          const skatepark = await Skatepark.findOne({ slug: slug.toLowerCase() }).session(session);
          
          if (!skatepark) {
            console.log(`⚠️  Skatepark "${slug}" not found, skipping...`);
            continue;
          }
  
          // 1. Determine which fixed reviews to use
          const reviewsToCreate = FIXED_REVIEWS_DATA[slug] || FIXED_REVIEWS_DATA._default;
          
          // 2. Map the fixed data into the Mongoose Review structure
          const reviews = reviewsToCreate.map(fixedReview => {
            const createdAt = getDateFromDaysAgo(fixedReview.daysAgo);
            // Create a random ObjectId for userId for each unique review
            const userId = new mongoose.Types.ObjectId();
            
            return {
              entityType: 'skatepark' as const,
              entityId: skatepark._id,
              slug: skatepark.slug,
              userId: userId,
              userName: fixedReview.userName,
              rating: fixedReview.rating,
              comment: fixedReview.comment,
              helpfulCount: fixedReview.helpfulCount ?? 0, // Use the fixed count or 0
              reportsCount: 0,
              status: 'approved' as const,
              createdAt: createdAt,
              updatedAt: createdAt,
            };
          });
  
          if (reviews.length > 0) {
            await Review.insertMany(reviews, { session });
            parkCounts[slug] = reviews.length;
            totalReviews += reviews.length;
            console.log(`  ✓ ${slug}: ${reviews.length} fixed reviews`);
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
    console.log('\nReviews per park:');
    console.table(parkCounts);
  }
  
  // Run if executed directly via CLI
  if (require.main === module) {
    seedReviews().catch((err) => {
      console.error('Review seed exited with error:', err);
      process.exit(1);
    });
  }
  console.log('\nReviews per park:');
  console.table(parkCounts);
}

// Run if executed directly via CLI
if (require.main === module) {
  seedReviews().catch((err) => {
    console.error('Review seed exited with error:', err);
    process.exit(1);
  });
}

