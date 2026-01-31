'use client';

import React, { useState } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import type { IEventContentSection } from '@/lib/models/Event';

export type EventSectionForm = IEventContentSection & { id: string };

const SECTION_TYPES: { value: IEventContentSection['type']; label: string; icon: string }[] = [
  { value: 'intro', label: 'Intro', icon: '📖' },
  { value: 'heading', label: 'Heading', icon: '📌' },
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'list', label: 'List', icon: '📋' },
  { value: 'image', label: 'Image', icon: '🖼️' },
  { value: 'divider', label: 'Divider', icon: '─' },
  { value: 'info-box', label: 'Info Box', icon: 'ℹ️' },
];

interface EventContentBuilderProps {
  sections: { en: EventSectionForm[]; he: EventSectionForm[] };
  activeTab: 'en' | 'he';
  onSectionsChange: (sections: { en: EventSectionForm[]; he: EventSectionForm[] }) => void;
  onActiveTabChange?: (tab: 'en' | 'he') => void;
}

export function EventContentBuilder({ sections, activeTab, onSectionsChange, onActiveTabChange }: EventContentBuilderProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const currentSections = sections[activeTab] || [];

  const updateSections = (lang: 'en' | 'he', next: EventSectionForm[]) => {
    onSectionsChange({
      ...sections,
      [lang]: next.map((s, i) => ({ ...s, order: i })),
    });
  };

  const handleAddSection = (type: IEventContentSection['type']) => {
    const newSection: EventSectionForm = {
      id: `section-${Date.now()}-${Math.random()}`,
      type,
      order: currentSections.length,
      content: ['intro', 'heading', 'text', 'info-box'].includes(type) ? '' : undefined,
      level: type === 'heading' ? 2 : undefined,
      listType: type === 'list' ? 'bullet' : undefined,
      items: type === 'list' ? [{ title: '', content: '' }] : undefined,
      data: type === 'image' ? { url: '', alt: '' } : undefined,
      links: [],
      boxStyle: type === 'info-box' ? 'info' : undefined,
    };
    updateSections(activeTab, [...currentSections, newSection]);
    setSelectedId(newSection.id);
    setPopoverOpen(false);
  };

  const handleUpdateSection = (id: string, updates: Partial<EventSectionForm>) => {
    updateSections(
      activeTab,
      currentSections.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const handleRemoveSection = (id: string) => {
    updateSections(
      activeTab,
      currentSections.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i }))
    );
    if (selectedId === id) setSelectedId(null);
  };

  const handleMoveUp = (id: string) => {
    const idx = currentSections.findIndex((s) => s.id === id);
    if (idx <= 0) return;
    const next = [...currentSections];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    updateSections(activeTab, next.map((s, i) => ({ ...s, order: i })));
  };

  const handleMoveDown = (id: string) => {
    const idx = currentSections.findIndex((s) => s.id === id);
    if (idx < 0 || idx >= currentSections.length - 1) return;
    const next = [...currentSections];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    updateSections(activeTab, next.map((s, i) => ({ ...s, order: i })));
  };

  const handleAddListItem = (sectionId: string) => {
    const section = currentSections.find((s) => s.id === sectionId);
    if (!section || !section.items) return;
    handleUpdateSection(sectionId, {
      items: [...section.items, { title: '', content: '' }],
    });
  };

  const handleUpdateListItem = (sectionId: string, index: number, field: 'title' | 'content', value: string) => {
    const section = currentSections.find((s) => s.id === sectionId);
    if (!section || !section.items) return;
    const items = section.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    handleUpdateSection(sectionId, { items });
  };

  const handleRemoveListItem = (sectionId: string, index: number) => {
    const section = currentSections.find((s) => s.id === sectionId);
    if (!section || !section.items) return;
    handleUpdateSection(
      sectionId,
      { items: section.items.filter((_, i) => i !== index) }
    );
  };

  const sortedSections = [...currentSections].sort((a, b) => a.order - b.order);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>Content (sections)</CardTitle>
            {onActiveTabChange ? (
              <div className="flex items-center gap-2 bg-gray-bg dark:bg-gray-bg-dark px-3 py-1.5 rounded-lg border border-gray-border dark:border-gray-border-dark">
                <span className="text-xs font-semibold text-gray dark:text-gray-dark">Editing:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant={activeTab === 'en' ? 'blue' : 'gray'}
                    type="button"
                    onClick={() => onActiveTabChange('en')}
                    className="!rounded text-xs font-medium"
                  >
                    English
                  </Button>
                  <Button
                    variant={activeTab === 'he' ? 'blue' : 'gray'}
                    type="button"
                    onClick={() => onActiveTabChange('he')}
                    className="!rounded text-xs font-medium"
                    dir="rtl"
                  >
                    עברית
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Editing:</span>
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {activeTab === 'en' ? 'English' : 'עברית'}
                </span>
              </div>
            )}
          </div>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="gray" className="gap-2">
                <span className="text-lg">+</span>
                Add section
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              <div className="grid grid-cols-2 gap-2">
                {SECTION_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleAddSection(t.value)}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t.label}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedSections.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No {activeTab === 'en' ? 'English' : 'Hebrew'} sections yet. Add one to get started.
          </div>
        ) : (
          sortedSections.map((section, index) => {
            const typeInfo = SECTION_TYPES.find((t) => t.value === section.type);
            return (
              <div
                key={section.id}
                className={`rounded-lg p-4 border transition-all ${
                  selectedId === section.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
                onClick={() => setSelectedId(section.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveUp(section.id);
                        }}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
                        title="Move up"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <span className="text-xs text-gray-500">{index + 1}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveDown(section.id);
                        }}
                        disabled={index === sortedSections.length - 1}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
                        title="Move down"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {typeInfo?.icon} {typeInfo?.label}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="red"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSection(section.id);
                    }}
                  >
                    Remove
                  </Button>
                </div>

                {selectedId === section.id && (
                  <div className="space-y-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {(section.type === 'intro' || section.type === 'text' || section.type === 'info-box') && (
                      <Textarea
                        label="Content"
                        value={section.content || ''}
                        onChange={(e) => handleUpdateSection(section.id, { content: e.target.value })}
                        rows={section.type === 'intro' ? 3 : 6}
                        placeholder="Enter content..."
                        dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                      />
                    )}
                    {section.type === 'info-box' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Box style
                        </label>
                        <select
                          value={section.boxStyle || 'info'}
                          onChange={(e) =>
                            handleUpdateSection(section.id, {
                              boxStyle: e.target.value as 'info' | 'warning' | 'highlight',
                            })
                          }
                          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                        >
                          <option value="info">Info</option>
                          <option value="warning">Warning</option>
                          <option value="highlight">Highlight</option>
                        </select>
                      </div>
                    )}
                    {section.type === 'heading' && (
                      <>
                        <Input
                          label="Heading text"
                          value={section.content || ''}
                          onChange={(e) => handleUpdateSection(section.id, { content: e.target.value })}
                          placeholder="Heading..."
                          dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                        />
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Level (h1–h3)
                          </label>
                          <select
                            value={section.level ?? 2}
                            onChange={(e) =>
                              handleUpdateSection(section.id, { level: parseInt(e.target.value, 10) })
                            }
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                          >
                            <option value={1}>H1</option>
                            <option value={2}>H2</option>
                            <option value={3}>H3</option>
                          </select>
                        </div>
                      </>
                    )}
                    {section.type === 'list' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            List type
                          </label>
                          <select
                            value={section.listType || 'bullet'}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                listType: e.target.value as 'bullet' | 'numbered',
                              })
                            }
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                          >
                            <option value="bullet">Bullet</option>
                            <option value="numbered">Numbered</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          {(section.items || []).map((item, i) => (
                            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded p-3 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">Item {i + 1}</span>
                                <Button
                                  type="button"
                                  variant="red"
                                  size="sm"
                                  onClick={() => handleRemoveListItem(section.id, i)}
                                >
                                  Remove
                                </Button>
                              </div>
                              <Input
                                label="Title"
                                value={item.title}
                                onChange={(e) => handleUpdateListItem(section.id, i, 'title', e.target.value)}
                                dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                              />
                              <Textarea
                                label="Content"
                                value={item.content}
                                onChange={(e) => handleUpdateListItem(section.id, i, 'content', e.target.value)}
                                rows={2}
                                dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                              />
                            </div>
                          ))}
                          <Button type="button" variant="purple" size="sm" onClick={() => handleAddListItem(section.id)}>
                            + Add item
                          </Button>
                        </div>
                      </div>
                    )}
                    {section.type === 'image' && section.data && (
                      <div className="space-y-2">
                        <Input
                          label="Image URL"
                          value={section.data.url || ''}
                          onChange={(e) =>
                            handleUpdateSection(section.id, {
                              data: { ...section.data!, url: e.target.value },
                            })
                          }
                          placeholder="https://..."
                        />
                        <Input
                          label="Alt text"
                          value={section.data.alt || ''}
                          onChange={(e) =>
                            handleUpdateSection(section.id, {
                              data: { ...section.data!, alt: e.target.value },
                            })
                          }
                          dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                        />
                        <Input
                          label="Caption (optional)"
                          value={section.data.caption || ''}
                          onChange={(e) =>
                            handleUpdateSection(section.id, {
                              data: { ...section.data!, caption: e.target.value },
                            })
                          }
                          dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                        />
                      </div>
                    )}
                    {section.type === 'divider' && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No options for divider.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
