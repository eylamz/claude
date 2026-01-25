'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Icon } from '@/components/icons/Icon'
import { useTheme } from '@/context/ThemeProvider'
import { useTranslation } from '@/lib/i18n/client'
import { useLocale, useTranslations } from 'next-intl'
import { hasConsent } from '@/lib/utils/cookie-consent'
import { useToast } from '@/hooks/use-toast'
import { Button } from './button'

interface ThemeToggleProps {
  className?: string
  lng?: string
  isFloating?: boolean
}

export function ThemeToggle({ className = '', lng }: ThemeToggleProps) {
  const pathname = usePathname()
  const router = useRouter()
  const localeFromHook = useLocale()
  const { theme, toggleTheme } = useTheme()
  const { toast } = useToast()
  const tCommon = useTranslations('common')
  
  // Get locale from prop, pathname, or hook
  const currentLng = lng || (pathname?.split('/')?.[1] || localeFromHook || 'en')
  const { t } = useTranslation(currentLng, 'common')
  
  const [shouldAnimate, setShouldAnimate] = useState(false)

  const handleThemeToggle = () => {
    // Check if user has consented to essential cookies
    if (!hasConsent('essential')) {
      // Show toast notification
      toast({
        title: tCommon('cookieConsent.functionalConsentRequired'),
        description: tCommon('cookieConsent.functionalConsentMessage'),
        action: (
          <Button
            size="sm"
            variant="info"
            onClick={() => {
              // Trigger cookie banner to show settings
              if (typeof window !== 'undefined') {
                // Clear consent to show banner again, or better: show settings directly
                const event = new CustomEvent('showCookieSettings');
                window.dispatchEvent(event);
              }
            }}
          >
            {tCommon('cookieConsent.openCookieSettings')}
          </Button>
        ),
        variant: 'default',
      });
      return;
    }
    
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
      className={`group inline-flex items-center gap-2 rounded-lg text-sm font-medium transition-all duration-200 text-gray-600 dark:text-gray-300 ${className}`}
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
      <span className="hidden sm:inline transition-all duration-200 group-hover:scale-105 group-hover:text-gray-900 dark:group-hover:text-white">{theme === 'dark' ? t('light_mode') : t('dark_mode')}</span>
    </button>
  )
}
