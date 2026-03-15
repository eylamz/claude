import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Guide from '@/lib/models/Guide';
import GuideQuiz from '@/lib/models/GuideQuiz';
import mongoose from 'mongoose';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await User.findById(session.user.id);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

/**
 * GET /api/admin/guides/[id]/quiz
 * Admin: returns full quiz including correctOptionIndex.
 * [id] can be guide slug or MongoDB ObjectId.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { id } = await params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);

    await connectDB();

    const guide = isObjectId
      ? await Guide.findById(id).select('_id slug').lean()
      : await Guide.findOne({ slug: id.toLowerCase().trim() }).select('_id slug').lean();

    if (!guide) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    const guideSlug = guide.slug;
    const quiz = await GuideQuiz.findOne({
      $or: [{ guideSlug }, { guideId: guide._id }],
    }).lean();

    if (!quiz) {
      return NextResponse.json({ quiz: null, guideId: String(guide._id), guideSlug });
    }

    const questions = (quiz.questions as Array<Record<string, unknown>>).sort(
      (a, b) => ((a.order as number) ?? 0) - ((b.order as number) ?? 0)
    );

    return NextResponse.json({
      quiz: {
        id: String(quiz._id),
        guideId: String(quiz.guideId),
        guideSlug: quiz.guideSlug,
        questions,
        passingScore: quiz.passingScore ?? 70,
        xpReward: quiz.xpReward ?? 100,
        isActive: quiz.isActive ?? true,
        createdAt: quiz.createdAt,
        updatedAt: quiz.updatedAt,
      },
      guideId: String(guide._id),
      guideSlug,
    });
  } catch (error) {
    console.error('GET /api/admin/guides/[id]/quiz error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/guides/[id]/quiz
 * Admin: create or update quiz (upsert).
 * Body: { guideId, guideSlug, questions, passingScore, xpReward, isActive }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { id } = await params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);

    const body = await request.json();
    const guideId = body.guideId ?? body.guide_id;
    const guideSlug = body.guideSlug;
    let questions = Array.isArray(body.questions) ? body.questions : [];
    const passingScore = typeof body.passingScore === 'number' ? body.passingScore : 70;
    const xpReward = typeof body.xpReward === 'number' ? body.xpReward : 100;
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;

    await connectDB();

    const guide = isObjectId
      ? await Guide.findById(id).select('_id slug').lean()
      : await Guide.findOne({ slug: id.toLowerCase().trim() }).select('_id slug').lean();

    if (!guide) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    const resolvedGuideId = guideId ? new mongoose.Types.ObjectId(guideId) : guide._id;
    const resolvedGuideSlug = guideSlug ?? guide.slug;

    questions = questions.map((q: any, idx: number) => ({
      id: q.id || `q-${Date.now()}-${idx}`,
      question: q.question && typeof q.question === 'object' ? q.question : { en: '', he: '' },
      options: Array.isArray(q.options) ? q.options : [],
      correctOptionIndex: typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0,
      explanation: q.explanation && typeof q.explanation === 'object' ? q.explanation : undefined,
      order: typeof q.order === 'number' ? q.order : idx,
    }));

    const existing = await GuideQuiz.findOne({
      $or: [{ guideSlug: resolvedGuideSlug }, { guideId: resolvedGuideId }],
    });

    if (existing) {
      existing.guideId = resolvedGuideId;
      existing.guideSlug = resolvedGuideSlug;
      existing.questions = questions;
      existing.passingScore = passingScore;
      existing.xpReward = xpReward;
      existing.isActive = isActive;
      await existing.save();
      return NextResponse.json({
        quiz: {
          id: String(existing._id),
          guideId: String(existing.guideId),
          guideSlug: existing.guideSlug,
          questions: existing.questions,
          passingScore: existing.passingScore,
          xpReward: existing.xpReward,
          isActive: existing.isActive,
        },
      });
    }

    const created = await GuideQuiz.create({
      guideId: resolvedGuideId,
      guideSlug: resolvedGuideSlug,
      questions,
      passingScore,
      xpReward,
      isActive,
    });

    return NextResponse.json({
      quiz: {
        id: String(created._id),
        guideId: String(created.guideId),
        guideSlug: created.guideSlug,
        questions: created.questions,
        passingScore: created.passingScore,
        xpReward: created.xpReward,
        isActive: created.isActive,
      },
    });
  } catch (error) {
    console.error('POST /api/admin/guides/[id]/quiz error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
