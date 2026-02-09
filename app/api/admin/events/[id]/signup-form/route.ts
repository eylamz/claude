import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Event from '@/lib/models/Event';
import mongoose from 'mongoose';

/**
 * PATCH /api/admin/events/[id]/signup-form
 * Update only the event's signup form config (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const body = await request.json();
    const { signupForm, eventRules: bodyEventRules } = body;

    // Optional: update event rules only (eventRules can be sent with or without signupForm)
    if (bodyEventRules !== undefined && bodyEventRules !== null && typeof bodyEventRules === 'object') {
      event.eventRules = {
        en: typeof bodyEventRules.en === 'string' ? bodyEventRules.en : (event.eventRules?.en ?? ''),
        he: typeof bodyEventRules.he === 'string' ? bodyEventRules.he : (event.eventRules?.he ?? ''),
      };
    }

    if (signupForm === null || signupForm === undefined) {
      event.signupForm = undefined;
      await event.save();
      return NextResponse.json({
        event: {
          id: String(event._id),
          signupForm: null,
          eventRules: event.eventRules ?? undefined,
        },
      });
    }

    if (typeof signupForm !== 'object') {
      return NextResponse.json({ error: 'signupForm must be an object' }, { status: 400 });
    }

    const title = signupForm.title && typeof signupForm.title === 'object'
      ? { en: String(signupForm.title.en ?? ''), he: String(signupForm.title.he ?? '') }
      : { en: 'Event Registration', he: 'רישום לאירוע' };
    const description = signupForm.description && typeof signupForm.description === 'object'
      ? { en: String(signupForm.description.en ?? ''), he: String(signupForm.description.he ?? '') }
      : undefined;
    const showEventRulesCheckbox = Boolean(signupForm.showEventRulesCheckbox);
    const showPrivacyCheckbox = Boolean(signupForm.showPrivacyCheckbox);
    const privacyPolicyUrl = typeof signupForm.privacyPolicyUrl === 'string' ? signupForm.privacyPolicyUrl.trim() : undefined;
    const rawFields = Array.isArray(signupForm.fields) ? signupForm.fields : [];
    const fields = rawFields.map((f: any, idx: number) => {
      const validation =
        f.validation && typeof f.validation === 'object'
          ? {
              ...(typeof f.validation.min === 'number' && !Number.isNaN(f.validation.min) ? { min: f.validation.min } : {}),
              ...(typeof f.validation.max === 'number' && !Number.isNaN(f.validation.max) ? { max: f.validation.max } : {}),
            }
          : undefined;
      return {
        id: f.id || `field-${Date.now()}-${idx}`,
        name: String(f.name ?? '').trim() || `field_${idx}`,
        type: ['text', 'email', 'phone', 'number', 'select', 'textarea', 'checkbox'].includes(f.type) ? f.type : 'text',
        label: f.label && typeof f.label === 'object'
          ? { en: String(f.label.en ?? ''), he: String(f.label.he ?? '') }
          : { en: f.name || `Field ${idx + 1}`, he: f.name || `שדה ${idx + 1}` },
        required: Boolean(f.required),
        placeholder: f.placeholder && typeof f.placeholder === 'object'
          ? { en: String(f.placeholder.en ?? ''), he: String(f.placeholder.he ?? '') }
          : undefined,
        options: Array.isArray(f.options)
          ? f.options.map((o: any) => ({
              value: String(o.value ?? ''),
              label: o.label && typeof o.label === 'object'
                ? { en: String(o.label.en ?? ''), he: String(o.label.he ?? '') }
                : { en: String(o.value ?? ''), he: String(o.value ?? '') },
              linkUrl: typeof o.linkUrl === 'string' && o.linkUrl.trim() ? o.linkUrl.trim() : undefined,
            }))
          : undefined,
        order: typeof f.order === 'number' ? f.order : idx,
        ...(Object.keys(validation || {}).length > 0 && { validation }),
      };
    });

    event.signupForm = {
      title,
      ...(description && { description }),
      showEventRulesCheckbox,
      showPrivacyCheckbox,
      privacyPolicyUrl: privacyPolicyUrl || undefined,
      fields,
    };
    await event.save();

    return NextResponse.json({
      event: {
        id: String(event._id),
        signupForm: event.signupForm,
        eventRules: event.eventRules ?? undefined,
      },
    });
  } catch (error) {
    console.error('Event signup-form update error:', error);
    return NextResponse.json(
      { error: 'Failed to update signup form' },
      { status: 500 }
    );
  }
}
