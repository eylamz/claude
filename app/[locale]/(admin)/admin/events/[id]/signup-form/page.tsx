'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, SelectWrapper, Skeleton, Toaster, Textarea } from '@/components/ui';
import { Checkbox } from '@/components/ui/checkbox';
import { NumberInput } from '@/components/ui/number-input';
import { useToast } from '@/hooks/use-toast';

type FieldType = 
  | 'text' 
  | 'email' 
  | 'phone' 
  | 'number'
  | 'textarea' 
  | 'dropdown' 
  | 'checkbox' 
  | 'radio' 
  | 'date' 
  | 'file' 
  | 'signature';

interface FormField {
  id: string;
  type: FieldType;
  label: { en: string; he: string };
  name: string;
  required: boolean;
  placeholder: { en: string; he: string };
  helpText: { en: string; he: string };
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string;
  };
  options?: { en: string[]; he: string[] }; // For dropdown, radio, checkbox
  /** For checkbox options: optional link URL per option (e.g. privacy policy). Same length as options.en */
  optionLinkUrls?: string[];
  conditionalLogic?: {
    dependsOn: string;
    condition: 'equals' | 'not-equals' | 'contains' | 'greater-than' | 'less-than';
    value: string;
  };
  acceptFileTypes?: string; // For file upload
  maxFileSize?: number; // In MB
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text Input' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'date', label: 'Date Picker' },
  { value: 'file', label: 'File Upload' },
  { value: 'signature', label: 'Signature Pad' },
];

