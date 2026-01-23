import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Form from '@/lib/models/Form';
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

    const form = await Form.findById(id).lean();

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Format form data
    const formattedForm = {
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
      status: form.status || 'draft',
      visibleFrom: form.visibleFrom ? form.visibleFrom.toISOString() : null,
      visibleUntil: form.visibleUntil ? form.visibleUntil.toISOString() : null,
      metaTitle: {
        en: form.metaTitle?.en || '',
        he: form.metaTitle?.he || '',
      },
      metaDescription: {
        en: form.metaDescription?.en || '',
        he: form.metaDescription?.he || '',
      },
      metaKeywords: {
        en: form.metaKeywords?.en || '',
        he: form.metaKeywords?.he || '',
      },
      submissionsCount: form.submissionsCount || 0,
      createdAt: form.createdAt ? form.createdAt.toISOString() : null,
      updatedAt: form.updatedAt ? form.updatedAt.toISOString() : null,
      publishedAt: form.publishedAt ? form.publishedAt.toISOString() : null,
    };

    return NextResponse.json({ form: formattedForm });
  } catch (error: any) {
    console.error('Get form error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch form' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const form = await Form.findById(id);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate and clean fields
    if (body.fields !== undefined) {
      if (Array.isArray(body.fields)) {
        const cleanedFields = body.fields
          .filter((field: any) => field && field.id && field.type && field.label)
          .map((field: any, index: number) => ({
            id: String(field.id),
            type: String(field.type),
            label: {
              en: String(field.label?.en || ''),
              he: String(field.label?.he || ''),
            },
            required: Boolean(field.required),
            order: typeof field.order === 'number' ? field.order : index,
            placeholder: field.placeholder
              ? {
                  en: String(field.placeholder.en || ''),
                  he: String(field.placeholder.he || ''),
                }
              : undefined,
            options: field.options && Array.isArray(field.options)
              ? field.options.map((opt: any) => ({
                  value: String(opt.value || ''),
                  label: {
                    en: String(opt.label?.en || ''),
                    he: String(opt.label?.he || ''),
                  },
                }))
              : undefined,
            hasOtherOption: Boolean(field.hasOtherOption),
            otherInputType: field.otherInputType === 'textarea' ? 'textarea' : 'input',
            images: field.images && Array.isArray(field.images)
              ? field.images.map((img: any) => ({
                  url: String(img.url || ''),
                  alt: img.alt
                    ? {
                        en: String(img.alt.en || ''),
                        he: String(img.alt.he || ''),
                      }
                    : undefined,
                }))
              : undefined,
            min: typeof field.min === 'number' ? field.min : undefined,
            max: typeof field.max === 'number' ? field.max : undefined,
            validation: field.validation || undefined,
          }));
        form.fields = cleanedFields;
        form.markModified('fields');
      } else {
        return NextResponse.json(
          { error: 'Fields must be an array' },
          { status: 400 }
        );
      }
    }

    // Update other fields
    if (body.slug !== undefined) form.slug = body.slug;
    if (body.title !== undefined) form.title = body.title;
    if (body.description !== undefined) form.description = body.description;
    if (body.status !== undefined) {
      form.status = body.status;
      // Set publishedAt when status changes to published
      if (body.status === 'published' && !form.publishedAt) {
        form.publishedAt = new Date();
      }
    }
    if (body.visibleFrom !== undefined) {
      form.visibleFrom = body.visibleFrom ? new Date(body.visibleFrom) : undefined;
    }
    if (body.visibleUntil !== undefined) {
      form.visibleUntil = body.visibleUntil ? new Date(body.visibleUntil) : undefined;
    }
    if (body.metaTitle !== undefined) form.metaTitle = body.metaTitle;
    if (body.metaDescription !== undefined) form.metaDescription = body.metaDescription;
    if (body.metaKeywords !== undefined) form.metaKeywords = body.metaKeywords;

    await form.save();

    // Format response
    const formattedForm = {
      id: form._id.toString(),
      slug: form.slug,
      title: form.title,
      description: form.description,
      fields: form.fields,
      status: form.status,
      visibleFrom: form.visibleFrom ? form.visibleFrom.toISOString() : null,
      visibleUntil: form.visibleUntil ? form.visibleUntil.toISOString() : null,
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      metaKeywords: form.metaKeywords,
      submissionsCount: form.submissionsCount,
    };

    return NextResponse.json({
      message: 'Form updated successfully',
      form: formattedForm,
    });
  } catch (error: any) {
    console.error('Update form error:', error);

    // Handle duplicate key error
    if (error.code === 11000 || error.name === 'MongoServerError') {
      const duplicateField = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'field';
      const duplicateValue = error.keyValue ? Object.values(error.keyValue)[0] : 'value';

      if (duplicateField === 'slug') {
        return NextResponse.json(
          { error: `A form with the slug "${duplicateValue}" already exists. Please choose a different slug.` },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: `A form with this ${duplicateField} already exists.` },
        { status: 409 }
      );
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: error.message || 'Validation failed' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update form' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const form = await Form.findById(id);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    await form.deleteOne();

    return NextResponse.json({ message: 'Form deleted successfully' });
  } catch (error: any) {
    console.error('Delete form error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete form' },
      { status: 500 }
    );
  }
}
