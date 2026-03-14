// Adds test streak data to a user so you can test the profile streak section.
// Updates the user's streak object (currentWeeklyStreak, currentMonthlyStreak,
// weeklyHoursThisWeek, etc.). Enable streaks in UI by setting NEXT_PUBLIC_ENABLE_STREAKS=true.
//
// Usage:
//   node scripts/add-test-streak-to-user.js [email]
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

// Test streak values – visible on account profile page (Streak card)
const TEST_STREAK = {
  currentWeeklyStreak: 3,
  longestWeeklyStreak: 5,
  currentMonthlyStreak: 2,
  longestMonthlyStreak: 4,
  lastActiveWeek: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
  lastActiveMonth: new Date().toISOString().slice(0, 7),  // YYYY-MM
  weeklyHoursThisWeek: 4,
  monthlyHoursThisMonth: 12,
};

async function main() {
  const email = process.argv[2] || 'eylamzr1@gmail.com';

  try {
    await mongoose.connect(MONGODB_URI);

    const db = mongoose.connection;
    const usersColl = db.collection('users');

    const user = await usersColl.findOne(
      { email },
      { projection: { _id: 1, email: 1, streak: 1 } }
    );
    if (!user?._id) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }

    await usersColl.updateOne(
      { _id: user._id },
      { $set: { streak: TEST_STREAK } }
    );

    console.log('Test streak set for user:', {
      userEmail: user.email,
      streak: TEST_STREAK,
    });
    console.log('Visit the account profile page to see the streak card.');
    console.log('(Ensure NEXT_PUBLIC_ENABLE_STREAKS=true in .env.local to show the streak section.)');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error adding test streak:', err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
}

main();
