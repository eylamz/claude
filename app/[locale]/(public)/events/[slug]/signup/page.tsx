'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, SelectWrapper, Checkbox, Textarea } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { formatConfirmationNumber } from '@/lib/utils/formatConfirmationNumber';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface SignupFormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'select' | 'textarea' | 'checkbox';
  label: { en: string; he: string };
  required?: boolean;
  placeholder?: { en: string; he: string };
  options?: Array<{ value: string; label: { en: string; he: string }; linkUrl?: string }>;
  order?: number;
}

interface IEvent {
  _id: string;
  slug: string;
  content: {
    he: { title: string; description?: string };
    en: { title: string; description?: string };
  };
  dateTime: {
    startDate: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    timezone: { he: string; en: string };
  };
  location: { name: { he: string; en: string }; address?: { he?: string; en?: string } };
  registrationRequired: boolean;
  registrationClosesAt?: string;
  status: string;
  signupForm?: {
    title?: { en: string; he: string };
    description?: { en: string; he: string };
    fields?: SignupFormField[];
    showEventRulesCheckbox?: boolean;
    showPrivacyCheckbox?: boolean;
    privacyPolicyUrl?: string;
  };
  eventRules?: { en?: string; he?: string };
}

interface FormFieldValue {
  name: string;
  type: string;
  value: string | number | boolean;
  label?: string;
}

function getDefaultFormFields(locale: 'en' | 'he'): FormFieldValue[] {
  return [
    { name: 'fullName', type: 'text', value: '', label: locale === 'he' ? 'שם מלא' : 'Full Name' },
    { name: 'email', type: 'email', value: '', label: locale === 'he' ? 'אימייל' : 'Email' },
    { name: 'phone', type: 'phone', value: '', label: locale === 'he' ? 'טלפון' : 'Phone' },
    { name: 'notes', type: 'textarea', value: '', label: locale === 'he' ? 'הערות (אופציונלי)' : 'Notes (optional)' },
  ];
}

