# ENBOSS Gamification — Cursor Step-by-Step Prompts

> Give each step to Cursor **one at a time**. Only move to the next step after verifying the checklist at the bottom of each step. Each prompt is self-contained and tells Cursor exactly what to build.

---

## STEP 1 — Foundation: Models, Feature Flags & Level Config

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 1 of 20 — the pure foundation. Do not build any UI or API routes yet. Only create the files listed below.

**Context:** ENBOSS is a Next.js + MongoDB/Mongoose + TypeScript platform (App Router). Existing models are in `lib/models/`. All new models should follow the same pattern as the existing ones (Schema → interface → model with `mongoose.models.X || mongoose.model()`).

**Task: Create the following files exactly as specified.**

---

1. `lib/config/feature-flags.ts`

Export two objects — `featureFlags` (NEXT_PUBLIC_ vars, safe client+server) and `serverFlags` (XP values, server-only):

featureFlags keys: xpSystem, awardPopups, leaderboard, personalRanking, seasonalLeaderboard, locationCheckins, guideQuizzes, eventWinnerClaims, surveyRewards, reviewRewards, eventSignupRewards, kudos, streaks, crews, crewLeaderboard, explorerMap, skateparkKing, pioneerBadge, weeklyChallenges, xpMultiplier, adminRanking.

All read from `process.env.NEXT_PUBLIC_ENABLE_[UPPERCASE_KEY] === 'true'`.

serverFlags keys (read from process.env with numeric defaults):
xpSkatepark=50, xpQuizPassed=100, xpEventSignup=20, xpEventWinner1st=500, xpEventWinner2nd=300, xpEventWinner3rd=150, xpSurveyCompleted=75, xpReviewWritten=40, xpKudosReceived=5, xpKudosGiven=2, xpWeeklyChallenge=80, xpStreakWeeklyBonus=50, xpStreakMonthlyBonus=200, xpPioneerBonus=100, xpCrewContribution=10.

---

2. `lib/config/levels.ts`

Export a `LEVELS` array (10 items) and two helper functions:
- `getLevelFromXP(xp: number)` → returns the highest level whose minXP <= xp
- `getNextLevel(xp: number)` → returns the next level or null if maxed

Levels:
export const LEVELS = [
  { id: 1,  title: { en: 'Fresh Blood',  he: 'Fresh Blood'            }, minXP: 0,      color: '#afafaf' },
  { id: 2,  title: { en: 'Spot Chaser',  he: 'Spot Chaser'    }, minXP: 200,    color: '#6BBFBA' },
  { id: 3,  title: { en: 'Park Rat',     he: 'Park Rat'    }, minXP: 500,    color: '#48B34B' },
  { id: 4,  title: { en: 'Shredder',     he: 'Shredder'           }, minXP: 1000,   color: '#93c5fd' },
  { id: 5,  title: { en: 'Flow State',   he: 'Flow State'         }, minXP: 2500,   color: '#DBDB3D' },
  { id: 6,  title: { en: 'Ripper',       he: 'Ripper'           }, minXP: 5000,   color: '#f39d39' },
  { id: 7,  title: { en: 'Street King',  he: 'Street King'      }, minXP: 10000,  color: '#d44eb3' },
  { id: 8,  title: { en: 'Pro',          he: 'Pro'            }, minXP: 20000,  color: '#c5b6fd' },
  { id: 9,  title: { en: 'Legend',       he: 'Legend'           }, minXP: 40000,  color: '#f3394c' },
  { id: 10, title: { en: 'ENBOSS',       he: 'ENBOSS'          }, minXP: 75000,  color: '#9DFF00' },
] as const;

Each level has: id, title: {en, he}, minXP, color.

---

3. Create these Mongoose models in `lib/models/`:

**BadgeDefinition.ts**
Fields: id (String, unique), name ({en,he}), description ({en,he}), icon (String), category (enum: location|guides|events|reviews|surveys|signups|streaks|social|crews|special), trigger (Mixed — see types below), xpReward (Number), rarity (enum: common|rare|epic|legendary), isActive (Boolean, default true), createdAt.
Trigger type can be: { type: 'count', action: string, threshold: number } | { type: 'streak', streakType: 'weekly'|'monthly', threshold: number } | { type: 'pioneer' } | { type: 'king' } | { type: 'manual' }.

**XPEvent.ts**
Fields: userId (ObjectId ref User, required, indexed), type (enum: skatepark_checkin|guide_quiz_passed|event_signup|event_winner_approved|survey_completed|review_written|kudos_received|kudos_given|weekly_challenge_completed|streak_bonus_weekly|streak_bonus_monthly|pioneer_bonus|admin_adjustment), xpAmount (Number), multiplierApplied (Number, optional), baseXP (Number, optional), sourceId (ObjectId, optional), sourceType (String, optional), seasonId (String, optional), meta (Mixed, optional), awardedBadgeIds ([String], optional), createdAt.
Indexes: { userId: 1, createdAt: -1 }, { userId: 1, type: 1 }.

**AwardNotification.ts**
Fields: userId (ObjectId ref User, required, indexed), type (enum: xp|badge|level_up|streak|king_crowned|king_dethroned), xpAmount (Number, optional), badgeId (String, optional), badgeName ({en,he}, optional), badgeIcon (String, optional), levelId (Number, optional), levelTitle ({en,he}, optional), message ({en,he}, required), isRead (Boolean, default false, indexed), readAt (Date, optional), sourceType (String, required), createdAt.
Index: { userId: 1, isRead: 1, createdAt: -1 }.

**SkateparkCheckin.ts**
Fields: userId (ObjectId ref User, required), skateparkId (ObjectId ref Skatepark, required), skateparkSlug (String, required), checkInAt (Date, required), checkOutAt (Date, optional), durationMinutes (Number, optional), coordinates: { lat: Number, lng: Number }, isVerified (Boolean, default false), xpAwarded (Boolean, default false), xpAmount (Number, default 0), isPioneer (Boolean, default false), isoWeek (String, required — format '2025-W12'), isoMonth (String, required — format '2025-03'), createdAt.
Indexes: { userId: 1, skateparkId: 1, isoWeek: 1 }, { skateparkId: 1, createdAt: -1 }, unique { userId: 1, skateparkId: 1, isoWeek: 1 } — one checkin per user per park per week that can be verified.

**StreakRecord.ts**
Fields: userId (ObjectId ref User, required), type (enum: weekly|monthly), period (String, required), hoursLogged (Number, default 0), metThreshold (Boolean, default false), streakCountAtEnd (Number, default 0), bonusXPAwarded (Boolean, default false), createdAt.
Unique index: { userId: 1, type: 1, period: 1 }.

**GuideQuiz.ts**
Fields: guideId (ObjectId ref Guide, required), guideSlug (String, required, indexed), questions (array of { id: String, question: {en,he}, options: [{en,he}], correctOptionIndex: Number, explanation: {en,he} optional, order: Number }), passingScore (Number, default 70), xpReward (Number, default 100), isActive (Boolean, default true), createdAt, updatedAt. Timestamps true.

**GuideQuizAttempt.ts**
Fields: userId (ObjectId, required), guideId (ObjectId, required), guideSlug (String, required), quizId (ObjectId, required), answers ([Number]), score (Number), passed (Boolean), xpAwarded (Boolean, default false), xpAmount (Number, default 0), attemptNumber (Number, default 1), completedAt (Date), createdAt.
Index: { userId: 1, guideId: 1 }.

**EventWinnerClaim.ts**
Fields: userId (ObjectId, required), eventId (ObjectId, required), eventSlug (String, required), placement (enum: 1st|2nd|3rd|participant), sport (String, required), category (String, optional), proofDescription (String, required), proofImages ([String], optional), status (enum: pending|approved|rejected, default pending, indexed), reviewedBy (ObjectId, optional), reviewedAt (Date, optional), reviewNotes (String, optional), xpAwarded (Boolean, default false), xpAmount (Number, optional), createdAt, updatedAt. Timestamps true.

**WeeklyChallenge.ts**
Fields: weekId (String, required, unique — format '2025-W12'), challenges (array of { id: String, title: {en,he}, description: {en,he}, actionType: String, targetCount: Number, xpReward: Number, icon: String }), isActive (Boolean, default false), startsAt (Date), endsAt (Date), createdAt.

**UserChallengeProgress.ts**
Fields: userId (ObjectId, required), weekId (String, required), challengeId (String, required), currentCount (Number, default 0), isCompleted (Boolean, default false), completedAt (Date, optional), xpAwarded (Boolean, default false), createdAt, updatedAt. Timestamps true.
Unique index: { userId: 1, weekId: 1, challengeId: 1 }.

**ReviewKudos.ts**
Fields: giverUserId (ObjectId ref User, required), receiverUserId (ObjectId ref User, required), reviewId (ObjectId, required), skateparkId (ObjectId, optional), createdAt.
Unique index: { giverUserId: 1, reviewId: 1 }.

**Crew.ts**
Fields: name (String, required, trim), slug (String, required, unique, lowercase), description ({en,he}, optional), logo (String, optional), city (String, optional), relatedSports ([String]), founderId (ObjectId ref User, required), founderName (String, required), members (array of { userId: ObjectId, username: String, profilePhoto: String optional, role: enum founder|admin|member, joinedAt: Date, contributedXP: Number default 0 }), totalXP (Number, default 0), memberCount (Number, default 1), currentSeasonXP (Number, default 0), currentRank (Number, default 0), currentSeasonRank (Number, default 0), isPublic (Boolean, default true), requiresApproval (Boolean, default false), maxMembers (Number, default 50), createdAt, updatedAt. Timestamps true.

**CrewInvite.ts**
Fields: crewId (ObjectId, required), invitedUserId (ObjectId, required), invitedByUserId (ObjectId, required), status (enum: pending|accepted|declined, default pending), expiresAt (Date), createdAt.

**XPMultiplierEvent.ts**
Fields: title ({en,he}, required), description ({en,he}, optional), multiplier (Number, required, min 1), appliesTo ([String], required — array of XPEventType values or ['all']), startsAt (Date, required), endsAt (Date, required), isActive (Boolean, default true), createdBy (ObjectId ref User), createdAt.
Index: { startsAt: 1, endsAt: 1, isActive: 1 }.

**Season.ts**
Fields: id (String, required, unique — e.g. 'season-1'), title ({en,he}, required), startsAt (Date, required), endsAt (Date, required), isActive (Boolean, default false), topIndividuals (Mixed, optional — array snapshot), topCrews (Mixed, optional — array snapshot), rewards (array of { rank: Number, badgeId: String, xpBonus: Number }), createdAt.

**SkateparkKing.ts**
Fields: skateparkId (ObjectId ref Skatepark, required), skateparkSlug (String, required), currentKingUserId (ObjectId ref User, required), currentKingUsername (String, required), currentKingPhoto (String, optional), currentKingCheckins (Number, required), crownedAt (Date, required), month (String, required — '2025-03'), history (array of { userId: ObjectId, username: String, month: String, checkins: Number }), updatedAt.
Unique index: { skateparkId: 1, month: 1 }.

---

4. Update `lib/models/User.ts` — add these optional fields to the schema and IUser interface:
- username: String, optional, unique sparse index, trim, maxlength 30
- bio: String, optional, trim, maxlength 300
- profilePhoto: String, optional
- relatedSports: [String], default []
- city: String, optional

