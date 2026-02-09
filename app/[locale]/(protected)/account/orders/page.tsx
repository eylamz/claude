'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Package,
  Filter,
  X,
  Eye,
  Truck,
  RotateCw,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  Ban,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { SelectWrapper } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import type { OrderStatus } from '@/lib/db/models/Order';

interface OrderItem {
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string;
  sku: string;
  color: string;
  size: string;
  price: number;
  discountPrice?: number;
  quantity: number;
  imageUrl: string;
  subtotal: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  userId?: string;
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  items: OrderItem[];
  shippingAddress: {
    firstName?: string;
    lastName?: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    country: string;
    zip: string;
    phone?: string;
  };
  billingAddress?: {
    firstName?: string;
    lastName?: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    country: string;
    zip: string;
    phone?: string;
  };
  paymentMethod: string;
  shopifyOrderId?: string;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  tax: number;
  discount?: number;
  total: number;
  trackingNumber?: string;
  tracking?: {
    number: string;
    carrier: string;
    url?: string;
    addedAt: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasMore: boolean;
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: OrderStatus }) {
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    paid: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle },
    processing: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: Package },
    shipped: { color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400', icon: Truck },
    delivered: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    cancelled: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: Ban },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/**
 * Order details modal
 */
function OrderDetailsModal({
  order,
  isOpen,
  onClose,
  locale,
}: {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  locale: string;
}) {
  if (!isOpen || !order) return null;

  // Timeline dates
  const createdAt = new Date(order.createdAt);
  const updatedAt = new Date(order.updatedAt);
  const trackingAddedAt = order.tracking?.addedAt ? new Date(order.tracking.addedAt) : null;

  const timeline = [
    {
      status: 'pending',
      label: 'Order Placed',
      date: createdAt,
      completed: ['pending', 'paid', 'processing', 'shipped', 'delivered'].includes(order.status),
    },
    {
      status: 'paid',
      label: 'Payment Received',
      date: order.status === 'paid' ? updatedAt : null,
      completed: ['paid', 'processing', 'shipped', 'delivered'].includes(order.status),
    },
    {
      status: 'processing',
      label: 'Processing',
      date: ['processing', 'shipped', 'delivered'].includes(order.status) ? updatedAt : null,
      completed: ['processing', 'shipped', 'delivered'].includes(order.status),
    },
    {
      status: 'shipped',
      label: 'Shipped',
      date: trackingAddedAt || (['shipped', 'delivered'].includes(order.status) ? updatedAt : null),
      completed: ['shipped', 'delivered'].includes(order.status),
    },
    {
      status: 'delivered',
      label: 'Delivered',
      date: order.status === 'delivered' ? updatedAt : null,
      completed: order.status === 'delivered',
    },
  ];

  const handleDownloadInvoice = () => {
    // Generate and download invoice
    const invoiceContent = `
      Invoice
      Order Number: ${order.orderNumber}
      Date: ${createdAt.toLocaleDateString()}
      
      Billing Address:
      ${order.billingAddress?.firstName || order.customerInfo.firstName} ${order.billingAddress?.lastName || order.customerInfo.lastName}
      ${order.billingAddress?.address1 || order.shippingAddress.address1}
      ${order.billingAddress?.city || order.shippingAddress.city}, ${order.billingAddress?.province || order.shippingAddress.province} ${order.billingAddress?.zip || order.shippingAddress.zip}
      
      Items:
      ${order.items.map(item => `- ${item.productName} (${item.color}, ${item.size}) x${item.quantity} - $${item.subtotal.toFixed(2)}`).join('\n')}
      
      Subtotal: $${order.subtotal.toFixed(2)}
      ${order.discount ? `Discount: -$${order.discount.toFixed(2)}` : ''}
      Shipping: $${order.shipping.toFixed(2)}
      Tax: $${order.tax.toFixed(2)}
      Total: $${order.total.toFixed(2)}
    `;

    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${order.orderNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-6 flex items-center justify-between z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Order {order.orderNumber}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Placed on {createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Status */}
            <div className="flex items-center gap-4">
              <StatusBadge status={order.status} />
              {order.trackingNumber && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Truck className="w-4 h-4" />
                  <span>Tracking: {order.trackingNumber}</span>
                  {order.tracking?.url && (
                    <a
                      href={order.tracking.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Track Package
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="border-t border-b border-gray-200 dark:border-gray-800 py-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Order Timeline
              </h3>
              <div className="space-y-4">
                {timeline.map((step) => (
                  <div key={step.status} className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.completed
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    }`}>
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 pb-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-medium ${step.completed ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                            {step.label}
                          </p>
                          {step.date && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {step.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Order Items
              </h3>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-800 rounded-lg"
                  >
                    <Link
                      href={`/${locale}/products/${item.productSlug}`}
                      className="flex-shrink-0"
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        width={80}
                        height={80}
                        className="rounded-lg object-cover"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/${locale}/products/${item.productSlug}`}
                        className="font-medium text-gray-900 dark:text-white hover:text-blue-600 transition-colors"
                      >
                        {item.productName}
                      </Link>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <span className="inline-block mr-3">
                          Color: <span className="font-medium">{item.color}</span>
                        </span>
                        <span className="inline-block">
                          Size: <span className="font-medium">{item.size}</span>
                        </span>
                        <span className="block mt-1">
                          SKU: {item.sku}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Quantity: {item.quantity}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${item.subtotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Shipping Address
              </h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-gray-900 dark:text-white">
                  {order.shippingAddress.firstName || order.customerInfo.firstName}{' '}
                  {order.shippingAddress.lastName || order.customerInfo.lastName}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {order.shippingAddress.address1}
                  {order.shippingAddress.address2 && `, ${order.shippingAddress.address2}`}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zip}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {order.shippingAddress.country}
                </p>
                {order.shippingAddress.phone && (
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Phone: {order.shippingAddress.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Order Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>${order.subtotal.toFixed(2)}</span>
                </div>
                {order.discount && order.discount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount</span>
                    <span>-${order.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Shipping</span>
                  <span>${order.shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tax</span>
                  <span>${order.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-800">
                  <span>Total</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between gap-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleDownloadInvoice}>
                <Download className="w-4 h-4 mr-2" />
                Download Invoice
              </Button>
              {order.trackingNumber && (
                <Link href={`/${locale}/orders/${order.orderNumber}/track`}>
                  <Button variant="primary">
                    <Truck className="w-4 h-4 mr-2" />
                    Track Order
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Order card component (mobile)
 */
function OrderCard({ order, locale: _locale, onViewDetails, onTrackOrder, onReorder }: {
  order: Order;
  locale: string;
  onViewDetails: () => void;
  onTrackOrder: () => void;
  onReorder: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const createdAt = new Date(order.createdAt);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {order.orderNumber}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Items Preview */}
        <div className="flex items-center gap-2 mb-4">
          {order.items.slice(0, 3).map((item, index) => (
            <div key={index} className="flex-shrink-0">
              <Image
                src={item.imageUrl}
                alt={item.productName}
                width={60}
                height={60}
                className="rounded-lg object-cover border border-gray-200 dark:border-gray-700"
              />
            </div>
          ))}
          {order.items.length > 3 && (
            <div className="flex-shrink-0 w-[60px] h-[60px] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                +{order.items.length - 3}
              </span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            ${order.total.toFixed(2)}
          </span>
        </div>

        {/* Expandable Details */}
        {isExpanded && (
          <div className="space-y-4 pb-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Items ({order.items.length})
              </h4>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      width={40}
                      height={40}
                      className="rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {item.productName}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        {item.color} • {item.size} • Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${item.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 min-w-0"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Details
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="flex-1 min-w-0"
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
          {order.trackingNumber && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTrackOrder}
              className="flex-1 min-w-0"
            >
              <Truck className="w-4 h-4 mr-1" />
              Track
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onReorder}
            className="flex-1 min-w-0"
          >
            <RotateCw className="w-4 h-4 mr-1" />
            Reorder
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton
 */
function OrderSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="w-16 h-16 rounded-lg" />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main orders page
 */
export default function OrdersPage() {
  const params = useParams();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || (params.locale as string) || 'en';
  const router = useRouter();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [orderNumberSearch, setOrderNumberSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch orders
  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      if (statusFilter) params.set('status', statusFilter);
      if (orderNumberSearch) params.set('orderNumber', orderNumberSearch);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const response = await fetch(`/api/orders?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push(`/${locale}/login`);
          return;
        }
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentPage, statusFilter, orderNumberSearch, dateFrom, dateTo, locale]);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleTrackOrder = (order: Order) => {
    router.push(`/${locale}/orders/${order.orderNumber}/track`);
  };

  const handleReorder = async (order: Order) => {
    // TODO: Implement reorder functionality
    // This would add all items from the order back to the cart
    console.log('Reorder order:', order.orderNumber);
  };

  const handleResetFilters = () => {
    setStatusFilter('');
    setOrderNumberSearch('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter || orderNumberSearch || dateFrom || dateTo;

  return (
    <div className="min-h-screen  p-4">
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Order History
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage your past orders
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Search order number..."
                    value={orderNumberSearch}
                    onChange={(e) => setOrderNumberSearch(e.target.value)}
                  />
                </div>
                <div>
                  <SelectWrapper
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
                    options={[
                      { value: '', label: 'All Statuses' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'paid', label: 'Paid' },
                      { value: 'processing', label: 'Processing' },
                      { value: 'shipped', label: 'Shipped' },
                      { value: 'delivered', label: 'Delivered' },
                      { value: 'cancelled', label: 'Cancelled' },
                    ]}
                  />
                </div>
                <div>
                  <Input
                    type="date"
                    placeholder="Date from"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    type="date"
                    placeholder="Date to"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <Button variant="outline" onClick={handleResetFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </CardContent>
          )}
        </Card>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <OrderSkeleton key={i} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No orders found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {hasActiveFilters
                  ? 'Try adjusting your filters to see more results.'
                  : "You haven't placed any orders yet."}
              </p>
              {hasActiveFilters ? (
                <Button variant="primary" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Link href={`/${locale}/shop`}>
                  <Button variant="primary">
                    Start Shopping
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Order
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Items
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {orders.map((order) => {
                          const createdAt = new Date(order.createdAt);
                          return (
                            <tr
                              key={order._id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {order.orderNumber}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                {createdAt.toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={order.status} />
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  {order.items.slice(0, 3).map((item, index) => (
                                    <Image
                                      key={index}
                                      src={item.imageUrl}
                                      alt={item.productName}
                                      width={40}
                                      height={40}
                                      className="rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                                    />
                                  ))}
                                  {order.items.length > 3 && (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      +{order.items.length - 3}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  ${order.total.toFixed(2)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewDetails(order)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {order.trackingNumber && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleTrackOrder(order)}
                                    >
                                      <Truck className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReorder(order)}
                                  >
                                    <RotateCw className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {orders.map((order) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  locale={locale}
                  onViewDetails={() => handleViewDetails(order)}
                  onTrackOrder={() => handleTrackOrder(order)}
                  onReorder={() => handleReorder(order)}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <Card className="mt-6">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {(pagination.page - 1) * pagination.itemsPerPage + 1} to{' '}
                      {Math.min(pagination.page * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                      {pagination.totalItems} orders
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={pagination.page === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Order Details Modal */}
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrder(null);
          }}
          locale={locale}
        />
      </div>
    </div>
  );
}

