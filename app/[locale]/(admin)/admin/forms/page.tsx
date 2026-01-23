'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardContent, Skeleton, SelectWrapper, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Toaster } from '@/components/ui';
import { SearchInput } from '@/components/common/SearchInput';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

interface Form {
  id: string;
  slug: string;
  title: {
    en: string;
    he: string;
  };
  description: {
    en: string;
    he: string;
  };
  fields: any[];
  status: string;
  visibleFrom: string | null;
  visibleUntil: string | null;
  submissionsCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

export default function FormsPage() {
  const locale = useLocale();
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewPopoverOpen, setViewPopoverOpen] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [bulkOperation, setBulkOperation] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Toast hook
  const { toast } = useToast();

  // Refs to prevent duplicate API calls
  const isFetchingRef = useRef(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [status, sortBy, sortOrder]);

  const fetchForms = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(status && status !== 'all' && { status }),
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/admin/forms?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch forms');

      const data = await response.json();
      setForms(data.forms);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch forms',
        variant: 'error',
      });
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [pagination.currentPage, pagination.limit, debouncedSearch, status, sortBy, sortOrder, toast]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === forms.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(forms.map(f => f.id)));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedItems.size === 0) return;

    const actionLabels: Record<string, string> = {
      'publish': 'publish',
      'archive': 'archive',
      'delete': 'delete',
    };

    const actionLabel = actionLabels[action] || action;
    const confirmMessage = action === 'delete'
      ? `Are you sure you want to delete ${selectedItems.size} selected form(s)? This action cannot be undone.`
      : `Are you sure you want to ${actionLabel} ${selectedItems.size} selected form(s)?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setBulkOperation(action);
    const formIds = Array.from(selectedItems);
    const results = { success: 0, failed: 0 };
    const errors: string[] = [];

    try {
      if (action === 'delete') {
        for (const formId of formIds) {
          try {
            const response = await fetch(`/api/admin/forms/${formId}`, {
              method: 'DELETE',
            });

            if (response.ok) {
              results.success++;
            } else {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to delete form');
            }
          } catch (error) {
            results.failed++;
            const form = forms.find(f => f.id === formId);
            errors.push(form ? form.title.en : formId);
            console.error(`Error deleting form ${formId}:`, error);
          }
        }

        setForms(prevForms => prevForms.filter(form => !formIds.includes(form.id)));
      } else if (action === 'publish' || action === 'archive') {
        const newStatus = action === 'publish' ? 'published' : 'archived';

        for (const formId of formIds) {
          try {
            const response = await fetch(`/api/admin/forms/${formId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
              results.success++;
            } else {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to update form');
            }
          } catch (error) {
            results.failed++;
            const form = forms.find(f => f.id === formId);
            errors.push(form ? form.title.en : formId);
            console.error(`Error updating form ${formId}:`, error);
          }
        }

        setForms(prevForms =>
          prevForms.map(form =>
            formIds.includes(form.id) ? { ...form, status: newStatus } : form
          )
        );
      }

      if (results.failed > 0) {
        toast({
          title: 'Partial Success',
          description: `Completed: ${results.success} succeeded, ${results.failed} failed. Failed forms: ${errors.join(', ')}`,
          variant: 'warning',
        });
      } else {
        toast({
          title: 'Success',
          description: `Successfully ${actionLabel}ed ${results.success} form(s).`,
          variant: 'success',
        });
      }

      fetchForms();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast({
        title: 'Error',
        description: `Error performing bulk action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'error',
      });
    } finally {
      setBulkOperation(null);
      setSelectedItems(new Set());
    }
  };

  const handleStatusChange = async (formId: string, newStatus: string) => {
    try {
      setUpdatingStatus(formId);
      const response = await fetch(`/api/admin/forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      setForms(prevForms =>
        prevForms.map(form =>
          form.id === formId ? { ...form, status: newStatus } : form
        )
      );
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'error',
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDeleteForm = async (formId: string, formTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${formTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setUpdatingStatus(formId);
      const response = await fetch(`/api/admin/forms/${formId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete form');
      }

      setForms(prevForms => prevForms.filter(form => form.id !== formId));

      if (viewPopoverOpen === formId) {
        setViewPopoverOpen(null);
      }

      fetchForms();
    } catch (error) {
      console.error('Error deleting form:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete form',
        variant: 'error',
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300',
      published: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      archived: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isFormVisible = (form: Form) => {
    if (form.status !== 'published') return false;
    const now = new Date();
    if (form.visibleFrom && new Date(form.visibleFrom) > now) return false;
    if (form.visibleUntil && new Date(form.visibleUntil) < now) return false;
    return true;
  };

  return (
    <div className="pt-16 space-y-6">
      <Toaster />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">Forms</h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Manage forms and submissions
          </p>
        </div>
        <Button variant="green" onClick={() => router.push(`/${locale}/admin/forms/new`)}>
          Create Form
        </Button>
      </div>

      {/* Filters */}
      <Card className="!p-0 bg-card dark:bg-card-dark">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                placeholder="Search by title..."
                className="!max-w-full"
              />
            </div>
            <div className="flex gap-2">
              <div className="">
                <SelectWrapper
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'published', label: 'Published' },
                    { value: 'archived', label: 'Archived' },
                  ]}
                />
              </div>
              <div className="">
                <SelectWrapper
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  options={[
                    { value: 'createdAt-desc', label: 'Newest First' },
                    { value: 'createdAt-asc', label: 'Oldest First' },
                    { value: 'submissionsCount-desc', label: 'Most Submissions' },
                    { value: 'submissionsCount-asc', label: 'Least Submissions' },
                  ]}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <Card className="bg-card dark:bg-card-dark">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text dark:text-text-dark">
                {selectedItems.size} form(s) selected
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="orange"
                  onClick={() => handleBulkAction('publish')}
                  disabled={!!bulkOperation}
                >
                  {bulkOperation === 'publish' ? 'Publishing...' : 'Publish'}
                </Button>
                <Button
                  variant="gray"
                  onClick={() => handleBulkAction('archive')}
                  disabled={!!bulkOperation}
                >
                  {bulkOperation === 'archive' ? 'Archiving...' : 'Archive'}
                </Button>
                <Button
                  variant="red"
                  onClick={() => handleBulkAction('delete')}
                  disabled={!!bulkOperation}
                >
                  {bulkOperation === 'delete' ? 'Deleting...' : 'Delete Selected'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forms Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Checkbox
                variant="brand"
                id="select-all"
                checked={selectedItems.size === forms.length && forms.length > 0}
                onChange={() => toggleSelectAll()}
                label=""
              />
            </TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="hidden md:table-cell">Fields</TableHead>
            <TableHead className="hidden md:table-cell">Submissions</TableHead>
            <TableHead className="hidden md:table-cell">Visibility</TableHead>
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j} className="whitespace-nowrap">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : forms.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-text-secondary dark:text-text-secondary-dark">
                No forms found
              </TableCell>
            </TableRow>
          ) : (
            forms.map((form) => (
              <TableRow key={form.id}>
                <TableCell className="whitespace-nowrap px-4 md:px-6 md:py-3">
                  <Checkbox
                    variant="brand"
                    id={`select-${form.id}`}
                    checked={selectedItems.has(form.id)}
                    onChange={() => toggleSelection(form.id)}
                    label=""
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <button
                      onClick={() => router.push(`/${locale}/admin/forms/${form.id}/edit`)}
                      className="text-sm font-medium text-brand-main dark:text-brand-dark hover:underline"
                    >
                      {form.title[locale as 'en' | 'he'] || form.title.en}
                    </button>
                    <div className="text-xs text-text-secondary dark:text-text-secondary-dark">
                      {form.description[locale as 'en' | 'he'] || form.description.en}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark">
                  {form.fields?.length || 0} field(s)
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark">
                  {form.submissionsCount.toLocaleString()}
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark">
                  <div className="flex flex-col gap-1">
                    {form.visibleFrom && (
                      <span>From: {formatDate(form.visibleFrom)}</span>
                    )}
                    {form.visibleUntil && (
                      <span>Until: {formatDate(form.visibleUntil)}</span>
                    )}
                    {!form.visibleFrom && !form.visibleUntil && (
                      <span className="text-gray-400">Always visible</span>
                    )}
                    {isFormVisible(form) && (
                      <span className="text-green-600 dark:text-green-400 text-xs">● Active</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(form.status)}`}>
                    {form.status}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm font-medium">
                  <Popover open={viewPopoverOpen === form.id} onOpenChange={(open) => setViewPopoverOpen(open ? form.id : null)}>
                    <PopoverContent className="w-96 p-0" align="end">
                      <div className="p-4 space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold text-text dark:text-text-dark">{form.title.en}</h3>
                          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">{form.title.he}</p>
                        </div>

                        <div>
                          <p className="text-sm text-text-secondary dark:text-text-secondary-dark line-clamp-3">{form.description.en}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border dark:border-border-dark">
                          <div>
                            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Fields</p>
                            <p className="text-sm font-medium text-text dark:text-text-dark">{form.fields?.length || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Submissions</p>
                            <p className="text-sm font-medium text-text dark:text-text-dark">{form.submissionsCount.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-border dark:border-border-dark">
                          <div>
                            <p className="text-xs text-text-secondary dark:text-text-secondary-dark mb-1">Visibility</p>
                            {form.visibleFrom && (
                              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">From: {formatDate(form.visibleFrom)}</p>
                            )}
                            {form.visibleUntil && (
                              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Until: {formatDate(form.visibleUntil)}</p>
                            )}
                            {!form.visibleFrom && !form.visibleUntil && (
                              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Always visible</p>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border dark:border-border-dark">
                          <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
                            Status
                          </label>
                          <SelectWrapper
                            value={form.status}
                            onChange={(e) => {
                              handleStatusChange(form.id, e.target.value);
                              setViewPopoverOpen(null);
                            }}
                            options={[
                              { value: 'draft', label: 'Draft' },
                              { value: 'published', label: 'Published' },
                              { value: 'archived', label: 'Archived' },
                            ]}
                          />
                        </div>

                        <div className="flex flex-col gap-2 pt-2 border-t border-border dark:border-border-dark">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setViewPopoverOpen(null);
                              router.push(`/${locale}/admin/forms/${form.id}/edit`);
                            }}
                          >
                            Edit Form
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setViewPopoverOpen(null);
                              router.push(`/${locale}/admin/forms/${form.id}/submissions`);
                            }}
                          >
                            View Submissions
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setViewPopoverOpen(null);
                              handleDeleteForm(form.id, form.title.en);
                            }}
                            disabled={updatingStatus === form.id}
                          >
                            {updatingStatus === form.id ? 'Deleting...' : 'Delete Form'}
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="text-text-secondary dark:text-text-secondary-dark hover:text-text dark:hover:text-text-dark">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/${locale}/admin/forms/${form.id}/edit`)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/${locale}/admin/forms/${form.id}/submissions`)}>
                        View Submissions
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteForm(form.id, form.title.en)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-text-secondary dark:text-text-secondary-dark">
            Showing {(pagination.currentPage - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of{' '}
            {pagination.totalCount} forms
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
              disabled={pagination.currentPage === 1}
            >
              Previous
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
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
