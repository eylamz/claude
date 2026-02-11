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
    // Theme is a functional cookie - always allowed (required for basic functionality)
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

  // Update meta theme-color when theme changes
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    const color = theme === 'dark' ? '#181c21' : '#f6f7f9'
    
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', color)
    } else {
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.content = color
      document.getElementsByTagName('head')[0].appendChild(meta)
    }
  }, [theme])

  return (
    <button
      onClick={handleThemeToggle}
      className={`group inline-flex items-center gap-2 rounded-lg text-sm font-semibold transition-colors duration-300 text-text dark:text-text-dark ${theme === 'dark' ? 'hover:text-yellow-500 dark:hover:text-yellow-400' : 'hover:text-blue dark:hover:text-blue-dark'} ${className}`}
      aria-label={theme === 'dark' ? t('light_mode') : t('dark_mode')}
    >
      {theme === 'dark' ? (
        <Icon name="sunBold"
          className={`h-4 w-4 group-hover:scale-105 group-hover:text-yellow-500 dark:group-hover:text-yellow-400 transition-all duration-300 ${shouldAnimate ? 'animate-pop' : ''}`}
        />
      ) : (
        <Icon name="moonBold"
        className={`h-4 w-4 group-hover:scale-105 group-hover:text-blue dark:group-hover:text-blue-dark transition-all duration-300 ${shouldAnimate ? 'animate-pop' : ''}`}
        />
      )}
      <span className="transition-colors duration-300  group-hover:text-black dark:group-hover:text-white">{theme === 'dark' ? t('light_mode') : t('dark_mode')}</span>
    </button>
  )
}
