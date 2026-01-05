import mongoose from 'mongoose';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { connectDB, disconnectDB } from './mongodb';
import User, { IUser } from '../models/User';

type WithId<T> = T & { _id: mongoose.Types.ObjectId };

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

async function confirmDestructive(prompt: string): Promise<boolean> {
  if (process.argv.includes('--yes') || process.argv.includes('--force')) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (q: string) => new Promise<string>((res) => rl.question(q, res));
  const answer = (await question(`${prompt} Type "yes" to continue: `)).trim().toLowerCase();
  rl.close();
  return answer === 'yes';
}

async function clearUsers(session?: mongoose.ClientSession) {
  console.log('🧹 Clearing existing users...');
  if (session) {
    await User.deleteMany({}, { session });
  } else {
    await User.deleteMany({});
  }
}

export async function seedUsers() {
  console.log('🚀 Starting user seed...');
  await connectDB();

  const proceed = await confirmDestructive('This will delete ALL users in the database.');
  if (!proceed) {
    console.log('❎ Aborted by user');
    await disconnectDB();
    return;
  }

  const session = await mongoose.startSession();
  let count = 0;

  try {
    // Clear upfront to ensure idempotency even if transaction rolls back later
    await clearUsers();
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
      const createdUsers = await Promise.all(seedUsers.map((u) => User.create(u)));
      count = createdUsers.length;

      console.log('✅ Users created successfully within transaction');
      console.log(`📊 Created ${count} users:`);
      createdUsers.forEach((user) => {
        console.log(`   - ${user.email} (${user.role})`);
      });
    });
  } catch (err) {
    console.error('❌ User seeding failed:', err);
    throw err;
  } finally {
    await session.endSession();
    await disconnectDB();
  }

  console.log('🎉 User seed complete!');
}

// Run if executed directly via CLI
if (require.main === module) {
  seedUsers().catch((err) => {
    console.error('User seed exited with error:', err);
    process.exit(1);
  });
}











