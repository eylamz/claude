'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Toaster } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';

interface FormFieldDef {
  id: string;
  name: string;
  type: string;
  label: { en: string; he: string };
}

interface Signup {
  id: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  formData: Array<{ name: string; type: string; value: string | number | boolean; label?: string }>;
  userEmail?: string;
  userName?: string;
  submittedAt: string;
  confirmationNumber: string;
  status: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

export default function EventSignupFormSubmissionsPage() {
  const locale = useLocale() as 'en' | 'he';
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { toast } = useToast();

  const [eventTitle, setEventTitle] = useState<string>('');
  const [formFields, setFormFields] = useState<FormFieldDef[]>([]);
  const [submissions, setSubmissions] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
  });

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/admin/events/${eventId}`);
        if (!res.ok) throw new Error('Failed to fetch event');
        const data = await res.json();
        setEventTitle(data.event?.title?.[locale] || data.event?.title?.en || 'Event');
        const sf = data.event?.signupForm;
        if (Array.isArray(sf?.fields) && sf.fields.length > 0) {
          setFormFields(sf.fields);
        }
      } catch (e) {
        toast({ title: 'Error', description: 'Failed to load event', variant: 'error' });
      }
    };
    fetchEvent();
  }, [eventId, locale, toast]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          eventId,
          page: pagination.currentPage.toString(),
          limit: pagination.limit.toString(),
          sortBy: 'submittedAt',
          sortOrder: 'desc',
        });
        const res = await fetch(`/api/admin/event-signups?${params}`);
        if (!res.ok) throw new Error('Failed to fetch submissions');
        const data = await res.json();
        setSubmissions(data.signups || []);
        setPagination(data.pagination || pagination);
      } catch (e) {
        toast({ title: 'Error', description: 'Failed to load submissions', variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [eventId, pagination.currentPage, pagination.limit, toast]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(locale === 'he' ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFieldLabel = (name: string) => {
    const def = formFields.find((f) => f.name === name);
    return def ? (def.label[locale] || def.label.en || name) : name;
  };

  const getValue = (signup: Signup, fieldName: string) => {
    const fd = signup.formData?.find((f) => f.name === fieldName);
    if (fd == null) return '—';
    const v = fd.value;
    if (v === null || v === undefined) return '—';
    if (typeof v === 'boolean') return v ? (locale === 'he' ? 'כן' : 'Yes') : (locale === 'he' ? 'לא' : 'No');
    return String(v);
  };

  const columnNames = formFields.length > 0
    ? formFields.map((f) => f.name)
    : (submissions[0]?.formData?.map((f) => f.name) || []);

  return (
    <div className="pt-16 space-y-6 max-w-6xl mx-auto px-4">
      <Toaster />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">
            {eventTitle}
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            {locale === 'en' ? 'Event signup submissions' : 'הגשות הרשמה לאירוע'} · {pagination.totalCount} {locale === 'en' ? 'total' : 'סה״כ'}
          </p>
        </div>
        <Button variant="gray" onClick={() => router.push(`/${locale}/admin/events/${eventId}/signup-form`)}>
          {locale === 'en' ? 'Edit signup form' : 'ערוך טופס הרשמה'}
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-text-secondary dark:text-text-secondary-dark">
              {locale === 'en' ? 'No submissions yet' : 'אין הגשות עדיין'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{locale === 'en' ? 'Submissions' : 'הגשות'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">{locale === 'en' ? 'Submitted' : 'נשלח'}</TableHead>
                    <TableHead className="whitespace-nowrap">{locale === 'en' ? 'Confirmation #' : 'מספר אימות'}</TableHead>
                    {columnNames.map((name) => (
                      <TableHead key={name} className="min-w-[120px]">
                        {getFieldLabel(name)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark">
                        {formatDate(s.submittedAt)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{s.confirmationNumber}</TableCell>
                      {columnNames.map((name) => (
                        <TableCell key={name} className="max-w-xs">
                          <div className="text-sm truncate" title={getValue(s, name)}>
                            {getValue(s, name)}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-text-secondary dark:text-text-secondary-dark">
                  {locale === 'en'
                    ? `Showing ${(pagination.currentPage - 1) * pagination.limit + 1} to ${Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of ${pagination.totalCount}`
                    : `מציג ${(pagination.currentPage - 1) * pagination.limit + 1} עד ${Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} מתוך ${pagination.totalCount}`}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
                    disabled={pagination.currentPage === 1}
                  >
                    {locale === 'en' ? 'Previous' : 'הקודם'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage + 1 })}
                    disabled={pagination.currentPage >= pagination.totalPages}
                  >
                    {locale === 'en' ? 'Next' : 'הבא'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