export default function EventSignupFormPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale() as 'en' | 'he';
  const eventId = params.id as string;
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'en' | 'he'>('en');
  const [viewMode, setViewMode] = useState<'builder' | 'preview' | 'test'>('builder');
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState({ en: 'Event Registration', he: 'רישום לאירוע' });
  const [formDescription, setFormDescription] = useState({ en: '', he: '' });
  const [eventRules, setEventRules] = useState({ en: '', he: '' });
  const [showEventRulesCheckbox, setShowEventRulesCheckbox] = useState(false);
  const [showPrivacyCheckbox, setShowPrivacyCheckbox] = useState(false);
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventSlug, setEventSlug] = useState<string | null>(null);
  const draggedFieldRef = useRef<FormField | null>(null);

  // Load event and signup form config
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/events/${eventId}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!data.event || cancelled) return;
        setEventSlug(data.event.slug || null);
        if (data.event.eventRules && typeof data.event.eventRules === 'object') {
          setEventRules({
            en: typeof data.event.eventRules.en === 'string' ? data.event.eventRules.en : '',
            he: typeof data.event.eventRules.he === 'string' ? data.event.eventRules.he : '',
          });
        }
        const sf = data.event.signupForm;
        if (sf?.title) {
          setFormTitle(sf.title);
        }
        if (sf?.description) {
          setFormDescription(sf.description);
        }
        if (typeof sf?.showEventRulesCheckbox === 'boolean') {
          setShowEventRulesCheckbox(sf.showEventRulesCheckbox);
        }
        if (typeof sf?.showPrivacyCheckbox === 'boolean') {
          setShowPrivacyCheckbox(sf.showPrivacyCheckbox);
        }
        if (typeof sf?.privacyPolicyUrl === 'string' && sf.privacyPolicyUrl.trim()) {
          setPrivacyPolicyUrl(sf.privacyPolicyUrl);
        } else if (sf?.showPrivacyCheckbox) {
          setPrivacyPolicyUrl('/[locale]/terms#privacy-policy');
        }
        if (Array.isArray(sf?.fields) && sf.fields.length > 0) {
          const mapped: FormField[] = sf.fields.map((f: any, idx: number) => {
            const hasOptions = f.type === 'select' || f.type === 'dropdown' || f.type === 'checkbox';
            const opts = Array.isArray(f.options) && f.options.length > 0 ? f.options : [];
            const optionLinkUrls = opts.map((o: any) => (typeof o?.linkUrl === 'string' ? o.linkUrl : ''));
            return {
              id: f.id || `field-${Date.now()}-${idx}`,
              type: f.type === 'select' ? 'dropdown' : (f.type === 'dropdown' ? 'dropdown' : f.type) as FieldType,
              label: f.label || { en: '', he: '' },
              name: f.name || `field_${idx}`,
              required: Boolean(f.required),
              placeholder: f.placeholder || { en: '', he: '' },
              helpText: { en: '', he: '' },
              ...(f.validation && typeof f.validation === 'object' && { validation: f.validation }),
              ...(hasOptions ? {
                options: opts.length
                  ? {
                      en: opts.map((o: any) => (typeof o === 'string' ? o : o?.label?.en ?? o?.value ?? '')),
                      he: opts.map((o: any) => (typeof o === 'string' ? o : o?.label?.he ?? o?.value ?? '')),
                    }
                  : { en: [''], he: [''] },
                ...(f.type === 'checkbox' ? { optionLinkUrls: optionLinkUrls.length ? optionLinkUrls : [''] } : {}),
              } : {}),
            };
          });
          setFields(mapped);
        }
      } catch (e) {
        if (!cancelled) toast({ title: 'Error', description: 'Failed to load event', variant: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId, toast]);

  const handleAddField = (type: FieldType) => {
    const newField: FormField = {
      id: `field-${Date.now()}-${Math.random()}`,
      type,
      label: { en: '', he: '' },
      name: '',
      required: false,
      placeholder: { en: '', he: '' },
      helpText: { en: '', he: '' },
      ...(type === 'dropdown' || type === 'radio' || type === 'checkbox' ? {
        options: { en: [''], he: [''] },
        ...(type === 'checkbox' ? { optionLinkUrls: [''] } : {}),
      } : {}),
      ...(type === 'file' ? {
        acceptFileTypes: '',
        maxFileSize: 5,
      } : {}),
      ...(type === 'number' ? {
        validation: { min: 0, max: 100 },
      } : {}),
    };

    setFields([...fields, newField]);
    setSelectedField(newField.id);
  };

  const handleUpdateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
    if (selectedField === id) {
      setSelectedField(null);
    }
  };

  const handleAddOption = (fieldId: string) => {
    const lang = activeTab;
    setFields(fields.map(field => {
      if (field.id !== fieldId || !field.options) return field;
      const otherLang = lang === 'en' ? 'he' : 'en';
      const currentOther = field.options[otherLang] || [];
      const newLen = (field.options[lang] || []).length + 1;
      return {
        ...field,
        options: {
          ...field.options,
          [lang]: [...(field.options[lang] || []), ''],
          [otherLang]: currentOther.length >= newLen ? currentOther : [...currentOther, ...Array(newLen - currentOther.length).fill('')],
        },
        ...(field.type === 'checkbox' ? { optionLinkUrls: [...(field.optionLinkUrls || []), ''] } : {}),
      };
    }));
  };

  const handleUpdateOption = (fieldId: string, index: number, value: string) => {
    const lang = activeTab;
    setFields(fields.map(field =>
      field.id === fieldId && field.options
        ? {
            ...field,
            options: {
              ...field.options,
              [lang]: field.options[lang].map((opt, i) => i === index ? value : opt),
            },
          }
        : field
    ));
  };

  const handleUpdateOptionLinkUrl = (fieldId: string, optIndex: number, url: string) => {
    setFields(fields.map(field =>
      field.id === fieldId && field.type === 'checkbox'
        ? {
            ...field,
            optionLinkUrls: (field.optionLinkUrls || [...(field.options?.en || []).map(() => '')]).map((u, i) => i === optIndex ? url : u),
          }
        : field
    ));
  };

  const handleRemoveOption = (fieldId: string, index: number) => {
    const lang = activeTab;
    setFields(fields.map(field => {
      if (field.id !== fieldId || !field.options) return field;
      const otherLang = lang === 'en' ? 'he' : 'en';
      return {
        ...field,
        options: {
          ...field.options,
          [lang]: field.options[lang].filter((_, i) => i !== index),
          [otherLang]: field.options[otherLang].filter((_, i) => i !== index),
        },
        ...(field.type === 'checkbox' && field.optionLinkUrls?.length
          ? { optionLinkUrls: field.optionLinkUrls.filter((_, i) => i !== index) }
          : {}),
      };
    }));
  };

  const handleDragStart = (field: FormField) => {
    draggedFieldRef.current = field;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetField: FormField) => {
    if (!draggedFieldRef.current || draggedFieldRef.current.id === targetField.id) {
      draggedFieldRef.current = null;
      return;
    }

    const fieldsCopy = [...fields];
    const draggedIndex = fieldsCopy.findIndex(f => f.id === draggedFieldRef.current!.id);
    const targetIndex = fieldsCopy.findIndex(f => f.id === targetField.id);
    
    fieldsCopy.splice(draggedIndex, 1);
    fieldsCopy.splice(targetIndex, 0, draggedFieldRef.current);
    
    setFields(fieldsCopy);
    draggedFieldRef.current = null;
  };

  const handleExportResponses = () => {
    // In real implementation, fetch responses from API and export to CSV
    alert('Export responses to CSV - Implementation needed');
  };

  const handleTestSubmit = () => {
    alert('Test submission sent!');
  };

  const validateForm = () => {
    if (fields.length === 0) {
      alert('Please add at least one field to the form');
      return false;
    }

    // Validate field names are unique
    const fieldNames = fields.map(f => f.name).filter(Boolean);
    if (new Set(fieldNames).size !== fieldNames.length) {
      alert('Field names must be unique');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const apiFields = fields.map((f, order) => {
        const type = f.type === 'dropdown' || f.type === 'radio' ? 'select' : f.type;
        const optionLabels = f.options?.en?.length || f.options?.he?.length
          ? (f.options?.en || f.options?.he || [''])
          : [];
        const options = optionLabels.length
          ? optionLabels.map((val: string, i: number) => ({
              value: val || `opt_${i}`,
              label: {
                en: (f.options?.en?.[i] ?? val) || '',
                he: (f.options?.he?.[i] ?? val) || '',
              },
              ...(f.type === 'checkbox' && (f.optionLinkUrls?.[i] ?? '').trim() && { linkUrl: (f.optionLinkUrls?.[i] ?? '').trim() }),
            }))
          : undefined;
        return {
          id: f.id,
          name: f.name,
          type,
          label: f.label,
          required: f.required,
          placeholder: f.placeholder,
          options,
          order,
          ...(f.validation && (f.validation.min !== undefined || f.validation.max !== undefined) && { validation: f.validation }),
        };
      });
      const res = await fetch(`/api/admin/events/${eventId}/signup-form`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signupForm: {
            title: formTitle,
            description: formDescription,
            showEventRulesCheckbox,
            showPrivacyCheckbox,
            privacyPolicyUrl: privacyPolicyUrl.trim() || undefined,
            fields: apiFields,
          },
          eventRules: { en: eventRules.en, he: eventRules.he },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }
      toast({ title: 'Saved', description: 'Signup form saved.', variant: 'success' });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to save form',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pt-16 flex items-center justify-between">
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pt-16">
      <Toaster />
      {/* Header - match guides edit */}
      <div className="pt-16 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">Signup Form Builder</h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            {eventSlug ? eventSlug : `Event ID: ${eventId}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button type="button" variant="red" onClick={() => router.back()} className="inline-flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" />
            Cancel
          </Button>
          <Button
            type="button"
            variant="gray"
            onClick={() => router.push(`/${locale}/admin/events/${eventId}/signup-form/submissions`)}
          >
            View submissions
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleExportResponses}>
            Export
          </Button>
          <Button
            type="button"
            variant="blue"
            onClick={() => setViewMode(viewMode === 'builder' ? 'preview' : 'builder')}
          >
            {viewMode === 'builder' ? 'Preview' : 'Edit'}
          </Button>
          <Button type="button" variant="green" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Form'}
          </Button>
        </div>
      </div>

      {/* Mode selector - inline tabs style like guides */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={viewMode === 'builder' ? 'blue' : 'gray'}
              size="sm"
              onClick={() => setViewMode('builder')}
            >
              Builder
            </Button>
            <Button
              type="button"
              variant={viewMode === 'preview' ? 'blue' : 'gray'}
              size="sm"
              onClick={() => setViewMode('preview')}
            >
              Preview
            </Button>
            <Button
              type="button"
              variant={viewMode === 'test' ? 'blue' : 'gray'}
              size="sm"
              onClick={() => setViewMode('test')}
            >
              Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Form Configuration - match guides edit card style */}
      {viewMode === 'builder' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-gray dark:text-gray-dark">Form Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language Tabs - match guides edit */}
            <div className="flex space-x-2 border-b border-border dark:border-border-dark">
              <button
                type="button"
                onClick={() => setActiveTab('en')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'en'
                    ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
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
                    ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'text-text-secondary dark:text-text-secondary-dark'
                }`}
              >
                Hebrew
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">
                Form Title
              </label>
              <Input
                value={formTitle[activeTab]}
                onChange={(e) =>
                  setFormTitle({ ...formTitle, [activeTab]: e.target.value })
                }
                placeholder={activeTab === 'en' ? 'Event Registration' : 'רישום לאירוע'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">
                Form Description
              </label>
              <Textarea
                value={formDescription[activeTab]}
                onChange={(e) =>
                  setFormDescription({ ...formDescription, [activeTab]: e.target.value })
                }
                rows={3}
                placeholder={activeTab === 'en' ? 'Form description' : 'תיאור הטופס'}
                className="w-full"
              />
            </div>

            {/* Event rules – shown on public signup page in a modal */}
            <div className="pt-4 border-t border-border dark:border-border-dark">
              <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                Event rules
              </label>
              <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-2">
                {activeTab === 'en'
                  ? 'Optional. Shown to users on the signup page via a "View event rules" button in a modal.'
                  : 'אופציונלי. מוצג למשתמשים בדף ההרשמה באמצעות כפתור "צפה בכללי האירוע" במודל.'}
              </p>
              <Textarea
                value={eventRules[activeTab]}
                onChange={(e) =>
                  setEventRules({ ...eventRules, [activeTab]: e.target.value })
                }
                rows={6}
                placeholder={activeTab === 'en' ? 'Event rules / participation rules...' : 'כללי האירוע / כללי השתתפות...'}
                className="w-full"
              />
            </div>

            {/* Event rules acceptance checkbox – when on, public page shows required "I accept the Event Rules" checkbox (link opens modal) and hides the "View event rules" button */}
            <div className="pt-4 border-t border-border dark:border-border-dark">
              <Checkbox
                variant="brand"
                id="showEventRulesCheckbox"
                checked={showEventRulesCheckbox}
                onChange={setShowEventRulesCheckbox}
                label={activeTab === 'en' ? 'Add Event Rules acceptance checkbox' : 'הוסף תיבת סימון להסכמה לכללי האירוע'}
              />
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
                {activeTab === 'en'
                  ? 'When on, signup form shows a required "I accept the Event Rules" checkbox (link opens rules in modal). The standalone "View event rules" button is hidden.'
                  : 'כשמופעל, טופס ההרשמה מציג תיבת סימון חובה "אני מקבל/ת את כללי האירוע" (הקישור פותח את הכללים במודל). כפתור "צפה בכללי האירוע" מוסתר.'}
              </p>
            </div>

            {/* Privacy policy acceptance checkbox */}
            <div className="pt-4 border-t border-border dark:border-border-dark">
              <Checkbox
                variant="brand"
                id="showPrivacyCheckbox"
                checked={showPrivacyCheckbox}
                onChange={(checked) => {
                  setShowPrivacyCheckbox(checked);
                  if (checked && !privacyPolicyUrl.trim()) {
                    setPrivacyPolicyUrl('/[locale]/terms#privacy-policy');
                  }
                }}
                label={activeTab === 'en' ? 'Add Privacy Policy acceptance checkbox' : 'הוסף תיבת סימון להסכמה למדיניות פרטיות'}
              />
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
                {activeTab === 'en'
                  ? 'When on, signup form shows a required "I agree to the Privacy Policy" checkbox with link to the terms page (default: /[locale]/terms#privacy-policy).'
                  : 'כשמופעל, טופס ההרשמה מציג תיבת סימון חובה "אני מסכים/ה למדיניות הפרטיות" עם קישור לדף המדיניות (ברירת מחדל: /[locale]/terms#privacy-policy).'}
              </p>
              {showPrivacyCheckbox && (
                <div className="mt-2">
                  <Input
                    value={privacyPolicyUrl}
                    onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
                    placeholder="/[locale]/terms#privacy-policy"
                    className="w-full"
                  />
                  <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
                    {activeTab === 'en' ? 'Default /[locale]/terms#privacy-policy is used when the value is empty.' : 'ברירת המחדל /[locale]/terms#privacy-policy משמשת כאשר הערך ריק.'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Builder Mode - match guides edit card style */}
      {viewMode === 'builder' && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col items-start justify-between gap-4 mb-4">
                <CardTitle className="text-gray dark:text-gray-dark">Form Fields</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {FIELD_TYPES.map(type => (
                    <Button
                      key={type.value}
                      type="button"
                      variant="gray"
                      size="sm"
                      onClick={() => handleAddField(type.value)}
                    >
                      + {type.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <div className="text-center py-12 text-text-secondary dark:text-text-secondary-dark">
                  No fields yet. Click a button above to add a field.
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className={`border-2 rounded-lg p-4 cursor-move transition-colors ${
                        selectedField === field.id
                          ? 'border-brand-main dark:border-brand-dark bg-brand-main/5 dark:bg-brand-dark/10'
                          : 'border-border dark:border-border-dark bg-card dark:bg-card-dark'
                      }`}
                      draggable
                      onDragStart={() => handleDragStart(field)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(field)}
                      onClick={() => setSelectedField(field.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium">{index + 1}.</div>
                          <div>
                            <div className="font-medium text-text dark:text-text-dark">
                              {field.label[activeTab] || `Field ${index + 1}`}
                            </div>
                            <div className="text-xs text-text-secondary dark:text-text-secondary-dark">{field.type}</div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="error"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveField(field.id);
                          }}
                        >
                          Remove
                        </Button>
                      </div>

                      {/* Field Editor */}
                      {selectedField === field.id && (
                        <div className="mt-4 space-y-4 border-t pt-4">
                          {/* Basic Settings */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Label
                              </label>
                              <Input
                                value={field.label[activeTab]}
                                onChange={(e) =>
                                  handleUpdateField(field.id, {
                                    label: { ...field.label, [activeTab]: e.target.value },
                                  })
                                }
                                placeholder={activeTab === 'en' ? 'Field label' : 'תווית שדה'}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Field Name (unique)
                              </label>
                              <Input
                                value={field.name}
                                onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
                                placeholder="field_name"
                                required
                              />
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id={`required-${field.id}`}
                              checked={field.required}
                              onChange={(e) =>
                                handleUpdateField(field.id, { required: e.target.checked })
                              }
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor={`required-${field.id}`} className="text-sm text-gray-700">
                              Required
                            </label>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Placeholder
                            </label>
                            <Input
                              value={field.placeholder[activeTab]}
                              onChange={(e) =>
                                handleUpdateField(field.id, {
                                  placeholder: { ...field.placeholder, [activeTab]: e.target.value },
                                })
                              }
                              placeholder={activeTab === 'en' ? 'Placeholder text' : 'טקסט מציין'}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">
                              Help Text
                            </label>
                            <Textarea
                              value={field.helpText[activeTab]}
                              onChange={(e) =>
                                handleUpdateField(field.id, {
                                  helpText: { ...field.helpText, [activeTab]: e.target.value },
                                })
                              }
                              rows={2}
                              placeholder={activeTab === 'en' ? 'Helpful text' : 'טקסט עזרה'}
                              className="w-full"
                            />
                          </div>

                          {/* Number range (min/max) for number fields */}
                          {field.type === 'number' && (
                            <div>
                              <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                                Value range (Min / Max)
                              </label>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs text-text-secondary dark:text-text-secondary-dark mb-1">Min</label>
                                  <NumberInput
                                    min={-99999}
                                    max={99999}
                                    value={field.validation?.min ?? 0}
                                    onChange={(e) =>
                                      handleUpdateField(field.id, {
                                        validation: { ...field.validation, min: e.target.value ? parseInt(e.target.value, 10) : undefined },
                                      })
                                    }
                                    className="w-fit"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-text-secondary dark:text-text-secondary-dark mb-1">Max</label>
                                  <NumberInput
                                    min={-99999}
                                    max={99999}
                                    value={field.validation?.max ?? 100}
                                    onChange={(e) =>
                                      handleUpdateField(field.id, {
                                        validation: { ...field.validation, max: e.target.value ? parseInt(e.target.value, 10) : undefined },
                                      })
                                    }
                                    className="w-fit"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Options Editor (for dropdown, radio, checkbox) */}
                          {(field.type === 'dropdown' || field.type === 'radio' || field.type === 'checkbox') && (
                            <div>
                              <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                                Options ({activeTab.toUpperCase()})
                              </label>
                              <div className="space-y-2">
                                {(field.options?.[activeTab] || []).map((option, optIndex) => (
                                  <div key={optIndex} className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                      <Input
                                        value={option}
                                        onChange={(e) =>
                                          handleUpdateOption(field.id, optIndex, e.target.value)
                                        }
                                        placeholder={activeTab === 'en' ? 'Option text' : 'טקסט אפשרות'}
                                        className="flex-1"
                                      />
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() =>
                                          handleRemoveOption(field.id, optIndex)
                                        }
                                      >
                                        ×
                                      </Button>
                                    </div>
                                    {field.type === 'checkbox' && (
                                      <div className="pl-1">
                                        <Input
                                          value={(field.optionLinkUrls || [])[optIndex] ?? ''}
                                          onChange={(e) =>
                                            handleUpdateOptionLinkUrl(field.id, optIndex, e.target.value)
                                          }
                                          placeholder={activeTab === 'en' ? 'Link URL (e.g. /privacy or https://...)' : 'קישור (למשל מדיניות פרטיות)'}
                                          className="text-sm"
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => handleAddOption(field.id)}
                                className="mt-2"
                              >
                                + Add Option
                              </Button>
                            </div>
                          )}

                          {/* File Upload Settings */}
                          {field.type === 'file' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Accepted File Types (e.g., .pdf,.jpg,.png)
                                </label>
                                <Input
                                  value={field.acceptFileTypes}
                                  onChange={(e) =>
                                    handleUpdateField(field.id, { acceptFileTypes: e.target.value })
                                  }
                                  placeholder=".pdf,.jpg,.png"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">
                                  Max File Size (MB)
                                </label>
                                <NumberInput
                                  min={1}
                                  max={50}
                                  value={field.maxFileSize ?? 5}
                                  onChange={(e) =>
                                    handleUpdateField(field.id, { maxFileSize: parseInt(e.target.value, 10) })
                                  }
                                  className="w-fit"
                                />
                              </div>
                            </div>
                          )}

                          {/* Validation Rules (min/max length for text; number uses Value range above) */}
                          {field.type !== 'number' && (
                            <div>
                              <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                                Validation Rules (min/max length)
                              </label>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">
                                    Min
                                  </label>
                                  <NumberInput
                                    min={0}
                                    max={99999}
                                    value={field.validation?.min ?? 0}
                                    onChange={(e) =>
                                      handleUpdateField(field.id, {
                                        validation: {
                                          ...field.validation,
                                          min: e.target.value ? parseInt(e.target.value, 10) : undefined,
                                        },
                                      })
                                    }
                                    className="w-fit"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">
                                    Max
                                  </label>
                                  <NumberInput
                                    min={0}
                                    max={99999}
                                    value={field.validation?.max ?? 100}
                                    onChange={(e) =>
                                      handleUpdateField(field.id, {
                                        validation: {
                                          ...field.validation,
                                          max: e.target.value ? parseInt(e.target.value, 10) : undefined,
                                        },
                                      })
                                    }
                                    className="w-fit"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Conditional Logic */}
                          {fields.length > 1 && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Conditional Logic (Show this field when...)
                              </label>
                              <div className="grid grid-cols-3 gap-4">
                                <SelectWrapper
                                  label="Depends On"
                                  value={field.conditionalLogic?.dependsOn || ''}
                                  onChange={(e: { target: { value: string } }) => {
                                    if (e.target.value) {
                                      handleUpdateField(field.id, {
                                        conditionalLogic: field.conditionalLogic ? {
                                          ...field.conditionalLogic,
                                          dependsOn: e.target.value,
                                        } : {
                                          dependsOn: e.target.value,
                                          condition: 'equals',
                                          value: '',
                                        },
                                      });
                                    }
                                  }}
                                  options={[
                                    { value: '', label: 'None' },
                                    ...fields
                                      .filter(f => f.id !== field.id && f.name)
                                      .map(f => ({ value: f.id, label: f.label[activeTab] || f.name })),
                                  ]}
                                />
                                <SelectWrapper
                                  label="Condition"
                                  value={field.conditionalLogic?.condition || 'equals'}
                                  onChange={(e: { target: { value: string } }) =>
                                    handleUpdateField(field.id, {
                                      conditionalLogic: field.conditionalLogic ? {
                                        ...field.conditionalLogic,
                                        condition: e.target.value as 'equals' | 'not-equals' | 'contains' | 'greater-than' | 'less-than',
                                      } : undefined,
                                    })
                                  }
                                  options={[
                                    { value: 'equals', label: 'Equals' },
                                    { value: 'not-equals', label: 'Not Equals' },
                                    { value: 'contains', label: 'Contains' },
                                    { value: 'greater-than', label: 'Greater Than' },
                                    { value: 'less-than', label: 'Less Than' },
                                  ]}
                                />
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Value
                                  </label>
                                  <Input
                                    value={field.conditionalLogic?.value || ''}
                                    onChange={(e) =>
                                      handleUpdateField(field.id, {
                                        conditionalLogic: field.conditionalLogic ? {
                                          ...field.conditionalLogic,
                                          value: e.target.value,
                                        } : undefined,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Preview/Test Mode */}
      {(viewMode === 'preview' || viewMode === 'test') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-gray dark:text-gray-dark">{formTitle[activeTab]}</CardTitle>
            {formDescription[activeTab] && (
              <p className="text-sm text-text-secondary dark:text-text-secondary-dark">{formDescription[activeTab]}</p>
            )}
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              {fields.map(field => (
                <div key={field.id}>
                  <RenderFormField field={field} lang={activeTab} />
                </div>
              ))}
              <div className="flex space-x-3">
                <Button variant="primary" onClick={handleTestSubmit}>
                  {viewMode === 'preview' ? 'Preview Submit' : 'Test Submit'}
                </Button>
                <Button variant="secondary" onClick={() => setViewMode('builder')}>
                  Back to Builder
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper component to render form fields in preview/test mode
function RenderFormField({ field, lang }: { field: FormField; lang: 'en' | 'he' }) {
  const isRequired = field.required;

  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label[lang]} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <Input
            type={field.type}
            placeholder={field.placeholder[lang]}
            required={isRequired}
          />
          {field.helpText[lang] && (
            <p className="mt-1 text-sm text-gray-500">{field.helpText[lang]}</p>
          )}
        </div>
      );

    case 'textarea':
      return (
        <div>
          <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">
            {field.label[lang]} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <Textarea
            rows={4}
            placeholder={field.placeholder[lang]}
            required={isRequired}
            className="w-full"
          />
          {field.helpText[lang] && (
            <p className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">{field.helpText[lang]}</p>
          )}
        </div>
      );

    case 'number':
      return (
        <div>
          <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">
            {field.label[lang]} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <NumberInput
            min={field.validation?.min ?? 0}
            max={field.validation?.max ?? 99999}
            step={1}
            className="w-fit"
          />
          {field.helpText[lang] && (
            <p className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">{field.helpText[lang]}</p>
          )}
        </div>
      );

    case 'dropdown':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label[lang]} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <SelectWrapper
            value=""
            onChange={() => {}}
            options={[
              { value: '', label: 'Select...' },
              ...(field.options?.[lang] || []).filter(Boolean).map(opt => ({
                value: opt,
                label: opt,
              })),
            ]}
          />
          {field.helpText[lang] && (
            <p className="mt-1 text-sm text-gray-500">{field.helpText[lang]}</p>
          )}
        </div>
      );

    case 'radio':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {field.label[lang]} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <div className="space-y-2">
            {(field.options?.[lang] || []).filter(Boolean).map((option, index) => (
              <div key={index} className="flex items-center">
                <input
                  type="radio"
                  name={field.name}
                  value={option}
                  className="w-4 h-4 text-blue-600 border-gray-300"
                  required={isRequired}
                />
                <label className="ml-2 text-sm text-gray-700">{option}</label>
              </div>
            ))}
          </div>
          {field.helpText[lang] && (
            <p className="mt-1 text-sm text-gray-500">{field.helpText[lang]}</p>
          )}
        </div>
      );

    case 'checkbox':
      return (
        <div>
          <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
            {field.label[lang]} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <div className="space-y-2">
            {(field.options?.[lang] || []).filter(Boolean).map((option, index) => {
              const linkUrl = field.optionLinkUrls?.[index]?.trim();
              return (
                <div key={index} className="flex items-center">
                  <input
                    type="checkbox"
                    name={field.name}
                    value={option}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    required={isRequired}
                  />
                  <label className="ml-2 text-sm text-text dark:text-text-dark flex items-center">
                    {linkUrl ? (
                      <a
                        href={linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-main dark:text-brand-dark hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {option}
                      </a>
                    ) : (
                      option
                    )}
                  </label>
                </div>
              );
            })}
          </div>
          {field.helpText[lang] && (
            <p className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">{field.helpText[lang]}</p>
          )}
        </div>
      );

    case 'date':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label[lang]} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <Input
            type="date"
            required={isRequired}
          />
          {field.helpText[lang] && (
            <p className="mt-1 text-sm text-gray-500">{field.helpText[lang]}</p>
          )}
        </div>
      );

    case 'file':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label[lang]} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <input
            type="file"
            accept={field.acceptFileTypes}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required={isRequired}
          />
          {field.helpText[lang] && (
            <p className="mt-1 text-sm text-gray-500">{field.helpText[lang]}</p>
          )}
          {field.maxFileSize && (
            <p className="mt-1 text-xs text-gray-400">Max size: {field.maxFileSize}MB</p>
          )}
        </div>
      );

    case 'signature':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label[lang]} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg h-48 flex items-center justify-center">
            <div className="text-gray-500 text-sm">Signature Pad - Not implemented in preview</div>
          </div>
          {field.helpText[lang] && (
            <p className="mt-1 text-sm text-gray-500">{field.helpText[lang]}</p>
          )}
        </div>
      );

    default:
      return null;
  }
}

