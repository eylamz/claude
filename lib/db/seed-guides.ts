import mongoose from 'mongoose';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { connectDB, disconnectDB } from './mongodb';
import Guide, { IGuide } from '../models/Guide';
import User from '../models/User';

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

export async function seedGuides() {
  console.log('📘 Starting guide seed...');
  await connectDB();

  const proceed = await confirmDestructive('This will delete ALL guide data in the database.');
  if (!proceed) {
    console.log('❎ Aborted by user');
    await disconnectDB();
    return;
  }

  const session = await mongoose.startSession();
  let count = 0;

  try {
    // Delete all existing guides
    console.log('🧹 Clearing existing guide data...');
    await Guide.deleteMany({});

    await session.withTransaction(async () => {
      console.log('📘 Seeding guides...');
      
      // Find or create an author user
      let author = await User.findOne({ email: 'editor@enboss.co' }).session(session);
      if (!author) {
        // Create a default editor user if it doesn't exist
        author = await User.create([{
          email: 'editor@enboss.co',
          password: 'Editor123!',
          fullName: 'Editor User',
          role: 'editor',
        }], { session });
        author = Array.isArray(author) ? author[0] : author;
        console.log('👤 Created default editor user for guides');
      }

      const guidesData: Array<Partial<IGuide>> = [];

      // Guide 1: How to Ollie - Complete Beginner Guide
      guidesData.push({
        slug: slugify('How to Ollie - Complete Beginner Guide'),
        title: {
          en: 'How to Ollie - Complete Beginner Guide',
          he: 'איך לעשות אולי - מדריך למתחילים',
        },
        description: {
          en: 'Learn the fundamental trick of skateboarding. Master the ollie with step-by-step instructions, tips, and common mistakes to avoid.',
          he: 'למדו את הטריק הבסיסי של סקייטבורדינג. שלטו באולי עם הוראות שלב אחר שלב, טיפים ושגיאות נפוצות להימנע מהן.',
        },
        coverImage: img('Ollie Guide', '000000', 'FFFFFF'),
        relatedSports: ['skateboarding'],
        contentBlocks: [
          {
            type: 'heading',
            order: 0,
            heading: {
              en: 'Introduction to the Ollie',
              he: 'מבוא לאולי',
            },
            headingLevel: 'h2',
          },
          {
            type: 'text',
            order: 1,
            text: {
              en: 'The ollie is the foundation of street skating. It\'s the first trick every skater learns and opens the door to hundreds of other tricks. This guide will walk you through everything you need to know to master this essential move.',
              he: 'האולי הוא הבסיס לרכיבה ברחוב. זה הטריק הראשון שכל סקייטר לומד ופותח את הדלת למאות טריקים אחרים. המדריך הזה יעביר אתכם דרך כל מה שאתם צריכים לדעת כדי לשלוט בתנועה החיונית הזו.',
            },
          },
          {
            type: 'heading',
            order: 2,
            heading: {
              en: 'Step-by-Step Instructions',
              he: 'הוראות שלב אחר שלב',
            },
            headingLevel: 'h2',
          },
          {
            type: 'list',
            order: 3,
            listType: 'numbered',
            listItems: [
              {
                en: 'Position your feet: Back foot on the tail, front foot in the middle of the board',
                he: 'מיקום הרגליים: רגל אחורית על הזנב, רגל קדמית באמצע הלוח',
              },
              {
                en: 'Bend your knees and crouch down slightly',
                he: 'כופפו את הברכיים והתכופפו מעט',
              },
              {
                en: 'Pop the tail down hard with your back foot',
                he: 'פוצצו את הזנב למטה בחוזקה עם הרגל האחורית',
              },
              {
                en: 'Slide your front foot up the board while jumping',
                he: 'החליקו את הרגל הקדמית למעלה על הלוח תוך כדי קפיצה',
              },
              {
                en: 'Level out the board in the air',
                he: 'ישרו את הלוח באוויר',
              },
              {
                en: 'Land with both feet on the bolts',
                he: 'נחתו עם שתי הרגליים על הברגים',
              },
            ],
          },
          {
            type: 'heading',
            order: 4,
            heading: {
              en: 'Common Mistakes',
              he: 'שגיאות נפוצות',
            },
            headingLevel: 'h3',
          },
          {
            type: 'list',
            order: 5,
            listType: 'bullet',
            listItems: [
              {
                en: 'Not popping hard enough - the board won\'t leave the ground',
                he: 'לא פוצצים חזק מספיק - הלוח לא יעזוב את הקרקע',
              },
              {
                en: 'Forgetting to slide the front foot - the board won\'t level out',
                he: 'שוכחים להחליק את הרגל הקדמית - הלוח לא יתיישר',
              },
              {
                en: 'Looking down instead of forward - affects balance',
                he: 'מסתכלים למטה במקום קדימה - משפיע על שיווי המשקל',
              },
            ],
          },
          {
            type: 'heading',
            order: 6,
            heading: {
              en: 'Practice Tips',
              he: 'טיפים לתרגול',
            },
            headingLevel: 'h3',
          },
          {
            type: 'text',
            order: 7,
            text: {
              en: 'Start by practicing on grass or carpet to get the motion down without worrying about falling. Once you\'re comfortable, move to a smooth, flat surface. Practice daily, even if it\'s just for 15 minutes. Consistency is key!',
              he: 'התחילו בתרגול על דשא או שטיח כדי להבין את התנועה בלי לדאוג מנפילה. ברגע שתרגישו נוח, עברו למשטח חלק ושטוח. תרגלו מדי יום, אפילו רק 15 דקות. עקביות היא המפתח!',
            },
          },
          {
            type: 'divider',
            order: 8,
          },
        ],
        tags: ['beginner', 'ollie', 'tutorial', 'skateboarding'],
        viewsCount: 0,
        likesCount: 0,
        rating: 4.8,
        ratingCount: 15,
        status: 'published',
        isFeatured: true,
        authorId: author._id,
        authorName: author.fullName,
        publishedAt: new Date(),
        metaTitle: {
          en: 'How to Ollie - Complete Beginner Skateboarding Guide',
          he: 'איך לעשות אולי - מדריך סקייטבורדינג למתחילים',
        },
        metaDescription: {
          en: 'Master the ollie with our complete beginner guide. Step-by-step instructions, tips, and common mistakes to avoid.',
          he: 'שלטו באולי עם המדריך המלא שלנו למתחילים. הוראות שלב אחר שלב, טיפים ושגיאות נפוצות להימנע מהן.',
        },
      });

      // Guide 2: Skateboard Maintenance 101
      guidesData.push({
        slug: slugify('Skateboard Maintenance 101'),
        title: {
          en: 'Skateboard Maintenance 101',
          he: 'תחזוקת סקייטבורד 101',
        },
        description: {
          en: 'Keep your skateboard in top condition with regular maintenance. Learn how to clean bearings, replace grip tape, and extend your board\'s lifespan.',
          he: 'שמרו על הסקייטבורד שלכם במצב מעולה עם תחזוקה קבועה. למדו איך לנקות מיסבים, להחליף גריפ טייפ ולהאריך את חיי הלוח.',
        },
        coverImage: img('Maintenance Guide', '333333', 'FFFFFF'),
        relatedSports: ['skateboarding'],
        contentBlocks: [
          {
            type: 'heading',
            order: 0,
            heading: {
              en: 'Why Maintenance Matters',
              he: 'למה תחזוקה חשובה',
            },
            headingLevel: 'h2',
          },
          {
            type: 'text',
            order: 1,
            text: {
              en: 'Regular maintenance keeps your board rolling smoothly, extends its lifespan, and prevents accidents. A well-maintained board performs better and is safer to ride.',
              he: 'תחזוקה קבועה שומרת על הלוח שלכם מתגלגל בצורה חלקה, מאריכה את חייו ומונעת תאונות. לוח מתוחזק היטב מתפקד טוב יותר ובטוח יותר לרכיבה.',
            },
          },
          {
            type: 'heading',
            order: 2,
            heading: {
              en: 'Cleaning Your Bearings',
              he: 'ניקוי המיסבים שלכם',
            },
            headingLevel: 'h2',
          },
          {
            type: 'text',
            order: 3,
            text: {
              en: 'Dirty bearings slow you down and can cause premature wear. Clean them every few months or when they start making noise.',
              he: 'מיסבים מלוכלכים מאטים אתכם ויכולים לגרום לשחיקה מוקדמת. נקו אותם כל כמה חודשים או כשהם מתחילים להשמיע רעש.',
            },
          },
          {
            type: 'list',
            order: 4,
            listType: 'numbered',
            listItems: [
              {
                en: 'Remove the bearings from the wheels using a skate tool or bearing press',
                he: 'הסירו את המיסבים מהגלגלים באמצעות כלי סקייט או לחיצת מיסבים',
              },
              {
                en: 'Soak bearings in isopropyl alcohol or bearing cleaner for 10-15 minutes',
                he: 'השרו את המיסבים באלכוהול איזופרופיל או מנקה מיסבים למשך 10-15 דקות',
              },
              {
                en: 'Gently scrub with a toothbrush to remove dirt and grime',
                he: 'שפשפו בעדינות עם מברשת שיניים כדי להסיר לכלוך וזוהמה',
              },
              {
                en: 'Dry completely and apply 2-3 drops of bearing lubricant',
                he: 'ייבשו לחלוטין והחילו 2-3 טיפות של חומר סיכה למיסבים',
              },
              {
                en: 'Reinstall bearings and test the wheels',
                he: 'התקינו מחדש את המיסבים ובדקו את הגלגלים',
              },
            ],
          },
          {
            type: 'heading',
            order: 5,
            heading: {
              en: 'Replacing Grip Tape',
              he: 'החלפת גריפ טייפ',
            },
            headingLevel: 'h2',
          },
          {
            type: 'text',
            order: 6,
            text: {
              en: 'When your grip tape loses its grip or gets too dirty, it\'s time for a replacement. This is a straightforward process that takes about 15 minutes.',
              he: 'כשהגריפ טייפ שלכם מאבד את האחיזה או מתלכלך מדי, הגיע הזמן להחלפה. זה תהליך פשוט שלוקח כ-15 דקות.',
            },
          },
          {
            type: 'list',
            order: 7,
            listType: 'bullet',
            listItems: [
              {
                en: 'Peel off the old grip tape starting from one corner',
                he: 'קלפו את הגריפ טייפ הישן החל מפינה אחת',
              },
              {
                en: 'Clean the deck surface with a damp cloth',
                he: 'נקו את משטח הלוח עם מטלית לחה',
              },
              {
                en: 'Align the new grip tape and press down from the center outward',
                he: 'יישרו את הגריפ טייפ החדש ולחצו מהמרכז החוצה',
              },
              {
                en: 'Use a file or razor to trim the edges',
                he: 'השתמשו בקובץ או תער כדי לחתוך את הקצוות',
              },
            ],
          },
          {
            type: 'heading',
            order: 8,
            heading: {
              en: 'Regular Check-Ups',
              he: 'בדיקות קבועות',
            },
            headingLevel: 'h2',
          },
          {
            type: 'list',
            order: 9,
            listType: 'bullet',
            listItems: [
              {
                en: 'Check truck tightness weekly - loose trucks can cause accidents',
                he: 'בדקו את הדחיסות של הטרקס מדי שבוע - טרקס רופפים יכולים לגרום לתאונות',
              },
              {
                en: 'Inspect wheels for flat spots or excessive wear',
                he: 'בדקו את הגלגלים לכתמים שטוחים או שחיקה מוגזמת',
              },
              {
                en: 'Look for cracks in the deck, especially around the truck mounts',
                he: 'חפשו סדקים בלוח, במיוחד סביב נקודות חיבור הטרקס',
              },
              {
                en: 'Ensure all hardware is tight and secure',
                he: 'ודאו שכל החומרה הדוקה ומאובטחת',
              },
            ],
          },
          {
            type: 'divider',
            order: 10,
          },
        ],
        tags: ['maintenance', 'tutorial', 'skateboarding', 'care'],
        viewsCount: 0,
        likesCount: 0,
        rating: 4.6,
        ratingCount: 8,
        status: 'published',
        isFeatured: false,
        authorId: author._id,
        authorName: author.fullName,
        publishedAt: new Date(),
        metaTitle: {
          en: 'Skateboard Maintenance Guide - Keep Your Board in Top Shape',
          he: 'מדריך תחזוקת סקייטבורד - שמרו על הלוח במצב מעולה',
        },
        metaDescription: {
          en: 'Learn how to maintain your skateboard with our comprehensive guide. Clean bearings, replace grip tape, and keep your board rolling smoothly.',
          he: 'למדו איך לתחזק את הסקייטבורד שלכם עם המדריך המקיף שלנו. נקו מיסבים, החליפו גריפ טייפ ושמרו על הלוח מתגלגל בצורה חלקה.',
        },
      });

      const createdGuides = await Guide.insertMany(guidesData, { session });
      count = createdGuides.length;

      console.log('✅ Guide data created successfully within transaction');
    });
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    throw err;
  } finally {
    await session.endSession();
    await disconnectDB();
  }

  console.log('🎉 Guide seed complete:');
  console.log(`   Created ${count} guide(s)`);
}

// Run if executed directly via CLI
if (require.main === module) {
  seedGuides().catch((err) => {
    console.error('Guide seed exited with error:', err);
    process.exit(1);
  });
}

