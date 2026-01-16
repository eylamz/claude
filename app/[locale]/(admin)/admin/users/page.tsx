'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardContent, SelectWrapper, Skeleton, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui';
import { SearchInput } from '@/components/common/SearchInput';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'user' | 'editor' | 'admin';
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
  addresses: any[];
  orderCount: number;
  lastLogin: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: Date;
  details: string;
}

export default function UsersPage() {
  const locale = useLocale();
  const router = useRouter();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
  });
  const [viewDetailsModal, setViewDetailsModal] = useState<string | null>(null);
  const [activityLogVisible, setActivityLogVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 when filters change (excluding status - it's client-side)
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [role, dateFrom, dateTo]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch a large batch of users for client-side filtering
      // We'll paginate client-side after filtering
      const params = new URLSearchParams({
        page: '1',
        limit: '1000', // Fetch a large batch for client-side filtering
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(role && { role }),
        // Status filter is now client-side, so we don't send it to the API
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setAllUsers(data.users);
      // Store the total count from server for reference
      // We'll recalculate pagination client-side after filtering
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, role, dateFrom, dateTo]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Client-side filtering by status and pagination
  useEffect(() => {
    let filtered = [...allUsers];

    // Apply status filter
    if (status === 'active') {
      filtered = filtered.filter(user => user.emailVerified === true);
    } else if (status === 'pending') {
      filtered = filtered.filter(user => user.emailVerified === false);
    }
    // If status is empty or 'all', show all users

    // Update pagination based on filtered results
    const totalFiltered = filtered.length;
    const totalPages = Math.ceil(totalFiltered / pagination.limit) || 1;
    const currentPage = Math.min(pagination.currentPage, Math.max(1, totalPages));
    
    // Apply pagination to filtered results
    const startIndex = (currentPage - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const paginatedUsers = filtered.slice(startIndex, endIndex);

    setUsers(paginatedUsers);
    setPagination(prev => ({
      ...prev,
      currentPage,
      totalPages,
      totalCount: totalFiltered,
    }));
  }, [allUsers, status, pagination.limit, pagination.currentPage]);

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
    if (selectedItems.size === users.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(users.map(u => u.id)));
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates: { role: newRole } }),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleBulkRoleChange = (newRole: string) => {
    if (selectedItems.size === 0) return;
    if (confirm(`Change role to ${newRole} for ${selectedItems.size} selected user(s)?`)) {
      console.log('Bulk role change:', Array.from(selectedItems), newRole);
      setSelectedItems(new Set());
    }
  };

  const handleSendBulkEmail = () => {
    if (selectedItems.size === 0) return;
    alert(`Send bulk email to ${selectedItems.size} users - Implementation needed`);
  };

  const handleExportCSV = () => {
    // Convert users to CSV
    const headers = ['Name', 'Email', 'Role', 'Registration Date', 'Last Login', 'Order Count', 'Status'];
    const rows = users.map(u => [
      u.fullName,
      u.email,
      u.role,
      new Date(u.createdAt).toLocaleDateString(),
      new Date(u.lastLogin).toLocaleDateString(),
      u.orderCount.toString(),
      u.emailVerified ? 'Active' : 'Pending',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (userId: string, userName: string) => {
    if (confirm(`Delete user ${userName}? This action cannot be undone.`)) {
      fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' })
        .then(response => {
          if (response.ok) {
            fetchUsers();
          }
        })
        .catch(error => console.error('Error deleting user:', error));
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
      editor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400',
      user: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300',
    };
    return colors[role] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
  };

  const getStatusColor = (emailVerified: boolean) => {
    return emailVerified
      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="pt-16 space-y-6 w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">Users Management</h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="gray"
            className="flex items-center gap-1"
            onClick={async () => {
              setIsRefreshing(true);
              await fetchUsers();
              setIsRefreshing(false);
            }}
            title="Refresh data"
            disabled={isRefreshing}
          >
            Refresh
            <svg 
              className={`w-4 h-4 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
          <Button variant="secondary" onClick={() => setActivityLogVisible(!activityLogVisible)}>
            View Activity Log
          </Button>
          <Button variant="brand" onClick={() => router.push(`/${locale}/admin/users/new`)}>
            Add User
          </Button>
        </div>
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
                placeholder="Search by name or email..."
                className="!max-w-full"
              />
            </div>
            <div className="flex gap-2">
              <div className="">
                <SelectWrapper
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  options={[
                    { value: '', label: 'All Roles' },
                    { value: 'user', label: 'User' },
                    { value: 'editor', label: 'Editor' },
                    { value: 'admin', label: 'Admin' },
                  ]}
                />
              </div>
              <div className="">
                <SelectWrapper
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPagination(prev => ({ ...prev, currentPage: 1 }));
                  }}
                  options={[
                    { value: '', label: 'All Users' },
                    { value: 'active', label: 'Active' },
                    { value: 'pending', label: 'Pending Verification' },
                    { value: 'banned', label: 'Banned' },
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
                {selectedItems.size} user(s) selected
              </p>
              <div className="flex items-center gap-2">
                <SelectWrapper
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleBulkRoleChange(e.target.value);
                  }}
                  options={[
                    { value: '', label: 'Change Role' },
                    { value: 'user', label: 'Set as User' },
                    { value: 'editor', label: 'Set as Editor' },
                    { value: 'admin', label: 'Set as Admin' },
                  ]}
                />
                <Button variant="secondary" onClick={handleSendBulkEmail}>
                  Send Bulk Email
                </Button>
                <Button variant="destructive" onClick={() => console.log('Bulk delete')}>
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Checkbox
                variant="brand"
                id="select-all"
                checked={selectedItems.size === users.length && users.length > 0}
                onChange={() => toggleSelectAll()}
                label=""
              />
            </TableHead>
            <TableHead>
              Email
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Name
            </TableHead>
            <TableHead>
              Role
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Registered
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Last Login
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Orders
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Status
            </TableHead>
            <TableHead>
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 9 }).map((_, j) => (
                  <TableCell key={j} className="whitespace-nowrap">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-12 text-text-secondary dark:text-text-secondary-dark">
                No users found
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="whitespace-nowrap px-4 md:px-6 md:py-3">
                  <Checkbox
                    variant="brand"
                    id={`select-${user.id}`}
                    checked={selectedItems.has(user.id)}
                    onChange={() => toggleSelection(user.id)}
                    label=""
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <span className="text-sm text-text-secondary dark:text-text-secondary-dark">{user.email}</span>
                    {!user.emailVerified && (
                      <span className="inline-block mt-1 ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-orange-bg dark:bg-orange-bg-dark text-orange dark:text-orange-dark">
                        Not Verified
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <button
                    onClick={() => setViewDetailsModal(user.id)}
                    className="text-sm font-medium text-brand-main dark:text-brand-dark hover:underline"
                  >
                    {user.fullName}
                  </button>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <SelectWrapper
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    options={[
                      { value: 'user', label: 'User' },
                      { value: 'editor', label: 'Editor' },
                      { value: 'admin', label: 'Admin' },
                    ]}
                  />
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark">
                  {formatDate(user.createdAt)}
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark">
                  {formatDate(user.lastLogin)}
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark text-center">
                  {user.orderCount}
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.emailVerified)}`}>
                    {user.emailVerified ? 'Active' : 'Pending'}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-text-secondary dark:text-text-secondary-dark hover:text-text dark:hover:text-text-dark">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewDetailsModal(user.id)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/${locale}/admin/orders?user=${user.id}`)}>
                        View Orders
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/${locale}/admin/users/${user.id}`)}>
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(user.id, user.fullName)}>
                        Delete User
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
            {pagination.totalCount} users
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

      {/* User Details Modal */}
      {viewDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70">
          <div className="bg-background dark:bg-background-dark rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-text dark:text-text-dark">User Details</h2>
                <button
                  onClick={() => setViewDetailsModal(null)}
                  className="text-text-secondary dark:text-text-secondary-dark hover:text-text dark:hover:text-text-dark"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {(() => {
                const user = users.find(u => u.id === viewDetailsModal);
                if (!user) return null;
                
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">Full Name</label>
                        <p className="text-text dark:text-text-dark">{user.fullName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">Email</label>
                        <p className="text-text dark:text-text-dark">{user.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">Role</label>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                          {user.role.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">Status</label>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.emailVerified)}`}>
                          {user.emailVerified ? 'Active' : 'Pending'}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">Registration Date</label>
                        <p className="text-text dark:text-text-dark">{formatDate(user.createdAt)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">Last Login</label>
                        <p className="text-text dark:text-text-dark">{formatDate(user.lastLogin)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">Order Count</label>
                        <p className="text-text dark:text-text-dark">{user.orderCount}</p>
                      </div>
                    </div>

                    {user.addresses && user.addresses.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">Addresses</label>
                        <div className="space-y-2">
                          {user.addresses.map((addr, index) => (
                            <div key={index} className="border border-border dark:border-border-dark rounded p-3">
                              <p className="font-medium text-text dark:text-text-dark">{addr.name}</p>
                              <p className="text-sm text-text-secondary dark:text-text-secondary-dark">{addr.street}</p>
                              <p className="text-sm text-text-secondary dark:text-text-secondary-dark">{addr.city}, {addr.country} {addr.zip}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-border dark:border-border-dark">
                      <Button variant="secondary" onClick={() => setViewDetailsModal(null)}>
                        Close
                      </Button>
                      <Button variant="brand" onClick={() => {
                        setViewDetailsModal(null);
                        router.push(`/${locale}/admin/users/${user.id}`);
                      }}>
                        Edit User
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Activity Log */}
      {activityLogVisible && (
        <Card className="bg-card dark:bg-card-dark">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text dark:text-text-dark">Activity Log</h2>
              <button
                onClick={() => setActivityLogVisible(false)}
                className="text-text-secondary dark:text-text-secondary-dark hover:text-text dark:hover:text-text-dark"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {/* Placeholder activity log items */}
              <div className="flex items-start justify-between py-2 border-b border-border dark:border-border-dark">
                <div>
                  <p className="font-medium text-text dark:text-text-dark">User created account</p>
                  <p className="text-sm text-text-secondary dark:text-text-secondary-dark">2 days ago</p>
                </div>
              </div>
              <div className="flex items-start justify-between py-2 border-b border-border dark:border-border-dark">
                <div>
                  <p className="font-medium text-text dark:text-text-dark">Order #123 placed</p>
                  <p className="text-sm text-text-secondary dark:text-text-secondary-dark">5 days ago</p>
                </div>
              </div>
              <p className="text-sm text-text-secondary dark:text-text-secondary-dark italic">More activity entries would appear here...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}



