// Adds a test badge to a user so you can test the profile badges section.
// Creates/updates a BadgeDefinition, adds the badge to the user's badges array,
// and creates an AwardNotification so "earned at" and notifications work.
//
// Usage:
//   node scripts/add-test-badge-to-user.js [email]
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

// First badge: rare, trophy-style
const TEST_BADGE_1 = {
  id: 'test_badge_profile',
  name: { en: 'Profile Test Badge', he: 'באדג׳ בדיקה לפרופיל' },
  description: {
    en: 'A badge added by the test script for profile UI testing.',
    he: 'באדג׳ שנוסף על ידי סקריפט הבדיקה לבדיקת ממשק הפרופיל.',
  },
  icon: '🏅',
  rarity: 'rare',
};
// Second badge: legendary, different look
const TEST_BADGE_2 = {
  id: 'test_badge_legendary',
  name: { en: 'Legendary Explorer', he: 'חוקר אגדי' },
  description: {
    en: 'A legendary badge for testing profile design variety.',
    he: 'באדג׳ אגדי לבדיקת מגוון עיצוב הפרופיל.',
  },
  icon: '⭐',
  rarity: 'legendary',
};

const TEST_BADGES = [TEST_BADGE_1, TEST_BADGE_2];

async function main() {
  const email = process.argv[2] || 'eylamzr1@gmail.com';

  try {
    await mongoose.connect(MONGODB_URI);

    const db = mongoose.connection;

    const usersColl = db.collection('users');
    const badgeDefsColl = db.collection('badgedefinitions');
    const awardsColl = db.collection('awardnotifications');

    const user = await usersColl.findOne({ email }, { projection: { _id: 1, email: 1, badges: 1 } });
    if (!user?._id) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }

    const now = new Date();
    const badges = Array.isArray(user.badges) ? user.badges : [];
    const addedBadgeIds = [];

    for (const badge of TEST_BADGES) {
      // 1. Ensure BadgeDefinition exists
      await badgeDefsColl.updateOne(
        { id: badge.id },
        {
          $set: {
            id: badge.id,
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            category: 'special',
            trigger: { type: 'manual' },
            xpReward: 0,
            rarity: badge.rarity,
            isActive: true,
          },
        },
        { upsert: true }
      );

      // 2. Add badge to user's badges array
      if (!badges.includes(badge.id)) {
        await usersColl.updateOne(
          { _id: user._id },
          { $addToSet: { badges: badge.id } }
        );
        addedBadgeIds.push(badge.id);
      }

      // 3. Create AwardNotification for this badge
      await awardsColl.insertOne({
        userId: user._id,
        type: 'badge',
        badgeId: badge.id,
        badgeName: badge.name,
        badgeIcon: badge.icon,
        message: {
          en: `You earned the ${badge.name.en}!`,
          he: `הרווחת את ${badge.name.he}!`,
        },
        sourceType: 'manual_test_script',
        isRead: false,
        createdAt: now,
      });
    }

    if (addedBadgeIds.length > 0) {
      console.log('Added badge id(s) to user.badges:', addedBadgeIds.join(', '));
    }
    console.log('Done. Test badges set up for profile:', {
      userEmail: user.email,
      badgeIds: TEST_BADGES.map((b) => b.id),
      rarities: TEST_BADGES.map((b) => b.rarity),
    });
    console.log('Visit the account profile page to see both badges and the design difference by rarity.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error adding test badge:', err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
}

main();
