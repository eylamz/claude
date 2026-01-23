import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Form from '@/lib/models/Form';

export async function GET(request: Request) {
  try {
    await connectDB();

    // Get all visible forms (published and within date range)
    const forms = await Form.findVisible();

    // Format forms data (only include necessary fields for public)
    const formattedForms = forms.map((form: any) => ({
      id: form._id.toString(),
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
    }));

    return NextResponse.json({ forms: formattedForms });
  } catch (error: any) {
    console.error('Get forms error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}
