'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Toaster } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';

interface FormSubmission {
  id: string;
  formId: string;
  formSlug: string;
  answers: Array<{
    fieldId: string;
    question: { en: string; he: string };
    answer: any;
    fieldType: string;
  }>;
  submittedAt: string;
  createdAt: string;
}

interface Form {
  id: string;
  slug: string;
  title: {
    en: string;
    he: string;
  };
  fields: Array<{
    id: string;
    label: { en: string; he: string };
    type: string;
  }>;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

export default function FormSubmissionsPage() {
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
  });

  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch form
        const formResponse = await fetch(`/api/admin/forms/${id}`);
        if (!formResponse.ok) throw new Error('Failed to fetch form');
        const formData = await formResponse.json();
        setForm(formData.form);

        // Fetch submissions
        const submissionsResponse = await fetch(`/api/admin/forms/${id}/submissions?page=${pagination.currentPage}&limit=${pagination.limit}`);
        if (!submissionsResponse.ok) throw new Error('Failed to fetch submissions');
        const submissionsData = await submissionsResponse.json();
        setSubmissions(submissionsData.submissions);
        setPagination(submissionsData.pagination);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load submissions',
          variant: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, pagination.currentPage, pagination.limit, toast]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(locale === 'he' ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFieldLabel = (fieldId: string) => {
    if (!form) return fieldId;
    const field = form.fields.find(f => f.id === fieldId);
    return field ? (field.label[locale as 'en' | 'he'] || field.label.en) : fieldId;
  };

  const formatAnswer = (answer: any, fieldType: string): string => {
    if (answer === null || answer === undefined) return 'N/A';
    
    if (typeof answer === 'object' && answer.value === 'other') {
      return `${locale === 'en' ? 'Other' : 'אחר'}: ${answer.other || ''}`;
    }
    
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    
    return String(answer);
  };

  if (loading) {
    return (
      <div className="pt-16 space-y-6 max-w-6xl mx-auto px-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="pt-16 space-y-6 max-w-6xl mx-auto px-4">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-text-secondary dark:text-text-secondary-dark">
              Form not found
            </p>
            <Button variant="blue" onClick={() => router.push(`/${locale}/admin/forms`)} className="mt-4">
              Back to Forms
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="pt-16 space-y-6 max-w-6xl mx-auto px-4">
      <Toaster />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">
            {form.title[locale as 'en' | 'he'] || form.title.en}
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            {pagination.totalCount} {locale === 'en' ? 'submissions' : 'הגשות'}
          </p>
        </div>
        <Button variant="gray" onClick={() => router.push(`/${locale}/admin/forms/${id}/edit`)}>
          {locale === 'en' ? 'Edit Form' : 'ערוך טופס'}
        </Button>
      </div>

      {/* Submissions Table */}
      {submissions.length === 0 ? (
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
                    <TableHead>{locale === 'en' ? 'Submitted At' : 'נשלח ב'}</TableHead>
                    {form.fields
                      .sort((a, b) => a.order - b.order)
                      .map((field) => (
                        <TableHead key={field.id} className="min-w-[150px]">
                          {field.label[locale as 'en' | 'he'] || field.label.en}
                        </TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark">
                        {formatDate(submission.submittedAt)}
                      </TableCell>
                      {form.fields
                        .sort((a, b) => a.order - b.order)
                        .map((field) => {
                          const answer = submission.answers.find(a => a.fieldId === field.id);
                          return (
                            <TableCell key={field.id} className="max-w-xs">
                              <div className="text-sm text-text dark:text-text-dark truncate" title={formatAnswer(answer?.answer, answer?.fieldType || '')}>
                                {answer ? formatAnswer(answer.answer, answer.fieldType) : '-'}
                              </div>
                            </TableCell>
                          );
                        })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-text-secondary dark:text-text-secondary-dark">
                  {locale === 'en'
                    ? `Showing ${(pagination.currentPage - 1) * pagination.limit + 1} to ${Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of ${pagination.totalCount} submissions`
                    : `מציג ${(pagination.currentPage - 1) * pagination.limit + 1} עד ${Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} מתוך ${pagination.totalCount} הגשות`}
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
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1)
                      .map((page) => (
                        <button
                          key={page}
                          onClick={() => setPagination({ ...pagination, currentPage: page })}
                          className={`px-3 py-1 text-sm rounded ${
                            page === pagination.currentPage
                              ? 'bg-blue-600 dark:bg-blue-500 text-white'
                              : 'bg-white dark:bg-gray-700 text-text-secondary dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage + 1 })}
                    disabled={pagination.currentPage === pagination.totalPages}
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
