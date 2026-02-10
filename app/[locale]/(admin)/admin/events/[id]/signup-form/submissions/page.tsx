'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Toaster, Input, SelectWrapper } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { formatConfirmationNumber } from '@/lib/utils/formatConfirmationNumber';

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

const PAGE_SIZE = 50;
const FETCH_LIMIT = 5000; // fetch all for this event in one request; filter/paginate on client

export default function EventSignupFormSubmissionsPage() {
  const locale = useLocale() as 'en' | 'he';
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { toast } = useToast();

  const [eventTitle, setEventTitle] = useState<string>('');
  const [formFields, setFormFields] = useState<FormFieldDef[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'submittedAt' | 'confirmationNumber'>('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

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
          page: '1',
          limit: FETCH_LIMIT.toString(),
          sortBy: 'submittedAt',
          sortOrder: 'desc',
        });
        const res = await fetch(`/api/admin/event-signups?${params}`);
        if (!res.ok) throw new Error('Failed to fetch submissions');
        const data = await res.json();
        setAllSubmissions(data.signups || []);
      } catch (e) {
        toast({ title: 'Error', description: 'Failed to load submissions', variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [eventId, toast]);

  const matchesSearch = (s: Signup, q: string): boolean => {
    if (!q.trim()) return true;
    const lower = q.trim().toLowerCase();
    if (s.confirmationNumber?.toLowerCase().includes(lower)) return true;
    if (s.userEmail?.toLowerCase().includes(lower)) return true;
    if (s.userName?.toLowerCase().includes(lower)) return true;
    if (s.formData?.some((f) => String(f.value).toLowerCase().includes(lower))) return true;
    return false;
  };

  const filteredAndSorted = useMemo(() => {
    let list = allSubmissions;
    if (statusFilter && statusFilter !== 'all') {
      list = list.filter((s) => s.status === statusFilter);
    }
    if (searchQuery.trim()) {
      list = list.filter((s) => matchesSearch(s, searchQuery));
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'submittedAt') {
        cmp = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      } else {
        cmp = (a.confirmationNumber || '').localeCompare(b.confirmationNumber || '');
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [allSubmissions, statusFilter, searchQuery, sortBy, sortOrder]);

  const totalFiltered = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const pageIndex = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedSubmissions = useMemo(
    () => filteredAndSorted.slice((pageIndex - 1) * PAGE_SIZE, pageIndex * PAGE_SIZE),
    [filteredAndSorted, pageIndex]
  );

  useEffect(() => {
    if (totalPages >= 1 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

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
    : (paginatedSubmissions[0]?.formData?.map((f) => f.name) || []);

  const handleFilterChange = (updates: { search?: string; status?: string; sortBy?: typeof sortBy; sortOrder?: typeof sortOrder }) => {
    if (updates.search !== undefined) setSearchQuery(updates.search);
    if (updates.status !== undefined) setStatusFilter(updates.status);
    if (updates.sortBy !== undefined) setSortBy(updates.sortBy);
    if (updates.sortOrder !== undefined) setSortOrder(updates.sortOrder);
    setCurrentPage(1);
  };

  return (
    <div className="pt-16 space-y-6 max-w-6xl mx-auto px-4">
      <Toaster />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">
            {eventTitle}
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            {locale === 'en' ? 'Event signup submissions' : 'הגשות הרשמה לאירוע'} · {totalFiltered} {locale === 'en' ? 'shown' : 'מוצג'} {searchQuery || statusFilter !== 'all' ? `(${locale === 'en' ? 'filtered from' : 'מתוך'} ${allSubmissions.length})` : ''}
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
      ) : allSubmissions.length === 0 ? (
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
            <div className="flex flex-col gap-4">
              <CardTitle>{locale === 'en' ? 'Submissions' : 'הגשות'}</CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  type="search"
                  placeholder={locale === 'en' ? 'Search confirmation #, email, name...' : 'חיפוש מספר אימות, אימייל, שם...'}
                  value={searchQuery}
                  onChange={(e) => handleFilterChange({ search: e.target.value })}
                  className="max-w-xs"
                />
                <SelectWrapper
                  value={statusFilter}
                  onChange={(e) => handleFilterChange({ status: e.target.value })}
                  options={[
                    { value: 'all', label: locale === 'en' ? 'All statuses' : 'כל הסטטוסים' },
                    { value: 'confirmed', label: 'Confirmed' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                  className="w-40"
                />
                <SelectWrapper
                  value={sortBy}
                  onChange={(e) => handleFilterChange({ sortBy: e.target.value as typeof sortBy })}
                  options={[
                    { value: 'submittedAt', label: locale === 'en' ? 'Date' : 'תאריך' },
                    { value: 'confirmationNumber', label: locale === 'en' ? 'Confirmation #' : 'מספר אימות' },
                  ]}
                  className="w-36"
                />
                <Button
                  variant="gray"
                  size="sm"
                  onClick={() => handleFilterChange({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' })}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {totalFiltered === 0 ? (
              <p className="text-center py-8 text-text-secondary dark:text-text-secondary-dark">
                {locale === 'en' ? 'No submissions match your filters.' : 'אין הגשות התואמות את הסינון.'}
              </p>
            ) : (
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
                  {paginatedSubmissions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark">
                        {formatDate(s.submittedAt)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{formatConfirmationNumber(s.confirmationNumber)}</TableCell>
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
            )}

            {totalFiltered > 0 && totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-text-secondary dark:text-text-secondary-dark">
                  {locale === 'en'
                    ? `Showing ${(pageIndex - 1) * PAGE_SIZE + 1} to ${Math.min(pageIndex * PAGE_SIZE, totalFiltered)} of ${totalFiltered}`
                    : `מציג ${(pageIndex - 1) * PAGE_SIZE + 1} עד ${Math.min(pageIndex * PAGE_SIZE, totalFiltered)} מתוך ${totalFiltered}`}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={pageIndex === 1}
                  >
                    {locale === 'en' ? 'Previous' : 'הקודם'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={pageIndex >= totalPages}
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
