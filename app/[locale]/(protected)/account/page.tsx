'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Package,
  Heart,
  Star,
  Award,
  ShoppingBag,
  MapPin,
  Settings,
  HelpCircle,
  LogOut,
  LayoutDashboard,
  ListOrdered,
  ChevronRight,
  ArrowRight,
  UserCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import type { OrderStatus } from '@/lib/db/models/Order';

interface Order {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  items: Array<{
    imageUrl: string;
    productName: string;
  }>;
  createdAt: string;
}

interface WishlistProduct {
  _id: string;
  name: string | { en: string; he: string };
  slug: string;
  imageUrl: string;
  price: number;
  discountPrice?: number;
}

interface AccountStats {
  totalOrders: number;
  wishlistItems: number;
  reviewsWritten: number;
  points: number;
}

interface QuickLink {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations('common.account.orderStatus');
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', label: t('pending') },
    paid: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', label: t('paid') },
    processing: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', label: t('processing') },
    shipped: { color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400', label: t('shipped') },
    delivered: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', label: t('delivered') },
    cancelled: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', label: t('cancelled') },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

/**
 * Desktop Sidebar Navigation
 */
function SidebarNav({ locale, currentPath }: { locale: string; currentPath: string }) {
  const t = useTranslations('common.account');
  const navItems = [
    { href: `/${locale}/account`, icon: LayoutDashboard, label: t('dashboard'), exact: true },
    { href: `/${locale}/account/profile`, icon: UserCircle, label: t('profile') },
    { href: `/${locale}/account/orders`, icon: ListOrdered, label: t('orders') },
    { href: `/${locale}/account/wishlist`, icon: Heart, label: t('wishlist') },
    { href: `/${locale}/account/addresses`, icon: MapPin, label: t('addresses') },
    { href: `/${locale}/account/settings`, icon: Settings, label: t('settings') },
  ];

  const handleLogout = async () => {
    await signOut({ callbackUrl: `/${locale}/login` });
  };

  return (
    <aside className="hidden lg:block w-64 flex-shrink-0">
      <Card className="sticky top-8">
        <CardContent className="p-0">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? currentPath === item.href
                : currentPath.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>{t('logout')}</span>
            </button>
          </nav>
        </CardContent>
      </Card>
    </aside>
  );
}

/**
 * Mobile Tab Navigation
 */
function MobileTabNav({ locale, currentPath }: { locale: string; currentPath: string }) {
  const t = useTranslations('common.account');
  const navItems = [
    { href: `/${locale}/account`, icon: LayoutDashboard, label: t('dashboard') },
    { href: `/${locale}/account/profile`, icon: UserCircle, label: t('profile') },
    { href: `/${locale}/account/orders`, icon: ListOrdered, label: t('orders') },
    { href: `/${locale}/account/wishlist`, icon: Heart, label: t('wishlist') },
    { href: `/${locale}/account/settings`, icon: Settings, label: t('settings') },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.href || 
            (item.href !== `/${locale}/account` && currentPath.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Main Account Page
 */
export default function AccountPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('common.account');

  const [stats, setStats] = useState<AccountStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<WishlistProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFetchingRef = useRef(false);
  const lastFetchTimestampRef = useRef(0);
  const MIN_FETCH_INTERVAL_MS = 30000; // throttle to at most once every 30s

  useEffect(() => {
    // Throttle fetches to avoid repeated requests (dev double-invoke, rapid locale changes, etc.)
    const now = Date.now();
    if (now - lastFetchTimestampRef.current < MIN_FETCH_INTERVAL_MS) {
      return;
    }
    lastFetchTimestampRef.current = now;
    fetchAccountData();
  }, [locale]);

  const fetchAccountData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const response = await fetch('/api/account/stats');
      if (!response.ok) {
        if (response.status === 401) {
          router.push(`/${locale}/login`);
          return;
        }
        throw new Error('Failed to fetch account data');
      }

      const data = await response.json();
      setStats(data.stats);
      setRecentOrders(data.recentOrders || []);
      setWishlistProducts(data.wishlistProducts || []);
    } catch (error) {
      console.error('Error fetching account data:', error);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Quick links configuration
  const quickLinks: QuickLink[] = [
    {
      title: t('orders'),
      description: t('viewOrderHistory'),
      href: `/${locale}/account/orders`,
      icon: ShoppingBag,
      color: 'bg-blue-500',
    },
    {
      title: t('addresses'),
      description: t('manageAddresses'),
      href: `/${locale}/account/addresses`,
      icon: MapPin,
      color: 'bg-green-500',
    },
    {
      title: t('wishlist'),
      description: t('savedItems'),
      href: `/${locale}/account/wishlist`,
      icon: Heart,
      color: 'bg-red-500',
    },
    {
      title: t('settings'),
      description: t('accountSettings'),
      href: `/${locale}/account/settings`,
      icon: Settings,
      color: 'bg-purple-500',
    },
    {
      title: t('reviews'),
      description: t('yourReviews'),
      href: `/${locale}/account/reviews`,
      icon: Star,
      color: 'bg-yellow-500',
    },
    {
      title: t('help'),
      description: t('supportCenter'),
      href: `/${locale}/help`,
      icon: HelpCircle,
      color: 'bg-indigo-500',
    },
  ];

  // Get product name (handles both string and localized object)
  const getProductName = (product: WishlistProduct): string => {
    if (typeof product.name === 'string') return product.name;
    return product.name.en || product.name.he || 'Product';
  };

  return (
    <div className="min-h-screen  pb-16 lg:pb-0">
      <div className="max-w-6xl mx-auto p-4 lg:p-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation (Desktop) */}
          <SidebarNav locale={locale} currentPath={pathname} />

          {/* Main Content */}
          <div className="flex-1 space-y-8">
            {/* Welcome Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t('welcomeBack')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t('accountOverview')}
              </p>
            </div>

            {/* Quick Stats */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-8 w-8 mb-4" />
                      <Skeleton className="h-6 w-24 mb-2" />
                      <Skeleton className="h-4 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {t('totalOrders')}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {stats?.totalOrders || 0}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {t('wishlistItems')}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {stats?.wishlistItems || 0}
                        </p>
                      </div>
                      <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <Heart className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {t('reviewsWritten')}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {stats?.reviewsWritten || 0}
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                        <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {t('rewardPoints')}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {stats?.points || 0}
                        </p>
                      </div>
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('recentOrders')}</CardTitle>
                  <Link href={`/${locale}/account/orders`}>
                    <Button variant="outline" size="sm">
                      {t('viewAll')}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="w-16 h-16 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    ))}
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {t('noOrdersYet')}
                    </p>
                    <Link href={`/${locale}/shop`}>
                      <Button variant="primary">
                        {t('startShopping')}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentOrders.map((order) => {
                      const createdAt = new Date(order.createdAt);
                      const firstItem = order.items[0];

                      return (
                        <Link
                          key={order._id}
                          href={`/${locale}/account/orders`}
                          className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="relative flex items-center">
                            {firstItem && (
                              <Image
                                src={firstItem.imageUrl}
                                alt={firstItem.productName}
                                width={64}
                                height={64}
                                className="rounded-lg object-cover"
                              />
                            )}
                            {order.items.length > 1 && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                +{order.items.length - 1}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {order.orderNumber}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {createdAt.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <StatusBadge status={order.status} />
                            <div className="text-right">
                              <p className="font-semibold text-gray-900 dark:text-white">
                                ${order.total.toFixed(2)}
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-600" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Wishlist Preview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('wishlist')}</CardTitle>
                  <Link href={`/${locale}/account/wishlist`}>
                    <Button variant="outline" size="sm">
                      {t('viewAll')}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="w-full aspect-square rounded-lg" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    ))}
                  </div>
                ) : wishlistProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {t('yourWishlistIsEmpty')}
                    </p>
                    <Link href={`/${locale}/shop`}>
                      <Button variant="primary">
                        {t('browseProducts')}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {wishlistProducts.map((product) => (
                      <Link
                        key={product._id}
                        href={`/${locale}/products/${product.slug}`}
                        className="group"
                      >
                        <div className="space-y-2">
                          <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                            <Image
                              src={product.imageUrl}
                              alt={getProductName(product)}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {getProductName(product)}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {product.discountPrice ? (
                                <>
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    ${product.discountPrice.toFixed(2)}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-500 line-through">
                                    ${product.price.toFixed(2)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  ${product.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links Grid */}
            <Card>
              <CardHeader>
                <CardTitle>{t('quickLinks')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quickLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="group flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:shadow-md transition-all hover:border-blue-300 dark:hover:border-blue-700"
                      >
                        <div className={`${link.color} p-3 rounded-lg text-white`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {link.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {link.description}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <MobileTabNav locale={locale} currentPath={pathname} />
    </div>
  );
}
