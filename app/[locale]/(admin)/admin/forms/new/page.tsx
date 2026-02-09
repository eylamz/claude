'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, SelectWrapper, Toaster } from '@/components/ui';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUploader } from '@/components/admin';
import { useToast } from '@/hooks/use-toast';
import { NumberInput } from '@/components/ui/number-input';

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'date' | 'number' | 'link' | 'image' | 'image-selection' | 'israel-cities';
  label: { en: string; he: string };
  required: boolean;
  order: number;
  placeholder?: { en: string; he: string };
  options?: Array<{ value: string; label: { en: string; he: string } }>;
  hasOtherOption?: boolean;
  otherInputType?: 'input' | 'textarea';
  otherLabel?: { en: string; he: string };
  otherPlaceholder?: { en: string; he: string };
  images?: Array<{ url: string; alt?: { en: string; he: string } }>;
  min?: number;
  max?: number;
  validation?: any;
}

type FormFieldType = FormField['type'];

interface FormFormData {
  title: { en: string; he: string };
  slug: string;
  description: { en: string; he: string };
  fields: FormField[];
  status: 'draft' | 'published' | 'archived';
  visibleFrom: string;
  visibleUntil: string;
  metaTitle: { en: string; he: string };
  metaDescription: { en: string; he: string };
  metaKeywords: { en: string; he: string };
}

const FORM_FIELD_TYPES: { value: FormFieldType; label: string; icon: string }[] = [
  { value: 'text', label: 'Text Input', icon: '📝' },
  { value: 'textarea', label: 'Textarea', icon: '📄' },
  { value: 'radio', label: 'Radio Buttons', icon: '🔘' },
  { value: 'checkbox', label: 'Checkbox', icon: '☑️' },
  { value: 'select', label: 'Dropdown', icon: '📋' },
  { value: 'date', label: 'Date Picker', icon: '📅' },
  { value: 'number', label: 'Number Input', icon: '🔢' },
  { value: 'link', label: 'Link', icon: '🔗' },
  { value: 'image', label: 'Image', icon: '🖼️' },
  { value: 'image-selection', label: 'Image Selection', icon: '🖼️📸' },
  { value: 'israel-cities', label: 'Israeli Cities', icon: '🏙️' },
];

