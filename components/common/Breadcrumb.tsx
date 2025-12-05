'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  const locale = useLocale();

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={`select-none mx-auto w-full max-w-6xl absolute top-20 left-4 right-4 z-20 ${className}`}
    >
      <ol className="flex items-center text-sm text-text-dark/80 dark:text-text-dark/90 transition-color duration-300">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <Fragment key={index}>
              <li className={isLast ? 'navMdShadow truncate max-w-[150px]' : ''}>
                {item.href && !isLast ? (
                  <Link 
                    href={`/${locale}${item.href}`}
                    className="navMdShadow hover:text-text-dark dark:hover:text-text-dark"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'text-text-dark/90 dark:text-text-dark font-medium' : ''}>
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && (
                <li className="navMdShadow px-1">
                  <span> » </span>
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

