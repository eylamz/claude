'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea, SelectWrapper, Checkbox, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '@/components/ui';
import { NumberInput } from '@/components/ui/number-input';
import type { IHeroCarouselImage, IMultilingualText } from '@/lib/models/Settings';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Icon } from '@/components/icons/Icon';

// Helper function for multilingual text
const getMultilingualText = (text: string | IMultilingualText | undefined, lang: 'en' | 'he'): string => {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text[lang] || '';
};

// Environment flag keys and human-readable descriptions (from .env.local)
const ENV_FLAGS: { key: string; description: string }[] = [
  { key: 'NEXT_PUBLIC_ENABLE_ANALYTICS', description: 'Enable analytics (page views, consent, device, referrer)' },
  { key: 'NEXT_PUBLIC_SET_IL_COOKIE_POLICY', description: 'IL cookie policy: simplified banner, accept all cookies (including analytics)' },
  { key: 'NEXT_PUBLIC_ENABLE_LOGIN', description: 'Turns user login on or off' },
  { key: 'NEXT_PUBLIC_ENABLE_REGISTER', description: 'Allow user registration' },
  { key: 'NEXT_PUBLIC_ENABLE_COMMUNITY', description: 'Community page' },
  { key: 'NEXT_PUBLIC_ENABLE_GROWTH_LAB', description: 'Growth Lab Pages' },
  { key: 'NEXT_PUBLIC_ENABLE_ECOMMERCE', description: 'Shop Pages' },
  { key: 'NEXT_PUBLIC_ENABLE_TRAINERS', description: 'Trainers page' },
  { key: 'NEXT_PUBLIC_ENABLE_MULTILINGUAL_REVIEWS', description: 'Reviews in multiple languages (false = same as skatepark locale)' },
  { key: 'NEXT_PUBLIC_ENABLE_USERREVIEWS', description: 'Only logged-in users can add reviews' },
  { key: 'NEXT_PUBLIC_ENABLE_EVERYONEREVIEWS', description: 'Everyone can add reviews' },
  { key: 'NEXT_PUBLIC_ENABLE_MULTIPLE_REVIEWS', description: 'Allow multiple reviews from same user' },
  { key: 'NEXT_PUBLIC_ENABLE_AUTO_APPROVE_REVIEWS', description: 'Auto approve reviews' },
  { key: 'NEXT_PUBLIC_ENABLE_NEWSLETTER', description: 'Newsletter (footer + admin newsletter page)' },
  { key: 'NEXT_PUBLIC_ENABLE_WEATHER_FORECAST', description: 'Weather forecast' },
];