Add to IUser interface: totalXP, levelId, currentRank, currentSeasonXP, currentSeasonRank, streak (object with all streak fields), crewId, badges array, stats object, pioneerParkIds.

**Full streak sub-object fields:**
currentWeeklyStreak, longestWeeklyStreak, currentMonthlyStreak, longestMonthlyStreak, lastActiveWeek, lastActiveMonth, weeklyHoursThisWeek, monthlyHoursThisMonth — all with sensible defaults (0 or '').

**Full stats sub-object fields:**
skateparksVisited, totalCheckinHours, guidesCompleted, quizzesPassed, eventsAttended, reviewsWritten, surveysCompleted, kudosReceived, kudosGiven, challengesCompleted, pioneerParks, crownedKingCount — all Number, default 0.

---

5. Update `lib/models/FormSubmission.ts` — add optional `userId` field (ObjectId ref User, sparse index).

---

6. Update `lib/models/Skatepark.ts` — add these optional fields:
- pioneerId: ObjectId ref User
- pioneerUsername: String
- pioneerPhoto: String
- currentKingUserId: ObjectId ref User
- currentKingUsername: String
- currentKingPhoto: String

---

7. Add the complete `.env.local` block below to the project's `.env.local.example` file (create it if it doesn't exist):

NEXT_PUBLIC_ENABLE_XP_SYSTEM=false
NEXT_PUBLIC_ENABLE_AWARD_POPUPS=false
NEXT_PUBLIC_ENABLE_LEADERBOARD=false
NEXT_PUBLIC_ENABLE_PERSONAL_RANKING=false
NEXT_PUBLIC_ENABLE_SEASONAL_LEADERBOARD=false
NEXT_PUBLIC_ENABLE_LOCATION_CHECKINS=false
NEXT_PUBLIC_ENABLE_GUIDE_QUIZZES=false
NEXT_PUBLIC_ENABLE_EVENT_WINNER_CLAIMS=false
NEXT_PUBLIC_ENABLE_SURVEY_REWARDS=false
NEXT_PUBLIC_ENABLE_REVIEW_REWARDS=false
NEXT_PUBLIC_ENABLE_EVENT_SIGNUP_REWARDS=false
NEXT_PUBLIC_ENABLE_KUDOS=false
NEXT_PUBLIC_ENABLE_STREAKS=false
NEXT_PUBLIC_ENABLE_CREWS=false
NEXT_PUBLIC_ENABLE_CREW_LEADERBOARD=false
NEXT_PUBLIC_ENABLE_EXPLORER_MAP=false
NEXT_PUBLIC_ENABLE_SKATEPARK_KING=false
NEXT_PUBLIC_ENABLE_PIONEER_BADGE=false
NEXT_PUBLIC_ENABLE_WEEKLY_CHALLENGES=false
NEXT_PUBLIC_ENABLE_XP_MULTIPLIER=false
NEXT_PUBLIC_ENABLE_ADMIN_RANKING=false
STREAK_WEEKLY_MIN_HOURS=3
STREAK_MONTHLY_MIN_HOURS=10
XP_SKATEPARK_CHECKIN=50
XP_GUIDE_QUIZ_PASSED=100
XP_EVENT_SIGNUP=20
XP_EVENT_WINNER_1ST=500
XP_EVENT_WINNER_2ND=300
XP_EVENT_WINNER_3RD=150
XP_SURVEY_COMPLETED=75
XP_REVIEW_WRITTEN=40
XP_KUDOS_RECEIVED=5
XP_KUDOS_GIVEN=2
XP_WEEKLY_CHALLENGE_COMPLETED=80
XP_STREAK_WEEKLY_BONUS=50
XP_STREAK_MONTHLY_BONUS=200
XP_PIONEER_FIRST_CHECKIN=100
XP_CREW_CONTRIBUTION_BONUS=10

Do not create any pages, components, or API routes in this step. Only the files listed above.
```

### What This Step Does
Creates the entire data layer and configuration skeleton for the gamification system. No UI, no logic — just the raw structure that every future step depends on. Think of it as pouring the concrete foundation before building walls.

### ✅ Verify Before Continuing

- [ ] `lib/config/feature-flags.ts` exists and exports `featureFlags` and `serverFlags` — TypeScript compiles with no errors
- [ ] `lib/config/levels.ts` exists — run `getLevelFromXP(0)` returns level 1, `getLevelFromXP(200)` returns level 2, `getLevelFromXP(75000)` returns level 10 (ENBOSS)
- [ ] All 15 new model files exist in `lib/models/` — each exports a default model
- [ ] `User.ts` compiles — the new fields are in both the Schema and the IUser interface
- [ ] `FormSubmission.ts` has the optional `userId` field
- [ ] `Skatepark.ts` has the 6 new optional fields
- [ ] `.env.local.example` exists with all flags set to `false`
- [ ] `npm run build` or `npx tsc --noEmit` passes with no TypeScript errors

---

## STEP 2 — XP Service & Badge Service (Core Engine)

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 2 of 20 — the core XP and badge services. All models from Step 1 exist. Do not build any UI or API routes yet.

**Context:** The XP service is the single function that all reward-granting API routes will call. It must never be duplicated inline. The badge service checks whether a stat change has unlocked a new badge.

---

**Task 1: Create `lib/services/xp.service.ts`**

Export `awardXP(params)` — async function that:

1. Checks `featureFlags.xpSystem` — if false, returns immediately with no changes.
2. Queries `XPMultiplierEvent` for any active event where `isActive: true`, `startsAt <= now`, `endsAt >= now`, and `appliesTo` includes the given `type` or includes 'all'. If found, multiply xpAmount by `multiplier`. Store the original as `baseXP` and the multiplier value as `multiplierApplied`.
3. Atomically increments `user.totalXP`, `user.currentSeasonXP`, and `user.stats.[relevantCounter]` using `$inc`. The relevant counter mapping is:
   - skatepark_checkin → stats.skateparksVisited (only if `meta.isNewPark === true`), stats.totalCheckinHours += durationHours
   - guide_quiz_passed → stats.guidesCompleted, stats.quizzesPassed
   - event_signup → stats.eventsAttended
   - review_written → stats.reviewsWritten
   - survey_completed → stats.surveysCompleted
   - kudos_received → stats.kudosReceived
   - kudos_given → stats.kudosGiven
   - weekly_challenge_completed → stats.challengesCompleted
4. If user is in a crew (user.crewId exists): increment `Crew.totalXP`, `Crew.currentSeasonXP`, and the member's `contributedXP` inside the members array, using `$inc` and `$` positional operator.
5. Creates an `XPEvent` document with all relevant fields including `seasonId` (from the currently active `Season` where `isActive: true`).
6. Calls `checkLevelUp(userId, oldXP, newXP)` — if level changed, creates an `AwardNotification` of type `level_up` with new level title and returns the new level.
7. Calls `badgeService.checkAndAwardBadges(userId, type, updatedStats)` — returns array of newly earned `BadgeDefinition` documents.
8. For each earned badge: adds badge to `user.badges` array (with earnedAt and sourceId), creates an `AwardNotification` of type `badge`.
9. Returns `{ newTotal: number, newLevel: Level | null, badgesEarned: BadgeDefinition[] }`.

Params type:
```ts
{
  userId: string;
  type: XPEventType;
  xpAmount: number;
  sourceId?: string;
  sourceType?: string;
  meta?: Record<string, any>;
}
```

Also export `checkLevelUp(userId: string, oldXP: number, newXP: number)` — uses `getLevelFromXP` from `lib/config/levels.ts`. Returns new Level if level changed, null otherwise.

---

**Task 2: Create `lib/services/badge.service.ts`**

Export `checkAndAwardBadges(userId: string, actionType: string, stats: UserStats): Promise<BadgeDefinition[]>`

Logic:
1. Find all `BadgeDefinition` docs where `isActive: true` and `trigger.type === 'count'` and `trigger.action === actionType`.
2. Filter out badges the user already has (check `user.badges` array).
3. For remaining candidates: check if `stats.[relevantCounter] >= trigger.threshold`.
4. Return all newly qualifying badges (do not save them — the XP service saves them).

Also export `awardBadgeManually(userId: string, badgeId: string, adminId: string, note: string)` — for admin use. Adds badge to user, creates XPEvent of type admin_adjustment with the xpReward of the badge, creates AwardNotification.

---

**Task 3: Create `lib/services/streak.service.ts`**

Export:
- `addCheckinHours(userId: string, durationMinutes: number, isoWeek: string, isoMonth: string): Promise<void>` — increments `user.streak.weeklyHoursThisWeek` and `user.streak.monthlyHoursThisMonth` using $inc.
- `processWeeklyStreaks(): Promise<void>` — iterates all users, checks if `weeklyHoursThisWeek >= STREAK_WEEKLY_MIN_HOURS`, updates streak counts, resets weeklyHoursThisWeek to 0, awards bonus XP via `awardXP()` if streak continues, writes `StreakRecord` docs. Checks streak badges.
- `processMonthlyStreaks(): Promise<void>` — same logic for monthly.

---

**Task 4: Create `lib/services/king.service.ts`**

Export `updateKingForSkatepark(skateparkId: string, skateparkSlug: string, month: string): Promise<void>`

Logic:
1. Count verified checkins per userId for this `skateparkId` and `isoMonth`.
2. Find the userId with the highest count.
3. Load or create `SkateparkKing` for `{ skateparkId, month }`.
4. If the leading userId is different from `currentKingUserId`: update the king, push previous king to `history`, create `AwardNotification` of type `king_crowned` for new king and `king_dethroned` for the previous king, update `Skatepark.currentKingUserId/Username/Photo`.
5. Always update `currentKingCheckins`.

All services must import from `lib/config/feature-flags.ts` and skip their work if the relevant flag is false.
```

### What This Step Does
The XP service is the heart of everything. Every time a user earns points from here on, it goes through `awardXP()`. This step also sets up the badge evaluation logic and the streak/king maintenance services that will be called by cron jobs later.

### ✅ Verify Before Continuing

- [ ] `lib/services/xp.service.ts` exists and exports `awardXP` and `checkLevelUp`
- [ ] `lib/services/badge.service.ts` exists and exports `checkAndAwardBadges` and `awardBadgeManually`
- [ ] `lib/services/streak.service.ts` exists and exports all 3 functions
- [ ] `lib/services/king.service.ts` exists and exports `updateKingForSkatepark`
- [ ] TypeScript compiles with no errors across all service files
- [ ] Manually test in a scratch script or the Node REPL: call `awardXP` with `NEXT_PUBLIC_ENABLE_XP_SYSTEM=false` → nothing happens. Set to `true` → XPEvent document is created in MongoDB and `user.totalXP` is incremented.
- [ ] Calling `awardXP` with a type that maps to a stat counter correctly increments that counter
- [ ] `getLevelFromXP` is used correctly in `checkLevelUp` — giving a user exactly 200 XP triggers level 2

---

## STEP 3 — Award Popup Notification System

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 3 of 20 — the award popup notification system. The XP service from Step 2 already creates AwardNotification documents. This step builds the frontend system that shows them to the user.

**Context:** This must be a global system — a React context that wraps the app and polls for unread notifications, then shows them one at a time as popups. It must check `featureFlags.awardPopups` before doing anything.

---

**Task 1: Create 2 API routes**

