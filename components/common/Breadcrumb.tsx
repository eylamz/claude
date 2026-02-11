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
      className={`select-none mx-auto w-full max-w-6xl z-20 relative ${locale === 'he' ? 'right-4 lg:right-5' : 'left-2'} ${className}`}
    >
      <ol className="hidden md:flex items-center text-xs text-text/80 dark:text-text-dark/90 transition-color duration-300">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <Fragment key={index}>
              <li className={isLast ? ' truncate max-w-[150px]' : ''}>
                {item.href && !isLast ? (
                  <Link 
                    href={`/${locale}${item.href}`}
                    className=" hover:text-text dark:hover:text-text-dark hover:underline"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'text-text/90 dark:text-text-dark font-medium' : ''}>
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && (
                <li className=" px-1">
                  <span> &gt; </span>
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

