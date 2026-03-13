// Simple Node script to create a test AwardNotification of type "xp" for a given user email.
// Usage:
//   node scripts/create-test-xp-notification.js [email]
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

    const xpResult = await awardsColl.insertOne({
      userId: user._id,
      type: 'xp',
      xpAmount: 75,
      message: {
        en: 'You landed a new trick at the park!',
        he: 'נחתת טריק חדש בפארק!',
      },
      sourceType: 'manual_test_script',
      isRead: false,
      createdAt: now,
    });

    console.log('Created test XP AwardNotification:', {
      id: String(xpResult.insertedId),
      userEmail: user.email,
      xpAmount: 75,
      createdAt: now,
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error creating test XP AwardNotification:', err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
}

main();