export default function EventSignupPage() {
  const params = useParams();
  const locale = useLocale() as 'en' | 'he';
  const slug = params.slug as string;
  const { toast } = useToast();

  const [event, setEvent] = useState<IEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormFieldValue[]>(() =>
    getDefaultFormFields(locale).map((f) => ({ ...f, value: f.type === 'checkbox' ? false : '' }))
  );
  const [success, setSuccess] = useState<{ confirmationNumber: string } | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [acceptedEventRules, setAcceptedEventRules] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${slug}`);
        if (!res.ok) {
          if (res.status === 404) setError('Event not found');
          else setError('Failed to load event');
          return;
        }
        const data = await res.json();
        if (!cancelled && data.event) {
          setEvent(data.event);
          const ev = data.event as IEvent;
          if (ev.signupForm?.fields?.length) {
            const ordered = [...ev.signupForm.fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setFormData(
              ordered.map((f) => ({
                name: f.name,
                type: f.type,
                value: f.type === 'checkbox' ? false : '',
                label: f.label?.[locale] ?? f.label?.en ?? f.name,
              }))
            );
          } else {
            setFormData(
              getDefaultFormFields(locale).map((f) => ({
                ...f,
                value: f.type === 'checkbox' ? false : '',
              }))
            );
          }
        }
      } catch {
        if (!cancelled) setError('Failed to load event');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchEvent();
    return () => {
      cancelled = true;
    };
  }, [slug, locale]);

  const updateField = (name: string, value: string | number | boolean) => {
    setFormData((prev) =>
      prev.map((f) => (f.name === name ? { ...f, value } : f))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || submitting) return;

    if (event.signupForm?.showEventRulesCheckbox && !acceptedEventRules) {
      toast({
        title: locale === 'he' ? 'נדרש' : 'Required',
        description: locale === 'he' ? 'יש לאשר את כללי האירוע.' : 'You must accept the event rules.',
        variant: 'error',
      });
      return;
    }
    if (event.signupForm?.showPrivacyCheckbox && !acceptedPrivacy) {
      toast({
        title: locale === 'he' ? 'נדרש' : 'Required',
        description: locale === 'he' ? 'יש לאשר את מדיניות הפרטיות.' : 'You must agree to the privacy policy.',
        variant: 'error',
      });
      return;
    }

    const payload = formData.map((f) => ({
      name: f.name,
      type: f.type,
      value: f.value,
      label: f.label,
    }));
    if (event.signupForm?.showEventRulesCheckbox) {
      payload.push({
        name: 'eventRulesAccepted',
        type: 'checkbox',
        value: acceptedEventRules,
        label: locale === 'he' ? 'הסכמה לכללי האירוע' : 'Accept event rules',
      });
    }
    if (event.signupForm?.showPrivacyCheckbox) {
      payload.push({
        name: 'privacyAccepted',
        type: 'checkbox',
        value: acceptedPrivacy,
        label: locale === 'he' ? 'הסכמה למדיניות פרטיות' : 'Accept privacy policy',
      });
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${slug}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: payload }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          title: locale === 'he' ? 'שגיאה' : 'Error',
          description: data.message || data.error || 'Registration failed',
          variant: 'error',
        });
        return;
      }

      setSuccess({ confirmationNumber: data.confirmationNumber });
      toast({
        title: locale === 'he' ? 'נרשמת בהצלחה' : 'Registered successfully',
        description: locale === 'he' ? 'שמרו את מספר האישור.' : 'Save your confirmation number.',
        variant: 'success',
      });
    } catch {
      toast({
        title: locale === 'he' ? 'שגיאה' : 'Error',
        description: locale === 'he' ? 'אירעה שגיאה. נסה שוב.' : 'Something went wrong. Please try again.',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getEventTitle = () => {
    if (!event?.content) return '';
    return locale === 'he' ? event.content.he?.title : event.content.en?.title;
  };

  const isEventPast = () => {
    if (!event?.dateTime?.startDate) return false;
    return new Date(event.dateTime.startDate) < new Date();
  };

  const isRegistrationClosed = () => {
    if (!event?.registrationClosesAt) return false;
    return new Date(event.registrationClosesAt) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background dark:bg-background-dark flex items-center justify-center px-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background dark:bg-background-dark flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground dark:text-foreground-dark mb-2">
            {locale === 'he' ? 'אירוע לא נמצא' : 'Event not found'}
          </h1>
          <Link
            href={`/${locale}/events`}
            className="inline-flex items-center gap-2 text-brand-main hover:text-brand-main/80 font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            {locale === 'he' ? 'חזרה לאירועים' : 'Back to Events'}
          </Link>
        </div>
      </div>
    );
  }

  if (!event.registrationRequired) {
    return (
      <div className="min-h-screen bg-background dark:bg-background-dark flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground dark:text-foreground-dark mb-2">
            {locale === 'he' ? 'האירוע לא דורש הרשמה' : 'This event does not require registration'}
          </h1>
          <Link
            href={`/${locale}/events/${slug}`}
            className="inline-flex items-center gap-2 text-brand-main hover:text-brand-main/80 font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            {locale === 'he' ? 'חזרה לאירוע' : 'Back to Event'}
          </Link>
        </div>
      </div>
    );
  }

  if (isRegistrationClosed()) {
    return (
      <div className="min-h-screen bg-background dark:bg-background-dark flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground dark:text-foreground-dark mb-2">
            {locale === 'he' ? 'ההרשמה נסגרה' : 'Registration is closed'}
          </h1>
          <p className="text-muted-foreground mb-4">
            {locale === 'he' ? 'תאריך סגירת ההרשמה חלף. אין אפשרות להירשם כעת.' : 'The registration deadline has passed. You can no longer register.'}
          </p>
          <Link
            href={`/${locale}/events/${slug}`}
            className="inline-flex items-center gap-2 text-brand-main hover:text-brand-main/80 font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            {locale === 'he' ? 'חזרה לאירוע' : 'Back to Event'}
          </Link>
        </div>
      </div>
    );
  }

  if (isEventPast()) {
    return (
      <div className="min-h-screen bg-background dark:bg-background-dark flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground dark:text-foreground-dark mb-2">
            {locale === 'he' ? 'ההרשמה נסגרה' : 'Registration is closed'}
          </h1>
          <p className="text-muted-foreground mb-4">
            {locale === 'he' ? 'אין אפשרות להירשם לאירוע שכבר הסתיים.' : 'This event has already passed.'}
          </p>
          <Link
            href={`/${locale}/events/${slug}`}
            className="inline-flex items-center gap-2 text-brand-main hover:text-brand-main/80 font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            {locale === 'he' ? 'חזרה לאירוע' : 'Back to Event'}
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen  flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md bg-card dark:bg-card-dark box-shadow:0_1px_1px_#66666612,0_2px_2px_#5e5e5e12,0_4px_4px_#7a5d4413,0_8px_8px_#5e5e5e12,0_16px_16px_#5e5e5e12]">
          <CardHeader>
            <CardTitle className="text-center text-brand-main dark:text-brand-dark">
              {locale === 'he' ? 'נרשמת בהצלחה!' : 'You\'re registered!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-text dark:text-text-dark">
              {locale === 'he' ? 'מספר האישור שלך:' : 'Your confirmation number:'}
            </p>
            <p className="text-center font-poppins font-semibold text-2xl bg-muted dark:bg-muted-dark px-4 py-2 rounded">
              {formatConfirmationNumber(success.confirmationNumber)}
            </p>
            <p className="text-center text-base text-muted-foreground">
              {locale === 'he' ? 'שמרו את המספר לאישור.' : 'Save this number for your records.'}
            </p>
            <div className="flex flex-col gap-2 justify-center items-center">
              <Button asChild variant="primary" className="w-fit max-w-[270px]">
                <Link href={`/${locale}/events/${slug}`}>
                  {locale === 'he'
                    ? `חזרה ל- ${getEventTitle() || 'אירוע'}`
                    : `Back to ${getEventTitle() || 'Event'}`}
                </Link>
              </Button>
              <Button asChild variant="gray" className="w-fit max-w-[200px]">
                <Link href={`/${locale}/events`}>
                  {locale === 'he' ? 'חזרה לאירועים' : 'Back to Events'}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark pb-12 px-4 pt-20">
      <div className="max-w-lg mx-auto">
        <Link
          href={`/${locale}/events/${slug}`}
          className="inline-flex items-center gap-2 text-brand-text hover:text-brand-text/80 dark:text-brand-dark dark:hover:text-brand-dark/80 font-medium mb-6"
        >
          <ChevronLeft className={`w-4 h-4 ${locale === 'he' ? 'rotate-180' : ''}`} />
          {locale === 'he'
            ? `חזרה ל-${getEventTitle() || 'אירוע'}`
            : `Back to ${getEventTitle() || 'Event'}`}
        </Link>

        <Card className="">
          <CardHeader>
            <CardTitle className="text-xl text-center">
              {event?.signupForm?.title?.[locale] || event?.signupForm?.title?.en || (locale === 'he' ? 'הרשמה לאירוע' : 'Event Registration')}
            </CardTitle>
            <p className="text-muted-foreground text-2xl mt-1 text-center">{getEventTitle()}</p>
            {event?.signupForm?.description?.[locale] && (
              <p className="text-muted-foreground text-base mt-1 text-center">{event.signupForm.description[locale]}</p>
            )}
            {event?.eventRules?.[locale]?.trim() && !event?.signupForm?.showEventRulesCheckbox && (
              <Button
                type="button"
                variant="gray"
                size="sm"
                className="mt-2 w-fit"
                onClick={() => setShowRulesModal(true)}
              >
                {locale === 'he' ? 'צפה בכללי האירוע' : 'View event rules'}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formData.map((field) => {
                const config = event?.signupForm?.fields?.find((f) => f.name === field.name);
                const isRequired = config?.required ?? (field.name === 'email' || field.name === 'fullName');
                const placeholder = config?.placeholder?.[locale] ?? config?.placeholder?.en ?? field.label;
                return (
                <div key={field.name}>
                  {field.type === 'textarea' ? (
                    <Textarea
                      id={field.name}
                      value={String(field.value)}
                      onChange={(e) => updateField(field.name, e.target.value)}
                      placeholder={placeholder}
                      required={isRequired}
                      label={field.label}
                      className="min-h-[80px]"
                    />
                  ) : field.type === 'select' && config?.options?.length ? (
                    <>
                      <label
                        htmlFor={field.name}
                        className="block text-base font-medium text-foreground dark:text-foreground-dark mb-1"
                      >
                        {field.label}
                        {isRequired && <span className="text-red dark:text-red-dark ms-1">*</span>}
                      </label>
                    <SelectWrapper
                      value={String(field.value)}
                      onChange={(e) => updateField(field.name, e.target.value)}
                      options={[
                        { value: '', label: locale === 'he' ? 'בחר...' : 'Select...' },
                        ...config.options.map((opt) => ({
                          value: opt.value,
                          label: opt.label?.[locale] ?? opt.label?.en ?? opt.value,
                        })),
                      ]}
                      className="w-full"
                    />
                    </>
                  ) : field.type === 'checkbox' && config?.options?.length ? (
                    <>
                    <label
                      htmlFor={field.name}
                      className="block text-base font-medium text-foreground dark:text-foreground-dark mb-1"
                    >
                      {field.label}
                      {isRequired && <span className="text-red dark:text-red-dark ms-1">*</span>}
                    </label>
                    <div className="space-y-2">
                      {config.options.map((opt) => {
                        const labelText = opt.label?.[locale] ?? opt.label?.en ?? opt.value;
                        const linkUrl = (opt as { linkUrl?: string }).linkUrl?.trim();
                        return (
                          <label key={opt.value} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={String(field.value).split(',').includes(opt.value)}
                              onChange={(e) => {
                                const current = String(field.value).split(',').filter(Boolean);
                                const next = e.target.checked
                                  ? [...current, opt.value]
                                  : current.filter((v) => v !== opt.value);
                                updateField(field.name, next.join(','));
                              }}
                              className="rounded border-input"
                            />
                            <span className="text-base">
                              {linkUrl ? (
                                <a
                                  href={linkUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand-main dark:text-brand-dark hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {labelText}
                                </a>
                              ) : (
                                labelText
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    </>
                  ) : field.type === 'checkbox' ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(field.value)}
                        onChange={(e) => updateField(field.name, e.target.checked)}
                        className="rounded border-input"
                      />
                      <span className="text-base">{field.label}</span>
                    </label>
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type === 'phone' ? 'tel' : field.type}
                      value={String(field.value)}
                      onChange={(e) =>
                        updateField(
                          field.name,
                          field.type === 'number' ? Number(e.target.value) : e.target.value
                        )
                      }
                      placeholder={placeholder}
                      required={isRequired}
                      label={field.label}
                      className="w-full"
                    />
                  )}
                </div>
              );})}

              {event?.signupForm?.showEventRulesCheckbox && event?.eventRules?.[locale]?.trim() && (
                <div className="flex items-center">
                  <span className="inline-flex flex-shrink-0">
                    <Checkbox
                      id="event-rules-accept"
                      checked={acceptedEventRules}
                      onChange={setAcceptedEventRules}
                      label=""
                      variant="brand"
                    />
                  </span>
                  <label htmlFor="event-rules-accept" className={` text-base text-foreground dark:text-foreground-dark cursor-pointer flex-1 ${locale === 'he' ? 'ms-1 -mt-2.5' : '-ms-2 -mt-1.5'}`}>
                    {locale === 'he' ? 'אני מקבל/ת את ' : 'I accept the '}
                    <button
                      type="button"
                      className="text-brand-main dark:text-brand-dark hover:underline font-medium"
                      onClick={() => setShowRulesModal(true)}
                    >
                      {locale === 'he' ? 'כללי האירוע' : 'Event Rules'}
                    </button>
                    <span className="text-red dark:text-red-dark ms-0.5">*</span>
                  </label>
                </div>
              )}

              {event?.signupForm?.showPrivacyCheckbox && (
                <div className="flex items-center">
                  <span className="inline-flex flex-shrink-0">
                    <Checkbox
                      id="privacy-accept"
                      checked={acceptedPrivacy}
                      onChange={setAcceptedPrivacy}
                      label=""
                      variant="brand"
                    />
                  </span>
                  <label htmlFor="privacy-accept" className={` text-base text-foreground dark:text-foreground-dark cursor-pointer flex-1 ${locale === 'he' ? 'ms-1 -mt-2.5' : '-ms-2 -mt-1.5'}`}>
                    {locale === 'he' ? 'אני מסכים/ה ל' : 'I agree to the '}
                    <a
                      href={(() => {
                        const url = event.signupForm?.privacyPolicyUrl?.trim();
                        if (!url || url === '/[locale]/privacy' || url === '/[locale]/terms#privacy-policy') return `/${locale}/terms#privacy-policy`;
                        return url.replace('[locale]', locale);
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-main dark:text-brand-dark hover:underline font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {locale === 'he' ? 'מדיניות הפרטיות' : 'Privacy Policy'}
                    </a>
                    <span className="text-red dark:text-red-dark ms-0.5">*</span>
                  </label>
                </div>
              )}
              <div className="flex justify-center">
              <Button
                type="submit"
                variant="primary"
                className="text-base font-semibold w-full max-w-[270px]"
                disabled={submitting}
              >
                {submitting
                  ? locale === 'he'
                    ? 'שולח...'
                    : 'Submitting...'
                  : locale === 'he'
                    ? 'שלח הרשמה'
                    : 'Submit Registration'}
              </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Event rules modal */}
        {showRulesModal && event?.eventRules?.[locale]?.trim() && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/40 backdrop-blur-[2px]"
            onClick={() => setShowRulesModal(false)}
            role="dialog"
            aria-modal="true"
            aria-label={locale === 'he' ? 'כללי האירוע' : 'Event rules'}
          >
            <div
              className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
                <h2 className="text-lg font-semibold text-foreground dark:text-foreground-dark">
                  {locale === 'he' ? 'כללי האירוע' : 'Event rules'}
                </h2>
                <Button
                  type="button"
                  variant="gray"
                  size="sm"
                  onClick={() => setShowRulesModal(false)}
                  aria-label={locale === 'he' ? 'סגור' : 'Close'}
                >
                  ×
                </Button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 whitespace-pre-wrap text-foreground dark:text-foreground-dark text-base">
                {event.eventRules[locale]}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
