'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useTranslation } from '@/lib/i18n/client'
import { useEffect, useState } from 'react'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { Icon } from '@/components/icons/Icon'

interface LanguageToggleProps {
  className?: string
  lng?: string
}

export default function LanguageToggle({ className = '', lng }: LanguageToggleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const localeFromHook = useLocale()
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Get locale from prop, pathname, or hook
  const currentLng = lng || (pathname?.split('/')?.[1] || localeFromHook || 'en')
  const { t } = useTranslation(currentLng, 'common')

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const toggleLanguage = async () => {
    setIsLoading(true)
    const newLang = currentLng === 'en' ? 'he' : 'en'
    const currentPathname = pathname
    const segments = currentPathname.split('/')
    segments[1] = newLang
    await router.push(segments.join('/'))
    // Note: We don't set isLoading to false here as the component will unmount
    // when the route changes
  }

  // Return a placeholder during SSR
  if (!isMounted) {
    return (
      <button
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 ${className}`}
        aria-label="Toggle language"
      >
        {currentLng === 'en' ? (
          <div className="flex items-center gap-2">
            <Icon name="israelFlag" className="w-6 h-6" />
            <p className="font-assistant">עברית</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Icon name="usaFlag" className="w-6 h-6" />
            <p className="font-poppins">English</p>
          </div>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={toggleLanguage}
      className={`group outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 inline-flex items-center gap-2 text-sm font-medium transition-all duration-200 text-text dark:text-text-dark ${className}`}
      aria-label={t('toggle_language')}
      disabled={isLoading}
    >
      {isLoading ? (
        <LoadingSpinner size={24} variant="header" />
      ) : (
        <>
          {currentLng === 'en' ? (
            <div className="flex items-center gap-2">
              <Icon name="israelFlag" className="w-6 h-6 group-hover:scale-105 transition-all duration-300 group-hover:text-brand-main dark:group-hover:text-brand-dark" />
              <p className="font-assistant transition-colors duration-300  group-hover:text-black dark:group-hover:text-white">
                עברית
                </p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Icon name="usaFlag" className="w-6 h-6 group-hover:scale-105 transition-all duration-300 group-hover:text-brand-main dark:group-hover:text-brand-dark" />
              <p className="font-poppins transition-colors duration-300  group-hover:text-black dark:group-hover:text-white">
                English
                </p>
            </div>
          )}
        </>
      )}
    </button>
  )
}

// Export as LanguageSwitcher for backward compatibility
export const LanguageSwitcher = LanguageToggle