`GET /api/notifications/unread`
- Requires authentication. Returns 401 if not logged in.
- Checks `featureFlags.awardPopups` server-side — returns 403 if false.
- Returns all `AwardNotification` docs for this user where `isRead: false`, sorted by `createdAt` ascending (oldest first, so we show them in order).
- Only returns fields needed for display: type, xpAmount, badgeId, badgeName, badgeIcon, levelId, levelTitle, message, sourceType, createdAt.

`PATCH /api/notifications/mark-read`
- Requires authentication.
- Body: `{ ids: string[] }` — array of notification _id strings.
- Sets `isRead: true` and `readAt: new Date()` for all matching docs belonging to this user.
- Returns `{ success: true }`.

---

**Task 2: Create `lib/hooks/useAwardNotifications.ts`**

A custom React hook that:
1. Checks `featureFlags.awardPopups` — if false, returns empty state immediately.
2. Polls `GET /api/notifications/unread` every 30 seconds (use `setInterval`).
3. Maintains a queue of unread notifications in state.
4. Exposes `currentNotification` (first in queue or null), `dismissCurrent()` (marks it read + removes from queue), `queueLength`.

---

**Task 3: Create `lib/contexts/AwardNotificationContext.tsx`**

A React context that wraps `useAwardNotifications` and provides it to the component tree. Export `AwardNotificationProvider` and `useAwardNotificationContext`.

---

**Task 4: Create `components/gamification/AwardPopup.tsx`**

A component that reads from `AwardNotificationContext` and renders the appropriate popup based on `currentNotification.type`:

- **`xp`** — Small toast, bottom-right corner, auto-dismisses after 3 seconds. Shows: "+[xpAmount] XP · [message in current locale]". Use a subtle slide-in animation.

- **`badge`** — Full centered modal. Shows: badge icon (large), badge name (localized), badge rarity as a coloured chip (common=grey, rare=blue, epic=purple, legendary=gold), description (localized), a short celebration animation (CSS keyframes, no external library). A "Nice!" dismiss button. Does NOT auto-dismiss.

- **`level_up`** — Full centered modal. Shows: "Level Up! 🎉" heading, new level title in large text coloured with the level's color from `lib/config/levels.ts`, XP bar showing new position, a "Keep Riding!" dismiss button. Does NOT auto-dismiss.

- **`king_crowned`** — Toast with 👑 emoji. "You're the King of [park name]!". Auto-dismisses 5 seconds.

- **`king_dethroned`** — Toast with a fallen crown. "You've been dethroned at [park name]". Auto-dismisses 4 seconds.

- **`streak`** — Toast with 🔥 emoji. Shows streak count. Auto-dismisses 4 seconds.

All text must support bilingual display — use the current locale to choose `message.en` or `message.he`.

---

**Task 5:** Add `<AwardNotificationProvider>` and `<AwardPopup />` to the root layout (`app/layout.tsx` or the main authenticated layout). The popup should only render when a user is logged in.

All components must check `featureFlags.awardPopups` before rendering anything.
```

### What This Step Does
Before building any more reward hooks, you need to be able to *see* when rewards are working. This step gives you the visual feedback layer — every XP earn, badge, and level-up will show as a popup from this point forward. Without this, you'd be building features blind.

### ✅ Verify Before Continuing

- [ ] `/api/notifications/unread` returns 401 for logged-out users, 403 if `awardPopups` flag is false
- [ ] `/api/notifications/mark-read` correctly sets `isRead: true` in the database
- [ ] `AwardNotificationProvider` wraps the app without breaking any existing pages
- [ ] Manually insert an `AwardNotification` document of type `xp` in MongoDB for your admin user → within 30 seconds, the XP toast appears on screen
- [ ] Manually insert type `badge` → the badge modal appears and requires a click to dismiss
- [ ] Manually insert type `level_up` → the level-up modal appears with the correct level color
- [ ] After dismissing each popup, confirm the document now has `isRead: true` in MongoDB
- [ ] With `NEXT_PUBLIC_ENABLE_AWARD_POPUPS=false`, no polling happens and no popups appear

---

## STEP 4 — Easy Reward Hooks (Signup, Survey, Review)

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 4 of 20 — hooking XP rewards into existing actions that already work. The XP service from Step 2 and the popup system from Step 3 are ready.

**Context:** These three hooks require NO new UI — they just add XP award calls into existing API route handlers after their main action succeeds.

---

**Task 1: Event Signup Reward**

In the existing API route that handles event signups (POST to create an `EventSignup`), after the signup is successfully saved:
1. Check if the request has an authenticated user session.
2. Check `featureFlags.eventSignupRewards` — skip if false.
3. Call `awardXP({ userId, type: 'event_signup', xpAmount: serverFlags.xpEventSignup, sourceId: signup._id, sourceType: 'event', meta: { eventSlug } })`.
4. Do not fail the signup if the XP award fails — wrap in try/catch and log the error.

---

**Task 2: Survey / Growth-Lab Reward**

In the existing API route that handles `FormSubmission` creation, after the submission is successfully saved:
1. Check if the request has an authenticated user session.
2. Check `featureFlags.surveyRewards` — skip if false.
3. Check for duplicate: has this user already submitted this formId? Query `FormSubmission` where `formId === submission.formId AND userId === session.userId`. If a previous submission exists, skip the reward (one reward per user per form).
4. Set `submission.userId = session.userId` before saving (the field now exists from Step 1).
5. Call `awardXP({ userId, type: 'survey_completed', xpAmount: serverFlags.xpSurveyCompleted, sourceId: form._id, sourceType: 'form', meta: { formSlug } })`.

---

**Task 3: Review Reward**

In the existing API route that handles review creation for skateparks, after the review is successfully saved:
1. Check if the request has an authenticated user session.
2. Check `featureFlags.reviewRewards` — skip if false.
3. Call `awardXP({ userId, type: 'review_written', xpAmount: serverFlags.xpReviewWritten, sourceId: skatepark._id, sourceType: 'skatepark', meta: { skateparkSlug } })`.

---

**Task 4: Kudos / Props**

The existing heart/helpful button on skatepark reviews currently exists but may not save to a model. This task makes it a real XP-earning action.

Create `POST /api/reviews/[reviewId]/kudos`:
1. Requires authentication.
2. Check `featureFlags.kudos` — return 403 if false.
3. Check `ReviewKudos` for existing record `{ giverUserId: session.userId, reviewId }` — if found, return 400 "Already given kudos".
4. Determine `receiverUserId` from the review document.
5. Prevent self-kudos: if `giverUserId === receiverUserId`, return 400.
6. Create `ReviewKudos` document.
7. Award XP to giver: `awardXP({ userId: giverId, type: 'kudos_given', xpAmount: serverFlags.xpKudosGiven, ... })`.
8. Award XP to receiver: `awardXP({ userId: receiverId, type: 'kudos_received', xpAmount: serverFlags.xpKudosReceived, ... })`.
9. Return `{ success: true, totalKudos: newKudosCount }`.

Update the heart/helpful button in the review component to call this API instead of whatever it does now. Show the current kudos count. Check `featureFlags.kudos` — if false, hide the button entirely or show it as non-interactive (your choice based on design).

Do not break any existing functionality. All tasks are additive only.
```

### What This Step Does
Three of the easiest XP sources — event signups, surveys, and reviews — get wired up with almost no new code. This is the fastest way to have real XP flowing through the system so you can see it working end-to-end with the popup system from Step 3.

### ✅ Verify Before Continuing

- [ ] Sign up for a test event → XP toast appears (if `eventSignupRewards=true`)
- [ ] Submit a growth-lab form → XP toast appears (if `surveyRewards=true`)
- [ ] Submit the same form again → no second XP awarded
- [ ] Write a skatepark review → XP toast appears (if `reviewRewards=true`)
- [ ] Give kudos on a review → giver sees XP toast, receiver's AwardNotification is created
- [ ] Try to give kudos twice on the same review → 400 error returned
- [ ] Try to give kudos to yourself → 400 error returned
- [ ] Check MongoDB: `XPEvent` collection has documents for each action
- [ ] Check MongoDB: `User.totalXP` has been incremented correctly
- [ ] Check MongoDB: `User.stats.reviewsWritten`, `stats.eventsAttended`, `stats.surveysCompleted` are incrementing
- [ ] Turn each flag to `false` individually and confirm no XP is awarded for that action

---

## STEP 5 — User Profile: Edit & Public View

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 5 of 20 — user profile pages. The XP system is working. Now users need a place to see their progress and edit their identity.

---

**Task 1: Edit Profile page — `/account/profile`**

Create `app/(main)/account/profile/page.tsx` (or the equivalent route in your app structure). Requires authentication — redirect to login if not authenticated.

Sections:
1. **Avatar** — Profile photo display. Upload button opens file picker → uploads to your existing image storage → updates `user.profilePhoto`. Show current photo or a default avatar placeholder.
2. **Identity** — Edit: username (unique, validated), full name, bio (textarea, max 300 chars), city (use the existing israel-cities autocomplete component), relatedSports (multi-select checkboxes: skateboarding, rollerblading, bmx, scootering).
3. **Progress** (read-only, only if `featureFlags.xpSystem`) — Current level badge (title + colour from levels config), XP bar showing progress to next level (current XP / next level minXP), total XP number, current rank (only if `featureFlags.personalRanking`).
4. **Streak** (read-only, only if `featureFlags.streaks`) — Weekly streak flame count, monthly streak count, weekly hours this week vs threshold.
5. **Badges** (only if `featureFlags.xpSystem`) — Grid of earned badges. Each badge shows icon, name (localized), rarity chip, date earned. If no badges yet, show empty state "Start riding to earn your first badge".
6. **XP History** (only if `featureFlags.xpSystem`) — Table of last 20 XPEvents: date, type (human-readable localized label), XP amount (+/-), source name. Paginated (load more button).

Save button for the editable fields. Username uniqueness must be validated on the server. Show inline error if username is taken.

---

**Task 2: Public profile page — `/users/[username]/page.tsx`**

Accessible to anyone including logged-out users.

Sections (same visual design as edit page but read-only):
1. Header: profile photo, username, level badge, city, relatedSports tags, bio.
2. Streak display (if `featureFlags.streaks` and user has a streak > 0).
3. Stats grid: Parks Visited, Guides Completed, Events Attended, Reviews Written — all from `user.stats`.
4. Badge grid — same as edit page but no interaction.
5. If this is the logged-in user's own profile AND `featureFlags.personalRanking`: show "Your rank: #[currentRank]" chip.
6. Recent XP activity (last 5 events, brief display).

If the username doesn't exist, return a 404 page.

---

**Task 3: API routes**

`GET /api/users/[username]` — public profile data (no sensitive fields). Looks up user by `username` field.
`PATCH /api/account/profile` — authenticated. Updates username, bio, profilePhoto, relatedSports, city, fullName. Validates username uniqueness.
`GET /api/account/xp-history?page=&limit=` — authenticated. Paginated XPEvent query for the logged-in user.

---

**Task 4: Navbar / header update**

