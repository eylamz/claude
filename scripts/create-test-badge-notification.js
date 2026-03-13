// Simple Node script to create a test AwardNotification of type "badge" for a given user email.
// Usage:
//   node scripts/create-test-badge-notification.js [email]
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

    const badgeResult = await awardsColl.insertOne({
      userId: user._id,
      type: 'badge',
      badgeId: 'test_badge_1',
      badgeName: {
        en: 'Testing Badge',
        he: 'באדג׳ בדיקה',
      },
      badgeIcon: 'https://via.placeholder.com/128?text=Badge',
      message: {
        en: 'You earned a special testing badge!',
        he: 'הרווחת באדג׳ מיוחד לבדיקה!',
      },
      sourceType: 'manual_test_script',
      isRead: false,
      createdAt: now,
    });

    console.log('Created test Badge AwardNotification:', {
      id: String(badgeResult.insertedId),
      userEmail: user.email,
      badgeId: 'test_badge_1',
      createdAt: now,
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error creating test Badge AwardNotification:', err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
}

main();

