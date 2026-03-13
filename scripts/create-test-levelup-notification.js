// Simple Node script to create a test AwardNotification of type "level_up" for a given user email.
// Usage:
//   node scripts/create-test-levelup-notification.js [email]
//
// If email is not provided, defaults to 'eylamzr1@gmail.com'.

const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config();

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in environment variables.');
  process.exit(1);
}

async function main() {
  const email = process.argv[2] || 'eylamzr1@gmail.com';

  try {
    await mongoose.connect(MONGODB_URI);

    const db = mongoose.connection;

    const usersColl = db.collection('users');
    const awardsColl = db.collection('awardnotifications');

    const user = await usersColl.findOne({ email }, { projection: { _id: 1, email: 1 } });
    if (!user?._id) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }

    const now = new Date();

    const levelUpResult = await awardsColl.insertOne({
      userId: user._id,
      type: 'level_up',
      levelId: 2,
      levelTitle: {
        en: 'Spot Chaser',
        he: 'Spot Chaser',
      },
      message: {
        en: 'You just leveled up! Keep pushing your limits!',
        he: 'עלית רמה! תמשיך לדחוף את הגבולות שלך!',
      },
      sourceType: 'manual_test_script',
      isRead: false,
      createdAt: now,
    });

    console.log('Created test level_up AwardNotification:', {
      id: String(levelUpResult.insertedId),
      userEmail: user.email,
      levelId: 2,
      createdAt: now,
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error creating test level_up AwardNotification:', err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
}

main();

