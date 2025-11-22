'use client';

import { useState, ReactNode } from 'react';

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export const Accordion = ({ title, children, defaultOpen = false }: AccordionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border dark:border-border-dark">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left text-base font-semibold text-header-text-dark dark:text-header-text hover:text-brand-main dark:hover:text-brand-main transition-colors"
      >
        <span>{title}</span>
        <svg
          className={`w-5 h-5 transition-transform duration-200 text-black/60 dark:text-white/60 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="pb-4">{children}</div>}
    </div>
  );
};