If the user is logged in, add a link to `/account/profile` (avatar or username in the header). Show the user's current level badge next to their name if `featureFlags.xpSystem` is true.
```

### What This Step Does
Users now have a real profile — a place that reflects who they are as a rider. This is the core identity feature that all other gamification surfaces point back to.

### ✅ Verify Before Continuing

- [ ] `/account/profile` redirects to login when not authenticated
- [ ] Can update username, bio, city, relatedSports and changes persist in MongoDB
- [ ] Uploading a profile photo saves correctly and displays on reload
- [ ] Setting a duplicate username shows a clear error message
- [ ] XP bar shows correct values from `getLevelFromXP` and `getNextLevel`
- [ ] Badge grid shows badges earned in Steps 3–4 (if any were triggered)
- [ ] XP history shows the correct events with correct amounts
- [ ] `/users/[username]` shows public profile correctly for a valid username
- [ ] `/users/nonexistent` returns a 404 page
- [ ] Rank number only shows if `NEXT_PUBLIC_ENABLE_PERSONAL_RANKING=true`
- [ ] The header shows the user's level badge when logged in

---

## STEP 6 — Guide Quizzes

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 6 of 20 — guide quizzes. Users can take a quiz at the end of a guide and earn XP for passing.

---

**Task 1: Admin quiz builder — `/admin/guides/[slug]/quiz`**

Create this admin page. Requires admin role.

The page allows the admin to create or edit a quiz for a specific guide:
- Add/remove/reorder questions (drag handles optional, numbered order field is fine).
- Each question: question text (EN + HE tabs), 2–5 answer options (EN + HE each), select which option is correct (radio button), optional explanation text (EN + HE).
- Set passing score (number input, default 70, meaning 70% correct to pass).
- Set XP reward (number input, default from `serverFlags.xpQuizPassed`).
- Toggle active/inactive.
- Save button → upserts `GuideQuiz` document.

Show a link to this page from the guide's admin edit page.

---

**Task 2: Quiz UI on guide page**

On the public guide page (`/guides/[slug]`), at the very bottom of the content:
1. Check `featureFlags.guideQuizzes` — if false, render nothing.
2. If user is not logged in — show "Log in to take the quiz and earn XP" prompt (no quiz content).
3. Fetch `GET /api/guides/[slug]/quiz` — if no quiz exists or `isActive: false`, render nothing.
4. Fetch `GET /api/guides/[slug]/quiz/attempt` — if user already passed, show "Quiz completed ✓ You earned [xp] XP" instead of the quiz.
5. If quiz exists and user hasn't passed: show a "Take the Quiz" button that reveals the quiz.

The quiz renders as a multi-step card — one question per step. Show progress (Question 2 of 5). Each step shows the question and 3–5 answer options as selectable cards. No feedback per question — all answers collected first, then submitted.

Final step: "Submit" button → calls `POST /api/guides/[slug]/quiz/submit`.

After submission:
- If passed: show score (e.g. "4/5 correct"), XP earned, confetti animation. The AwardPopup system will show the badge if one was earned.
- If failed: show score, passing threshold, "Try Again" button (retry is allowed but XP only awarded on first pass).

---

**Task 3: API routes**

`GET /api/guides/[slug]/quiz` — public if quiz exists and isActive. Returns questions WITHOUT the `correctOptionIndex` field (strip it server-side before returning). Returns xpReward and passingScore.

`POST /api/guides/[slug]/quiz/submit` — requires authentication. Check flag. Body: `{ answers: number[] }`. Server calculates score by comparing answers to `correctOptionIndex` from the stored quiz. If score >= passingScore:
- Check `GuideQuizAttempt` for prior passed attempt (xpAwarded: true) — if found, return the previous result without awarding XP again.
- Call `awardXP(...)` with type `guide_quiz_passed`.
- Save `GuideQuizAttempt` with `xpAwarded: true`.
If failed: save attempt with `passed: false, xpAwarded: false`. Increment `attemptNumber`.
Returns `{ passed, score, correctCount, totalCount, xpEarned }`.

`GET /api/guides/[slug]/quiz/attempt` — authenticated. Returns the user's best/latest attempt for this guide if one exists.

(Admin) `GET /api/admin/guides/[slug]/quiz` — returns full quiz including correct answers.
(Admin) `POST /api/admin/guides/[slug]/quiz` — create/update quiz.
```

### What This Step Does
Guide quizzes are the knowledge-engagement loop. Reading a guide alone is passive; the quiz makes it active and rewarding. It also gives you content to test the full XP + badge + popup flow end-to-end with a controlled action.

### ✅ Verify Before Continuing

- [ ] Admin can create a quiz with 3+ questions, set correct answers, and save it
- [ ] The saved quiz appears on the guide page for logged-in users
- [ ] Questions render one at a time and all answers are collected before submit
- [ ] Correct answers are NOT exposed in the `GET /api/guides/[slug]/quiz` response (check Network tab)
- [ ] Submitting all correct answers → pass message + XP toast appears
- [ ] Submitting wrong answers → fail message + score shown + "Try Again" works
- [ ] Taking the quiz again after passing → "Quiz completed ✓" shows, no second XP awarded
- [ ] `GuideQuizAttempt` document created in MongoDB for each attempt
- [ ] `user.stats.guidesCompleted` and `quizzesPassed` incremented after passing
- [ ] With `NEXT_PUBLIC_ENABLE_GUIDE_QUIZZES=false`, no quiz UI appears on guide pages

---

## STEP 7 — Skatepark Check-Ins, Pioneer & King

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 7 of 20 — the skatepark check-in system, Pioneer badge, and Skatepark King. This is the most complex feature. Build all three together as they share the same trigger (a verified check-in).

---

**Task 1: Check-In API routes**

`POST /api/checkin/start`
- Requires authentication. Check `featureFlags.locationCheckins`.
- Body: `{ skateparkId: string, lat: number, lng: number }`.
- Load the Skatepark by ID. Get its coordinates from the DB.
- Calculate distance between user coordinates and skatepark coordinates using the Haversine formula. If distance > 200 meters, return 400 "You are too far from this skatepark".
- Check for an existing unverified checkin for this user at this skatepark today (same calendar day in Israel timezone, Asia/Jerusalem). If one exists, return 400 "Already checked in today".
- Calculate `isoWeek` (format: '2025-W12') and `isoMonth` ('2025-03') from current date.
- Create `SkateparkCheckin` with `checkInAt: now`, `isVerified: false`.
- Return `{ checkinId, checkInAt, message: "Check-in started! Stay for 60 minutes to earn XP." }`.

`POST /api/checkin/verify`
- Requires authentication. Check flag.
- Body: `{ checkinId: string }`.
- Load the checkin. Verify it belongs to the authenticated user.
- Calculate `durationMinutes = (now - checkInAt) / 60000`.
- If `durationMinutes < 60`, return 400 "Not enough time yet — [X] minutes remaining".
- Set `isVerified: true`, `checkOutAt: now`, `durationMinutes`.
- Call `addCheckinHours(userId, durationMinutes, isoWeek, isoMonth)` from streak service.
- **Pioneer check** (if `featureFlags.pioneerBadge`): Query `SkateparkCheckin` for any prior `isVerified: true` AND `isPioneer: true` doc at this `skateparkId`. If none found: set `isPioneer: true` on this checkin, update `Skatepark.pioneerId/Username/Photo`, increment `user.stats.pioneerParks`, push skateparkId to `user.pioneerParkIds`, call `awardXP` for `pioneer_bonus` type with `xpPioneerBonus` amount.
- **King update** (if `featureFlags.skateparkKing`): Call `king.service.updateKingForSkatepark(skateparkId, skateparkSlug, isoMonth)`.
- **Award base XP**: Check if user has already earned XP for this park (query `SkateparkCheckin` for any prior `xpAwarded: true` at this park). If first-ever verified checkin at this park: set `meta.isNewPark: true`. Call `awardXP({ type: 'skatepark_checkin', xpAmount: serverFlags.xpSkatepark, meta: { isNewPark, skateparkSlug, durationMinutes } })`.
- Set `checkin.xpAwarded: true`, save.
- Return `{ xpEarned, isPioneer, isNewPark, durationMinutes }`.

`GET /api/checkin/status`
- Requires authentication. Query param: `skateparkId`.
- Returns: `{ hasActiveCheckin: bool, checkinId: string | null, canCheckInToday: bool, minutesElapsed: number | null }`.

`GET /api/skateparks/[slug]/king`
- Public. Returns current `SkateparkKing` doc for the current month for this park.

---

**Task 2: Check-In UI on skatepark page**

On the skatepark detail page, add a check-in section (only if `featureFlags.locationCheckins` and user is logged in):

States the UI must handle:
1. **Default:** "Check In Here" button.
2. **Location loading:** Spinner while waiting for `navigator.geolocation.getCurrentPosition`.
3. **Too far:** "You need to be at the skatepark to check in" error message with distance shown.
4. **Active check-in:** Timer showing elapsed time (MM:SS), progress bar toward 60 minutes, "You're checked in! [X] minutes remaining" message.
5. **Ready to verify:** At 60+ minutes, "Verify Check-In & Earn XP" button appears.
6. **Completed today:** "Checked in today ✓ Come back tomorrow" message.

Use `navigator.geolocation` on button click. Store the active `checkinId` in `localStorage` keyed to the skatepark slug so the timer persists on page refresh.

The timer should count up client-side from `checkInAt` (received from the API). Poll `GET /api/checkin/status?skateparkId=` on mount to restore state if user navigates away and returns.

---

**Task 3: Pioneer display on skatepark page**

If `featureFlags.pioneerBadge` and `skatepark.pioneerId` exists, show a small banner below the skatepark title:
"🏆 First Rider: @[pioneerUsername]" with their profile photo (small avatar). This is a link to their public profile. This is permanent — never removed once set.

---

**Task 4: King display on skatepark page**

If `featureFlags.skateparkKing`, show a section on the skatepark page:
"👑 King of [Month]: @[username]" with their photo and "[X] check-ins this month". Links to their profile. If no king yet this month (park has no checkins), show "No king yet this month — be the first!".

---

**Task 5: Cron job for auto-verification (optional enhancement)**

