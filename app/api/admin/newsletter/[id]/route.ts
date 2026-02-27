import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import NewsletterSubscriber from '@/lib/models/NewsletterSubscriber';
import { validateCsrf } from '@/lib/security/csrf';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrfResponse = validateCsrf(request);
    if (csrfResponse) {
      return csrfResponse;
    }
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const deleted = await NewsletterSubscriber.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Subscriber removed.' });
  } catch (error) {
    console.error('Admin newsletter DELETE error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
