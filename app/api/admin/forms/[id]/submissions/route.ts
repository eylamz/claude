import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Form from '@/lib/models/Form';
import FormSubmission from '@/lib/models/FormSubmission';
import mongoose from 'mongoose';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid form ID' }, { status: 400 });
    }

    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    // Verify form exists
    const form = await Form.findById(id);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Calculate pagination
    const totalCount = await FormSubmission.countDocuments({ formId: id });
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Sort configuration
    const sortConfig: any = {};
    sortConfig['submittedAt'] = sortOrder === 'asc' ? 1 : -1;

    // Fetch submissions
    const submissions = await FormSubmission.find({ formId: id })
      .sort(sortConfig)
      .skip(skip)
      .limit(limit)
      .lean();

    // Format submissions data
    const formattedSubmissions = submissions.map((submission: any) => ({
      id: submission._id.toString(),
      formId: submission.formId.toString(),
      formSlug: submission.formSlug,
      answers: submission.answers || [],
      submittedAt: submission.submittedAt ? submission.submittedAt.toISOString() : null,
      createdAt: submission.createdAt ? submission.createdAt.toISOString() : null,
    }));

    return NextResponse.json({
      submissions: formattedSubmissions,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error: any) {
    console.error('Get form submissions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
