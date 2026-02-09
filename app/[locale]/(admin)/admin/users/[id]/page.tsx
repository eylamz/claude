'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, SelectWrapper, Skeleton } from '@/components/ui';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'user' | 'editor' | 'admin';
  emailVerified: boolean;
  addresses: Array<{
    type: 'home' | 'work' | 'other';
    name: string;
    street: string;
    city: string;
    zip: string;
    country: string;
    phone?: string;
    isDefault: boolean;
  }>;
  preferences: {
    language: 'en' | 'he';
    colorMode: 'light' | 'dark' | 'system';
    emailMarketing: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const id = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/users/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('User not found');
        } else {
          setError('Failed to fetch user');
        }
        return;
      }
      const data = await response.json();
      setUser(data.user);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user');
      console.error('Error fetching user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      setError(null);
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          addresses: user.addresses,
          preferences: user.preferences,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      const data = await response.json();
      setUser(data.user);
      
      // Redirect back to users list
      router.push(`/${locale}/admin/users`);
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
      console.error('Error saving user:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Not Found</h1>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
          <Button variant="secondary" onClick={() => router.push(`/${locale}/admin/users`)}>
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
          <p className="text-sm text-gray-500 mt-1">
            Edit user account information
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" onClick={() => router.push(`/${locale}/admin/users`)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={user.fullName}
              onChange={(e) => setUser({ ...user, fullName: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={user.email}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectWrapper
              label="Role"
              value={user.role}
              onChange={(e: { target: { value: string } }) => setUser({ ...user, role: e.target.value as 'user' | 'editor' | 'admin' })}
              options={[
                { value: 'user', label: 'User' },
                { value: 'editor', label: 'Editor' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="emailVerified"
                checked={user.emailVerified}
                onChange={(e) => setUser({ ...user, emailVerified: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="emailVerified" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Verified
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectWrapper
              label="Language"
              value={user.preferences.language}
              onChange={(e: { target: { value: string } }) =>
                setUser({
                  ...user,
                  preferences: { ...user.preferences, language: e.target.value as 'en' | 'he' },
                })
              }
              options={[
                { value: 'en', label: 'English' },
                { value: 'he', label: 'Hebrew' },
              ]}
            />
            <SelectWrapper
              label="Color Mode"
              value={user.preferences.colorMode}
              onChange={(e: { target: { value: string } }) =>
                setUser({
                  ...user,
                  preferences: { ...user.preferences, colorMode: e.target.value as 'light' | 'dark' | 'system' },
                })
              }
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
            />
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="emailMarketing"
                checked={user.preferences.emailMarketing}
                onChange={(e) =>
                  setUser({
                    ...user,
                    preferences: { ...user.preferences, emailMarketing: e.target.checked },
                  })
                }
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="emailMarketing" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Marketing
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Addresses */}
      <Card>
        <CardHeader>
          <CardTitle>Addresses</CardTitle>
        </CardHeader>
        <CardContent>
          {user.addresses && user.addresses.length > 0 ? (
            <div className="space-y-4">
              {user.addresses.map((address, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <SelectWrapper
                      label="Type"
                      value={address.type}
                      onChange={(e: { target: { value: string } }) => {
                        const newAddresses = [...user.addresses];
                        newAddresses[index].type = e.target.value as 'home' | 'work' | 'other';
                        setUser({ ...user, addresses: newAddresses });
                      }}
                      options={[
                        { value: 'home', label: 'Home' },
                        { value: 'work', label: 'Work' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                    <Input
                      label="Name"
                      value={address.name}
                      onChange={(e) => {
                        const newAddresses = [...user.addresses];
                        newAddresses[index].name = e.target.value;
                        setUser({ ...user, addresses: newAddresses });
                      }}
                    />
                  </div>
                  <Input
                    label="Street"
                    value={address.street}
                    onChange={(e) => {
                      const newAddresses = [...user.addresses];
                      newAddresses[index].street = e.target.value;
                      setUser({ ...user, addresses: newAddresses });
                    }}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      label="City"
                      value={address.city}
                      onChange={(e) => {
                        const newAddresses = [...user.addresses];
                        newAddresses[index].city = e.target.value;
                        setUser({ ...user, addresses: newAddresses });
                      }}
                    />
                    <Input
                      label="ZIP Code"
                      value={address.zip}
                      onChange={(e) => {
                        const newAddresses = [...user.addresses];
                        newAddresses[index].zip = e.target.value;
                        setUser({ ...user, addresses: newAddresses });
                      }}
                    />
                    <Input
                      label="Country"
                      value={address.country}
                      onChange={(e) => {
                        const newAddresses = [...user.addresses];
                        newAddresses[index].country = e.target.value;
                        setUser({ ...user, addresses: newAddresses });
                      }}
                    />
                  </div>
                  {address.phone && (
                    <Input
                      label="Phone"
                      value={address.phone}
                      onChange={(e) => {
                        const newAddresses = [...user.addresses];
                        newAddresses[index].phone = e.target.value;
                        setUser({ ...user, addresses: newAddresses });
                      }}
                    />
                  )}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`isDefault-${index}`}
                      checked={address.isDefault}
                      onChange={(e) => {
                        const newAddresses = [...user.addresses];
                        // Only one address can be default
                        if (e.target.checked) {
                          newAddresses.forEach((addr, idx) => {
                            addr.isDefault = idx === index;
                          });
                        } else {
                          newAddresses[index].isDefault = false;
                        }
                        setUser({ ...user, addresses: newAddresses });
                      }}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor={`isDefault-${index}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Default Address
                    </label>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const newAddresses = user.addresses.filter((_, idx) => idx !== index);
                        setUser({ ...user, addresses: newAddresses });
                      }}
                      className="ml-auto"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No addresses added yet
            </p>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              const newAddresses = [
                ...user.addresses,
                {
                  type: 'home' as const,
                  name: '',
                  street: '',
                  city: '',
                  zip: '',
                  country: '',
                  isDefault: user.addresses.length === 0,
                },
              ];
              setUser({ ...user, addresses: newAddresses });
            }}
            className="mt-4"
          >
            + Add Address
          </Button>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">Created:</span>{' '}
            <span className="text-gray-600 dark:text-gray-400">
              {new Date(user.createdAt).toLocaleString()}
            </span>
          </div>
          <div className="text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">Last Updated:</span>{' '}
            <span className="text-gray-600 dark:text-gray-400">
              {new Date(user.updatedAt).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

