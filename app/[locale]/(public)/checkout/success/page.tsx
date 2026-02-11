'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  CheckCircle, 
  Mail, 
  Truck, 
  MapPin, 
  CreditCard,
  ArrowRight,
  Printer,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Copy,
  UserPlus,
  Loader2
} from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string;
  quantity: number;
  color: string;
  size: string;
  price: number;
  subtotal: number;
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  zip: string;
}

interface OrderData {
  orderNumber?: string;
  orderId?: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  estimatedDelivery?: string;
  isGuest?: boolean;
}

/**
 * Simple confetti animation component
 */
function ConfettiAnimation() {
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    // Generate confetti pieces
    const pieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 2,
    }));
    setConfetti(pieces);

    // Clean up after animation
    const timer = setTimeout(() => {
      setConfetti([]);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (confetti.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className={`absolute top-0 w-2 h-2 rounded-full ${
            ['bg-yellow-400', 'bg-blue-400', 'bg-red-400', 'bg-green-400', 'bg-purple-400'][
              piece.id % 5
            ]
          }`}
          style={{
            left: `${piece.left}%`,
            animation: `fall ${piece.duration}s ${piece.delay}s ease-in forwards`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart, items: cartItems } = useCartStore();
  
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get order data from URL params or localStorage
  useEffect(() => {
    setMounted(true);
    
    // Clear cart on mount
    clearCart();

    // Try to get order data from URL params (if redirected from Shopify)
    const orderNumber = searchParams.get('order');
    const checkoutId = searchParams.get('checkout_id');

    // Try to load order data from localStorage (saved before checkout)
    const savedOrderData = localStorage.getItem('orderData');
    
    if (savedOrderData) {
      try {
        const data = JSON.parse(savedOrderData);
        setOrderData(data);
        // Clear saved data after loading
        localStorage.removeItem('orderData');
      } catch (e) {
        console.error('Failed to parse order data', e);
      }
    } else if (orderNumber || checkoutId) {
      // Fetch order details from API
      fetchOrderDetails(orderNumber || checkoutId || '');
    } else {
      // If no order data, redirect to cart
      setTimeout(() => {
        router.push('/cart');
      }, 2000);
    }

    setLoading(false);
  }, [searchParams, router, clearCart]);

  // Fetch order details from API
  const fetchOrderDetails = async (identifier: string) => {
    try {
      // TODO: Replace with actual API endpoint
      // const response = await fetch(`/api/orders/${identifier}`);
      // const data = await response.json();
      // setOrderData(data);
      
      // For now, use cart items as order items
      if (cartItems.length > 0) {
        const items: OrderItem[] = cartItems.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          productSlug: item.productSlug,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
          color: item.color,
          size: item.size,
          price: item.discountPrice || item.price,
          subtotal: (item.discountPrice || item.price) * item.quantity,
        }));

        // Get saved shipping address
        const savedAddress = localStorage.getItem('shippingAddress');
        const shippingAddress: ShippingAddress = savedAddress 
          ? JSON.parse(savedAddress)
          : {
              firstName: '',
              lastName: '',
              email: '',
              phone: '',
              address1: '',
              city: '',
              province: '',
              country: '',
              zip: '',
            };

        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        const shipping = subtotal >= 50 ? 0 : 5.99;
        const tax = subtotal * 0.08;
        const total = subtotal + shipping + tax;

        // Calculate estimated delivery (5-7 business days)
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 5);

        setOrderData({
          orderNumber: identifier || `ORD-${Date.now()}`,
          orderId: identifier,
          items,
          shippingAddress,
          paymentMethod: 'Credit Card',
          subtotal,
          shipping,
          tax,
          discount: 0,
          total,
          estimatedDelivery: deliveryDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          isGuest: !localStorage.getItem('user_id'),
        });
      }
    } catch (error) {
      console.error('Failed to fetch order details:', error);
    }
  };

  // Print receipt
  const handlePrint = () => {
    window.print();
  };

  // Copy order number
  const handleCopyOrderNumber = () => {
    if (orderData?.orderNumber) {
      navigator.clipboard.writeText(orderData.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Social sharing
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `I just placed an order! Order #${orderData?.orderNumber || ''}`;

  const handleShare = (platform: 'facebook' | 'twitter' | 'linkedin') => {
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    };

    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600 dark:text-gray-400" />
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen  flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No order data found</p>
          <Link
            href="/shop"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  py-8 px-4 sm:px-6 lg:px-8">
      <ConfettiAnimation />
      
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 mb-6 text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Order Confirmed!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Thank you for your purchase. Your order has been received.
          </p>
          
          {/* Order Number */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Order Number:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-lg text-gray-900 dark:text-white">
                {orderData.orderNumber}
              </span>
              <button
                onClick={handleCopyOrderNumber}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Copy order number"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Order Summary
              </h2>
              
              {/* Items */}
              <div className="space-y-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                {orderData.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <Link
                      href={`/shop/${item.productSlug}`}
                      className="relative w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 hover:opacity-75 transition-opacity"
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/shop/${item.productSlug}`}
                        className="font-medium text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        {item.productName}
                      </Link>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {item.color} • {item.size} × {item.quantity}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-2">
                        ${item.subtotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${orderData.subtotal.toFixed(2)}
                  </span>
                </div>
                {orderData.discount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Discount</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      -${orderData.discount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {orderData.shipping === 0 ? (
                      <span className="text-green-600 dark:text-green-400">FREE</span>
                    ) : (
                      `$${orderData.shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tax</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${orderData.tax.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-base pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                  <span className="font-bold text-gray-900 dark:text-white text-lg">
                    ${orderData.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Shipping Address
                </h2>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <p className="font-medium">
                  {orderData.shippingAddress.firstName} {orderData.shippingAddress.lastName}
                </p>
                <p>{orderData.shippingAddress.address1}</p>
                {orderData.shippingAddress.address2 && (
                  <p>{orderData.shippingAddress.address2}</p>
                )}
                <p>
                  {orderData.shippingAddress.city}, {orderData.shippingAddress.province}{' '}
                  {orderData.shippingAddress.zip}
                </p>
                <p>{orderData.shippingAddress.country}</p>
                <p className="pt-2">{orderData.shippingAddress.phone}</p>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Payment Method
                </h2>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {orderData.paymentMethod}
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Next Steps */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Next Steps
              </h2>
              
              <div className="space-y-4">
                {/* Confirmation Email */}
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Confirmation Email
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      We've sent a confirmation email to {orderData.shippingAddress.email}
                    </p>
                  </div>
                </div>

                {/* Estimated Delivery */}
                {orderData.estimatedDelivery && (
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Estimated Delivery
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {orderData.estimatedDelivery}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-3 print:hidden">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Actions
              </h2>
              
              {/* Track Order */}
              {orderData.orderId && (
                <Link
                  href={`/orders/${orderData.orderId}`}
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 px-4 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                >
                  Track Order
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}

              {/* Create Account (Guest) */}
              {orderData.isGuest && (
                <Link
                  href="/register"
                  className="w-full flex items-center justify-center gap-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </Link>
              )}

              {/* Print Receipt */}
              <button
                onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>

              {/* Continue Shopping */}
              <Link
                href="/shop"
                className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Continue Shopping
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Social Share */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 print:hidden">
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Share Your Purchase
                </h2>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleShare('facebook')}
                  className="flex-1 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  aria-label="Share on Facebook"
                >
                  <Facebook className="w-4 h-4" />
                  <span className="hidden sm:inline">Facebook</span>
                </button>
                <button
                  onClick={() => handleShare('twitter')}
                  className="flex-1 p-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  aria-label="Share on Twitter"
                >
                  <Twitter className="w-4 h-4" />
                  <span className="hidden sm:inline">Twitter</span>
                </button>
                <button
                  onClick={() => handleShare('linkedin')}
                  className="flex-1 p-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  aria-label="Share on LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                  <span className="hidden sm:inline">LinkedIn</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600 dark:text-gray-400" />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}