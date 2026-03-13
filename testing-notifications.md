1. XP notification
  node scripts/create-test-xp-notification.js
  # or
  node scripts/create-test-xp-notification.js your-email@example.com

This inserts a single AwardNotification with type: "xp" for that user.



2. Badge notification
  node scripts/create-test-badge-notification.js
  # or
  node scripts/create-test-badge-notification.js your-email@example.com

This inserts a single AwardNotification with type: "badge" (test badge id/name/icon/message).


3. Level-up notification
  node scripts/create-test-levelup-notification.js
  # or
  node scripts/create-test-levelup-notification.js your-email@example.com

This inserts a single AwardNotification with type: "level_up", levelId: 2, and a localized level title/message.
