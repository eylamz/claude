// Creates test XPEvent documents for a user so you can test the XP History section
// on the account profile page. Also increments the user's totalXP so the progress
// bar matches the history.
//
// Usage:
//   node scripts/create-test-xp-events.js [email]
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

// Valid XPEvent types (from lib/models/XPEvent.ts)
const XP_EVENT_TYPES = [
  'skatepark_checkin',
  'guide_quiz_passed',
  'event_signup',
  'event_winner_approved',
  'survey_completed',
  'review_written',
  'kudos_received',
  'kudos_given',
  'weekly_challenge_completed',
  'streak_bonus_weekly',
  'streak_bonus_monthly',
  'pioneer_bonus',
  'admin_adjustment',
];

// Test events: variety of types and amounts so profile table looks realistic
const TEST_XP_EVENTS = [
  { type: 'skatepark_checkin', xpAmount: 25, sourceType: 'manual_test_script' },
  { type: 'guide_quiz_passed', xpAmount: 50, sourceType: 'manual_test_script' },
  { type: 'event_signup', xpAmount: 30, sourceType: 'manual_test_script' },
  { type: 'review_written', xpAmount: 40, sourceType: 'manual_test_script' },
  { type: 'survey_completed', xpAmount: 20, sourceType: 'manual_test_script' },
  { type: 'streak_bonus_weekly', xpAmount: 100, sourceType: 'manual_test_script' },
  { type: 'admin_adjustment', xpAmount: 50, sourceType: 'manual_test_script' },
];

async function main() {
  const email = process.argv[2] || 'eylamzr1@gmail.com';

  try {
    await mongoose.connect(MONGODB_URI);

    const db = mongoose.connection;

    const usersColl = db.collection('users');
    const xpEventsColl = db.collection('xpevents');

    const user = await usersColl.findOne({ email }, { projection: { _id: 1, email: 1, totalXP: 1 } });
    if (!user?._id) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }

    const now = new Date();
    let totalAdded = 0;

    // Insert one event per type, with slightly different createdAt so they sort nicely
    for (let i = 0; i < TEST_XP_EVENTS.length; i++) {
      const ev = TEST_XP_EVENTS[i];
      const createdAt = new Date(now.getTime() - (TEST_XP_EVENTS.length - 1 - i) * 60000); // 1 min apart
      await xpEventsColl.insertOne({
        userId: user._id,
        type: ev.type,
        xpAmount: ev.xpAmount,
        sourceType: ev.sourceType,
        createdAt,
      });
      totalAdded += ev.xpAmount;
    }

    // Update user totalXP so profile progress bar matches
    await usersColl.updateOne(
      { _id: user._id },
      { $inc: { totalXP: totalAdded } }
    );

    const previousTotal = user.totalXP ?? 0;
    const newTotal = previousTotal + totalAdded;

    console.log('Created test XP events for profile:', {
      userEmail: user.email,
      eventsInserted: TEST_XP_EVENTS.length,
      totalXPAdded: totalAdded,
      previousTotalXP: previousTotal,
      newTotalXP: newTotal,
    });
    console.log('Event types:', TEST_XP_EVENTS.map((e) => `${e.type} (+${e.xpAmount})`).join(', '));
    console.log('Visit the account profile page and check the XP History section.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error creating test XP events:', err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
}

main();