Create `app/api/cron/verify-checkins/route.ts` — secured with `CRON_SECRET` header check.
Finds all `SkateparkCheckin` docs where `isVerified: false` and `checkInAt < now - 60 minutes`.
For each: calls the same verify logic as the API above.
This handles cases where users forget to tap "Verify".
```

### What This Step Does
The check-in system is the most physically real feature — it connects what happens at a real skatepark to the platform. Pioneer and King are built on top of it. This step is worth the complexity because check-ins are the highest-engagement loop on the platform.

### ✅ Verify Before Continuing

- [ ] Clicking "Check In Here" requests geolocation permission
- [ ] With coordinates far from the skatepark (test by mocking location): "Too far" error shown
- [ ] With coordinates near the skatepark: check-in starts, timer appears
- [ ] Timer persists if you refresh the page (uses localStorage)
- [ ] Before 60 minutes: verify button is NOT shown
- [ ] After 60 minutes (or set `checkInAt` manually in DB to 61 min ago): verify button appears
- [ ] Clicking verify: XP toast appears, check-in is marked verified in MongoDB
- [ ] First-ever verify at a park: Pioneer banner appears on park page, `isPioneer: true` in DB
- [ ] Second user to verify at the same park: does NOT become Pioneer
- [ ] King section shows on skatepark page (may be empty if no verified checkins yet for the month)
- [ ] After 2+ users check in: the user with the most checkins appears as King
- [ ] Cannot start two check-ins at the same park on the same calendar day
- [ ] With `NEXT_PUBLIC_ENABLE_LOCATION_CHECKINS=false`: no check-in button appears anywhere
- [ ] With `NEXT_PUBLIC_ENABLE_PIONEER_BADGE=false`: Pioneer banner never shows
- [ ] With `NEXT_PUBLIC_ENABLE_SKATEPARK_KING=false`: King section never shows

---

## STEP 8 — Streak Tracking & Cron Jobs

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 8 of 20 — streak tracking. The streak service from Step 2 exists. The check-in system from Step 7 calls `addCheckinHours()`. This step wires up the full streak lifecycle with cron jobs and UI display.

---

**Task 1: Streak status API**

`GET /api/streaks/me` — authenticated. Check `featureFlags.streaks`. Returns:
```json
{
  "weeklyStreak": 4,
  "monthlyStreak": 2,
  "longestWeeklyStreak": 7,
  "longestMonthlyStreak": 3,
  "weeklyHoursThisWeek": 1.5,
  "weeklyHoursTarget": 3,
  "monthlyHoursThisMonth": 6,
  "monthlyHoursTarget": 10,
  "weeklyProgress": 0.5,
  "monthlyProgress": 0.6,
  "currentWeekEndsAt": "2025-03-16T22:59:59.000Z",
  "isAtRisk": true
}
```
`isAtRisk` is true when: fewer than 2 days remain in the week AND weeklyHoursThisWeek < weeklyHoursTarget.

`GET /api/streaks/[username]` — public. Returns only streak counts and longest streaks (no hours data).

---

**Task 2: Streak UI on profile page**

Update the edit profile page (`/account/profile`) and public profile page (`/users/[username]`).

On the edit profile page, add a "Streak" card (only if `featureFlags.streaks`):
- Large flame emoji 🔥 with current weekly streak count.
- Weekly hours progress bar: "1.5 / 3 hours this week"
- Monthly hours progress bar: "6 / 10 hours this month"
- Monthly streak count below.
- If `isAtRisk: true`: yellow warning banner — "⚠️ Your streak is at risk! [X] hours needed by Sunday."
- Longest streak records.

On the public profile page, show: streak flame with count (weekly), no hours data.

---

**Task 3: Cron jobs**

`app/api/cron/process-weekly-streaks/route.ts`
- Secured: check `Authorization: Bearer ${CRON_SECRET}` header. Return 401 if invalid.
- Calls `streakService.processWeeklyStreaks()`.
- Should be scheduled to run every Monday at 01:00 AM Israel time (Asia/Jerusalem).
- Returns `{ processed: number, streaksExtended: number, streaksReset: number }`.

`app/api/cron/process-monthly-streaks/route.ts`
- Same security. Calls `streakService.processMonthlyStreaks()`.
- Should run on the 1st of each month at 01:00 AM Israel time.

`app/api/cron/reset-weekly-hours/route.ts`
- Runs every Monday. Resets `user.streak.weeklyHoursThisWeek = 0` for all users via bulk update.

Add these cron jobs to `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/process-weekly-streaks", "schedule": "0 23 * * 0" },
    { "path": "/api/cron/process-monthly-streaks", "schedule": "0 23 1 * *" },
    { "path": "/api/cron/reset-weekly-hours", "schedule": "0 23 * * 0" }
  ]
}
```
(23:00 UTC = 01:00 Israel time in winter, 00:00 in summer — adjust with DST awareness in the service logic.)

---

**Task 4: Streak badge triggers**

In `lib/services/streak.service.ts`, after updating streak counts and before returning, call `badgeService.checkAndAwardBadges()` for streak-type badges. The badge definitions for streaks need to be seeded — add a seed script or admin action to insert the streak badge definitions into `BadgeDefinition` collection if they don't exist:

weekly streaks: 4-week (week-streak-4), 12-week (week-streak-12), 26-week (week-streak-26)
monthly streaks: 3-month (month-streak-3), 6-month (month-streak-6), 12-month (month-streak-12)
```

### What This Step Does
Streaks are the top retention mechanic. Once users have a streak going, they'll keep coming back to protect it. This step closes the loop by making streaks visible, awarding bonuses, and running the weekly/monthly maintenance cron jobs.

### ✅ Verify Before Continuing

- [ ] `GET /api/streaks/me` returns correct hours data — verify by checking against `SkateparkCheckin` records
- [ ] Profile page shows the streak card with correct progress bars
- [ ] `isAtRisk` warning appears when conditions are met (test by manually setting `lastActiveWeek` and low hours)
- [ ] Manually call the weekly streak cron endpoint (with the correct `CRON_SECRET` header) → streak counts update in MongoDB
- [ ] Users who met the threshold have `currentWeeklyStreak` incremented
- [ ] Users who did not meet the threshold have `currentWeeklyStreak` reset to 0 and `longestWeeklyStreak` updated if applicable
- [ ] Streak bonus XP is awarded via `awardXP` (check `XPEvent` collection)
- [ ] `StreakRecord` documents are created for each user after cron runs
- [ ] Streak badges trigger when thresholds are hit (check badge seeding)
- [ ] With `NEXT_PUBLIC_ENABLE_STREAKS=false`: no streak UI, no streak API responses, no streak XP

---

## STEP 9 — Explorer Map on Profile

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 9 of 20 — the Explorer Map. The check-in system from Step 7 is working and users now have verified check-in records.

**Context:** The Explorer Map shows a personal view of Israel's skateparks — visited (green), pioneer (star), king (crown), unvisited (grey). It reuses the existing skatepark map component.

---

**Task 1: Refactor the existing map component**

The existing `/skateparks` page has a Google Map component showing all parks as pins. Extract the map component so it accepts props:

```ts
interface SkateparksMapProps {
  pins: Array<{
    skateparkId: string;
    slug: string;
    name: string;
    lat: number;
    lng: number;
    status: 'visited' | 'pioneer' | 'king' | 'unvisited';
  }>;
  interactive?: boolean; // if false, clicking pins only navigates, no controls
  showLegend?: boolean;
}
```

Pin colours/icons by status:
- `visited` → green filled pin
- `pioneer` → green pin with a gold star ⭐
- `king` → green pin with a crown 👑
- `unvisited` → grey/muted pin

The existing `/skateparks` page continues working as before — it passes all parks as `unvisited` initially, then marks visited ones from the user session if logged in.

---

**Task 2: Explorer Map API**

`GET /api/account/explorer-map` — authenticated. Check `featureFlags.explorerMap`.

Returns all skateparks with the user's personal status for each:
```json
{
  "totalParks": 47,
  "visitedCount": 12,
  "pioneerCount": 2,
  "kingCount": 1,
  "pins": [
    { "skateparkId": "...", "slug": "...", "name": "...", "lat": ..., "lng": ..., "status": "pioneer" },
    ...
  ]
}
```

Status priority: if user is pioneer at a park → 'pioneer'. If user is current king → 'king'. If user has any verified checkin → 'visited'. Otherwise → 'unvisited'.

---

**Task 3: Add Explorer Map to profile pages**

On `/account/profile`: Add a "My Map" tab or section (only if `featureFlags.explorerMap`). Shows the `<SkateparksMap>` component with the user's personal pin statuses. Shows "You've visited [X] of [Y] parks in Israel" above the map.

On `/users/[username]`: Same map section but calls a public version of the endpoint (or the same one if viewing your own profile). For other users' profiles, load their visited/pioneer/king parks (status is public info).

Create `GET /api/users/[username]/explorer-map` — public endpoint. Same logic but for the requested username.
```

### What This Step Does
The Explorer Map turns abstract XP numbers into something visually meaningful. A user can literally see their journey across Israel park by park. It makes the check-in feature feel worth it beyond just the XP.

### ✅ Verify Before Continuing

- [ ] Existing `/skateparks` page still works identically after map refactor
- [ ] Profile page shows the map with correct pin colours for visited parks
- [ ] Parks with Pioneer status show the star icon
- [ ] Parks with King status show the crown icon
- [ ] Unvisited parks show as muted/grey
- [ ] "Visited X of Y parks" counter is correct
- [ ] Another user's public profile also shows their map
- [ ] With `NEXT_PUBLIC_ENABLE_EXPLORER_MAP=false`: map section doesn't appear on any profile

---

## STEP 10 — Event Winner Claims

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 10 of 20 — event winner claims. After a competition event ends, riders can submit their result for admin approval.

---

**Task 1: Winner claim form on event page**

On the event detail page, after the event's `endDate` has passed:
1. Check `featureFlags.eventWinnerClaims` — if false, render nothing.
2. If user is not authenticated, show nothing.
3. Check if user already submitted a claim for this event (query `EventWinnerClaim` by `userId + eventId`) — if yes, show claim status: "Your claim is [pending/approved/rejected]" with admin notes if rejected.
4. If no claim yet: show "Claim Your Result" button that opens a form:
   - Placement: radio (1st / 2nd / 3rd / Participated)
   - Sport: text or select (pre-filled with event's sport if available)
   - Category: text input, optional (e.g. 'Pro', 'Amateur', 'Under 18')
   - Description: textarea (required, explain what you won or how you placed)
   - Proof images: optional file upload (max 3 images)
   - Submit button.

---

**Task 2: API routes**

`POST /api/events/[slug]/winner-claim` — authenticated. Check flag. Validate required fields. Check for duplicate claim. Create `EventWinnerClaim` with status 'pending'. Return `{ claimId, status: 'pending' }`.

`GET /api/events/[slug]/winner-claim/my` — authenticated. Returns this user's claim for this event if it exists.

---

**Task 3: Admin review page — `/admin/ranking/winner-claims`**

Requires admin role. Check `featureFlags.adminRanking`.

Show a table of all claims filtered by status (tabs: Pending / Approved / Rejected).

Each row: event name, username, placement, sport, category, submitted date, status.
Clicking a row opens a detail panel:
- Full claim details + proof images.
- Admin notes textarea.
- "Approve" and "Reject" buttons.

`PATCH /api/admin/winner-claims/[id]`
- Admin only.
- Body: `{ action: 'approve' | 'reject', notes?: string }`.
- On approve: set status 'approved', set `reviewedBy/At`. Call `awardXP` with the appropriate XP amount based on `placement` (1st=500, 2nd=300, 3rd=150, participant=0). Set `xpAwarded: true`. Check for `champion` badge.
- On reject: set status 'rejected', set `reviewedBy/At/Notes`. Create `AwardNotification` of type `xp` with message explaining the rejection (xpAmount: 0 in this case — or use a different notification type).
- Notify the user via `AwardNotification` in both cases.
```

### What This Step Does
Competition is central to the wheel sports community. This gives competitions on ENBOSS real stakes — winning something in real life translates to recognition on the platform. The admin approval keeps it honest.

### ✅ Verify Before Continuing

- [ ] "Claim Your Result" button only appears after an event's end date has passed
- [ ] Form validation works — can't submit without required fields
- [ ] Claim is saved in MongoDB with status 'pending'
- [ ] Can't submit two claims for the same event
- [ ] `/admin/ranking/winner-claims` shows the pending claim
- [ ] Admin can approve → XP awarded to the user, AwardNotification created
- [ ] Admin can reject → user sees rejected status + admin notes on the event page
- [ ] Approved 1st place claim awards 500 XP
- [ ] `champion` badge triggers on first approved winner claim
- [ ] With `NEXT_PUBLIC_ENABLE_EVENT_WINNER_CLAIMS=false`: no claim button on event pages

