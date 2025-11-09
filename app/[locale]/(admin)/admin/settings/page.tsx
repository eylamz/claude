'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea, Select, Checkbox } from '@/components/ui';
import { NumberInput } from '@/components/ui/number-input';
import type { IHeroCarouselImage, IMultilingualText } from '@/lib/models/Settings';

// Helper function for multilingual text
const getMultilingualText = (text: string | IMultilingualText | undefined, lang: 'en' | 'he'): string => {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text[lang] || '';
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your site settings and preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} variant="primary">
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
        <div className={`p-4 rounded-lg ${
          notification.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
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
      <Card>
        <CardHeader>
          <CardTitle>Homepage Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hero Carousel */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Hero Carousel</h3>
            
            {/* Add New Image */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 bg-gray-50 dark:bg-gray-800/50">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Add New Carousel Image</h4>
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

            {/* Carousel Images List */}
            {heroCarouselImages.length > 0 && (
              <div className="space-y-4">
                {heroCarouselImages.map((img, index) => {
                  const previewImage = img.desktopImageUrl || img.tabletImageUrl || img.mobileImageUrl;
                  const isEditing = editingIndex === index;
                  
                  if (isEditing) {
                    return (
                      <div key={index} className="border border-blue-300 dark:border-blue-600 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Editing Carousel Image #{index + 1}</h5>
                        <div className="space-y-3">
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
                              <Input
                                label="English"
                                type="text"
                                value={editImageTitleEn}
                                onChange={(e) => setEditImageTitleEn(e.target.value)}
                              />
                              <Input
                                label="Hebrew"
                                type="text"
                                value={editImageTitleHe}
                                onChange={(e) => setEditImageTitleHe(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subtitle</label>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                label="English"
                                type="text"
                                value={editImageSubtitleEn}
                                onChange={(e) => setEditImageSubtitleEn(e.target.value)}
                              />
                              <Input
                                label="Hebrew"
                                type="text"
                                value={editImageSubtitleHe}
                                onChange={(e) => setEditImageSubtitleHe(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">CTA Button Text</label>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                label="English"
                                type="text"
                                value={editImageCtaTextEn}
                                onChange={(e) => setEditImageCtaTextEn(e.target.value)}
                              />
                              <Input
                                label="Hebrew"
                                type="text"
                                value={editImageCtaTextHe}
                                onChange={(e) => setEditImageCtaTextHe(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Text Overlay</label>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                label="English"
                                type="text"
                                value={editImageTextOverlayEn}
                                onChange={(e) => setEditImageTextOverlayEn(e.target.value)}
                              />
                              <Input
                                label="Hebrew"
                                type="text"
                                value={editImageTextOverlayHe}
                                onChange={(e) => setEditImageTextOverlayHe(e.target.value)}
                              />
                            </div>
                          </div>
                          <Input
                            label="Link"
                            type="text"
                            value={editImageLink}
                            onChange={(e) => setEditImageLink(e.target.value)}
                          />
                          <div className="flex space-x-2">
                            <Button variant="primary" size="sm" onClick={saveEdit} className="flex-1">
                              Save Changes
                            </Button>
                            <Button variant="secondary" size="sm" onClick={cancelEdit} className="flex-1">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                      <div className="flex items-start space-x-4">
                        <div className="shrink-0">
                          {previewImage && (
                            <img src={previewImage} alt={`Carousel ${index + 1}`} className="w-24 h-24 object-cover rounded" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {img.desktopImageUrl && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">Desktop: {img.desktopImageUrl}</p>}
                          {img.tabletImageUrl && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">Tablet: {img.tabletImageUrl}</p>}
                          {img.mobileImageUrl && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">Mobile: {img.mobileImageUrl}</p>}
                          {img.link && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">Link: {img.link}</p>}
                          {typeof img.title === 'object' && img.title && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              <p>Title EN: {img.title.en || '(empty)'}</p>
                              <p>Title HE: {img.title.he || '(empty)'}</p>
                            </div>
                          )}
                          {typeof img.subtitle === 'object' && img.subtitle && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              <p>Subtitle EN: {img.subtitle.en || '(empty)'}</p>
                              <p>Subtitle HE: {img.subtitle.he || '(empty)'}</p>
                            </div>
                          )}
                          {typeof img.ctaText === 'object' && img.ctaText && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              <p>CTA EN: {img.ctaText.en || '(empty)'}</p>
                              <p>CTA HE: {img.ctaText.he || '(empty)'}</p>
                            </div>
                          )}
                          {typeof img.textOverlay === 'object' && img.textOverlay && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              <p>Overlay EN: {img.textOverlay.en || '(empty)'}</p>
                              <p>Overlay HE: {img.textOverlay.he || '(empty)'}</p>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Order: {img.order + 1}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => startEditing(index)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => moveCarouselImage(index, 'up')}
                            disabled={index === 0}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => moveCarouselImage(index, 'down')}
                            disabled={index === heroCarouselImages.length - 1}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => removeCarouselImage(index)}
                            className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            title="Remove"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
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
                showSpinner={true}
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
                showSpinner={true}
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
                showSpinner={true}
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
                showSpinner={true}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shop Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Shop Settings</CardTitle>
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
              showSpinner={true}
            />
          </div>
          <Select
            label="Default Sort Order"
            value={defaultSortOrder}
            onChange={(e) => setDefaultSortOrder(e.target.value)}
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
      <Card>
        <CardHeader>
          <CardTitle>Email Settings</CardTitle>
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
      <Card>
        <CardHeader>
          <CardTitle>SEO Settings</CardTitle>
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
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Mode</CardTitle>
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

      {/* Bottom Save Button */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 -mx-6">
        <div className="flex items-center justify-end space-x-3">
          <Button onClick={handleSave} disabled={saving} variant="primary" size="lg">
            {saving ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saving...</span>
              </span>
            ) : (
              'Save All Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
