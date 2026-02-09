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
        const created = await User.create([{
          email: 'editor@enboss.co',
          password: 'Editor123!',
          fullName: 'Editor User',
          role: 'editor',
        }], { session });
        author = (Array.isArray(created) ? created[0] : created) as NonNullable<typeof author>;
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
        contentBlocks: {
          en: [
            {
              type: 'heading',
              order: 0,
              heading: 'Introduction to the Ollie',
              headingLevel: 'h2',
            },
            {
              type: 'text',
              order: 1,
              text: 'The ollie is the foundation of street skating. It\'s the first trick every skater learns and opens the door to hundreds of other tricks. This guide will walk you through everything you need to know to master this essential move.',
            },
            {
              type: 'heading',
              order: 2,
              heading: 'Step-by-Step Instructions',
              headingLevel: 'h2',
            },
            {
              type: 'list',
              order: 3,
              listType: 'numbered',
              listItems: [
                { title: '', content: 'Position your feet: Back foot on the tail, front foot in the middle of the board' },
                { title: '', content: 'Bend your knees and crouch down slightly' },
                { title: '', content: 'Pop the tail down hard with your back foot' },
                { title: '', content: 'Slide your front foot up the board while jumping' },
                { title: '', content: 'Level out the board in the air' },
                { title: '', content: 'Land with both feet on the bolts' },
              ],
            },
            {
              type: 'heading',
              order: 4,
              heading: 'Common Mistakes',
              headingLevel: 'h3',
            },
            {
              type: 'list',
              order: 5,
              listType: 'bullet',
              listItems: [
                { title: '', content: 'Not popping hard enough - the board won\'t leave the ground' },
                { title: '', content: 'Forgetting to slide the front foot - the board won\'t level out' },
                { title: '', content: 'Looking down instead of forward - affects balance' },
              ],
            },
            {
              type: 'heading',
              order: 6,
              heading: 'Practice Tips',
              headingLevel: 'h3',
            },
            {
              type: 'text',
              order: 7,
              text: 'Start by practicing on grass or carpet to get the motion down without worrying about falling. Once you\'re comfortable, move to a smooth, flat surface. Practice daily, even if it\'s just for 15 minutes. Consistency is key!',
            },
            {
              type: 'divider',
              order: 8,
            },
          ],
          he: [
            {
              type: 'heading',
              order: 0,
              heading: 'מבוא לאולי',
              headingLevel: 'h2',
            },
            {
              type: 'text',
              order: 1,
              text: 'האולי הוא הבסיס לרכיבה ברחוב. זה הטריק הראשון שכל סקייטר לומד ופותח את הדלת למאות טריקים אחרים. המדריך הזה יעביר אתכם דרך כל מה שאתם צריכים לדעת כדי לשלוט בתנועה החיונית הזו.',
            },
            {
              type: 'heading',
              order: 2,
              heading: 'הוראות שלב אחר שלב',
              headingLevel: 'h2',
            },
            {
              type: 'list',
              order: 3,
              listType: 'numbered',
              listItems: [
                { title: '', content: 'מיקום הרגליים: רגל אחורית על הזנב, רגל קדמית באמצע הלוח' },
                { title: '', content: 'כופפו את הברכיים והתכופפו מעט' },
                { title: '', content: 'פוצצו את הזנב למטה בחוזקה עם הרגל האחורית' },
                { title: '', content: 'החליקו את הרגל הקדמית למעלה על הלוח תוך כדי קפיצה' },
                { title: '', content: 'ישרו את הלוח באוויר' },
                { title: '', content: 'נחתו עם שתי הרגליים על הברגים' },
              ],
            },
            {
              type: 'heading',
              order: 4,
              heading: 'שגיאות נפוצות',
              headingLevel: 'h3',
            },
            {
              type: 'list',
              order: 5,
              listType: 'bullet',
              listItems: [
                { title: '', content: 'לא פוצצים חזק מספיק - הלוח לא יעזוב את הקרקע' },
                { title: '', content: 'שוכחים להחליק את הרגל הקדמית - הלוח לא יתיישר' },
                { title: '', content: 'מסתכלים למטה במקום קדימה - משפיע על שיווי המשקל' },
              ],
            },
            {
              type: 'heading',
              order: 6,
              heading: 'טיפים לתרגול',
              headingLevel: 'h3',
            },
            {
              type: 'text',
              order: 7,
              text: 'התחילו בתרגול על דשא או שטיח כדי להבין את התנועה בלי לדאוג מנפילה. ברגע שתרגישו נוח, עברו למשטח חלק ושטוח. תרגלו מדי יום, אפילו רק 15 דקות. עקביות היא המפתח!',
            },
            {
              type: 'divider',
              order: 8,
            },
          ],
        },
        tags: {
          en: ['beginner', 'ollie', 'tutorial', 'skateboarding'],
          he: ['מתחיל', 'אולי', 'מדריך', 'סקייטבורד'],
        },
        viewsCount: 0,
        likesCount: 0,
        rating: 4.8,
        ratingCount: 15,
        status: 'published',
        isFeatured: true,
        authorId: author!._id as mongoose.Types.ObjectId,
        authorName: author!.fullName,
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
        contentBlocks: {
          en: [
            {
              type: 'heading',
              order: 0,
              heading: 'Why Maintenance Matters',
              headingLevel: 'h2',
            },
            {
              type: 'text',
              order: 1,
              text: 'Regular maintenance keeps your board rolling smoothly, extends its lifespan, and prevents accidents. A well-maintained board performs better and is safer to ride.',
            },
            {
              type: 'heading',
              order: 2,
              heading: 'Cleaning Your Bearings',
              headingLevel: 'h2',
            },
            {
              type: 'text',
              order: 3,
              text: 'Dirty bearings slow you down and can cause premature wear. Clean them every few months or when they start making noise.',
            },
            {
              type: 'list',
              order: 4,
              listType: 'numbered',
              listItems: [
                { title: '', content: 'Remove the bearings from the wheels using a skate tool or bearing press' },
                { title: '', content: 'Soak bearings in isopropyl alcohol or bearing cleaner for 10-15 minutes' },
                { title: '', content: 'Gently scrub with a toothbrush to remove dirt and grime' },
                { title: '', content: 'Dry completely and apply 2-3 drops of bearing lubricant' },
                { title: '', content: 'Reinstall bearings and test the wheels' },
              ],
            },
            {
              type: 'heading',
              order: 5,
              heading: 'Replacing Grip Tape',
              headingLevel: 'h2',
            },
            {
              type: 'text',
              order: 6,
              text: 'When your grip tape loses its grip or gets too dirty, it\'s time for a replacement. This is a straightforward process that takes about 15 minutes.',
            },
            {
              type: 'list',
              order: 7,
              listType: 'bullet',
              listItems: [
                { title: '', content: 'Peel off the old grip tape starting from one corner' },
                { title: '', content: 'Clean the deck surface with a damp cloth' },
                { title: '', content: 'Align the new grip tape and press down from the center outward' },
                { title: '', content: 'Use a file or razor to trim the edges' },
              ],
            },
            {
              type: 'heading',
              order: 8,
              heading: 'Regular Check-Ups',
              headingLevel: 'h2',
            },
            {
              type: 'list',
              order: 9,
              listType: 'bullet',
              listItems: [
                { title: '', content: 'Check truck tightness weekly - loose trucks can cause accidents' },
                { title: '', content: 'Inspect wheels for flat spots or excessive wear' },
                { title: '', content: 'Look for cracks in the deck, especially around the truck mounts' },
                { title: '', content: 'Ensure all hardware is tight and secure' },
              ],
            },
            {
              type: 'divider',
              order: 10,
            },
          ],
          he: [
            {
              type: 'heading',
              order: 0,
              heading: 'למה תחזוקה חשובה',
              headingLevel: 'h2',
            },
            {
              type: 'text',
              order: 1,
              text: 'תחזוקה קבועה שומרת על הלוח שלכם מתגלגל בצורה חלקה, מאריכה את חייו ומונעת תאונות. לוח מתוחזק היטב מתפקד טוב יותר ובטוח יותר לרכיבה.',
            },
            {
              type: 'heading',
              order: 2,
              heading: 'ניקוי המיסבים שלכם',
              headingLevel: 'h2',
            },
            {
              type: 'text',
              order: 3,
              text: 'מיסבים מלוכלכים מאטים אתכם ויכולים לגרום לשחיקה מוקדמת. נקו אותם כל כמה חודשים או כשהם מתחילים להשמיע רעש.',
            },
            {
              type: 'list',
              order: 4,
              listType: 'numbered',
              listItems: [
                { title: '', content: 'הסירו את המיסבים מהגלגלים באמצעות כלי סקייט או לחיצת מיסבים' },
                { title: '', content: 'השרו את המיסבים באלכוהול איזופרופיל או מנקה מיסבים למשך 10-15 דקות' },
                { title: '', content: 'שפשפו בעדינות עם מברשת שיניים כדי להסיר לכלוך וזוהמה' },
                { title: '', content: 'ייבשו לחלוטין והחילו 2-3 טיפות של חומר סיכה למיסבים' },
                { title: '', content: 'התקינו מחדש את המיסבים ובדקו את הגלגלים' },
              ],
            },
            {
              type: 'heading',
              order: 5,
              heading: 'החלפת גריפ טייפ',
              headingLevel: 'h2',
            },
            {
              type: 'text',
              order: 6,
              text: 'כשהגריפ טייפ שלכם מאבד את האחיזה או מתלכלך מדי, הגיע הזמן להחלפה. זה תהליך פשוט שלוקח כ-15 דקות.',
            },
            {
              type: 'list',
              order: 7,
              listType: 'bullet',
              listItems: [
                { title: '', content: 'קלפו את הגריפ טייפ הישן החל מפינה אחת' },
                { title: '', content: 'נקו את משטח הלוח עם מטלית לחה' },
                { title: '', content: 'יישרו את הגריפ טייפ החדש ולחצו מהמרכז החוצה' },
                { title: '', content: 'השתמשו בקובץ או תער כדי לחתוך את הקצוות' },
              ],
            },
            {
              type: 'heading',
              order: 8,
              heading: 'בדיקות קבועות',
              headingLevel: 'h2',
            },
            {
              type: 'list',
              order: 9,
              listType: 'bullet',
              listItems: [
                { title: '', content: 'בדקו את הדחיסות של הטרקס מדי שבוע - טרקס רופפים יכולים לגרום לתאונות' },
                { title: '', content: 'בדקו את הגלגלים לכתמים שטוחים או שחיקה מוגזמת' },
                { title: '', content: 'חפשו סדקים בלוח, במיוחד סביב נקודות חיבור הטרקס' },
                { title: '', content: 'ודאו שכל החומרה הדוקה ומאובטחת' },
              ],
            },
            {
              type: 'divider',
              order: 10,
            },
          ],
        },
        tags: {
          en: ['maintenance', 'tutorial', 'skateboarding', 'care'],
          he: ['תחזוקה', 'מדריך', 'סקייטבורד', 'טיפול'],
        },
        viewsCount: 0,
        likesCount: 0,
        rating: 4.6,
        ratingCount: 8,
        status: 'published',
        isFeatured: false,
        authorId: author!._id as mongoose.Types.ObjectId,
        authorName: author!.fullName,
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