---

## STEP 11 — Weekly Challenges

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 11 of 20 — weekly challenges. Three challenges appear every Monday and reset on Sunday. Completing them earns XP.

---

**Task 1: Admin challenge management — `/admin/challenges`**

Requires admin. Check `featureFlags.adminRanking`.

Page shows list of all `WeeklyChallenge` documents sorted by `startsAt` descending. Each shows weekId, number of challenges, whether it's active.

"Create New Week" button opens a form:
- Week selector (date picker → auto-calculates weekId '2025-W12' and sets startsAt/endsAt).
- Add up to 5 challenge items. Each item: title (EN+HE), description (EN+HE), action type (dropdown: skatepark_checkin / review_written / quiz_passed / event_signup / survey_completed), target count, XP reward, icon (emoji or icon name).
- Save → creates `WeeklyChallenge` with `isActive: false`.
- Separate "Activate" button to set the week as active (deactivates any other currently active week).

---

**Task 2: Challenge progress tracking**

In the `awardXP` service (or as a separate call after `awardXP`), add a step:
1. Check `featureFlags.weeklyChallenges`.
2. Find the currently active `WeeklyChallenge`.
3. Find challenge items where `actionType === xpEvent.type`.
4. For each matching challenge item: find or create `UserChallengeProgress`. Increment `currentCount`. If `currentCount >= targetCount` and `!isCompleted`: mark completed, award XP via `awardXP` (type: weekly_challenge_completed), create `AwardNotification`.

This logic should be extracted into `lib/services/challenge.service.ts` → `processChallengeProgress(userId, actionType)`.

---

**Task 3: Challenges UI**

`GET /api/challenges/current` — authenticated. Check flag. Returns current week's challenges with user's progress for each.

Create `app/(main)/challenges/page.tsx` (or add a "Challenges" section to the user dashboard/home page if one exists). Check `featureFlags.weeklyChallenges`.

Shows 3 challenge cards for the current week:
- Challenge title (localized), description, icon.
- Progress bar: "1 / 1 completed" or "0 / 3 visits".
- XP reward badge.
- If completed: green check overlay + "Completed ✓ +[XP] XP".
- Time remaining in the week (e.g. "Resets in 3 days").
- If no active challenges for this week: "Check back Monday for new challenges."
```

### What This Step Does
Weekly challenges create a reason to open ENBOSS every week even when nothing else is happening. They bridge different features — a challenge might push a review-writer to check into a skatepark, cross-pollinating user behavior.

### ✅ Verify Before Continuing

- [ ] Admin can create a week's challenges with correct dates and save
- [ ] Activating a week deactivates any previously active week
- [ ] Challenges page shows current week's 3 challenges for logged-in users
- [ ] Progress bars start at 0 and update correctly after each relevant XP-earning action
- [ ] Completing a challenge (meeting target count) awards XP and shows a completion state
- [ ] Challenge completion XP is an `XPEvent` of type `weekly_challenge_completed`
- [ ] Completing the same challenge twice does not award XP twice
- [ ] After Sunday midnight, old challenges show as expired (no new progress tracked)
- [ ] With `NEXT_PUBLIC_ENABLE_WEEKLY_CHALLENGES=false`: challenges page hidden, no progress tracking

---

## STEP 12 — Individual Leaderboard Page

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 12 of 20 — the individual leaderboard page. Users can now see how they rank against all other riders in Israel.

---

**Task 1: Rank calculation**

Create `app/api/cron/update-rankings/route.ts` — secured cron.
Using MongoDB aggregation, sort all users by `totalXP` descending. Update each user's `currentRank` field with their position (1 = highest). Do the same for `currentSeasonXP` → `currentSeasonRank`.
Similarly for crews: sort by `totalXP` → update `Crew.currentRank`. Sort by `currentSeasonXP` → `Crew.currentSeasonRank`.

Add to `vercel.json` crons: run this every hour: `"0 * * * *"`.

Also update rank immediately inside `awardXP` for the specific user (not all users — just their rank estimate based on their new XP vs. their previous rank). Full recalculation happens via cron.

---

**Task 2: Leaderboard API**

`GET /api/leaderboard?tab=individual&sport=&season=&page=1&limit=50`

If `tab=individual`:
- Check `featureFlags.leaderboard`.
- If `season` param provided and `featureFlags.seasonalLeaderboard`: sort by `currentSeasonXP` and use `currentSeasonRank`.
- Otherwise: sort by `totalXP`, use `currentRank`.
- If `sport` param: filter by `relatedSports` array containing that sport.
- Return: rank, userId, username, profilePhoto, levelId, levelTitle (from levels config), city, relatedSports, totalXP (or seasonXP), currentWeeklyStreak, top 3 badges (by rarity then earnedAt).
- Paginated: include `totalCount` in response.
- Include `myRank` in the response if user is authenticated (their rank regardless of page). Only include this if `featureFlags.personalRanking`.

---

**Task 3: Leaderboard page — `/leaderboard`**

Check `featureFlags.leaderboard` in the page component — if false, redirect to `/` or show 404.

UI layout:
- Tab bar: "All Time" | "This Season" (only if `featureFlags.seasonalLeaderboard`) | "Crews" (only if `featureFlags.crewLeaderboard` — greyed out for now, enabled in Step 15).
- Sport filter pills: All / Skateboarding / Rollerblading / BMX / Scootering.
- If `featureFlags.personalRanking` and user is logged in: sticky chip at top — "Your rank: #[myRank]".
- Leaderboard table/list. Each row: rank number, profile photo, username, level badge (title + colour), city, sports tags, streak flame (if streak > 0), top 3 badge icons, XP number.
- Logged-in user's own row is highlighted (different background).
- Clicking any row navigates to `/users/[username]`.
- Load more button for pagination.

If `featureFlags.personalRanking=false`: do NOT show the "Your rank" chip and do NOT highlight the user's own row.
```

### What This Step Does
The leaderboard is the payoff for everything built so far. Users can finally see where they stand. This is the page that will drive competitive behavior — riders will check it regularly and push their XP to climb.

### ✅ Verify Before Continuing

- [ ] `/leaderboard` redirects away or shows 404 when `NEXT_PUBLIC_ENABLE_LEADERBOARD=false`
- [ ] Leaderboard shows users sorted by totalXP correctly
- [ ] Level titles appear with correct colours next to usernames
- [ ] Sport filter correctly filters the list
- [ ] "Your rank" chip appears for logged-in users only when `NEXT_PUBLIC_ENABLE_PERSONAL_RANKING=true`
- [ ] When `NEXT_PUBLIC_ENABLE_PERSONAL_RANKING=false`: no rank chip, no row highlighting
- [ ] Clicking a user row navigates to their public profile
- [ ] Pagination (load more) works — next page of results loads
- [ ] The rank cron endpoint correctly recalculates `currentRank` for all users

---

## STEP 13 — Admin Ranking Pages

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 13 of 20 — the admin ranking management pages. Admins need full control over the gamification system.

Check `featureFlags.adminRanking` on every page and API route — redirect to `/admin` if false.

---

**Task 1: `/admin/ranking`**
Overview page. Shows:
- Total users with XP > 0, total XP awarded (sum), most active users this week.
- Search box: search users by username or email. Shows matching users with their XP, level, rank, badge count.
- Quick links to: winner claims, badge management, seasons, multipliers.

**Task 2: `/admin/ranking/[userId]`**
Individual user XP management.
- Shows user info: username, email, level, totalXP, rank, all badges, full XP history.
- Manual XP adjustment: number input (positive or negative), required "Reason" textarea, "Apply Adjustment" button.
  - Calls `PATCH /api/admin/ranking/[userId]` → body: `{ xpDelta: number, reason: string }`.
  - Creates `XPEvent` of type `admin_adjustment` with `meta: { adminId, reason }`.
  - Updates `user.totalXP`.
  - Creates `AwardNotification` for the user (if positive: "Admin awarded you X XP: [reason]").
- Manual badge management: dropdown of all active `BadgeDefinition` items, "Grant Badge" button. "Revoke" button next to each owned badge.

**Task 3: `/admin/ranking/badges`**
Badge definition management.
- Table of all `BadgeDefinition` docs: name, category, rarity, XP reward, trigger, active status.
- Create new badge form: all fields from the schema.
- Edit existing badge (click row to open form).
- Toggle active/inactive without deleting.

**Task 4: `/admin/ranking/seasons`** (placeholder — full implementation in Step 18)
Simple page that shows "Seasons management — coming in a future step" for now. Just the shell.

**Task 5: `/admin/ranking/multipliers`** (placeholder — full implementation in Step 17)
Same placeholder approach.

All admin API routes must:
- Verify the user has `role === 'admin'`.
- Return 403 if not admin.
- Log all destructive actions in `XPEvent` with `admin_adjustment` type.
```

### What This Step Does
Admin control is the safety net for the whole system. If anything goes wrong with XP data, the admin can fix it. This step also gives you the badge management interface so you can create and manage the full badge catalog.

### ✅ Verify Before Continuing

- [ ] `/admin/ranking` requires admin role — non-admin users see 403
- [ ] User search returns correct results
- [ ] Manual XP adjustment updates `user.totalXP` and creates an `XPEvent`
- [ ] Positive XP adjustment creates an `AwardNotification` for the user → popup appears for that user
- [ ] Granting a badge adds it to `user.badges` and creates `AwardNotification`
- [ ] Revoking a badge removes it from `user.badges`
- [ ] Badge management page shows all seeded badges
- [ ] Can create a new badge definition and it appears in the list
- [ ] With `NEXT_PUBLIC_ENABLE_ADMIN_RANKING=false`: all admin ranking routes return 403 or redirect

---

## STEP 14 — Crews System

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 14 of 20 — the Crews system. Users can form riding crews, and crew XP combines for team competition.

Check `featureFlags.crews` on all crew pages and APIs — hide/block if false.

---

**Task 1: Crew pages**

`/crews` — Public crew directory. Lists all public crews with: logo, name, city, sports, member count, totalXP, currentRank. Filter by sport. Link to each crew page.

`/crews/create` — Authenticated. Form: crew name, slug (auto-generated from name, editable), description (EN+HE), logo upload, city (israel-cities), relatedSports (multi-select). requiresApproval toggle. Submit → `POST /api/crews`.

`/crews/[slug]` — Public crew page. Shows: logo, name, description, city, sports, founder, total XP, season XP, member count. Members table: avatar, username, level badge, contributed XP, join date. "Join Crew" button (authenticated users who aren't in a crew). If `requiresApproval`: shows "Request to Join" instead.

---

**Task 2: API routes**

`POST /api/crews` — authenticated. Validate slug uniqueness. Create `Crew`. Set the founder as the first member with role 'founder'. Update `user.crewId`. Award `crew-founder` badge via `awardBadgeManually` logic.

`GET /api/crews` — public. Returns paginated crew list with filter support.

`GET /api/crews/[slug]` — public. Returns full crew data.

`POST /api/crews/[slug]/join` — authenticated. Check `featureFlags.crews`. Validate user isn't already in a crew. Validate crew isn't full (`memberCount < maxMembers`). If `requiresApproval: false`: add user to members array immediately, update `user.crewId`, increment `memberCount`. Award `crew-member` badge. If `requiresApproval: true`: create `CrewInvite` with status 'pending'.

`PATCH /api/crews/[slug]/members/[userId]` — crew founder/admin only. Actions: approve (from pending invite), kick (remove member), promote to admin, demote to member.

`DELETE /api/crews/[slug]/leave` — authenticated member. Remove from crew. If founder leaves and no other admin exists, transfer ownership to longest-standing member or dissolve if no members remain.

---

**Task 3: XP contribution**

The `awardXP` service from Step 2 already handles crew XP contribution. Verify it's working: when a crew member earns XP, check that `Crew.totalXP`, `Crew.currentSeasonXP`, and their `contributedXP` in the members array all increment correctly.

---

**Task 4: Crew section on profile**

On `/account/profile`: add a "Crew" section. If in a crew: show crew logo, name, user's contributed XP, link to crew page, "Leave Crew" button. If not in a crew: "Join a Crew" link to `/crews`.

On `/users/[username]`: show crew membership (crew logo + name, linked) if user is in one.
```

