'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Instagram, Youtube } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';
import { AboutPhotoCollage } from '@/components/home';

export default function AboutPage() {
  const t = useTranslations('about');
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark">
      {/* Top gradient header wrapper, matching guides-page-client */}
      <div className="relative pt-14 bg-gradient-to-br from-brand-purple/10 via-transparent to-brand-main/10 dark:from-brand-purple/5 dark:to-brand-dark/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]">
          {/* Header - visually aligned with guides header, without animations */}
          <header>
            <div className={`flex items-center justify-center ${locale === 'he' ? 'gap-2' : 'gap-3'}`}>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text dark:text-text-dark leading-tight mb-3 text-center">
              {t('title')}
            </h1>
            <Icon name="logo" className={` h-auto text-gray-900 dark:text-white ${locale === 'he' ? '-mt-[0.25rem] w-[7.5rem]' : '-mt-[0.45rem] w-[9.75rem]'}`} />
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-center">
              {t('subtitle')}
            </p>
          </header>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
        <div className="space-y-12 sm:space-y-14 mt-6">
          {/* Welcome Section */}
          <section>
            <p className="text-[1rem] leading-relaxed text-gray-700 dark:text-gray-300">
              {t('welcome')}
            </p>
          </section>

          {/* Passion Section */}
          <section className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-2xl p-8 sm:p-10 lg:p-12 border border-blue-100 dark:border-blue-900">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
              {t('passion.title')}
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('passion.description')}
            </p>
          </section>

          {/* Why ENBOSS Section */}
          <section className="prose prose-lg dark:prose-invert max-w-none">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
              {t('whyEnboss.title')}
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('whyEnboss.description')}
            </p>
          </section>


          {/* Photo Collage Section */}
          <section>
            <div className="overflow-visible">
              <AboutPhotoCollage />
            </div>
          </section>
          
          {/* Vision Section */}
          <section className="z-[2] relative !-mt-[4rem] bg-gradient-to-br from-purple-50 to-pink-50 dark:from-[#14072b] dark:to-[#1a0718] rounded-2xl p-8 sm:p-10 lg:p-12 border border-purple-100 dark:border-purple-900">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
              {t('vision.title')}
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('vision.description')}
            </p>
          </section>


          {/* Join Section */}
          <section className="prose prose-lg dark:prose-invert max-w-none">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
              {t('join.title')}
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('join.description')}
            </p>
          </section>

          {/* Connect Section */}
          <section className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-8 sm:p-10 lg:p-12 border border-gray-200 dark:border-gray-700">
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 text-center text-gray-900 dark:text-white">
              {t('connect.title')}
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8">
              {/* Instagram */}
              <a
                href="https://instagram.com/enboss"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-3 p-6 rounded-xl bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] dark:from-[#c49d2b] dark:via-[#b42063] dark:to-[#5e1e91] text-text-dark shadow-lg"
                aria-label={t('connect.instagram')}
              >
                <Instagram className="w-8 h-8 group-hover:scale-125 transition-transform duration-300" />
                <span className="font-semibold text-sm sm:text-base">
                  {t('connect.instagram')}
                </span>
              </a>

              {/* YouTube */}
              <a
                href="https://youtube.com/@enboss"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-3 p-6 rounded-xl bg-[#ff0033] text-white shadow-lg"
                aria-label={t('connect.youtube')}
              >
                <Youtube className="w-8 h-8 group-hover:scale-125 transition-transform duration-300" />
                <span className="font-semibold text-sm sm:text-base">
                  {t('connect.youtube')}
                </span>
              </a>

              {/* TikTok */}
              <a
                href="https://tiktok.com/@enboss"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-3 p-6 rounded-xl text-white shadow-lg"
                style={{
                  background: 'linear-gradient(to bottom right, hsla(348, 68.20%, 17.30%, 0.50) 0%, rgb(161, 32, 58) 25%, hsl(333, 18.00%, 31.60%) 50%, rgb(43, 132, 131) 75%, rgb(13, 37, 37) 100%)',
                }}
                aria-label={t('connect.tiktok')}
              >
                <Icon 
                  name="tiktok" 
                  className="w-8 h-8 group-hover:scale-125 transition-transform duration-300" 
                />
                <span className="font-semibold text-sm sm:text-base">
                  {t('connect.tiktok')}
                </span>
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}



