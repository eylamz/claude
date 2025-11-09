'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui';

interface SuggestionItem {
  id: string;
  type: 'products' | 'skateparks' | 'events' | 'guides' | 'trainers';
  title: string;
  subtitle?: string;
  image?: string;
}

interface SearchBarProps {
  placeholder?: string;
  maxDesktop?: number;
  maxMobile?: number;
}

export default function SearchBar({ placeholder = 'Search...', maxDesktop = 6, maxMobile = 4 }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, SuggestionItem[]>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const flatList = useMemo(() => Object.values(suggestions).flat(), [suggestions]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions({});
      setLoading(false);
      return;
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const limit = isMobile ? maxMobile : maxDesktop;
        const grouped: Record<string, SuggestionItem[]> = {};
        (data.results || []).forEach((r: any) => {
          if (!grouped[r.type]) grouped[r.type] = [];
          if (grouped[r.type].length < limit) {
            grouped[r.type].push({ id: r.id, type: r.type, title: r.title || r.name, subtitle: r.subtitle, image: r.image });
          }
        });
        setSuggestions(grouped);
        setActiveIndex(0);
      } catch (_) {
        setSuggestions({});
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, maxDesktop, maxMobile]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) setOpen(true);
    if (!flatList.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatList.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flatList.length) % flatList.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const active = flatList[activeIndex];
      if (active) window.location.href = `/${active.type}/${active.id}`;
    }
  };

  return (
    <div className="relative" aria-expanded={open} aria-haspopup="listbox">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-500" aria-hidden="true" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-controls="search-suggestions"
        />
      </div>

      {open && (
        <div
          ref={listRef}
          id="search-suggestions"
          role="listbox"
          className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-auto"
        >
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Loading…</div>
          ) : flatList.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No results</div>
          ) : (
            Object.entries(suggestions).map(([group, items]) => (
              <div key={group} className="p-2">
                <div className="px-2 py-1 text-xs uppercase text-gray-500">{group}</div>
                <ul className="mt-1">
                  {items.map((item, idx) => {
                    const globalIndex = Object.values(suggestions)
                      .slice(0, Object.keys(suggestions).indexOf(group))
                      .reduce((sum, arr) => sum + arr.length, 0) + idx;
                    const isActive = activeIndex === globalIndex;
                    return (
                      <li
                        key={`${item.type}-${item.id}`}
                        role="option"
                        aria-selected={isActive}
                        className={`px-3 py-2 rounded-md cursor-pointer ${isActive ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                        onMouseEnter={() => setActiveIndex(globalIndex)}
                        onClick={() => (window.location.href = `/${item.type}/${item.id}`)}
                      >
                        <div className="text-sm text-gray-900 dark:text-white">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-xs text-gray-500">{item.subtitle}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
          <div className="p-2 border-t border-gray-100 dark:border-gray-800">
            <a className="block text-center text-sm text-blue-600 dark:text-blue-400" href={`/search?q=${encodeURIComponent(query)}`}>
              See all results
            </a>
          </div>
        </div>
      )}
    </div>
  );
}



