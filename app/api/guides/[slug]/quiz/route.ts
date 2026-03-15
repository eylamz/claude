import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Guide from '@/lib/models/Guide';
import GuideQuiz from '@/lib/models/GuideQuiz';
import { featureFlags } from '@/lib/config/feature-flags';

/**
 * GET /api/guides/[slug]/quiz
 * Public: returns active quiz for a guide WITHOUT correctOptionIndex.
 * Returns 404 if no quiz, inactive, or feature disabled.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!featureFlags.guideQuizzes) {
    return NextResponse.json({ error: 'Guide quizzes are disabled' }, { status: 404 });
  }

  try {
    const { slug } = await params;
    const normalizedSlug = slug.toLowerCase().trim();

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

    const questionsSafe = (quiz.questions as Array<{ question: any; options: any[]; explanation?: any; order: number; correctOptionIndex?: number }>).map(
      (q) => {
        const { correctOptionIndex: _omit, ...rest } = q;
        return rest;
      }
    );

    return NextResponse.json({
      quizId: String(quiz._id),
      guideSlug: quiz.guideSlug,
      questions: questionsSafe.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      passingScore: quiz.passingScore ?? 70,
      xpReward: quiz.xpReward ?? 100,
    });
  } catch (error) {
    console.error('GET /api/guides/[slug]/quiz error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
