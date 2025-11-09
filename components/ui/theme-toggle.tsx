'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/icons/Icon'
import { useTheme } from '@/context/ThemeProvider'
import { useTranslation } from '@/lib/i18n/client'
import { useLocale } from 'next-intl'

interface ThemeToggleProps {
  className?: string
  lng?: string
  isFloating?: boolean
}

export function ThemeToggle({ className = '', lng }: ThemeToggleProps) {
  const pathname = usePathname()
  const localeFromHook = useLocale()
  const { theme, toggleTheme } = useTheme()
  
  // Get locale from prop, pathname, or hook
  const currentLng = lng || (pathname?.split('/')?.[1] || localeFromHook || 'en')
  const { t } = useTranslation(currentLng, 'common')
  
  const [shouldAnimate, setShouldAnimate] = useState(false)

  const handleThemeToggle = () => {
    setShouldAnimate(true)
    toggleTheme()
  }

  useEffect(() => {
    if (shouldAnimate) {
      const timer = setTimeout(() => {
        setShouldAnimate(false)
      }, 300) // Match the animation duration
      return () => clearTimeout(timer)
    }
  }, [shouldAnimate])

  return (
    <button
      onClick={handleThemeToggle}
      className={`group inline-flex items-center gap-2 rounded-lg text-sm font-medium transition-all duration-100 text-gray-600 dark:text-gray-300 ${className}`}
      aria-label={theme === 'dark' ? t('light_mode') : t('dark_mode')}
    >
      {theme === 'dark' ? (
        <Icon name="sun"
          className={`h-4 w-4 ${shouldAnimate ? 'animate-pop' : ''}`}
        />
      ) : (
        <Icon name="moon"
          className={`h-4 w-4 ${shouldAnimate ? 'animate-pop' : ''}`}
        />
      )}
      <span className="hidden sm:inline transition-all duration-100 group-hover:scale-105 group-hover:text-gray-900 dark:group-hover:text-white">{theme === 'dark' ? t('light_mode') : t('dark_mode')}</span>
    </button>
  )
}
