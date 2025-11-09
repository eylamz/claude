'use client';

import { useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select } from '@/components/ui';

type FieldType = 
  | 'text' 
  | 'email' 
  | 'phone' 
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
  const eventId = params.id as string;
  
  const [activeTab, setActiveTab] = useState<'en' | 'he'>('en');
  const [viewMode, setViewMode] = useState<'builder' | 'preview' | 'test'>('builder');
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState({ en: 'Event Registration', he: 'רישום לאירוע' });
  const [formDescription, setFormDescription] = useState({ en: '', he: '' });
  const draggedFieldRef = useRef<FormField | null>(null);

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
      } : {}),
      ...(type === 'file' ? {
        acceptFileTypes: '',
        maxFileSize: 5,
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
    setFields(fields.map(field =>
      field.id === fieldId && field.options
        ? {
            ...field,
            options: {
              ...field.options,
              [lang]: [...(field.options[lang] || []), ''],
            },
          }
        : field
    ));
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

  const handleRemoveOption = (fieldId: string, index: number) => {
    const lang = activeTab;
    setFields(fields.map(field =>
      field.id === fieldId && field.options
        ? {
            ...field,
            options: {
              ...field.options,
              [lang]: field.options[lang].filter((_, i) => i !== index),
            },
          }
        : field
    ));
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

  const handleSave = () => {
    if (!validateForm()) return;
    // In real implementation, save to API
    console.log('Saving form...', { eventId, fields, formTitle, formDescription });
    alert('Form saved!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Signup Form Builder</h1>
          <p className="text-sm text-gray-500 mt-1">
            Event ID: {eventId}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" onClick={() => router.back()}>
            Back
          </Button>
          <Button variant="secondary" onClick={handleExportResponses}>
            Export Responses
          </Button>
          <Button
            variant="secondary"
            onClick={() => setViewMode(viewMode === 'builder' ? 'preview' : 'builder')}
          >
            {viewMode === 'builder' ? 'Preview' : 'Edit'}
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Form
          </Button>
        </div>
      </div>

      {/* Mode Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setViewMode('builder')}
              className={`px-4 py-2 rounded ${
                viewMode === 'builder'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Builder
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-4 py-2 rounded ${
                viewMode === 'preview'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setViewMode('test')}
              className={`px-4 py-2 rounded ${
                viewMode === 'test'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Test Submission
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Form Configuration */}
      {viewMode === 'builder' && (
        <Card>
          <CardHeader>
            <CardTitle>Form Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language Tabs */}
            <div className="flex space-x-2 border-b">
              <button
                type="button"
                onClick={() => setActiveTab('en')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'en'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('he')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'he'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500'
                }`}
              >
                Hebrew
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Form Description
              </label>
              <textarea
                value={formDescription[activeTab]}
                onChange={(e) =>
                  setFormDescription({ ...formDescription, [activeTab]: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={activeTab === 'en' ? 'Form description' : 'תיאור הטופס'}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Builder Mode */}
      {viewMode === 'builder' && (
        <>
          {/* Add Field Button */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Form Fields</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {FIELD_TYPES.map(type => (
                    <Button
                      key={type.value}
                      type="button"
                      variant="secondary"
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
                <div className="text-center py-12 text-gray-500">
                  No fields yet. Click a button above to add a field.
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className={`border-2 rounded-lg p-4 cursor-move ${
                        selectedField === field.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300'
                      }`}
                      draggable
                      onDragStart={() => handleDragStart(field)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(field)}
                      onClick={() => setSelectedField(field.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-gray-500 text-sm font-medium">{index + 1}.</div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {field.label[activeTab] || `Field ${index + 1}`}
                            </div>
                            <div className="text-xs text-gray-500">{field.type}</div>
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Help Text
                            </label>
                            <textarea
                              value={field.helpText[activeTab]}
                              onChange={(e) =>
                                handleUpdateField(field.id, {
                                  helpText: { ...field.helpText, [activeTab]: e.target.value },
                                })
                              }
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder={activeTab === 'en' ? 'Helpful text' : 'טקסט עזרה'}
                            />
                          </div>

                          {/* Options Editor (for dropdown, radio, checkbox) */}
                          {(field.type === 'dropdown' || field.type === 'radio' || field.type === 'checkbox') && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Options ({activeTab.toUpperCase()})
                              </label>
                              <div className="space-y-2">
                                {(field.options?.[activeTab] || []).map((option, optIndex) => (
                                  <div key={optIndex} className="flex items-center space-x-2">
                                    <Input
                                      value={option}
                                      onChange={(e) =>
                                        handleUpdateOption(field.id, optIndex, e.target.value)
                                      }
                                      placeholder={activeTab === 'en' ? 'Option text' : 'טקסט אפשרות'}
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Max File Size (MB)
                                </label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="50"
                                  value={field.maxFileSize}
                                  onChange={(e) =>
                                    handleUpdateField(field.id, { maxFileSize: parseInt(e.target.value) })
                                  }
                                  placeholder="5"
                                />
                              </div>
                            </div>
                          )}

                          {/* Validation Rules */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Validation Rules
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Min Length
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={field.validation?.min}
                                  onChange={(e) =>
                                    handleUpdateField(field.id, {
                                      validation: {
                                        ...field.validation,
                                        min: e.target.value ? parseInt(e.target.value) : undefined,
                                      },
                                    })
                                  }
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Max Length
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={field.validation?.max}
                                  onChange={(e) =>
                                    handleUpdateField(field.id, {
                                      validation: {
                                        ...field.validation,
                                        max: e.target.value ? parseInt(e.target.value) : undefined,
                                      },
                                    })
                                  }
                                  placeholder="100"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Conditional Logic */}
                          {fields.length > 1 && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Conditional Logic (Show this field when...)
                              </label>
                              <div className="grid grid-cols-3 gap-4">
                                <Select
                                  label="Depends On"
                                  value={field.conditionalLogic?.dependsOn || ''}
                                  onChange={(e) => {
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
                                <Select
                                  label="Condition"
                                  value={field.conditionalLogic?.condition || 'equals'}
                                  onChange={(e) =>
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
            <CardTitle>{formTitle[activeTab]}</CardTitle>
            {formDescription[activeTab] && (
              <p className="text-sm text-gray-600">{formDescription[activeTab]}</p>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label[lang]} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <textarea
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={field.placeholder[lang]}
            required={isRequired}
          />
          {field.helpText[lang] && (
            <p className="mt-1 text-sm text-gray-500">{field.helpText[lang]}</p>
          )}
        </div>
      );

    case 'dropdown':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label[lang]} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <Select
            options={[
              { value: '', label: 'Select...' },
              ...(field.options?.[lang] || []).filter(Boolean).map(opt => ({
                value: opt,
                label: opt,
              })),
            ]}
            required={isRequired}
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {field.label[lang]} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <div className="space-y-2">
            {(field.options?.[lang] || []).filter(Boolean).map((option, index) => (
              <div key={index} className="flex items-center">
                <input
                  type="checkbox"
                  name={field.name}
                  value={option}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
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