export default function NewFormPage() {
  const locale = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'en' | 'he'>('en');
  const [previewMode, setPreviewMode] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const draggedFieldRef = useRef<FormField | null>(null);
  const [draggedOverId, setDraggedOverId] = useState<string | null>(null);

  const { toast } = useToast();

  const [formData, setFormData] = useState<FormFormData>({
    title: { en: '', he: '' },
    slug: '',
    description: { en: '', he: '' },
    fields: [],
    status: 'draft',
    visibleFrom: '',
    visibleUntil: '',
    metaTitle: { en: '', he: '' },
    metaDescription: { en: '', he: '' },
    metaKeywords: { en: '', he: '' },
  });

  // Generate slug from title
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (lang: 'en' | 'he', value: string) => {
    setFormData(prev => {
      const newData = { ...prev, title: { ...prev.title, [lang]: value } };
      if (lang === 'en' && (!prev.slug || prev.slug === generateSlug(prev.title.en))) {
        newData.slug = generateSlug(value);
      }
      return newData;
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleAddField = (type: FormFieldType) => {
    const newField: FormField = {
      id: `field-${Date.now()}-${Math.random()}`,
      type,
      label: { en: '', he: '' },
      required: false,
      order: formData.fields.length,
      placeholder: type === 'text' || type === 'textarea' || type === 'link' ? { en: '', he: '' } : undefined,
      options: type === 'radio' || type === 'select' || type === 'checkbox' ? [{ value: '', label: { en: '', he: '' } }] : undefined,
      hasOtherOption: type === 'radio' || type === 'select' ? false : undefined,
      otherInputType: 'input',
      otherLabel: type === 'radio' || type === 'select' ? { en: 'Other', he: 'אחר' } : undefined,
      otherPlaceholder: type === 'radio' || type === 'select' ? { en: 'Please specify...', he: 'אנא ציין...' } : undefined,
      images: type === 'image-selection' ? [] : undefined,
      min: type === 'number' || type === 'date' ? undefined : undefined,
      max: type === 'number' || type === 'date' ? undefined : undefined,
    };

    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setSelectedField(newField.id);
  };

  const handleUpdateField = (id: string, updates: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field =>
        field.id === id ? { ...field, ...updates } : field
      ),
    }));
  };

  const handleRemoveField = (id: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields
        .filter(f => f.id !== id)
        .map((field, index) => ({ ...field, order: index })),
    }));
    if (selectedField === id) {
      setSelectedField(null);
    }
  };

  const handleMoveFieldUp = (fieldId: string) => {
    setFormData(prev => {
      const fields = [...prev.fields];
      const currentIndex = fields.findIndex(f => f.id === fieldId);
      if (currentIndex > 0) {
        [fields[currentIndex - 1], fields[currentIndex]] = [fields[currentIndex], fields[currentIndex - 1]];
        fields.forEach((f, i) => f.order = i);
        return { ...prev, fields };
      }
      return prev;
    });
  };

  const handleMoveFieldDown = (fieldId: string) => {
    setFormData(prev => {
      const fields = [...prev.fields];
      const currentIndex = fields.findIndex(f => f.id === fieldId);
      if (currentIndex < fields.length - 1) {
        [fields[currentIndex], fields[currentIndex + 1]] = [fields[currentIndex + 1], fields[currentIndex]];
        fields.forEach((f, i) => f.order = i);
        return { ...prev, fields };
      }
      return prev;
    });
  };

  const handleAddOption = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field => {
        if (field.id === fieldId && field.options) {
          return {
            ...field,
            options: [...field.options, { value: '', label: { en: '', he: '' } }],
          };
        }
        return field;
      }),
    }));
  };

  const handleUpdateOption = (fieldId: string, index: number, updates: Partial<{ value: string; label: { en: string; he: string } }>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field => {
        if (field.id === fieldId && field.options) {
          return {
            ...field,
            options: field.options.map((opt, i) =>
              i === index ? { ...opt, ...updates } : opt
            ),
          };
        }
        return field;
      }),
    }));
  };

  const handleRemoveOption = (fieldId: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field => {
        if (field.id === fieldId && field.options) {
          return {
            ...field,
            options: field.options.filter((_, i) => i !== index),
          };
        }
        return field;
      }),
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.en) newErrors['title.en'] = 'English title is required';
    if (!formData.title.he) newErrors['title.he'] = 'Hebrew title is required';
    if (!formData.slug) newErrors['slug'] = 'Slug is required';
    if (!formData.description.en) newErrors['description.en'] = 'English description is required';
    if (!formData.description.he) newErrors['description.he'] = 'Hebrew description is required';
    if (formData.fields.length === 0) {
      newErrors['fields'] = 'At least one field is required';
    }

    // Validate each field
    formData.fields.forEach((field, index) => {
      if (!field.label.en) {
        newErrors[`field-${index}-label-en`] = 'English label is required';
      }
      if (!field.label.he) {
        newErrors[`field-${index}-label-he`] = 'Hebrew label is required';
      }
      if ((field.type === 'radio' || field.type === 'select' || field.type === 'checkbox') && (!field.options || field.options.length === 0)) {
        newErrors[`field-${index}-options`] = 'At least one option is required';
      }
      if (field.type === 'image-selection' && (!field.images || field.images.length === 0)) {
        newErrors[`field-${index}-images`] = 'At least one image is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveDraft = useCallback(async () => {
    if (!formData.slug || !formData.title.en) return;

    try {
      const response = await fetch('/api/admin/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'draft',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastSaved(new Date());
        if (data.form && data.form.id) {
          // Store form ID for future updates
        }
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [formData]);

  useEffect(() => {
    const interval = setInterval(saveDraft, 30000);
    return () => clearInterval(interval);
  }, [saveDraft]);

  const handleSubmit = async (e?: React.FormEvent, saveAsDraft: boolean = false) => {
    if (e) e.preventDefault();

    if (!saveAsDraft && !validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        status: saveAsDraft ? 'draft' : 'published',
      };

      const response = await fetch('/api/admin/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create form');
      }

      await response.json();
      setLastSaved(new Date());

      if (saveAsDraft) {
        toast({
          title: 'Success',
          description: 'Draft saved successfully!',
          variant: 'success',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Form published successfully!',
          variant: 'success',
        });
        setTimeout(() => {
          router.push(`/${locale}/admin/forms`);
        }, 2500);
      }
    } catch (error: any) {
      console.error('Error submitting:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save form',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Toaster />
      {/* Header */}
      <div className="pt-16 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">Create New Form</h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            {lastSaved && `Last saved: ${lastSaved.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button type="button" variant="red" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="button" variant="blue" onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button
            type="button"
            variant="orange"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit(undefined, true);
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            type="button"
            variant="green"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Publishing...' : 'Publish Form'}
          </Button>
        </div>
      </div>

      {previewMode ? (
        /* Preview Mode */
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{formData.title[activeTab] || 'Untitled Form'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">{formData.description[activeTab]}</p>
                {formData.fields
                  .sort((a, b) => a.order - b.order)
                  .map((field) => (
                    <div key={field.id} className="border rounded-lg p-4">
                      <label className="block text-sm font-medium mb-2">
                        {field.label[activeTab]} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <div className="text-sm text-gray-500">Field type: {field.type}</div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Edit Mode */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-gray dark:text-gray-dark">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Language Tabs */}
              <div className="flex space-x-2 border-b">
                <button
                  type="button"
                  onClick={() => setActiveTab('en')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'en'
                      ? 'border-b-2 border-blue-border dark:border-blue-border-dark text-blue dark:text-blue-dark'
                      : 'text-text-secondary dark:text-text-secondary-dark'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('he')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'he'
                      ? 'border-b-2 border-blue-border dark:border-blue-border-dark text-blue dark:text-blue-dark'
                      : 'text-text-secondary dark:text-text-secondary-dark'
                  }`}
                >
                  Hebrew
                </button>
              </div>

              {/* Title */}
              <div>
                <Input
                  label="Title"
                  value={formData.title[activeTab]}
                  onChange={(e) => handleTitleChange(activeTab, e.target.value)}
                  placeholder={activeTab === 'en' ? 'Form Title' : 'כותרת הטופס'}
                  error={errors[`title.${activeTab}`]}
                  required
                />
              </div>

              {/* Slug */}
              <div>
                <Input
                  label="Slug"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="form-slug"
                  error={errors.slug}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Textarea
                  label="Description"
                  value={formData.description[activeTab]}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      description: { ...prev.description, [activeTab]: e.target.value },
                    }))
                  }
                  rows={4}
                  placeholder={activeTab === 'en' ? 'Form description' : 'תיאור הטופס'}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Fields Builder */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Form Fields</CardTitle>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="gray" className="gap-2">
                      <span className="text-lg">+</span>
                      Add Field
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="end">
                    <div className="grid grid-cols-2 gap-2">
                      {FORM_FIELD_TYPES.map(type => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAddField(type.value);
                            setPopoverOpen(false);
                          }}
                          className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-gray-border dark:border-gray-border-dark text-left"
                        >
                          <span className="text-2xl">{type.icon}</span>
                          <span className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.fields.length === 0 ? (
                <div className="text-center py-12 text-text-secondary dark:text-text-secondary-dark">
                  No fields yet. Add one to get started.
                </div>
              ) : (
                formData.fields
                  .sort((a, b) => a.order - b.order)
                  .map((field, index) => {
                    const fieldType = FORM_FIELD_TYPES.find(t => t.value === field.type);
                    return (
                      <div
                        key={field.id}
                        className={`bord rounded-lg p-4 transition-all ${
                          selectedField === field.id
                            ? 'border-blue-border bg-blue-bg dark:bg-blue-bg-dark'
                            : draggedOverId === field.id
                            ? 'border-blue-border dark:border-blue-border-dark bg-blue-bg dark:bg-blue-bg-dark border-dashed'
                            : 'border-border dark:border-border-dark'
                        } ${draggedFieldRef.current?.id === field.id ? 'opacity-50' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          draggedFieldRef.current = field;
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedOverId(null);
                        }}
                        onDragEnd={() => {
                          draggedFieldRef.current = null;
                          setDraggedOverId(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (draggedFieldRef.current && draggedFieldRef.current.id !== field.id) {
                            setDraggedOverId(field.id);
                          }
                        }}
                        onDragLeave={() => {
                          setDraggedOverId(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedFieldRef.current && draggedFieldRef.current.id !== field.id) {
                            const fields = [...formData.fields];
                            const draggedIndex = fields.findIndex(f => f.id === draggedFieldRef.current!.id);
                            const targetIndex = fields.findIndex(f => f.id === field.id);
                            const [moved] = fields.splice(draggedIndex, 1);
                            fields.splice(targetIndex, 0, moved);
                            fields.forEach((f, i) => f.order = i);
                            setFormData(prev => ({ ...prev, fields }));
                          }
                          draggedFieldRef.current = null;
                          setDraggedOverId(null);
                        }}
                        onClick={() => setSelectedField(field.id)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2 flex-1">
                            <div className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveFieldUp(field.id);
                                }}
                                disabled={index === 0}
                                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move up"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <span className="text-xs text-text-secondary dark:text-text-secondary-dark font-medium">{index + 1}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveFieldDown(field.id);
                                }}
                                disabled={index === formData.fields.length - 1}
                                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move down"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                            <div className="flex items-center gap-2 cursor-move" title="Drag to reorder">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                              </svg>
                              <span className="text-sm font-medium text-text dark:text-text-dark">
                                {fieldType?.icon} {fieldType?.label}
                              </span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="red"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveField(field.id);
                            }}
                          >
                            Remove
                          </Button>
                        </div>

                        {selectedField === field.id && (
                          <div className="space-y-3 mt-3">
                            {/* Language Tabs for Field */}
                            <div className="flex space-x-2 border-b">
                              <button
                                type="button"
                                onClick={() => setActiveTab('en')}
                                className={`px-3 py-1 text-xs font-medium ${
                                  activeTab === 'en'
                                    ? 'border-b-2 border-blue-border dark:border-blue-border-dark text-blue dark:text-blue-dark'
                                    : 'text-text-secondary dark:text-text-secondary-dark'
                                }`}
                              >
                                EN
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveTab('he')}
                                className={`px-3 py-1 text-xs font-medium ${
                                  activeTab === 'he'
                                    ? 'border-b-2 border-blue-border dark:border-blue-border-dark text-blue dark:text-blue-dark'
                                    : 'text-text-secondary dark:text-text-secondary-dark'
                                }`}
                              >
                                HE
                              </button>
                            </div>

                            {/* Field Label */}
                            <div>
                              <Input
                                label="Field Label"
                                value={field.label[activeTab]}
                                onChange={(e) =>
                                  handleUpdateField(field.id, {
                                    label: { ...field.label, [activeTab]: e.target.value },
                                  })
                                }
                                placeholder={activeTab === 'en' ? 'Question or label' : 'שאלה או תווית'}
                                error={errors[`field-${index}-label-${activeTab}`]}
                                required
                              />
                            </div>

                            {/* Required Toggle */}
                            <div>
                              <Checkbox
                                variant="brand"
                                id={`required-${field.id}`}
                                checked={field.required}
                                onChange={(checked) => handleUpdateField(field.id, { required: checked })}
                                label="Required field"
                              />
                            </div>

                            {/* Type-specific configurations */}
                            {(field.type === 'text' || field.type === 'textarea' || field.type === 'link') && (
                              <div>
                                <Input
                                  label="Placeholder"
                                  value={field.placeholder?.[activeTab] || ''}
                                  onChange={(e) =>
                                    handleUpdateField(field.id, {
                                      placeholder: {
                                        ...(field.placeholder || { en: '', he: '' }),
                                        [activeTab]: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder={activeTab === 'en' ? 'Placeholder text' : 'טקסט מציין מיקום'}
                                />
                              </div>
                            )}

                            {/* Options for radio, select, checkbox */}
                            {(field.type === 'radio' || field.type === 'select' || field.type === 'checkbox') && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
                                    Options
                                  </label>
                                  <Button
                                    type="button"
                                    variant="purple"
                                    size="sm"
                                    onClick={() => handleAddOption(field.id)}
                                  >
                                    + Add Option
                                  </Button>
                                </div>
                                {field.options?.map((option, optIndex) => (
                                  <div key={optIndex} className="border rounded-lg p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
                                        Option {optIndex + 1}
                                      </span>
                                      <Button
                                        type="button"
                                        variant="red"
                                        size="sm"
                                        onClick={() => handleRemoveOption(field.id, optIndex)}
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                    <Input
                                      label="Value"
                                      value={option.value}
                                      onChange={(e) =>
                                        handleUpdateOption(field.id, optIndex, { value: e.target.value })
                                      }
                                      placeholder="option-value"
                                    />
                                    <Input
                                      label={`Label (${activeTab === 'en' ? 'EN' : 'HE'})`}
                                      value={option.label[activeTab]}
                                      onChange={(e) =>
                                        handleUpdateOption(field.id, optIndex, {
                                          label: { ...option.label, [activeTab]: e.target.value },
                                        })
                                      }
                                      placeholder={activeTab === 'en' ? 'Option label' : 'תווית אפשרות'}
                                    />
                                  </div>
                                ))}
                                {errors[`field-${index}-options`] && (
                                  <p className="text-xs text-red-500">{errors[`field-${index}-options`]}</p>
                                )}

                                {/* Other Option */}
                                {(field.type === 'radio' || field.type === 'select') && (
                                  <div className="space-y-2">
                                    <Checkbox
                                      variant="brand"
                                      id={`hasOther-${field.id}`}
                                      checked={field.hasOtherOption || false}
                                      onChange={(checked) => handleUpdateField(field.id, { hasOtherOption: checked })}
                                      label="Add 'Other' option"
                                    />
                                    {field.hasOtherOption && (
                                      <div className="space-y-3 border-l-2 border-gray-300 dark:border-gray-600 pl-3 ml-2">
                                        <div>
                                          <Input
                                            label={`Other Label (${activeTab === 'en' ? 'EN' : 'HE'})`}
                                            value={field.otherLabel?.[activeTab] || ''}
                                            onChange={(e) =>
                                              handleUpdateField(field.id, {
                                                otherLabel: {
                                                  ...(field.otherLabel || { en: 'Other', he: 'אחר' }),
                                                  [activeTab]: e.target.value,
                                                },
                                              })
                                            }
                                            placeholder={activeTab === 'en' ? 'e.g., Other, Something else' : 'למשל, אחר, משהו אחר'}
                                          />
                                        </div>
                                        <div>
                                          <Input
                                            label={`Other Placeholder (${activeTab === 'en' ? 'EN' : 'HE'})`}
                                            value={field.otherPlaceholder?.[activeTab] || ''}
                                            onChange={(e) =>
                                              handleUpdateField(field.id, {
                                                otherPlaceholder: {
                                                  ...(field.otherPlaceholder || { en: 'Please specify...', he: 'אנא ציין...' }),
                                                  [activeTab]: e.target.value,
                                                },
                                              })
                                            }
                                            placeholder={activeTab === 'en' ? 'e.g., Please specify...' : 'למשל, אנא ציין...'}
                                          />
                                        </div>
                                        <SelectWrapper
                                          value={field.otherInputType || 'input'}
                                          onChange={(e) =>
                                            handleUpdateField(field.id, {
                                              otherInputType: e.target.value as 'input' | 'textarea',
                                            })
                                          }
                                          options={[
                                            { value: 'input', label: 'Text Input' },
                                            { value: 'textarea', label: 'Textarea' },
                                          ]}
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Min/Max for number and date */}
                            {(field.type === 'number' || field.type === 'date') && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Minimum</label>
                                  <NumberInput
                                    value={field.min ?? ''}
                                    onChange={(e) =>
                                      handleUpdateField(field.id, {
                                        min: e.target.value ? parseFloat(e.target.value) : undefined,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Maximum</label>
                                  <NumberInput
                                    value={field.max ?? ''}
                                    onChange={(e) =>
                                      handleUpdateField(field.id, {
                                        max: e.target.value ? parseFloat(e.target.value) : undefined,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            )}

                            {/* Images for image-selection */}
                            {field.type === 'image-selection' && (
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
                                  Images
                                </label>
                                <ImageUploader
                                  images={(field.images || []).map(img => ({
                                    url: img.url,
                                    publicId: img.url,
                                    alt: img.alt?.[activeTab],
                                  }))}
                                  onUpload={(images) => {
                                    handleUpdateField(field.id, {
                                      images: images.map(img => ({
                                        url: img.url,
                                        alt: img.alt
                                          ? {
                                              ...(field.images?.[0]?.alt || { en: '', he: '' }),
                                              [activeTab]: img.alt || '',
                                            }
                                          : undefined,
                                      })),
                                    });
                                  }}
                                  maxImages={20}
                                  folder="forms"
                                />
                                <Input
                                  label="Or add image URL"
                                  type="url"
                                  placeholder="https://..."
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const url = e.currentTarget.value.trim();
                                      if (url) {
                                        const currentImages = field.images || [];
                                        handleUpdateField(field.id, {
                                          images: [...currentImages, { url }],
                                        });
                                        e.currentTarget.value = '';
                                      }
                                    }
                                  }}
                                />
                                {errors[`field-${index}-images`] && (
                                  <p className="text-xs text-red-500">{errors[`field-${index}-images`]}</p>
                                )}
                              </div>
                            )}

                            {/* Image URL for image type */}
                            {field.type === 'image' && (
                              <div>
                                <Input
                                  label="Image URL"
                                  type="url"
                                  value={field.images?.[0]?.url || ''}
                                  onChange={(e) =>
                                    handleUpdateField(field.id, {
                                      images: e.target.value ? [{ url: e.target.value }] : [],
                                    })
                                  }
                                  placeholder="https://..."
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>

          {/* Visibility Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Visibility Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Visible From"
                    type="datetime-local"
                    value={formData.visibleFrom}
                    onChange={(e) => handleInputChange('visibleFrom', e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    label="Visible Until"
                    type="datetime-local"
                    value={formData.visibleUntil}
                    onChange={(e) => handleInputChange('visibleUntil', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings & SEO */}
          <Card>
            <CardHeader>
              <CardTitle>Settings & SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                  Status
                </label>
                <SelectWrapper
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'published', label: 'Published' },
                    { value: 'archived', label: 'Archived' },
                  ]}
                />
              </div>

              <div className="space-y-2">
                <Input
                  label="Meta Title"
                  value={formData.metaTitle[activeTab]}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      metaTitle: { ...prev.metaTitle, [activeTab]: e.target.value },
                    }))
                  }
                  placeholder={activeTab === 'en' ? 'SEO title' : 'כותרת SEO'}
                  maxLength={70}
                />
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                  {formData.metaTitle[activeTab].length}/70 characters
                </p>
              </div>

              <div className="space-y-2">
                <Textarea
                  label="Meta Description"
                  value={formData.metaDescription[activeTab]}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      metaDescription: { ...prev.metaDescription, [activeTab]: e.target.value },
                    }))
                  }
                  rows={3}
                  placeholder={activeTab === 'en' ? 'SEO description' : 'תיאור SEO'}
                  maxLength={160}
                />
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                  {formData.metaDescription[activeTab].length}/160 characters
                </p>
              </div>

              <div>
                <Input
                  label="Meta Keywords"
                  value={formData.metaKeywords[activeTab]}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      metaKeywords: { ...prev.metaKeywords, [activeTab]: e.target.value },
                    }))
                  }
                  placeholder={activeTab === 'en' ? 'keyword1, keyword2, keyword3' : 'מילת מפתח 1, מילת מפתח 2'}
                />
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
