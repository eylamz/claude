import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import GuideQuiz from '@/lib/models/GuideQuiz';
import GuideQuizAttempt from '@/lib/models/GuideQuizAttempt';
import { featureFlags } from '@/lib/config/feature-flags';

/**
 * GET /api/guides/[slug]/quiz/attempt
 * Authenticated: returns the user's best/latest attempt for this guide's quiz.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!featureFlags.guideQuizzes) {
    return NextResponse.json({ error: 'Guide quizzes are disabled' }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const normalizedSlug = slug.toLowerCase().trim();

    await connectDB();

    const quiz = await GuideQuiz.findOne({
      guideSlug: normalizedSlug,
      isActive: true,
    })
      .select('_id guideId guideSlug xpReward')
      .lean();

    if (!quiz) {
      return NextResponse.json({ attempt: null });
    }

    const attempt = await GuideQuizAttempt.findOne({
      userId: session.user.id,
      guideId: quiz.guideId,
      passed: true,
      xpAwarded: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!attempt) {
      return NextResponse.json({ attempt: null });
    }

    return NextResponse.json({
      attempt: {
        id: String(attempt._id),
        passed: attempt.passed,
        score: attempt.score,
        xpAwarded: attempt.xpAwarded,
        xpAmount: attempt.xpAmount ?? quiz.xpReward ?? 0,
        completedAt: attempt.completedAt ?? attempt.createdAt,
      },
    });
  } catch (error) {
    console.error('GET /api/guides/[slug]/quiz/attempt error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