### What This Step Does
Crews add the social recruitment dimension to the platform. When riders join ENBOSS to compete in a crew, they bring their whole riding group. This is the most powerful organic growth mechanic in the system.

### ✅ Verify Before Continuing

- [ ] Can create a crew with all required fields
- [ ] Slug uniqueness validation works
- [ ] Crew appears in the public directory
- [ ] Second user can join the crew (immediate if `requiresApproval: false`)
- [ ] Joining a crew that requires approval creates a pending `CrewInvite`
- [ ] Crew founder can approve a pending invite
- [ ] When a crew member earns XP: `Crew.totalXP` increments in MongoDB
- [ ] Member's `contributedXP` in the crew's members array increments
- [ ] Can't join a second crew while already in one
- [ ] Profile page shows crew section correctly for members and non-members
- [ ] Crew page shows correct member list with contributed XP
- [ ] With `NEXT_PUBLIC_ENABLE_CREWS=false`: crew pages return 404, no crew-related UI anywhere

---

## STEP 15 — Crews Leaderboard Tab

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 15 of 20 — adding the Crews tab to the leaderboard. The Crews system from Step 14 is working.

Check `featureFlags.crewLeaderboard` — if false, hide the Crews tab on the leaderboard page.

---

**Task 1: Crew leaderboard API**

`GET /api/leaderboard?tab=crews&season=&page=1&limit=50`
- Check `featureFlags.crewLeaderboard`.
- If `season` param and `featureFlags.seasonalLeaderboard`: sort by `currentSeasonXP`.
- Otherwise: sort by `totalXP`.
- Return for each crew: rank, crewId, slug, name, logo, city, relatedSports, memberCount, totalXP (or seasonXP), top 3 members (by contributedXP — avatar + username).

---

**Task 2: Leaderboard page update**

On `/leaderboard`, enable the "Crews" tab (it was a placeholder in Step 12). 

Crew leaderboard row: rank number, crew logo, crew name, city, sport tags, member count, top 3 member avatars (stacked), total XP.

Clicking a crew row navigates to `/crews/[slug]`.

If the logged-in user is in a crew and `featureFlags.personalRanking`: show "Your crew rank: #[rank]" chip alongside the individual rank chip.
```

### What This Step Does
Enabling the Crews tab completes the leaderboard. Team competition is now visible, which motivates crew recruitment even further.

### ✅ Verify Before Continuing

- [ ] Crews tab appears on the leaderboard only when `NEXT_PUBLIC_ENABLE_CREW_LEADERBOARD=true`
- [ ] Crew rows show correct XP totals
- [ ] Crew rows are sorted by totalXP descending
- [ ] Clicking a crew row navigates to the correct crew page
- [ ] "Your crew rank" chip appears for logged-in users in a crew (if `personalRanking=true`)
- [ ] The individual tab still works correctly (no regression)

---

## STEP 16 — XP Multiplier Events

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 16 of 20 — XP multiplier events. Admins can activate limited-time periods where all XP (or specific action XP) is multiplied.

Check `featureFlags.xpMultiplier` — if false, skip all multiplier logic in xp.service.ts and hide all multiplier UI.

---

**Task 1: Admin multiplier management — `/admin/ranking/multipliers`** (replacing the placeholder from Step 13)

Replace the placeholder page with the real UI:
- List of all `XPMultiplierEvent` docs sorted by `startsAt` descending.
- Create multiplier form: title (EN+HE), description (EN+HE optional), multiplier value (1.5 / 2 / 3 / custom number), appliesTo (multi-select of all XPEventTypes + 'all' option), start datetime, end datetime. Save → creates `XPMultiplierEvent`.
- Toggle `isActive` on existing events.

`POST /api/admin/multipliers` — admin only. Creates `XPMultiplierEvent`.
`PATCH /api/admin/multipliers/[id]` — admin only. Update or toggle `isActive`.

---

**Task 2: Active multiplier banner**

`GET /api/multipliers/active` — public. Returns the currently active multiplier(s) if any (isActive: true, startsAt <= now, endsAt >= now). Returns null if none active.

On the homepage and the skateparks listing page: show a banner if an active multiplier exists:
"🔥 2x XP Weekend — All actions earn double XP until Sunday 23:59! [X] hours remaining."

The banner should use a countdown timer (client-side) showing hours and minutes remaining.

---

**Task 3: Verify multiplier in xp.service.ts**

The `awardXP` service from Step 2 already queries for active multipliers. Verify it's working:
1. Create a multiplier event in the admin panel (start = now, end = 1 hour from now, multiplier = 2, appliesTo = 'all').
2. Trigger any XP-earning action.
3. Check `XPEvent` in MongoDB: `multiplierApplied` should be 2, `baseXP` should be the original amount, `xpAmount` should be doubled.
4. `user.totalXP` should have increased by the doubled amount.
```

### What This Step Does
Multiplier events create excitement and urgency. When you announce a 2x XP weekend on social media, it drives users to the app in a concentrated burst. This is one of the admin's most powerful tools for driving engagement spikes.

### ✅ Verify Before Continuing

- [ ] Admin can create a multiplier event with future start/end times
- [ ] Active multiplier banner appears on the homepage when an event is active
- [ ] Countdown timer works correctly on the banner
- [ ] When a multiplier is active: XPEvent.xpAmount is multiplied, XPEvent.baseXP stores original, XPEvent.multiplierApplied stores the multiplier value
- [ ] When no multiplier is active: XP awards normally with no multiplier fields set
- [ ] Multiplier only applies to action types listed in `appliesTo` (test with a targeted multiplier)
- [ ] With `NEXT_PUBLIC_ENABLE_XP_MULTIPLIER=false`: no banner, no multiplier applied in xp.service.ts

---

## STEP 17 — Seasonal Leaderboard & Seasons System

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 17 of 20 — the seasons system. Each season is a competitive period. At the end, top performers are immortalized and earn exclusive rewards.

Check `featureFlags.seasonalLeaderboard` — if false, hide all season-related UI.

---

**Task 1: Admin season management — `/admin/ranking/seasons`** (replacing placeholder)

- List all `Season` documents.
- Create season form: id (e.g. 'season-1'), title (EN+HE), start date, end date, rewards config (for ranks 1/2/3: badge ID + XP bonus amount).
- "Activate Season" button: sets `isActive: true` on this season, resets `currentSeasonXP` and `currentSeasonRank` to 0 for all users and crews (bulk update).
- "End Season" button: triggers `POST /api/cron/end-season` manually.

`POST /api/admin/seasons` — create season.
`PATCH /api/admin/seasons/[id]` — update, activate, or trigger end.

---

**Task 2: Season end cron**

`app/api/cron/end-season/route.ts` — secured with CRON_SECRET.

Logic:
1. Find the currently active `Season` (`isActive: true`).
2. If `Season.endsAt < now`: proceed.
3. Take top 10 snapshot: query users sorted by `currentSeasonXP` descending (limit 10). Store in `Season.topIndividuals`.
4. Take top 10 crew snapshot similarly. Store in `Season.topCrews`.
5. For each reward tier (rank 1, 2, 3): find the user at that rank and call `awardXP` with the bonus XP, and `awardBadgeManually` with the season winner badge.
6. Set `Season.isActive = false`.
7. Create `AwardNotification` for all top-10 users.

---

**Task 3: Season UI on leaderboard**

- "This Season" tab on the leaderboard now shows users sorted by `currentSeasonXP` using `currentSeasonRank`.
- A season info banner below the tabs: "Season 1: [dates] — [X] days remaining".
- Past seasons accessible via a "Previous Seasons" dropdown → shows the snapshot (read-only).

---

**Task 4: Season history on profiles**

On the user public profile page, add a "Season History" section: table of seasons they appeared in the top 10, their rank, their XP that season, any season badges earned.
```

### What This Step Does
Seasons create periodic resets that keep competition fresh and give newer users a real chance to compete. The all-time leaderboard rewards dedication; seasons reward current activity. Together they satisfy both long-term and short-term competitive motivations.

### ✅ Verify Before Continuing

- [ ] Admin can create and activate a season → `currentSeasonXP` resets to 0 for all users
- [ ] Earning XP while a season is active increments both `totalXP` and `currentSeasonXP`
- [ ] "This Season" leaderboard tab sorts by `currentSeasonXP` correctly
- [ ] Season info banner shows correct dates and days remaining
- [ ] Season end cron runs successfully: top-10 snapshot is saved in the `Season` document
- [ ] Top-3 users receive their season reward badges and XP bonus
- [ ] Season winner badge appears on the user's profile
- [ ] After season ends, `isActive` is false and `currentSeasonXP` is ready for reset when next season starts
- [ ] With `NEXT_PUBLIC_ENABLE_SEASONAL_LEADERBOARD=false`: "This Season" tab hidden, no season banners

---

## STEP 18 — Badge Seeding & Full Badge Catalog

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 18 of 20 — seeding the complete badge catalog. All the badge definitions need to exist in the database for the badge service to work correctly.

---

**Task 1: Create a badge seed script**

Create `scripts/seed-badges.ts` (run with `npx ts-node scripts/seed-badges.ts` or via a Next.js API route for convenience).

The script should upsert (insert or update) all badge definitions below using the `id` field as the unique key. If a badge with that id already exists, update it. If not, create it.

**Complete badge catalog to seed:**

Location badges:
- first-roll: count/skatepark_checkin/1, Common, 50 XP
- park-hopper: count/skatepark_checkin/5 unique parks, Common, 100 XP
- explorer-10: count/skateparksVisited/10, Rare, 200 XP
- explorer-20: count/skateparksVisited/20, Epic, 500 XP
- local-legend: (manual trigger — admin grants when 10 checkins at same park detected), Rare, 150 XP
- pioneer: trigger.type='pioneer', Rare, 100 XP
- multi-pioneer: count/pioneerParks/5, Epic, 400 XP
- king-crown: trigger.type='king', Epic, 200 XP
- king-dynasty: count/crownedKingCount/3, Legendary, 600 XP

Guide badges:
- first-quiz: count/quizzesPassed/1, Common, 50 XP
- scholar-5: count/quizzesPassed/5, Rare, 200 XP
- master-10: count/quizzesPassed/10, Epic, 400 XP
- know-it-all: count/quizzesPassed/20, Legendary, 800 XP

Review badges:
- first-review: count/reviewsWritten/1, Common, 40 XP
- reviewer-5: count/reviewsWritten/5, Rare, 150 XP
- reviewer-25: count/reviewsWritten/25, Epic, 400 XP
- helpful-voice: count/kudosReceived/50, Rare, 300 XP
- community-star: count/kudosReceived/200, Epic, 600 XP

Event badges:
- first-signup: count/eventsAttended/1, Common, 20 XP
- regular-5: count/eventsAttended/5, Rare, 100 XP
- event-addict-10: count/eventsAttended/10, Epic, 200 XP
- champion: trigger.type='manual', Legendary, 500 XP
- podium-3: count/approvedWinnerClaims/3, Legendary, 800 XP

Survey badges:
- first-voice: count/surveysCompleted/1, Common, 75 XP
- community-builder: count/surveysCompleted/5, Rare, 250 XP
- growth-driver: count/surveysCompleted/10, Epic, 500 XP

Streak badges:
- week-streak-4: streak/weekly/4, Common, 200 XP
- week-streak-12: streak/weekly/12, Rare, 500 XP
- week-streak-26: streak/weekly/26, Epic, 1000 XP
- month-streak-3: streak/monthly/3, Rare, 300 XP
- month-streak-6: streak/monthly/6, Epic, 700 XP
- month-streak-12: streak/monthly/12, Legendary, 1500 XP

Crew badges:
- crew-member: trigger.type='manual', Common, 30 XP
- crew-founder: trigger.type='manual', Rare, 100 XP
- crew-champion: trigger.type='manual', Legendary, 1000 XP

---

**Task 2: Admin badge seeding button**

On the `/admin/ranking/badges` page, add a "Seed Default Badges" button that calls a protected `POST /api/admin/badges/seed` endpoint. This runs the same upsert logic as the script, useful for resetting/initialising in production without server access.

---

**Task 3: Verify badge triggers are mapped correctly**

Review `badge.service.ts` and confirm the stat field mapping is complete for all `count` triggers. The service must know which `user.stats` field to check for each `action` string:

skatepark_checkin → stats.skateparksVisited (for unique park counts, query SkateparkCheckin for distinct parks, OR rely on the counter)
skateparksVisited → stats.skateparksVisited
quizzesPassed → stats.quizzesPassed
reviewsWritten → stats.reviewsWritten
eventsAttended → stats.eventsAttended
surveysCompleted → stats.surveysCompleted
kudosReceived → stats.kudosReceived
pioneerParks → stats.pioneerParks
approvedWinnerClaims → (add this counter to stats if missing)

Make sure `checkAndAwardBadges` is called with the correct action type and stat value after each relevant `awardXP` call.
```

