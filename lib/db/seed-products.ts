import mongoose from 'mongoose';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { connectDB, disconnectDB } from './mongodb';
import Product, { IProduct } from '../models/Product';

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

export async function seedProducts() {
  console.log('🛹 Starting product seed...');
  await connectDB();

  const proceed = await confirmDestructive('This will delete ALL product data in the database.');
  if (!proceed) {
    console.log('❎ Aborted by user');
    await disconnectDB();
    return;
  }

  const session = await mongoose.startSession();
  let count = 0;

  try {
    // Delete all existing products
    console.log('🧹 Clearing existing product data...');
    await Product.deleteMany({});

    await session.withTransaction(async () => {
      console.log('🛹 Seeding products...');
      const productsData: Array<Partial<IProduct>> = [];

      // 1. ENBOSS Classic Tee
      productsData.push({
        slug: slugify('ENBOSS Classic Tee'),
        name: { en: 'ENBOSS Classic Tee', he: 'ENBOSS Classic Tee (Hebrew)' },
        description: { en: 'Classic cotton tee for sessions and chill.', he: 'טי שירט כותנה קלאסית לרכיבה וליומיום (Hebrew)' },
        price: 89,
        category: 'clothing',
        subcategory: 't-shirt',
        relatedSports: ['skateboarding', 'rollerblading'],
        images: [
          { url: img('ENBOSS Classic Tee','000000','FFFFFF'), alt: { en: 'ENBOSS Classic Tee', he: 'ENBOSS Classic Tee (Hebrew)' }, order: 0, publicId: 'placeholder:classic-tee' },
        ],
        variants: [
          { 
            color: { name: { en: 'Black', he: 'Black (Hebrew)' }, hex: '#000000' }, 
            sizes: ['S','M','L','XL'].map((s, i) => ({ size: s, stock: 5 + ((i+1)%6), sku: `TEE-BLK-${s}` })),
            images: [
              { url: img('Classic Tee Black','000000','FFFFFF'), alt: { en: 'ENBOSS Classic Tee - Black', he: 'ENBOSS Classic Tee - Black (Hebrew)' }, order: 0, publicId: 'placeholder:classic-tee-black' },
            ],
          },
          { 
            color: { name: { en: 'White', he: 'White (Hebrew)' }, hex: '#FFFFFF' }, 
            sizes: ['S','M','L','XL'].map((s, i) => ({ size: s, stock: 7 + ((i+2)%6), sku: `TEE-WHT-${s}` })),
            images: [
              { url: img('Classic Tee White','FFFFFF','000000'), alt: { en: 'ENBOSS Classic Tee - White', he: 'ENBOSS Classic Tee - White (Hebrew)' }, order: 0, publicId: 'placeholder:classic-tee-white' },
            ],
          },
          { 
            color: { name: { en: 'Gray', he: 'Gray (Hebrew)' }, hex: '#808080' }, 
            sizes: ['S','M','L','XL'].map((s, i) => ({ size: s, stock: 6 + ((i+3)%6), sku: `TEE-GRY-${s}` })),
            images: [
              { url: img('Classic Tee Gray','808080','FFFFFF'), alt: { en: 'ENBOSS Classic Tee - Gray', he: 'ENBOSS Classic Tee - Gray (Hebrew)' }, order: 0, publicId: 'placeholder:classic-tee-gray' },
            ],
          },
        ],
        isFeatured: false,
        isPreorder: false,
        status: 'active',
        metadata: { title: { en: 'Classic Tee', he: 'Classic Tee (Hebrew)' }, description: { en: 'Soft cotton.', he: 'כותנה רכה (Hebrew)' } },
      });

      // 2. ENBOSS Skate Wax
      productsData.push({
        slug: slugify('ENBOSS Skate Wax'),
        name: { en: 'ENBOSS Skate Wax', he: 'ENBOSS Skate Wax (Hebrew)' },
        description: { en: 'Keep ledges slick for grinds.', he: 'שומר על מדרכות חלקות לגריינדים (Hebrew)' },
        price: 35,
        category: 'accessories',
        subcategory: 'maintenance',
        relatedSports: ['skateboarding','rollerblading'],
        images: [{ url: img('Skate Wax','333333','FFFFFF'), alt: { en: 'Skate Wax', he: 'Skate Wax (Hebrew)' }, order: 0, publicId: 'placeholder:wax' }],
        variants: [{ color: { name: { en: 'Standard', he: 'Standard (Hebrew)' }, hex: '#CCCCCC' }, sizes: [{ size: 'STD', stock: 50, sku: 'WAX-STD' }] }],
        status: 'active', isPreorder: false, isFeatured: false, metadata: { title: { en: 'Wax', he: 'Wax (Hebrew)' }, description: { en: 'Session essential.', he: 'חיוני לסשן (Hebrew)' } },
      });

      // 3. ENBOSS Logo Sticker Pack
      productsData.push({
        slug: slugify('ENBOSS Logo Sticker Pack'),
        name: { en: 'ENBOSS Logo Sticker Pack', he: 'ENBOSS Logo Sticker Pack (Hebrew)' },
        description: { en: 'Slap these on your deck or helmet.', he: 'מדבקות ללוח או לקסדה (Hebrew)' },
        price: 25,
        category: 'accessories', subcategory: 'stickers', relatedSports: ['skateboarding','rollerblading'],
        images: [{ url: img('Sticker Pack','111111','FFFFFF'), alt: { en: 'Sticker Pack', he: 'Sticker Pack (Hebrew)' }, order: 0, publicId: 'placeholder:sticker-pack' }],
        variants: [{ color: { name: { en: 'Multi', he: 'Multi (Hebrew)' }, hex: '#00FF00' }, sizes: [{ size: 'PK', stock: 100, sku: 'STICK-PACK' }] }],
        status: 'active', isPreorder: false, isFeatured: false, metadata: { title: { en: 'Stickers', he: 'Stickers (Hebrew)' }, description: { en: 'Logo stickers.', he: 'מדבקות לוגו (Hebrew)' } },
      });

      // 4. ENBOSS Hoodie
      productsData.push({
        slug: slugify('ENBOSS Hoodie'),
        name: { en: 'ENBOSS Hoodie', he: 'ENBOSS Hoodie (Hebrew)' },
        description: { en: 'Cozy heavyweight hoodie for chilly nights.', he: 'הודי חמים לערבים קרים (Hebrew)' },
        price: 189,
        discountPrice: 159,
        category: 'clothing', subcategory: 'hoodie', relatedSports: ['skateboarding','rollerblading'],
        images: [{ url: img('ENBOSS Hoodie','001F3F','FFFFFF'), alt: { en: 'ENBOSS Hoodie', he: 'ENBOSS Hoodie (Hebrew)' }, order: 0, publicId: 'placeholder:hoodie' }],
        variants: [
          { 
            color: { name: { en: 'Black', he: 'Black (Hebrew)' }, hex: '#000000' }, 
            sizes: ['S','M','L','XL'].map((s, i) => ({ size: s, stock: 5 + i, sku: `HD-BLK-${s}` })),
            images: [
              { url: img('ENBOSS Hoodie Black','000000','FFFFFF'), alt: { en: 'ENBOSS Hoodie - Black', he: 'ENBOSS Hoodie - Black (Hebrew)' }, order: 0, publicId: 'placeholder:hoodie-black' },
            ],
          },
          { 
            color: { name: { en: 'Navy', he: 'Navy (Hebrew)' }, hex: '#001F3F' }, 
            sizes: ['S','M','L','XL'].map((s, i) => ({ size: s, stock: 6 + i, sku: `HD-NVY-${s}` })),
            images: [
              { url: img('ENBOSS Hoodie Navy','001F3F','FFFFFF'), alt: { en: 'ENBOSS Hoodie - Navy', he: 'ENBOSS Hoodie - Navy (Hebrew)' }, order: 0, publicId: 'placeholder:hoodie-navy' },
            ],
          },
        ],
        isFeatured: true, isPreorder: false, status: 'active', metadata: { title: { en: 'Hoodie', he: 'Hoodie (Hebrew)' }, description: { en: 'Warm and durable.', he: 'חם ועמיד (Hebrew)' } },
      });

      // 5. ENBOSS Skateboard Deck
      productsData.push({
        slug: slugify('ENBOSS Skateboard Deck'),
        name: { en: 'ENBOSS Skateboard Deck', he: 'ENBOSS Skateboard Deck (Hebrew)' },
        description: { en: 'Premium maple deck in multiple designs.', he: 'דק מייפל איכותי במספר עיצובים (Hebrew)' },
        price: 280,
        category: 'parts', subcategory: 'deck', relatedSports: ['skateboarding'],
        images: [{ url: img('ENBOSS Deck','444444','FFFFFF'), alt: { en: 'Deck', he: 'Deck (Hebrew)' }, order: 0, publicId: 'placeholder:deck' }],
        variants: [
          { 
            color: { name: { en: 'Design A', he: 'Design A (Hebrew)' }, hex: '#FF6600' }, 
            sizes: [{ size: '8.0', stock: 10, sku: 'DECK-A-80' }],
            images: [
              { url: img('Deck Design A','FF6600','FFFFFF'), alt: { en: 'ENBOSS Deck - Design A', he: 'ENBOSS Deck - Design A (Hebrew)' }, order: 0, publicId: 'placeholder:deck-design-a' },
            ],
          },
          { 
            color: { name: { en: 'Design B', he: 'Design B (Hebrew)' }, hex: '#00AAFF' }, 
            sizes: [{ size: '8.25', stock: 10, sku: 'DECK-B-825' }],
            images: [
              { url: img('Deck Design B','00AAFF','FFFFFF'), alt: { en: 'ENBOSS Deck - Design B', he: 'ENBOSS Deck - Design B (Hebrew)' }, order: 0, publicId: 'placeholder:deck-design-b' },
            ],
          },
          { 
            color: { name: { en: 'Design C', he: 'Design C (Hebrew)' }, hex: '#AA00FF' }, 
            sizes: [{ size: '8.5', stock: 10, sku: 'DECK-C-85' }],
            images: [
              { url: img('Deck Design C','AA00FF','FFFFFF'), alt: { en: 'ENBOSS Deck - Design C', he: 'ENBOSS Deck - Design C (Hebrew)' }, order: 0, publicId: 'placeholder:deck-design-c' },
            ],
          },
        ],
        isFeatured: false, isPreorder: false, status: 'active', metadata: { title: { en: 'Deck', he: 'Deck (Hebrew)' }, description: { en: 'Responsive pop.', he: 'פופ מצוין (Hebrew)' } },
      });

      // 6. ENBOSS Grip Tape
      productsData.push({
        slug: slugify('ENBOSS Grip Tape'),
        name: { en: 'ENBOSS Grip Tape', he: 'ENBOSS Grip Tape (Hebrew)' },
        description: { en: 'Medium grit for solid control.', he: 'דרגת חיכוך בינונית לשליטה טובה (Hebrew)' },
        price: 45, category: 'parts', subcategory: 'grip', relatedSports: ['skateboarding'],
        images: [{ url: img('Grip Tape','000000','FFFFFF'), alt: { en: 'Grip Tape', he: 'Grip Tape (Hebrew)' }, order: 0, publicId: 'placeholder:grip' }],
        variants: [{ color: { name: { en: 'Black', he: 'Black (Hebrew)' }, hex: '#000000' }, sizes: [{ size: 'STD', stock: 30, sku: 'GRIP-BLK' }] }],
        status: 'active', isPreorder: false, isFeatured: false, metadata: { title: { en: 'Grip', he: 'Grip (Hebrew)' }, description: { en: 'Stick your tricks.', he: 'נדבק לטריקים (Hebrew)' } },
      });

      // 7. ENBOSS Cap
      productsData.push({
        slug: slugify('ENBOSS Cap'),
        name: { en: 'ENBOSS Cap', he: 'ENBOSS Cap (Hebrew)' },
        description: { en: 'Adjustable cap to keep the sun out.', he: 'כובע מתכוונן לשמש (Hebrew)' },
        price: 79, category: 'accessories', subcategory: 'headwear', relatedSports: ['skateboarding','rollerblading'],
        images: [{ url: img('Cap','FF0000','FFFFFF'), alt: { en: 'ENBOSS Cap', he: 'ENBOSS Cap (Hebrew)' }, order: 0, publicId: 'placeholder:cap' }],
        variants: [
          { 
            color: { name: { en: 'Black', he: 'Black (Hebrew)' }, hex: '#000000' }, 
            sizes: [{ size: 'ADJ', stock: 20, sku: 'CAP-BLK-ADJ' }],
            images: [
              { url: img('ENBOSS Cap Black','000000','FFFFFF'), alt: { en: 'ENBOSS Cap - Black', he: 'ENBOSS Cap - Black (Hebrew)' }, order: 0, publicId: 'placeholder:cap-black' },
            ],
          },
          { 
            color: { name: { en: 'Red', he: 'Red (Hebrew)' }, hex: '#FF0000' }, 
            sizes: [{ size: 'ADJ', stock: 20, sku: 'CAP-RED-ADJ' }],
            images: [
              { url: img('ENBOSS Cap Red','FF0000','FFFFFF'), alt: { en: 'ENBOSS Cap - Red', he: 'ENBOSS Cap - Red (Hebrew)' }, order: 0, publicId: 'placeholder:cap-red' },
            ],
          },
        ],
        status: 'active', isPreorder: false, isFeatured: false, metadata: { title: { en: 'Cap', he: 'Cap (Hebrew)' }, description: { en: 'Shade in style.', he: 'צל בסטייל (Hebrew)' } },
      });

      // 8. ENBOSS Bearings Set
      productsData.push({
        slug: slugify('ENBOSS Bearings Set'),
        name: { en: 'ENBOSS Bearings Set', he: 'ENBOSS Bearings Set (Hebrew)' },
        description: { en: 'Fast and durable bearings for smooth rides.', he: 'מיסבים מהירים ועמידים לרכיבה חלקה (Hebrew)' },
        price: 120, category: 'parts', subcategory: 'bearings', relatedSports: ['skateboarding','rollerblading'],
        images: [{ url: img('Bearings','222222','FFFFFF'), alt: { en: 'Bearings Set', he: 'Bearings Set (Hebrew)' }, order: 0, publicId: 'placeholder:bearings' }],
        variants: [{ color: { name: { en: 'Standard', he: 'Standard (Hebrew)' }, hex: '#999999' }, sizes: [{ size: 'SET', stock: 25, sku: 'BRG-SET' }] }],
        status: 'active', isPreorder: true, isFeatured: false, metadata: { title: { en: 'Bearings', he: 'Bearings (Hebrew)' }, description: { en: 'Smooth roll.', he: 'גלגול חלק (Hebrew)' } },
      });

      const createdProducts = await Product.insertMany(productsData, { session });
      count = createdProducts.length;

      console.log('✅ Product data created successfully within transaction');
    });
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    throw err;
  } finally {
    await session.endSession();
    await disconnectDB();
  }

  console.log('🎉 Product seed complete:');
  console.log(`   Created ${count} product(s)`);
}

// Run if executed directly via CLI
if (require.main === module) {
  seedProducts().catch((err) => {
    console.error('Product seed exited with error:', err);
    process.exit(1);
  });
}


