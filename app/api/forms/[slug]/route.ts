import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Form from '@/lib/models/Form';
import { internalError } from '@/lib/api/errors';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    await connectDB();

    const form = await Form.findBySlug(slug);

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Check if form is visible
    if (!form.isVisible()) {
      return NextResponse.json({ error: 'Form is not available' }, { status: 404 });
    }

    // Format form data
    const formattedForm = {
      id: String(form._id),
      slug: form.slug,
      title: {
        en: form.title?.en || '',
        he: form.title?.he || '',
      },
      description: {
        en: form.description?.en || '',
        he: form.description?.he || '',
      },
      fields: form.fields || [],
      submissionsCount: form.submissionsCount || 0,
      visibleFrom: form.visibleFrom ? form.visibleFrom.toISOString() : null,
      visibleUntil: form.visibleUntil ? form.visibleUntil.toISOString() : null,
    };

    return NextResponse.json({ form: formattedForm });
  } catch (error: any) {
    return internalError(error, 'forms/[slug] GET');
  }
}
