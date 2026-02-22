'use client';

import { useTranslations, useLocale } from 'next-intl';
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
            <Icon name="logo" className={` h-auto text-gray-900 dark:text-white ${locale === 'he' ? '-mt-[0.25rem] w-[7.5rem]' : '-mt-[7.3px] w-[9.75rem]'}`} />
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

          {/* Connect Section - icons match footer social styling */}
          <section className=" rounded-2xl p-8 sm:p-10 lg:p-12 border border-border dark:border-border-dark">
            <h2 className="text-3xl sm:text-4xl font-bold mb-10 text-center text-gray-900 dark:text-white">
              {t('connect.title')}
            </h2>
            <div className="flex flex-wrap justify-center items-start gap-6 sm:gap-8">
              {/* Instagram - same SVG as footer */}
              <a
                href="https://instagram.com/enboss"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-3"
                aria-label={t('connect.instagram')}
              >
                <span className="flex items-center justify-center  transition-all duration-200 group-hover:scale-110">
                <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-12 h-12 transition-all duration-300 
                stroke-black/0 dark:stroke-white/80 stroke-[1px]            
               fill-[url(#insta-gradient)] 
               /* צל שחור ב-Light Mode וצל לבן ב-Dark Mode על ה-SVG */
               [filter:drop-shadow(0_0_3px_rgba(0,0,0,0.15))_drop-shadow(0_0_8px_rgba(238,42,123,0.4))] 
               
               
              md:stroke-transparent md:fill-text md:dark:fill-text-dark md:drop-shadow-none 
               md:group-hover:scale-110 md:group-hover:stroke-black md:group-hover:stroke-[1px] 
               md:group-hover:fill-[url(#insta-gradient)] 
               /* אפקט הובר משולב ב-Desktop */
               md:group-hover:[filter:drop-shadow(0_0_1px_rgba(0,0,0,0.8))_drop-shadow(0_0_8px_rgba(238,42,123,0.4))]
               md:dark:group-hover:[filter:drop-shadow(0_0_10px_rgba(255,255,255,0.1))_drop-shadow(0_0_8px_rgba(238,42,123,0.4))]"
                    style={{ paintOrder: 'stroke' }}
                  >
                    <defs>
                      <linearGradient id="insta-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: '#f9ce34' }} />
                        <stop offset="50%" style={{ stopColor: '#ee2a7b' }} />
                        <stop offset="100%" style={{ stopColor: '#6228d7' }} />
                      </linearGradient>
                    </defs>
                    <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM12 15.88C9.86 15.88 8.12 14.14 8.12 12C8.12 9.86 9.86 8.12 12 8.12C14.14 8.12 15.88 9.86 15.88 12C15.88 14.14 14.14 15.88 12 15.88ZM17.92 6.88C17.87 7 17.8 7.11 17.71 7.21C17.61 7.3 17.5 7.37 17.38 7.42C17.26 7.47 17.13 7.5 17 7.5C16.73 7.5 16.48 7.4 16.29 7.21C16.2 7.11 16.13 7 16.08 6.88C16.03 6.76 16 6.63 16 6.5C16 6.37 16.03 6.24 16.08 6.12C16.13 5.99 16.2 5.89 16.29 5.79C16.52 5.56 16.87 5.45 17.19 5.52C17.26 5.53 17.32 5.55 17.38 5.58C17.44 5.6 17.5 5.63 17.56 5.67C17.61 5.7 17.66 5.75 17.71 5.79C17.8 5.89 17.87 5.99 17.92 6.12C17.97 6.24 18 6.37 18 6.5C18 6.63 17.97 6.76 17.92 6.88Z" />
                  </svg>
                </span>
                <span className="font-semibold text-base sm:text-lg">
                  {t('connect.instagram')}
                </span>
              </a>

               {/* TikTok - same Icon + styling as footer */}
               <a
                href="https://tiktok.com/@enboss"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-3"
                aria-label={t('connect.tiktok')}
              >
                <span className="flex items-center justify-center cursor-pointer transition-all duration-200 text-white stroke-black stroke-[0.75px] [filter:drop-shadow(-1px_-0.7px_0_#25F4EEd9)_drop-shadow(1.25px_1.25px_0_#FE2C55d9)_drop-shadow(0_0_8px_rgba(37,244,238,0.25))_drop-shadow(0_0_8px_rgba(227,45,21,0.35))] md:text-text md:dark:text-text-dark md:stroke-transparent md:[filter:none] md:group-hover:text-white md:group-hover:stroke-black group-hover:scale-110 
                md:group-hover:[filter:drop-shadow(-2px_-1.4px_0_#25F4EEd9)_drop-shadow(2.5px_2. 5px_0_#FE2C55d9)_drop-shadow(0_0_8px_rgba(37,244,238,0.25))_drop-shadow(0_0_8px_rgba(227,45,21,0.35))]"
                >
                  <Icon
                    name="tiktok"
                    className="w-12 h-12 transition-all duration-300"
                  />
                </span>
                <span className="font-semibold text-base sm:text-lg">
                  {t('connect.tiktok')}
                </span>
              </a>

              {/* YouTube - same Icon + styling as footer */}
              <a
                href="https://youtube.com/@enboss"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-3"
                aria-label={t('connect.youtube')}
              >
                <span className="flex items-center justify-center cursor-pointer transition-all duration-200 text-[#FF0000] [filter:drop-shadow(0_0_8px_rgba(255,0,0,0.25))] md:text-text md:dark:text-text-dark md:[filter:none] md:group-hover:text-[#FF0000] group-hover:scale-110 md:group-hover:[filter:drop-shadow(0_0_8px_rgba(255,0,0,0.25))]">
                  <Icon
                    name="youtube"
                    className="w-12 h-12 transition-all duration-300"
                  />
                </span>
                <span className="font-semibold text-base sm:text-lg">
                  {t('connect.youtube')}
                </span>
              </a>

             
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}



