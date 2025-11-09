'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import {
  MapPin,
  Home,
  Building2,
  MoreHorizontal,
  Edit,
  Trash2,
  Star,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

type AddressType = 'home' | 'work' | 'other';

interface Address {
  type: AddressType;
  name: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow ${
      type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
    }`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-gray-500 hover:text-gray-700">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function AddressCard({
  address,
  index,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: Address;
  index: number;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onSetDefault: (index: number) => void;
}) {
  const TypeIcon = address.type === 'home' ? Home : address.type === 'work' ? Building2 : MapPin;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <TypeIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{address.name}</h3>
                {address.isDefault && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <Star className="w-3.5 h-3.5" /> Default
                  </span>
                )}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mt-1">
                {address.street}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                {address.city}, {address.zip}
              </p>
              <p className="text-gray-700 dark:text-gray-300">{address.country}</p>
              {address.phone && (
                <p className="text-gray-600 dark:text-gray-400 mt-2">Phone: {address.phone}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!address.isDefault && (
              <Button variant="outline" size="sm" onClick={() => onSetDefault(index)}>
                Set Default
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onEdit(index)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(index)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddressFormModal({
  isOpen,
  onClose,
  onSave,
  initial,
  mobileFullScreen,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (addr: Address) => void;
  initial?: Address;
  mobileFullScreen?: boolean;
}) {
  const [form, setForm] = useState<Address>(
    initial || {
      type: 'home',
      name: '',
      street: '',
      city: '',
      zip: '',
      country: '',
      phone: '',
      isDefault: false,
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name) e.name = 'Required';
    if (!form.street) e.street = 'Required';
    if (!form.city) e.city = 'Required';
    if (!form.zip) e.zip = 'Required';
    if (!form.country) e.country = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={`fixed inset-0 flex items-center justify-center p-4 ${mobileFullScreen ? 'lg:items-center' : ''}`}>
        <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full ${mobileFullScreen ? 'h-full lg:h-auto lg:max-w-2xl' : 'max-w-2xl'} overflow-y-auto`}>
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{initial ? 'Edit Address' : 'Add New Address'}</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as AddressType })}
                options={[
                  { value: 'home', label: 'Home' },
                  { value: 'work', label: 'Work' },
                  { value: 'other', label: 'Other' },
                ]}
              />
              <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
              <Input label="Street Address" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} error={errors.street} />
              <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} error={errors.city} />
              <Input label="ZIP / Postal" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} error={errors.zip} />
              <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} error={errors.country} />
              <Input label="Phone (optional)" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="w-4 h-4" />
              <span className="text-sm">Set as default</span>
            </label>
          </div>
          <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit}>Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddressesPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split('/')[1] || 'en';

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const canAddMore = useMemo(() => (addresses?.length || 0) < 5, [addresses]);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/account/addresses');
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/${locale}/login`);
          return;
        }
        throw new Error('Failed to load addresses');
      }
      const data = await res.json();
      setAddresses(data.addresses || []);
    } catch (e) {
      console.error(e);
      setToast({ message: 'Failed to load addresses', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleSave = async (addr: Address) => {
    try {
      const isEdit = editIndex !== null;
      if (isEdit) {
        const res = await fetch('/api/account/addresses', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index: editIndex, update: addr, setDefault: addr.isDefault }),
        });
        if (!res.ok) throw new Error('Update failed');
        const data = await res.json();
        setAddresses(data.addresses);
        setToast({ message: 'Address updated', type: 'success' });
      } else {
        const res = await fetch('/api/account/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(addr),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Create failed');
        }
        const data = await res.json();
        setAddresses(data.addresses);
        setToast({ message: 'Address added', type: 'success' });
      }
      setShowForm(false);
      setEditIndex(null);
    } catch (e: any) {
      setToast({ message: e.message || 'Save failed', type: 'error' });
    }
  };

  const handleDelete = async (index: number) => {
    if (!confirm('Delete this address?')) return;
    try {
      const res = await fetch(`/api/account/addresses?index=${index}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      const data = await res.json();
      setAddresses(data.addresses);
      setToast({ message: 'Address deleted', type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message || 'Delete failed', type: 'error' });
    }
  };

  const handleSetDefault = async (index: number) => {
    try {
      const res = await fetch('/api/account/addresses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index, setDefault: true }),
      });
      if (!res.ok) throw new Error('Failed to set default');
      const data = await res.json();
      setAddresses(data.addresses);
      setToast({ message: 'Default address set', type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message || 'Action failed', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen  pb-16 lg:pb-0">
      <div className="max-w-5xl mx-auto p-4 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Address Book</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your shipping addresses</p>
          </div>
          <Button onClick={() => { setShowForm(true); setEditIndex(null); }} disabled={!canAddMore}>
            <Plus className="w-4 h-4 mr-2" />
            Add Address
          </Button>
        </div>

        {!canAddMore && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-lg text-sm">
            You have reached the maximum of 5 addresses.
          </div>
        )}

        {/* Addresses Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <Card key={i}>
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No addresses yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Add your first address to speed up checkout.</p>
              <Button onClick={() => { setShowForm(true); setEditIndex(null); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Address
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr, idx) => (
              <AddressCard
                key={`${addr.name}-${idx}`}
                address={addr}
                index={idx}
                onEdit={(i) => { setEditIndex(i); setShowForm(true); }}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Modal (full-screen on mobile) */}
      <AddressFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditIndex(null); }}
        onSave={handleSave}
        initial={editIndex !== null ? addresses[editIndex] : undefined}
        mobileFullScreen
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}



