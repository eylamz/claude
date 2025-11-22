'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  useCartItems, 
  useCartTotals,
  useCartIsLoading 
} from '@/stores/cartStore';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Loader2,
  MapPin,
  Truck,
  Store,
  Shield,
  Lock
} from 'lucide-react';
import { Input } from '@/components/ui';

interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  country: string;
  zip: string;
}

interface FormErrors {
  [key: string]: string;
}

type ShippingMethod = 'standard' | 'express' | 'pickup';

type Step = 1 | 2 | 3;

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartItems();
  const totals = useCartTotals();
  const isLoading = useCartIsLoading();
  
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Shipping information
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    province: '',
    country: 'United States',
    zip: '',
  });
  const [saveAddress, setSaveAddress] = useState(false);
  
  // Shipping method
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard');
  
  // Discount code
  const [discountCode, setDiscountCode] = useState('');
  
  // Load saved address if user is logged in
  useEffect(() => {
    const savedAddress = localStorage.getItem('shippingAddress');
    if (savedAddress) {
      try {
        setShippingAddress(JSON.parse(savedAddress));
      } catch (e) {
        console.error('Failed to load saved address', e);
      }
    }
  }, []);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && !isLoading) {
      router.push('/cart');
    }
  }, [items.length, isLoading, router]);

  // Calculate shipping cost
  const shippingCosts = {
    standard: totals.subtotal >= 50 ? 0 : 5.99,
    express: totals.subtotal >= 100 ? 0 : 14.99,
    pickup: 0,
  };
  
  const selectedShippingCost = shippingCosts[shippingMethod];
  const tax = totals.subtotal * 0.08;
  const finalTotal = totals.subtotal + selectedShippingCost + tax;

  // Validate step 1: Shipping information
  const validateShippingInfo = (): boolean => {
    const newErrors: FormErrors = {};

    if (!shippingAddress.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!shippingAddress.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!shippingAddress.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingAddress.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!shippingAddress.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!shippingAddress.address1.trim()) {
      newErrors.address1 = 'Address is required';
    }

    if (!shippingAddress.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!shippingAddress.province.trim()) {
      newErrors.province = 'State/Province is required';
    }

    if (!shippingAddress.zip.trim()) {
      newErrors.zip = 'Zip/Postal code is required';
    }

    if (!shippingAddress.country.trim()) {
      newErrors.country = 'Country is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle address autocomplete (placeholder - integrate with Google Places API)
  const handleAddressAutocomplete = async (address: string) => {
    if (address.length < 5) return;
    
    // TODO: Integrate with Google Places API or similar service
    // For now, just update the address1 field
    setShippingAddress(prev => ({ ...prev, address1: address }));
  };

  // Save address to localStorage or user account
  const handleSaveAddress = async () => {
    if (saveAddress) {
      localStorage.setItem('shippingAddress', JSON.stringify(shippingAddress));
      // TODO: Save to user account if logged in
    } else {
      localStorage.removeItem('shippingAddress');
    }
  };

  // Handle next step
  const handleNext = () => {
    if (currentStep === 1) {
      if (validateShippingInfo()) {
        handleSaveAddress();
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  // Handle back
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    } else {
      router.push('/cart');
    }
  };

  // Handle final submit - create Shopify checkout
  const handleSubmit = async () => {
    setSubmitting(true);
    setErrors({});

    try {
      // Create checkout session
      const response = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            color: item.color,
            size: item.size,
            price: item.discountPrice || item.price,
            productName: item.productName,
            productSlug: item.productSlug,
            sku: item.sku,
            imageUrl: item.imageUrl,
            maxStock: item.maxStock,
            addedAt: item.addedAt,
          })),
          customer: {
            email: shippingAddress.email,
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            phone: shippingAddress.phone,
          },
          shippingAddress: {
            address1: shippingAddress.address1,
            address2: shippingAddress.address2,
            city: shippingAddress.city,
            province: shippingAddress.province,
            country: shippingAddress.country,
            zip: shippingAddress.zip,
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            phone: shippingAddress.phone,
          },
          discountCode: discountCode || undefined,
          note: `Shipping method: ${shippingMethod}`,
          guest: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      // Redirect to Shopify checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to create checkout. Please try again.',
      });
      setSubmitting(false);
    }
  };

  // Step indicator
  const steps = [
    { number: 1, title: 'Shipping', icon: MapPin },
    { number: 2, title: 'Shipping Method', icon: Truck },
    { number: 3, title: 'Payment', icon: Shield },
  ];

  if (items.length === 0) {
    return (
      <div className="min-h-screen  flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Your cart is empty</p>
          <button
            onClick={() => router.push('/shop')}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCompleted
                          ? 'bg-green-500 border-green-500 text-white'
                          : isActive
                          ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`mt-2 text-sm font-medium hidden sm:block ${
                      isActive
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        isCompleted
                          ? 'bg-green-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              {/* Step 1: Shipping Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Shipping Information
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Enter your shipping details below
                    </p>
                  </div>

                  {/* Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      type="email"
                      label="Email Address *"
                      value={shippingAddress.email}
                      onChange={(e) =>
                        setShippingAddress(prev => ({ ...prev, email: e.target.value }))
                      }
                      error={errors.email}
                      placeholder="your@email.com"
                      required
                    />
                    <Input
                      type="tel"
                      label="Phone Number *"
                      value={shippingAddress.phone}
                      onChange={(e) =>
                        setShippingAddress(prev => ({ ...prev, phone: e.target.value }))
                      }
                      error={errors.phone}
                      placeholder="+1 (555) 000-0000"
                      required
                    />
                  </div>

                  {/* Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      type="text"
                      label="First Name *"
                      value={shippingAddress.firstName}
                      onChange={(e) =>
                        setShippingAddress(prev => ({ ...prev, firstName: e.target.value }))
                      }
                      error={errors.firstName}
                      placeholder="John"
                      required
                    />
                    <Input
                      type="text"
                      label="Last Name *"
                      value={shippingAddress.lastName}
                      onChange={(e) =>
                        setShippingAddress(prev => ({ ...prev, lastName: e.target.value }))
                      }
                      error={errors.lastName}
                      placeholder="Doe"
                      required
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <Input
                      type="text"
                      label="Address *"
                      value={shippingAddress.address1}
                      onChange={(e) => {
                        setShippingAddress(prev => ({ ...prev, address1: e.target.value }));
                        handleAddressAutocomplete(e.target.value);
                      }}
                      error={errors.address1}
                      placeholder="Street address"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Start typing to use address autocomplete
                    </p>
                  </div>

                  <Input
                    type="text"
                    label="Apartment, suite, etc. (optional)"
                    value={shippingAddress.address2}
                    onChange={(e) =>
                      setShippingAddress(prev => ({ ...prev, address2: e.target.value }))
                    }
                    placeholder="Apt, suite, unit, etc."
                  />

                  {/* City, State, Zip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      type="text"
                      label="City *"
                      value={shippingAddress.city}
                      onChange={(e) =>
                        setShippingAddress(prev => ({ ...prev, city: e.target.value }))
                      }
                      error={errors.city}
                      placeholder="New York"
                      required
                    />
                    <Input
                      type="text"
                      label="State/Province *"
                      value={shippingAddress.province}
                      onChange={(e) =>
                        setShippingAddress(prev => ({ ...prev, province: e.target.value }))
                      }
                      error={errors.province}
                      placeholder="NY"
                      required
                    />
                    <Input
                      type="text"
                      label="Zip/Postal Code *"
                      value={shippingAddress.zip}
                      onChange={(e) =>
                        setShippingAddress(prev => ({ ...prev, zip: e.target.value }))
                      }
                      error={errors.zip}
                      placeholder="10001"
                      required
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Country *
                    </label>
                    <select
                      value={shippingAddress.country}
                      onChange={(e) =>
                        setShippingAddress(prev => ({ ...prev, country: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent"
                      required
                    >
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Israel">Israel</option>
                    </select>
                    {errors.country && (
                      <p className="mt-1 text-sm text-red-600">{errors.country}</p>
                    )}
                  </div>

                  {/* Save Address */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="saveAddress"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    />
                    <label
                      htmlFor="saveAddress"
                      className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      Save this address for future orders
                    </label>
                  </div>

                  {/* Guest Checkout Notice */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Guest Checkout Available:</strong> You can complete your purchase without creating an account. We'll send order updates to your email.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: Shipping Method */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Shipping Method
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Choose your preferred shipping option
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Standard Shipping */}
                    <button
                      type="button"
                      onClick={() => setShippingMethod('standard')}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                        shippingMethod === 'standard'
                          ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-700'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Truck className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              Standard Shipping
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              5-7 business days
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {shippingCosts.standard === 0 ? (
                              <span className="text-green-600 dark:text-green-400">FREE</span>
                            ) : (
                              `$${shippingCosts.standard.toFixed(2)}`
                            )}
                          </div>
                          {totals.subtotal < 50 && shippingCosts.standard > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              ${(50 - totals.subtotal).toFixed(2)} away from free shipping
                            </div>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Express Shipping */}
                    <button
                      type="button"
                      onClick={() => setShippingMethod('express')}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                        shippingMethod === 'express'
                          ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-700'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Truck className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              Express Shipping
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              2-3 business days
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {shippingCosts.express === 0 ? (
                              <span className="text-green-600 dark:text-green-400">FREE</span>
                            ) : (
                              `$${shippingCosts.express.toFixed(2)}`
                            )}
                          </div>
                          {totals.subtotal < 100 && shippingCosts.express > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              ${(100 - totals.subtotal).toFixed(2)} away from free express
                            </div>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Pickup in Store */}
                    <button
                      type="button"
                      onClick={() => setShippingMethod('pickup')}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                        shippingMethod === 'pickup'
                          ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-700'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Store className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              Pickup in Store
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Free pickup at our store location
                            </div>
                          </div>
                        </div>
                        <div className="font-semibold text-green-600 dark:text-green-400">
                          FREE
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Payment */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Review & Payment
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Review your order and complete payment
                    </p>
                  </div>

                  {/* Discount Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Discount Code (optional)
                    </label>
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      placeholder="Enter discount code"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent"
                    />
                  </div>

                  {/* Error Message */}
                  {errors.submit && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-800 dark:text-red-200">{errors.submit}</p>
                    </div>
                  )}

                  {/* Security Notice */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Lock className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Secure Checkout
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          Your payment will be processed securely through Shopify. You'll be redirected to complete your purchase.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {currentStep === 1 ? 'Back to Cart' : 'Back'}
                </button>

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Complete Order
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Order Summary
                </h2>

                {/* Cart Items */}
                <div className="space-y-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                  {items.map((item) => {
                    const itemPrice = item.discountPrice || item.price;
                    return (
                      <div key={item.id} className="flex gap-3">
                        <div className="relative w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                            {item.productName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.color} • {item.size} × {item.quantity}
                          </p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                            ${(itemPrice * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${totals.subtotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Shipping ({shippingMethod === 'standard' ? 'Standard' : shippingMethod === 'express' ? 'Express' : 'Pickup'})
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedShippingCost === 0 ? (
                        <span className="text-green-600 dark:text-green-400">FREE</span>
                      ) : (
                        `$${selectedShippingCost.toFixed(2)}`
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Tax</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${tax.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-base pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                    <span className="font-bold text-gray-900 dark:text-white text-lg">
                      ${finalTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Security Badges */}
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    <span>Secure</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    <span>Encrypted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}