### What This Step Does
Without badges seeded in the database, none of the badge triggers fire even though all the logic is correct. This step makes the badge system fully operational with the complete catalog. The "Seed Default Badges" button means you can run this safely in production.

### ✅ Verify Before Continuing

- [ ] Seed script runs without errors
- [ ] MongoDB `badgedefinitions` collection contains all badges listed above
- [ ] "Seed Default Badges" admin button works on the badges page
- [ ] Running the seed twice does not create duplicates (upsert logic confirmed)
- [ ] Trigger a quiz pass → `first-quiz` badge is awarded (if not already earned)
- [ ] Trigger enough reviews to reach threshold → `first-review` and `reviewer-5` badges award at the right counts
- [ ] Streak badges trigger correctly from the streak service (verified with a test user)
- [ ] `badge.service.ts` correctly maps all action strings to the right `user.stats` fields

---

## STEP 19 — Badge Display Polish & Leaderboard Enhancements

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 19 of 20 — polishing the badge display system and filling in remaining leaderboard features.

---

**Task 1: Badge rarity visual system**

Ensure badges display consistently across the app with rarity styling:
- Common: grey border + grey chip label
- Rare: blue border + blue chip
- Epic: purple border + purple chip
- Legendary: gold/amber border + gold chip + subtle shimmer CSS animation

The badge icon, rarity chip, and name should display the same way in:
- Profile page badge grid
- Award popup modal
- Leaderboard row (top-3 icons, small)
- Skatepark Pioneer section (if pioneer badge shown)

Create a shared `<BadgeDisplay>` component and `<BadgeIcon>` component used everywhere.

---

**Task 2: Level badge component**

Create a shared `<LevelBadge>` component that takes `xp: number` (or `levelId: number`) and renders the level title as a small coloured pill/chip. Used in: profile header, leaderboard rows, reviews (next to reviewer name), nav header.

---

**Task 3: XP bar component**

Create a shared `<XPProgressBar>` component that shows:
- Current level title on the left
- Next level title on the right
- Filled bar showing progress (currentXP - currentLevelMinXP) / (nextLevelMinXP - currentLevelMinXP)
- "MAX LEVEL" state when at level 10

Used in: profile page, leaderboard row (expanded view), level-up popup.

---

**Task 4: Review cards update**

On skatepark review cards, add:
- Reviewer's `<LevelBadge>` next to their name (only if `featureFlags.xpSystem`)
- Total kudos count on the kudos button (existing heart button)
- Whether the logged-in user has already given kudos on this review (filled vs outline heart)

---

**Task 5: Leaderboard row expansion**

On the leaderboard, make rows expandable (click to expand):
- Expanded view shows: all badges (scroll), full stats grid, streak detail, XP bar.
- "View Full Profile" link at the bottom of the expanded view.
```

### What This Step Does
This step makes the gamification system feel polished and coherent. Consistent badge and level displays across all surfaces reinforce the identity system. Small touches like kudos count and level badge on reviews make the community aspect feel alive.

### ✅ Verify Before Continuing

- [ ] Legendary badges have the shimmer animation in all locations
- [ ] `<LevelBadge>` shows correct title and colour on profile, leaderboard, and review cards
- [ ] `<XPProgressBar>` correctly calculates fill percentage at various XP values
- [ ] Level 10 (ENBOSS) shows "MAX LEVEL" state
- [ ] Review cards show level badge next to reviewer name (when flag is on)
- [ ] Kudos count on review cards updates without page reload after giving kudos
- [ ] Heart is filled if logged-in user already gave kudos, outline if not
- [ ] Leaderboard rows expand to show full badge grid and stats
- [ ] All badge displays use the shared `<BadgeDisplay>` component (no duplicate badge styling)

---

## STEP 20 — Final Wiring, Badge Seed for Admin, Testing & Cleanup

### Prompt

```
We are building a gamification system for ENBOSS. This is Step 20 of 20 — final wiring, testing, and cleanup.

---

**Task 1: Verify all feature flags work as on/off switches**

For each flag, confirm that setting it to `false` in `.env.local` hides all related UI and blocks all related API routes:
- Go through the full flag list from `lib/config/feature-flags.ts`.
- Specifically test: `xpSystem=false` → no XP earned for any action, no XP displayed anywhere.
- Test: `leaderboard=false` → `/leaderboard` redirects away.
- Test: `locationCheckins=false` → no check-in button on any skatepark page.

Fix any flag that is not fully respected.

---

**Task 2: Add `NEXT_PUBLIC_ENABLE_GAMIFICATION_NAV=true` flag**

This flag controls whether gamification navigation items appear in the main nav:
- Leaderboard link in nav (requires both this flag AND `featureFlags.leaderboard`).
- Challenges link in nav (requires both this flag AND `featureFlags.weeklyChallenges`).
- Crews link in nav (requires both this flag AND `featureFlags.crews`).

Useful for soft-launching: you can have the system running but keep nav items hidden while testing.

---

**Task 3: Notification bell in header**

Add a bell icon 🔔 in the nav header (only when user is logged in and `featureFlags.awardPopups`). Shows an unread count badge if there are unread `AwardNotification` documents. Clicking it shows a dropdown of the last 5 notifications with a "View All" link to `/account/notifications`.

Create `app/(main)/account/notifications/page.tsx` — full list of all AwardNotifications for the logged-in user. Sorted by date. Can mark all as read.

---

**Task 4: Clean up any placeholder pages**

Check for any placeholder/stub pages created in earlier steps (e.g., seasons, multipliers stubs from Step 13). Confirm they all have their real implementations from later steps.

---

**Task 5: Ensure bilingual support throughout**

Audit all new UI components and API responses. Any user-facing string must use the bilingual `{ en, he }` pattern or the app's existing i18n system. Specifically check:
- Level titles
- Badge names and descriptions
- Award notification messages
- Challenge titles
- Crew description fields
- All popup/toast messages

---

**Task 6: Performance check**

- Add MongoDB indexes that may have been missed:
  - `XPEvent`: `{ userId: 1, createdAt: -1 }` for XP history pagination.
  - `SkateparkCheckin`: `{ userId: 1, isoMonth: 1 }` for streak calculation.
  - `AwardNotification`: `{ userId: 1, isRead: 1 }` for unread count.
- Review the `awardXP` function: it should not do more than 5-6 DB operations per call. If it's doing more, extract some to background jobs.

---

**Task 7: Update the README**

Create or update `lib/models/GAMIFICATION_README.md` documenting:
- The 17 new model files and their purpose
- The 4 service files and when to use them
- The feature flag list with one-line descriptions
- The XP earning reference table
- The implementation order for future reference
```

### What This Step Does
The final step closes any gaps, hardens the feature flag system, adds the notification bell UI, and ensures the whole system is production-ready. After this step the gamification system is fully functional and every feature is individually controllable.

### ✅ Final Verification Checklist

- [ ] Every feature flag correctly disables its feature — UI and API both
- [ ] `NEXT_PUBLIC_ENABLE_GAMIFICATION_NAV` controls nav link visibility
- [ ] Notification bell shows unread count and drops down last 5 notifications
- [ ] `/account/notifications` shows full notification history
- [ ] All 20 steps' features work together without regressions
- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`)
- [ ] No console errors in the browser across all new pages
- [ ] All new pages are bilingual (EN + HE)
- [ ] All MongoDB indexes are in place
- [ ] `GAMIFICATION_README.md` is written and accurate
- [ ] Test the full user journey end-to-end: register → check in → pass quiz → sign up for event → see rank on leaderboard → join crew → complete weekly challenge → get all expected XP and badges throughout

---

## Quick Reference: Step Order

| Step | Feature | Complexity |
|---|---|---|
| 1 | Models, flags, levels config | High setup, no logic |
| 2 | XP service, badge service, streak/king services | High — core engine |
| 3 | Award popup notification system | Medium |
| 4 | Easy reward hooks (signup, survey, review, kudos) | Low |
| 5 | User profile pages (edit + public) | Medium |
| 6 | Guide quizzes (admin builder + quiz UI) | Medium |
| 7 | Skatepark check-ins + Pioneer + King | High |
| 8 | Streak tracking + cron jobs | Medium |
| 9 | Explorer Map on profile | Medium |
| 10 | Event winner claims | Medium |
| 11 | Weekly challenges | Medium |
| 12 | Individual leaderboard page | Medium |
| 13 | Admin ranking pages | Medium |
| 14 | Crews system | High |
| 15 | Crews leaderboard tab | Low |
| 16 | XP multiplier events | Low |
| 17 | Seasonal leaderboard & seasons | Medium |
| 18 | Badge seeding & full catalog | Low |
| 19 | Badge/level display polish | Medium |
| 20 | Final wiring, flags audit, cleanup | Medium |