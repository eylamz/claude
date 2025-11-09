'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select, Dropdown, Skeleton } from '@/components/ui';

interface Trainer {
  id: string;
  slug: string;
  name: { en: string; he: string };
  area: string;
  relatedSports: string[];
  contactVisible: boolean;
  rating: number;
  totalReviews: number;
  approvedReviews: number;
  status: string;
  profileImage: string;
  isFeatured: boolean;
  linkedSkateparks: any[];
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

const SPORTS = [
  'Skateboarding',
  'BMX',
  'Scooter',
  'Longboarding',
  'Roller Skating',
  'Ski',
  'Snowboard',
];

export default function TrainersPage() {
  const locale = useLocale();
  const router = useRouter();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
  });
  const [reviewModalVisible, setReviewModalVisible] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [area, setArea] = useState('');
  const [sport, setSport] = useState('');

  const fetchTrainers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(status && { status }),
        ...(area && { area }),
        ...(sport && { sport }),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      const response = await fetch(`/api/admin/trainers?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch trainers');

      const data = await response.json();
      setTrainers(data.trainers);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching trainers:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.limit, search, status, area, sport]);

  useEffect(() => {
    fetchTrainers();
  }, [fetchTrainers]);

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
    if (selectedItems.size === trainers.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(trainers.map(t => t.id)));
    }
  };

  const handleStatusChange = async (trainerId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/trainers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerId, updates: { status: newStatus } }),
      });

      if (response.ok) {
        fetchTrainers();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedItems.size === 0) return;
    if (confirm(`Perform ${action} on ${selectedItems.size} selected trainer(s)?`)) {
      console.log(`Bulk action ${action}:`, Array.from(selectedItems));
      setSelectedItems(new Set());
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="text-sm text-gray-600 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trainers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage trainer profiles and reviews
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" onClick={() => setReviewModalVisible('moderation')}>
            Review Moderation
          </Button>
          <Button variant="primary" onClick={() => router.push(`/${locale}/admin/trainers/new`)}>
            Add Trainer
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                options={[
                  { value: '', label: 'All Areas' },
                  { value: 'north', label: 'North' },
                  { value: 'center', label: 'Center' },
                  { value: 'south', label: 'South' },
                ]}
              />
            </div>
            <div className="w-48">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'pending', label: 'Pending' },
                ]}
              />
            </div>
            <div className="w-48">
              <Select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                options={[
                  { value: '', label: 'All Sports' },
                  ...SPORTS.map(s => ({ value: s.toLowerCase(), label: s })),
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">
                {selectedItems.size} trainer(s) selected
              </p>
              <div className="flex items-center space-x-2">
                <Button variant="secondary" onClick={() => handleBulkAction('feature')}>
                  Feature/Unfeature
                </Button>
                <Button variant="secondary" onClick={() => handleBulkAction('activate')}>
                  Activate
                </Button>
                <Button variant="danger" onClick={() => handleBulkAction('delete')}>
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trainers Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === trainers.length && trainers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Area
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sports
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reviews
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : trainers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                      No trainers found
                    </td>
                  </tr>
                ) : (
                  trainers.map((trainer) => (
                    <tr key={trainer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(trainer.id)}
                          onChange={() => toggleSelection(trainer.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden">
                          <img
                            src={trainer.profileImage}
                            alt={trainer.name.en}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-trainer.jpg';
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => router.push(`/${locale}/admin/trainers/${trainer.id}`)}
                          className="text-left text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {trainer.name.en}
                        </button>
                        <div className="text-xs text-gray-500">{trainer.name.he}</div>
                        {trainer.isFeatured && (
                          <span className="mt-1 inline-block px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800">
                            Featured
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {trainer.area}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {trainer.relatedSports.slice(0, 2).map((sport) => (
                            <span key={sport} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {sport}
                            </span>
                          ))}
                          {trainer.relatedSports.length > 2 && (
                            <span className="text-xs text-gray-500">+{trainer.relatedSports.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {trainer.contactVisible ? (
                          <span className="text-green-600">
                            <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.736m0 0L21 21" />
                            </svg>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStars(trainer.rating)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="text-center">
                          <div>{trainer.approvedReviews}/{trainer.totalReviews}</div>
                          <div className="text-xs text-gray-400">approved</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(trainer.status)}`}>
                          {trainer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Dropdown
                          trigger={
                            <button className="text-gray-600 hover:text-gray-900">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>
                          }
                          options={[
                            {
                              label: 'View Details',
                              value: 'view',
                              onClick: () => router.push(`/${locale}/admin/trainers/${trainer.id}`),
                            },
                            {
                              label: 'Edit',
                              value: 'edit',
                              onClick: () => router.push(`/${locale}/admin/trainers/${trainer.id}/edit`),
                            },
                            {
                              label: trainer.isFeatured ? 'Unfeature' : 'Feature',
                              value: 'feature',
                              onClick: () => {
                                const updates = { isFeatured: !trainer.isFeatured };
                                fetch('/api/admin/trainers', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ trainerId: trainer.id, updates }),
                                }).then(() => fetchTrainers());
                              },
                            },
                            {
                              label: 'View Reviews',
                              value: 'reviews',
                              onClick: () => setReviewModalVisible(trainer.id),
                            },
                            {
                              label: 'Delete',
                              value: 'delete',
                              onClick: () => {
                                if (confirm(`Delete trainer ${trainer.name.en}?`)) {
                                  console.log('Delete:', trainer.id);
                                }
                              },
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(pagination.currentPage - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of{' '}
                {pagination.totalCount} trainers
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
                  disabled={pagination.currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1)
                    .map((page) => (
                      <button
                        key={page}
                        onClick={() => setPagination({ ...pagination, currentPage: page })}
                        className={`px-3 py-1 text-sm rounded ${
                          page === pagination.currentPage
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
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
        </CardContent>
      </Card>

      {/* Review Moderation Modal */}
      {reviewModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Review Moderation</h2>
                <button
                  onClick={() => setReviewModalVisible(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-500 mb-4">
                  Manage and approve user reviews for trainers.
                </p>
                
                {/* Pending Reviews */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Pending Reviews</h3>
                  <div className="border rounded-lg divide-y">
                    {trainers.flatMap(t => t.reviews || []).filter(r => !r.isApproved).length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        No pending reviews
                      </div>
                    ) : (
                      trainers.flatMap(t => (t.reviews || []).filter(r => !r.isApproved).map(r => ({
                        trainerId: t.id,
                        trainerName: t.name.en,
                        review: r,
                      }))).map((item, index) => (
                        <div key={index} className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{item.review.userName}</p>
                              <p className="text-sm text-gray-500">Review for: {item.trainerName}</p>
                              <div className="flex items-center mt-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <svg
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= item.review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                    }`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <p className="mt-2 text-sm text-gray-700">{item.review.comment}</p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => console.log('Approve review')}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => console.log('Reject review')}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



