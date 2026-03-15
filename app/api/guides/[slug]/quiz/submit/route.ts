import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import Guide from '@/lib/models/Guide';
import GuideQuiz from '@/lib/models/GuideQuiz';
import GuideQuizAttempt from '@/lib/models/GuideQuizAttempt';
import AwardNotification from '@/lib/models/AwardNotification';
import { featureFlags, serverFlags } from '@/lib/config/feature-flags';
import { awardXP } from '@/lib/services/xp.service';
import mongoose from 'mongoose';

/**
 * POST /api/guides/[slug]/quiz/submit
 * Authenticated. Body: { answers: number[] } (selected option index per question, same order as questions).
 * Returns { passed, score, correctCount, totalCount, xpEarned }.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!featureFlags.guideQuizzes) {
    return NextResponse.json({ error: 'Guide quizzes are disabled' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const normalizedSlug = slug.toLowerCase().trim();

    const body = await request.json();
    const answers: number[] = Array.isArray(body.answers) ? body.answers : [];

    await connectDB();

    const guide = await Guide.findOne({
      slug: normalizedSlug,
      status: 'published',
    })
      .select('_id')
      .lean();

    if (!guide) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    const quiz = await GuideQuiz.findOne({
      guideSlug: normalizedSlug,
      isActive: true,
    }).lean();

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const questions = (quiz.questions as Array<{ correctOptionIndex: number; order: number }>).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
    const totalCount = questions.length;
    if (totalCount === 0) {
      return NextResponse.json({ error: 'Quiz has no questions' }, { status: 400 });
    }
    if (answers.length !== totalCount) {
      return NextResponse.json(
        { error: `Expected ${totalCount} answers, got ${answers.length}` },
        { status: 400 }
      );
    }

    let correctCount = 0;
    for (let i = 0; i < questions.length; i++) {
      if (answers[i] === questions[i].correctOptionIndex) {
        correctCount++;
      }
    }
    const passingScore = quiz.passingScore ?? 70;
    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const passed = score >= passingScore;
    const xpReward = quiz.xpReward ?? serverFlags.xpQuizPassed;

    const userId = session.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const guideObjectId = guide._id;
    const quizObjectId = quiz._id;

    if (passed) {
      const priorPassed = await GuideQuizAttempt.findOne({
        userId: userObjectId,
        guideId: guideObjectId,
        passed: true,
        xpAwarded: true,
      })
        .sort({ createdAt: -1 })
        .lean();

      if (priorPassed) {
        return NextResponse.json({
          passed: true,
          score: priorPassed.score,
          correctCount: Math.round((priorPassed.score / 100) * totalCount),
          totalCount,
          xpEarned: 0,
        });
      }

      const attemptNumber =
        (await GuideQuizAttempt.countDocuments({
          userId: userObjectId,
          guideId: guideObjectId,
        })) + 1;

      try {
        await awardXP({
          userId,
          type: 'guide_quiz_passed',
          xpAmount: xpReward,
          sourceId: String(quiz._id),
          sourceType: 'guide_quiz',
          meta: { guideSlug: normalizedSlug },
        });
      } catch (xpErr) {
        console.error('Quiz awardXP error:', xpErr);
      }

      await AwardNotification.create({
        userId: userObjectId,
        type: 'xp',
        xpAmount: xpReward,
        message: {
          en: `You passed the guide quiz and earned ${xpReward} XP!`,
          he: `עברת את בוחן המדריך והרווחת ${xpReward} XP!`,
        },
        sourceType: 'guide_quiz',
      });

      await GuideQuizAttempt.create({
        userId: userObjectId,
        guideId: guideObjectId,
        guideSlug: normalizedSlug,
        quizId: quizObjectId,
        answers,
        score,
        passed: true,
        xpAwarded: true,
        xpAmount: xpReward,
        attemptNumber,
        completedAt: new Date(),
      });

      return NextResponse.json({
        passed: true,
        score,
        correctCount,
        totalCount,
        xpEarned: xpReward,
      });
    }

    const attemptNumber =
      (await GuideQuizAttempt.countDocuments({
        userId: userObjectId,
        guideId: guideObjectId,
      })) + 1;

    await GuideQuizAttempt.create({
      userId: userObjectId,
      guideId: guideObjectId,
      guideSlug: normalizedSlug,
      quizId: quizObjectId,
      answers,
      score,
      passed: false,
      xpAwarded: false,
      xpAmount: 0,
      attemptNumber,
      completedAt: new Date(),
    });

    return NextResponse.json({
      passed: false,
      score,
      correctCount,
      totalCount,
      xpEarned: 0,
    });
  } catch (error) {
    console.error('POST /api/guides/[slug]/quiz/submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