// Static process.env reads so Next.js inlines values at build time
const ENV_FLAG_VALUES: Record<string, boolean> = {
  NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  NEXT_PUBLIC_SET_IL_COOKIE_POLICY: process.env.NEXT_PUBLIC_SET_IL_COOKIE_POLICY === 'true',
  NEXT_PUBLIC_ENABLE_LOGIN: process.env.NEXT_PUBLIC_ENABLE_LOGIN === 'true',
  NEXT_PUBLIC_ENABLE_REGISTER: process.env.NEXT_PUBLIC_ENABLE_REGISTER === 'true',
  NEXT_PUBLIC_ENABLE_COMMUNITY: process.env.NEXT_PUBLIC_ENABLE_COMMUNITY === 'true',
  NEXT_PUBLIC_ENABLE_GROWTH_LAB: process.env.NEXT_PUBLIC_ENABLE_GROWTH_LAB === 'true',
  NEXT_PUBLIC_ENABLE_ECOMMERCE: process.env.NEXT_PUBLIC_ENABLE_ECOMMERCE === 'true',
  NEXT_PUBLIC_ENABLE_TRAINERS: process.env.NEXT_PUBLIC_ENABLE_TRAINERS === 'true',
  NEXT_PUBLIC_ENABLE_MULTILINGUAL_REVIEWS: process.env.NEXT_PUBLIC_ENABLE_MULTILINGUAL_REVIEWS === 'true',
  NEXT_PUBLIC_ENABLE_USERREVIEWS: process.env.NEXT_PUBLIC_ENABLE_USERREVIEWS === 'true',
  NEXT_PUBLIC_ENABLE_EVERYONEREVIEWS: process.env.NEXT_PUBLIC_ENABLE_EVERYONEREVIEWS === 'true',
  NEXT_PUBLIC_ENABLE_MULTIPLE_REVIEWS: process.env.NEXT_PUBLIC_ENABLE_MULTIPLE_REVIEWS === 'true',
  NEXT_PUBLIC_ENABLE_AUTO_APPROVE_REVIEWS: process.env.NEXT_PUBLIC_ENABLE_AUTO_APPROVE_REVIEWS === 'true',
  NEXT_PUBLIC_ENABLE_NEWSLETTER: process.env.NEXT_PUBLIC_ENABLE_NEWSLETTER === 'true',
  NEXT_PUBLIC_ENABLE_WEATHER_FORECAST: process.env.NEXT_PUBLIC_ENABLE_WEATHER_FORECAST === 'true',
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Homepage Settings
  const [heroCarouselImages, setHeroCarouselImages] = useState<IHeroCarouselImage[]>([]);
  const [featuredProductsCount, setFeaturedProductsCount] = useState(6);
  const [featuredSkateparksCount, setFeaturedSkateparksCount] = useState(6);
  const [featuredTrainersCount, setFeaturedTrainersCount] = useState(6);
  const [featuredGuidesCount, setFeaturedGuidesCount] = useState(6);
  
  // Shop Settings
  const [productsPerPage, setProductsPerPage] = useState(12);
  const [defaultSortOrder, setDefaultSortOrder] = useState('createdAt-desc');
  const [showOutOfStockProducts, setShowOutOfStockProducts] = useState(false);
  const [guestCheckoutEnabled, setGuestCheckoutEnabled] = useState(true);
  
  // Email Settings
  const [adminNotificationEmail, setAdminNotificationEmail] = useState('');
  const [orderConfirmationTemplate, setOrderConfirmationTemplate] = useState('');
  const [contactFormRecipient, setContactFormRecipient] = useState('');
  
  // SEO Settings
  const [siteTitle, setSiteTitle] = useState('');
  const [defaultMetaDescription, setDefaultMetaDescription] = useState('');
  const [facebookImage, setFacebookImage] = useState('');
  const [twitterImage, setTwitterImage] = useState('');
  
  // Maintenance Settings
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  // New carousel image form
  const [newDesktopImageUrl, setNewDesktopImageUrl] = useState('');
  const [newTabletImageUrl, setNewTabletImageUrl] = useState('');
  const [newMobileImageUrl, setNewMobileImageUrl] = useState('');
  const [newImageLink, setNewImageLink] = useState('');
  const [newImageTitleEn, setNewImageTitleEn] = useState('');
  const [newImageTitleHe, setNewImageTitleHe] = useState('');
  const [newImageSubtitleEn, setNewImageSubtitleEn] = useState('');
  const [newImageSubtitleHe, setNewImageSubtitleHe] = useState('');
  const [newImageCtaTextEn, setNewImageCtaTextEn] = useState('');
  const [newImageCtaTextHe, setNewImageCtaTextHe] = useState('');
  const [newImageTextOverlayEn, setNewImageTextOverlayEn] = useState('');
  const [newImageTextOverlayHe, setNewImageTextOverlayHe] = useState('');

  // Add new carousel form visibility
  const [showAddCarouselForm, setShowAddCarouselForm] = useState(false);

  // Accordion: which carousel item is expanded
  const [openCarouselIndex, setOpenCarouselIndex] = useState<number | null>(null);

  // Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDesktopImageUrl, setEditDesktopImageUrl] = useState('');
  const [editTabletImageUrl, setEditTabletImageUrl] = useState('');
  const [editMobileImageUrl, setEditMobileImageUrl] = useState('');
  const [editImageLink, setEditImageLink] = useState('');
  const [editImageTitleEn, setEditImageTitleEn] = useState('');
  const [editImageTitleHe, setEditImageTitleHe] = useState('');
  const [editImageSubtitleEn, setEditImageSubtitleEn] = useState('');
  const [editImageSubtitleHe, setEditImageSubtitleHe] = useState('');
  const [editImageCtaTextEn, setEditImageCtaTextEn] = useState('');
  const [editImageCtaTextHe, setEditImageCtaTextHe] = useState('');
  const [editImageTextOverlayEn, setEditImageTextOverlayEn] = useState('');
  const [editImageTextOverlayHe, setEditImageTextOverlayHe] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      
      const data = await response.json();
      const settings = data.settings;
      
      // Homepage Settings
      setHeroCarouselImages(settings.homepage?.heroCarouselImages || []);
      setFeaturedProductsCount(settings.homepage?.featuredProductsCount || 6);
      setFeaturedSkateparksCount(settings.homepage?.featuredSkateparksCount || 6);
      setFeaturedTrainersCount(settings.homepage?.featuredTrainersCount || 6);
      setFeaturedGuidesCount(settings.homepage?.featuredGuidesCount || 6);
      
      // Shop Settings
      setProductsPerPage(settings.shop?.productsPerPage || 12);
      setDefaultSortOrder(settings.shop?.defaultSortOrder || 'createdAt-desc');
      setShowOutOfStockProducts(settings.shop?.showOutOfStockProducts || false);
      setGuestCheckoutEnabled(settings.shop?.guestCheckoutEnabled || true);
      
      // Email Settings
      setAdminNotificationEmail(settings.email?.adminNotificationEmail || '');
      setOrderConfirmationTemplate(settings.email?.orderConfirmationTemplate || '');
      setContactFormRecipient(settings.email?.contactFormRecipient || '');
      
      // SEO Settings
      setSiteTitle(settings.seo?.siteTitle || '');
      setDefaultMetaDescription(settings.seo?.defaultMetaDescription || '');
      setFacebookImage(settings.seo?.facebookImage || '');
      setTwitterImage(settings.seo?.twitterImage || '');
      
      // Maintenance Settings
      setMaintenanceEnabled(settings.maintenance?.enabled || false);
      setMaintenanceMessage(settings.maintenance?.customMessage || '');
      
    } catch (error) {
      console.error('Error fetching settings:', error);
      setNotification({ type: 'error', message: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setNotification(null);
    
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homepage: {
            heroCarouselImages,
            featuredProductsCount,
            featuredSkateparksCount,
            featuredTrainersCount,
            featuredGuidesCount,
          },
          shop: {
            productsPerPage,
            defaultSortOrder,
            showOutOfStockProducts,
            guestCheckoutEnabled,
          },
          email: {
            adminNotificationEmail,
            orderConfirmationTemplate,
            contactFormRecipient,
          },
          seo: {
            siteTitle,
            defaultMetaDescription,
            facebookImage,
            twitterImage,
          },
          maintenance: {
            enabled: maintenanceEnabled,
            customMessage: maintenanceMessage,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to save settings');
      
      setNotification({ type: 'success', message: 'Settings saved successfully!' });
      
      // Hide success notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      setNotification({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const addCarouselImage = () => {
    // At least one image URL must be provided
    if (!newDesktopImageUrl.trim() && !newTabletImageUrl.trim() && !newMobileImageUrl.trim()) return;
    
    const title: IMultilingualText = {};
    if (newImageTitleEn.trim()) title.en = newImageTitleEn.trim();
    if (newImageTitleHe.trim()) title.he = newImageTitleHe.trim();
    
    const subtitle: IMultilingualText = {};
    if (newImageSubtitleEn.trim()) subtitle.en = newImageSubtitleEn.trim();
    if (newImageSubtitleHe.trim()) subtitle.he = newImageSubtitleHe.trim();
    
    const ctaText: IMultilingualText = {};
    if (newImageCtaTextEn.trim()) ctaText.en = newImageCtaTextEn.trim();
    if (newImageCtaTextHe.trim()) ctaText.he = newImageCtaTextHe.trim();
    
    const textOverlay: IMultilingualText = {};
    if (newImageTextOverlayEn.trim()) textOverlay.en = newImageTextOverlayEn.trim();
    if (newImageTextOverlayHe.trim()) textOverlay.he = newImageTextOverlayHe.trim();
    
    const newImage: IHeroCarouselImage = {
      desktopImageUrl: newDesktopImageUrl.trim() || undefined,
      tabletImageUrl: newTabletImageUrl.trim() || undefined,
      mobileImageUrl: newMobileImageUrl.trim() || undefined,
      link: newImageLink.trim() || undefined,
      title: Object.keys(title).length > 0 ? title : undefined,
      subtitle: Object.keys(subtitle).length > 0 ? subtitle : undefined,
      ctaText: Object.keys(ctaText).length > 0 ? ctaText : undefined,
      textOverlay: Object.keys(textOverlay).length > 0 ? textOverlay : undefined,
      order: heroCarouselImages.length,
    };
    
    setHeroCarouselImages([...heroCarouselImages, newImage]);
    setNewDesktopImageUrl('');
    setNewTabletImageUrl('');
    setNewMobileImageUrl('');
    setNewImageLink('');
    setNewImageTitleEn('');
    setNewImageTitleHe('');
    setNewImageSubtitleEn('');
    setNewImageSubtitleHe('');
    setNewImageCtaTextEn('');
    setNewImageCtaTextHe('');
    setNewImageTextOverlayEn('');
    setNewImageTextOverlayHe('');
  };

  const startEditing = (index: number) => {
    const img = heroCarouselImages[index];
    setOpenCarouselIndex(index); // expand accordion when editing
    setEditingIndex(index);
    setEditDesktopImageUrl(img.desktopImageUrl || '');
    setEditTabletImageUrl(img.tabletImageUrl || '');
    setEditMobileImageUrl(img.mobileImageUrl || '');
    setEditImageLink(img.link || '');
    setEditImageTitleEn(getMultilingualText(img.title, 'en'));
    setEditImageTitleHe(getMultilingualText(img.title, 'he'));
    setEditImageSubtitleEn(getMultilingualText(img.subtitle, 'en'));
    setEditImageSubtitleHe(getMultilingualText(img.subtitle, 'he'));
    setEditImageCtaTextEn(getMultilingualText(img.ctaText, 'en'));
    setEditImageCtaTextHe(getMultilingualText(img.ctaText, 'he'));
    setEditImageTextOverlayEn(getMultilingualText(img.textOverlay, 'en'));
    setEditImageTextOverlayHe(getMultilingualText(img.textOverlay, 'he'));
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    
    const title: IMultilingualText = {};
    if (editImageTitleEn.trim()) title.en = editImageTitleEn.trim();
    if (editImageTitleHe.trim()) title.he = editImageTitleHe.trim();
    
    const subtitle: IMultilingualText = {};
    if (editImageSubtitleEn.trim()) subtitle.en = editImageSubtitleEn.trim();
    if (editImageSubtitleHe.trim()) subtitle.he = editImageSubtitleHe.trim();
    
    const ctaText: IMultilingualText = {};
    if (editImageCtaTextEn.trim()) ctaText.en = editImageCtaTextEn.trim();
    if (editImageCtaTextHe.trim()) ctaText.he = editImageCtaTextHe.trim();
    
    const textOverlay: IMultilingualText = {};
    if (editImageTextOverlayEn.trim()) textOverlay.en = editImageTextOverlayEn.trim();
    if (editImageTextOverlayHe.trim()) textOverlay.he = editImageTextOverlayHe.trim();
    
    const updatedImages = [...heroCarouselImages];
    updatedImages[editingIndex] = {
      ...updatedImages[editingIndex],
      desktopImageUrl: editDesktopImageUrl.trim() || undefined,
      tabletImageUrl: editTabletImageUrl.trim() || undefined,
      mobileImageUrl: editMobileImageUrl.trim() || undefined,
      link: editImageLink.trim() || undefined,
      title: Object.keys(title).length > 0 ? title : undefined,
      subtitle: Object.keys(subtitle).length > 0 ? subtitle : undefined,
      ctaText: Object.keys(ctaText).length > 0 ? ctaText : undefined,
      textOverlay: Object.keys(textOverlay).length > 0 ? textOverlay : undefined,
    };
    
    setHeroCarouselImages(updatedImages);
    setEditingIndex(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
  };

  const removeCarouselImage = (index: number) => {
    const newImages = heroCarouselImages.filter((_, i) => i !== index);
    // Reorder images
    const reorderedImages = newImages.map((img, i) => ({ ...img, order: i }));
    setHeroCarouselImages(reorderedImages);
  };

  const moveCarouselImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...heroCarouselImages];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newImages.length) return;
    
    const temp = newImages[index];
    newImages[index] = newImages[newIndex];
    newImages[newIndex] = temp;
    
    // Update orders
    const reorderedImages = newImages.map((img, i) => ({ ...img, order: i }));
    setHeroCarouselImages(reorderedImages);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-background dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-main dark:border-brand-dark mx-auto"></div>
          <p className="mt-4 text-text-secondary dark:text-text-secondary-dark">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 space-y-6 w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your site settings and preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} variant="brand">
          {saving ? (
            <span className="flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Saving...</span>
            </span>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>

      {/* Success/Error Notification */}
      {notification && (
        <div className={`p-4 rounded-lg border ${
          notification.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <svg className="h-5 w-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Homepage Settings */}
      <Card className="bg-card dark:bg-card-dark">
        <CardHeader>
          <CardTitle className="text-text dark:text-text-dark">Homepage Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hero Carousel */}
          <div>
            <h3 className="text-lg font-semibold text-text dark:text-text-dark mb-4">Hero Carousel</h3>
            
            {/* Add New Image - shown only when user clicks Add new image */}
            {!showAddCarouselForm ? (
              <Button variant="gray" size="sm" onClick={() => setShowAddCarouselForm(true)} className="mb-4">
                Add new image
              </Button>
            ) : (
              <div className="border border-border dark:border-border-dark rounded-lg p-4 mb-4 bg-white/50 dark:bg-black/10">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-text dark:text-text-dark">Add New Carousel Image</h4>
                  <Button variant="red" size="sm" onClick={() => setShowAddCarouselForm(false)}>
                    Close
                  </Button>
                </div>
                <div className="space-y-3">
                  <Input
                    label="Desktop Image URL (optional - used as fallback)"
                    type="text"
                    placeholder="https://example.com/desktop-image.jpg"
                    value={newDesktopImageUrl}
                    onChange={(e) => setNewDesktopImageUrl(e.target.value)}
                  />
                  <Input
                    label="Tablet Image URL (optional)"
                    type="text"
                    placeholder="https://example.com/tablet-image.jpg"
                    value={newTabletImageUrl}
                    onChange={(e) => setNewTabletImageUrl(e.target.value)}
                  />
                  <Input
                    label="Mobile Image URL (optional)"
                    type="text"
                    placeholder="https://example.com/mobile-image.jpg"
                    value={newMobileImageUrl}
                    onChange={(e) => setNewMobileImageUrl(e.target.value)}
                  />
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title (optional)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="English"
                        type="text"
                        placeholder="Title (EN)"
                        value={newImageTitleEn}
                        onChange={(e) => setNewImageTitleEn(e.target.value)}
                      />
                      <Input
                        label="Hebrew"
                        type="text"
                        placeholder="כותרת (HE)"
                        value={newImageTitleHe}
                        onChange={(e) => setNewImageTitleHe(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subtitle (optional)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="English"
                        type="text"
                        placeholder="Subtitle (EN)"
                        value={newImageSubtitleEn}
                        onChange={(e) => setNewImageSubtitleEn(e.target.value)}
                      />
                      <Input
                        label="Hebrew"
                        type="text"
                        placeholder="תת-כותרת (HE)"
                        value={newImageSubtitleHe}
                        onChange={(e) => setNewImageSubtitleHe(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">CTA Button Text (optional)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="English"
                        type="text"
                        placeholder="Click Here (EN)"
                        value={newImageCtaTextEn}
                        onChange={(e) => setNewImageCtaTextEn(e.target.value)}
                      />
                      <Input
                        label="Hebrew"
                        type="text"
                        placeholder="לחץ כאן (HE)"
                        value={newImageCtaTextHe}
                        onChange={(e) => setNewImageCtaTextHe(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Text Overlay (optional)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="English"
                        type="text"
                        placeholder="Overlay Text (EN)"
                        value={newImageTextOverlayEn}
                        onChange={(e) => setNewImageTextOverlayEn(e.target.value)}
                      />
                      <Input
                        label="Hebrew"
                        type="text"
                        placeholder="טקסט כיסוי (HE)"
                        value={newImageTextOverlayHe}
                        onChange={(e) => setNewImageTextOverlayHe(e.target.value)}
                      />
                    </div>
                  </div>
                  <Input
                    label="Link (optional)"
                    type="text"
                    placeholder="https://example.com/page"
                    value={newImageLink}
                    onChange={(e) => setNewImageLink(e.target.value)}
                  />
                  <Button variant="secondary" size="sm" onClick={addCarouselImage} className="w-full">
                    Add Image
                  </Button>
                </div>
              </div>
            )}

            {/* Carousel Images List - accordion style */}
            {heroCarouselImages.length > 0 && (
              <div className="border border-border dark:border-border-dark rounded-lg overflow-hidden">
                {heroCarouselImages.map((img, index) => {
                  const previewImage = img.desktopImageUrl || img.tabletImageUrl || img.mobileImageUrl;
                  const isEditing = editingIndex === index;
                  const isOpen = openCarouselIndex === index;
                  const summaryTitle = getMultilingualText(img.title, 'en') || getMultilingualText(img.title, 'he') || `Carousel Image #${index + 1}`;

                  return (
                    <div
                      key={index}
                      className="border-b border-border dark:border-border-dark last:border-b-0 bg-card dark:bg-card-dark"
                    >
                      {/* Accordion header */}
                      <button
                        type="button"
                        onClick={() => setOpenCarouselIndex(isOpen ? null : index)}
                        className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-sidebar-hover dark:hover:bg-sidebar-hover-dark transition-colors"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {previewImage ? (
                            <img src={previewImage} alt="" className="w-14 h-14 object-cover rounded shrink-0" />
                          ) : (
                            <div className="w-14 h-14 rounded bg-muted dark:bg-muted-dark shrink-0 flex items-center justify-center text-xs text-text-secondary dark:text-text-secondary-dark">
                              No image
                            </div>
                          )}
                          <span className="font-medium text-text dark:text-text-dark truncate">
                            {summaryTitle}
                          </span>
                          <span className="text-xs text-text-secondary dark:text-text-secondary-dark shrink-0">
                            Order {index + 1}
                          </span>
                        </div>
                        <svg
                          className={`w-4 h-4 text-text-secondary dark:text-text-secondary-dark transition-transform duration-300 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>                      </button>

                      {/* Accordion body */}
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="px-4 pb-4">
                          {isEditing ? (
                            <div className="pt-2 space-y-3">
                              <h5 className="font-medium text-text dark:text-text-dark">Editing Carousel Image #{index + 1}</h5>
                              <Input
                                label="Desktop Image URL"
                                type="text"
                                value={editDesktopImageUrl}
                                onChange={(e) => setEditDesktopImageUrl(e.target.value)}
                              />
                              <Input
                                label="Tablet Image URL"
                                type="text"
                                value={editTabletImageUrl}
                                onChange={(e) => setEditTabletImageUrl(e.target.value)}
                              />
                              <Input
                                label="Mobile Image URL"
                                type="text"
                                value={editMobileImageUrl}
                                onChange={(e) => setEditMobileImageUrl(e.target.value)}
                              />
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                                <div className="grid grid-cols-2 gap-2">
                                  <Input label="English" type="text" value={editImageTitleEn} onChange={(e) => setEditImageTitleEn(e.target.value)} />
                                  <Input label="Hebrew" type="text" value={editImageTitleHe} onChange={(e) => setEditImageTitleHe(e.target.value)} />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subtitle</label>
                                <div className="grid grid-cols-2 gap-2">
                                  <Input label="English" type="text" value={editImageSubtitleEn} onChange={(e) => setEditImageSubtitleEn(e.target.value)} />
                                  <Input label="Hebrew" type="text" value={editImageSubtitleHe} onChange={(e) => setEditImageSubtitleHe(e.target.value)} />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">CTA Button Text</label>
                                <div className="grid grid-cols-2 gap-2">
                                  <Input label="English" type="text" value={editImageCtaTextEn} onChange={(e) => setEditImageCtaTextEn(e.target.value)} />
                                  <Input label="Hebrew" type="text" value={editImageCtaTextHe} onChange={(e) => setEditImageCtaTextHe(e.target.value)} />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Text Overlay</label>
                                <div className="grid grid-cols-2 gap-2">
                                  <Input label="English" type="text" value={editImageTextOverlayEn} onChange={(e) => setEditImageTextOverlayEn(e.target.value)} />
                                  <Input label="Hebrew" type="text" value={editImageTextOverlayHe} onChange={(e) => setEditImageTextOverlayHe(e.target.value)} />
                                </div>
                              </div>
                              <Input label="Link" type="text" value={editImageLink} onChange={(e) => setEditImageLink(e.target.value)} />
                              <div className="flex gap-2">
                                <Button variant="green" size="sm" onClick={saveEdit} className="flex-1">Save Changes</Button>
                                <Button variant="red" size="sm" onClick={cancelEdit} className="flex-1">Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-2">
                              <div className="flex items-start space-x-4 flex-wrap">
                                <div className="shrink-0">
                                  {previewImage && (
                                    <img src={previewImage} alt={`Carousel ${index + 1}`} className="w-24 h-24 object-cover rounded" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                  {img.desktopImageUrl && <p className="text-xs text-text-secondary dark:text-text-secondary-dark truncate">Desktop: {img.desktopImageUrl}</p>}
                                  {img.tabletImageUrl && <p className="text-xs text-text-secondary dark:text-text-secondary-dark truncate">Tablet: {img.tabletImageUrl}</p>}
                                  {img.mobileImageUrl && <p className="text-xs text-text-secondary dark:text-text-secondary-dark truncate">Mobile: {img.mobileImageUrl}</p>}
                                  {img.link && <p className="text-xs text-text-secondary dark:text-text-secondary-dark truncate">Link: {img.link}</p>}
                                  {typeof img.title === 'object' && img.title && (
                                    <div className="text-xs text-text-secondary dark:text-text-secondary-dark">
                                      <p>Title EN: {img.title.en || '(empty)'}</p>
                                      <p>Title HE: {img.title.he || '(empty)'}</p>
                                    </div>
                                  )}
                                  {typeof img.subtitle === 'object' && img.subtitle && (
                                    <div className="text-xs text-text-secondary dark:text-text-secondary-dark">
                                      <p>Subtitle EN: {img.subtitle.en || '(empty)'}</p>
                                      <p>Subtitle HE: {img.subtitle.he || '(empty)'}</p>
                                    </div>
                                  )}
                                  {typeof img.ctaText === 'object' && img.ctaText && (
                                    <div className="text-xs text-text-secondary dark:text-text-secondary-dark">
                                      <p>CTA EN: {img.ctaText.en || '(empty)'}</p>
                                      <p>CTA HE: {img.ctaText.he || '(empty)'}</p>
                                    </div>
                                  )}
                                  {typeof img.textOverlay === 'object' && img.textOverlay && (
                                    <div className="text-xs text-text-secondary dark:text-text-secondary-dark">
                                      <p>Overlay EN: {img.textOverlay.en || '(empty)'}</p>
                                      <p>Overlay HE: {img.textOverlay.he || '(empty)'}</p>
                                    </div>
                                  )}
                                  <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Order: {img.order + 1}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button variant="blue" size="sm" onClick={() => startEditing(index)}>
                                    <Icon name="editBold" className="w-5 h-5" />
                                  </Button>
                                  <Button variant="gray" size="sm" onClick={() => moveCarouselImage(index, 'up')} disabled={index === 0}>
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                  </Button>                                  <Button variant="gray" size="sm" onClick={() => moveCarouselImage(index, 'down')} disabled={index === heroCarouselImages.length - 1}>
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                  </Button>
                                  <Button variant="red" size="sm" onClick={() => removeCarouselImage(index)}>
                                    <Icon name="trashBold" className="w-5 h-5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Featured Counts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Featured Products Count
              </label>
              <NumberInput
                value={featuredProductsCount}
                onChange={(e) => setFeaturedProductsCount(Number(e.target.value))}
                min={1}
                max={20}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Featured Skateparks Count
              </label>
              <NumberInput
                value={featuredSkateparksCount}
                onChange={(e) => setFeaturedSkateparksCount(Number(e.target.value))}
                min={1}
                max={20}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Featured Trainers Count
              </label>
              <NumberInput
                value={featuredTrainersCount}
                onChange={(e) => setFeaturedTrainersCount(Number(e.target.value))}
                min={1}
                max={20}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Featured Guides Count
              </label>
              <NumberInput
                value={featuredGuidesCount}
                onChange={(e) => setFeaturedGuidesCount(Number(e.target.value))}
                min={1}
                max={20}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shop Settings */}
      <Card className="bg-card dark:bg-card-dark">
        <CardHeader>
          <CardTitle className="text-text dark:text-text-dark">Shop Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Products Per Page
            </label>
            <NumberInput
              value={productsPerPage}
              onChange={(e) => setProductsPerPage(Number(e.target.value))}
              min={6}
              max={48}
            />
          </div>
          <SelectWrapper
            label="Default Sort Order"
            value={defaultSortOrder}
            onChange={(e: { target: { value: string } }) => setDefaultSortOrder(e.target.value)}
            options={[
              { value: 'createdAt-desc', label: 'Newest First' },
              { value: 'createdAt-asc', label: 'Oldest First' },
              { value: 'price-asc', label: 'Price Low to High' },
              { value: 'price-desc', label: 'Price High to Low' },
              { value: 'name-asc', label: 'Name A to Z' },
              { value: 'name-desc', label: 'Name Z to A' },
            ]}
          />
          <Checkbox
            id="show-out-of-stock"
            checked={showOutOfStockProducts}
            onChange={setShowOutOfStockProducts}
            label="Show Out of Stock Products"
          />
          <Checkbox
            id="guest-checkout"
            checked={guestCheckoutEnabled}
            onChange={setGuestCheckoutEnabled}
            label="Enable Guest Checkout"
          />
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card className="bg-card dark:bg-card-dark">
        <CardHeader>
          <CardTitle className="text-text dark:text-text-dark">Email Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Admin Notification Email"
            type="email"
            value={adminNotificationEmail}
            onChange={(e) => setAdminNotificationEmail(e.target.value)}
            placeholder="admin@example.com"
          />
          <Input
            label="Contact Form Recipient"
            type="email"
            value={contactFormRecipient}
            onChange={(e) => setContactFormRecipient(e.target.value)}
            placeholder="contact@example.com"
          />
          <Textarea
            label="Order Confirmation Template"
            value={orderConfirmationTemplate}
            onChange={(e) => setOrderConfirmationTemplate(e.target.value)}
            placeholder="Thank you for your order..."
            rows={5}
          />
        </CardContent>
      </Card>

      {/* SEO Settings */}
      <Card className="bg-card dark:bg-card-dark">
        <CardHeader>
          <CardTitle className="text-text dark:text-text-dark">SEO Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Site Title"
            type="text"
            value={siteTitle}
            onChange={(e) => setSiteTitle(e.target.value)}
            placeholder="My Awesome Site"
          />
          <Textarea
            label="Default Meta Description"
            value={defaultMetaDescription}
            onChange={(e) => setDefaultMetaDescription(e.target.value)}
            placeholder="A brief description of your site..."
            rows={3}
          />
          <Input
            label="Facebook Image URL"
            type="text"
            value={facebookImage}
            onChange={(e) => setFacebookImage(e.target.value)}
            placeholder="https://example.com/og-image.jpg"
          />
          <Input
            label="Twitter Image URL"
            type="text"
            value={twitterImage}
            onChange={(e) => setTwitterImage(e.target.value)}
            placeholder="https://example.com/twitter-image.jpg"
          />
        </CardContent>
      </Card>

      {/* Maintenance Mode */}
      <Card className="bg-card dark:bg-card-dark">
        <CardHeader>
          <CardTitle className="text-text dark:text-text-dark">Maintenance Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Checkbox
            id="maintenance-enabled"
            checked={maintenanceEnabled}
            onChange={setMaintenanceEnabled}
            label="Enable Maintenance Mode"
          />
          <Textarea
            label="Custom Maintenance Message"
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            placeholder="We're currently performing scheduled maintenance. Please check back soon."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Environment Flags (.env) */}
      <Card className="bg-card dark:bg-card-dark">
        <CardHeader>
          <CardTitle className="text-text dark:text-text-dark">Environment Flags (.env)</CardTitle>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Current environment flags from .env.local (NEXT_PUBLIC_*). 
            <br />
            Change values in .env.local and restart the server.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variable</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ENV_FLAGS.map(({ key, description }) => {
                const value = ENV_FLAG_VALUES[key] ?? false;
                return (
                  <TableRow key={key}>
                    <TableCell className="font-mono text-xs text-text dark:text-text-dark">{key}</TableCell>
                    <TableCell className="text-text-secondary dark:text-text-secondary-dark">{description}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={value ? 'primary' : 'gray'}>
                        {value ? 'on' : 'off'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bottom Save Button */}
      <div className="px-6 py-4 border-t border-border dark:border-border-dark flex items-center justify-end">
        <Button onClick={handleSave} disabled={saving} variant="primary" size="lg">
            {saving ? (
            <span className="flex items-center justify-center gap-2 min-w-[7.3rem]">
            <LoadingSpinner size={16} variant="brand" />
            </span>
            ) : (
              'Save All Changes'
            )}
        </Button>
      </div>
    </div>
  );
}
