import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Form from '@/lib/models/Form';
import { MAX_ADMIN_PAGE_SIZE } from '@/lib/config/api';
import { validateCsrf } from '@/lib/security/csrf';

export async function GET(request: Request) {
  try {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const rawPage = parseInt(searchParams.get('page') || '1');
    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const requestedLimit = parseInt(searchParams.get('limit') || '20');
    const limit = Math.min(
      Math.max(Number.isNaN(requestedLimit) ? 20 : requestedLimit, 1),
      MAX_ADMIN_PAGE_SIZE
    );
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object
    const filter: any = {};

    // Search filter
    if (search) {
      filter.$or = [
        { 'title.en': { $regex: search, $options: 'i' } },
        { 'title.he': { $regex: search, $options: 'i' } },
        { 'description.en': { $regex: search, $options: 'i' } },
        { 'description.he': { $regex: search, $options: 'i' } },
      ];
    }

    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Sort configuration
    const sortConfig: any = {};
    sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate total count for pagination
    const totalCount = await Form.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Fetch forms
    const forms = await Form.find(filter)
      .sort(sortConfig)
      .skip(skip)
      .limit(limit)
      .lean();

    // Format forms data
    const formattedForms = forms.map((form: any) => ({
      id: form._id.toString(),
      slug: form.slug,
      title: {
        en: form.title?.en || 'Untitled',
        he: form.title?.he || 'ללא כותרת',
      },
      description: {
        en: form.description?.en || '',
        he: form.description?.he || '',
      },
      fields: form.fields || [],
      status: form.status || 'draft',
      visibleFrom: form.visibleFrom ? form.visibleFrom.toISOString() : null,
      visibleUntil: form.visibleUntil ? form.visibleUntil.toISOString() : null,
      submissionsCount: form.submissionsCount || 0,
      createdAt: form.createdAt ? form.createdAt.toISOString() : null,
      updatedAt: form.updatedAt ? form.updatedAt.toISOString() : null,
      publishedAt: form.publishedAt ? form.publishedAt.toISOString() : null,
    }));

    return NextResponse.json({
      forms: formattedForms,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error: any) {
    console.error('Forms API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrfResponse = validateCsrf(request);
    if (csrfResponse) {
      return csrfResponse;
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

    const body = await request.json();

    // Validate and clean fields
    let cleanedFields: any[] = [];
    if (body.fields && Array.isArray(body.fields)) {
      cleanedFields = body.fields
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
    }

    // Prepare form data
    const formData: any = {
      slug: body.slug,
      title: {
        en: body.title?.en || '',
        he: body.title?.he || '',
      },
      description: {
        en: body.description?.en || '',
        he: body.description?.he || '',
      },
      fields: cleanedFields,
      status: body.status || 'draft',
      visibleFrom: body.visibleFrom ? new Date(body.visibleFrom) : undefined,
      visibleUntil: body.visibleUntil ? new Date(body.visibleUntil) : undefined,
      metaTitle: body.metaTitle
        ? {
            en: body.metaTitle.en || '',
            he: body.metaTitle.he || '',
          }
        : undefined,
      metaDescription: body.metaDescription
        ? {
            en: body.metaDescription.en || '',
            he: body.metaDescription.he || '',
          }
        : undefined,
      metaKeywords: body.metaKeywords
        ? {
            en: body.metaKeywords.en || '',
            he: body.metaKeywords.he || '',
          }
        : undefined,
      authorId: session.user.id,
      authorName: (user as { name?: string; email?: string }).name || (user as { email?: string }).email,
      submissionsCount: 0,
    };

    // Create new form
    const newForm = new Form(formData);

    // Validate before saving
    try {
      const validationError = newForm.validateSync();
      if (validationError) {
        console.error('Validation error:', validationError);
        return NextResponse.json(
          { error: validationError.message || 'Validation failed' },
          { status: 400 }
        );
      }
    } catch (validationErr: any) {
      console.error('Validation exception:', validationErr);
      return NextResponse.json(
        { error: validationErr.message || 'Validation failed' },
        { status: 400 }
      );
    }

    await newForm.save();

    return NextResponse.json(
      { message: 'Form created successfully', form: newForm },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create form error:', error);

    // Handle duplicate key error (unique constraint violation)
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
      { error: error.message || 'Failed to create form' },
      { status: 500 }
    );
  }
}
