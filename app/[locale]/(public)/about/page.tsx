'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Instagram, Youtube } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';

// Custom hook for scroll-triggered animations
function useScrollAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return [ref, isVisible] as const;
}

export default function AboutPage() {
  const t = useTranslations('about');
  const [heroRef, heroVisible] = useScrollAnimation();
  const [welcomeRef, welcomeVisible] = useScrollAnimation();
  const [passionRef, passionVisible] = useScrollAnimation();
  const [whyRef, whyVisible] = useScrollAnimation();
  const [visionRef, visionVisible] = useScrollAnimation();
  const [joinRef, joinVisible] = useScrollAnimation();
  const [connectRef, connectVisible] = useScrollAnimation();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Track mouse movement for parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Section with animated gradient */}
      <section 
        ref={heroRef}
        className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 dark:from-blue-900 dark:via-purple-900 dark:to-pink-900 text-white"
      >
        {/* Animated gradient overlay */}
        <div 
          className="absolute inset-0 bg-black/20 hero-gradient"
          style={{
            transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
        
        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/10 blur-xl animate-pulse"
              style={{
                width: `${20 + i * 10}px`,
                height: `${20 + i * 10}px`,
                left: `${15 + i * 15}%`,
                top: `${20 + i * 12}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + i * 0.5}s`,
              }}
            />
          ))}
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div 
            className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${
              heroVisible 
                ? 'opacity-100 translate-y-0 animate-fadeUpIn' 
                : 'opacity-0 translate-y-10'
            }`}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              {t('title')}
            </h1>
            <p 
              className={`text-xl sm:text-2xl lg:text-3xl font-semibold text-blue-100 dark:text-blue-200 transition-all duration-1000 delay-300 ${
                heroVisible 
                  ? 'opacity-100 translate-y-0 animate-fadeUpIn' 
                  : 'opacity-0 translate-y-10'
              }`}
            >
              {t('subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Welcome Section */}
          <section 
            ref={welcomeRef}
            className={`prose prose-lg dark:prose-invert max-w-none transition-all duration-700 ${
              welcomeVisible 
                ? 'opacity-100 translate-y-0 animate-popFadeIn' 
                : 'opacity-0 translate-y-8'
            }`}
          >
            <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('welcome')}
            </p>
          </section>

          {/* Passion Section */}
          <section 
            ref={passionRef}
            className={`bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-2xl p-8 sm:p-10 lg:p-12 border border-blue-100 dark:border-blue-900 transition-all duration-700 hover:shadow-2xl hover:scale-[1.01] transform-gpu ${
              passionVisible 
                ? 'opacity-100 translate-x-0 animate-slideRight' 
                : 'opacity-0 -translate-x-8'
            }`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
              {t('passion.title')}
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('passion.description')}
            </p>
          </section>

          {/* Why ENBOSS Section */}
          <section 
            ref={whyRef}
            className={`prose prose-lg dark:prose-invert max-w-none transition-all duration-700 ${
              whyVisible 
                ? 'opacity-100 translate-x-0 animate-slideLeft' 
                : 'opacity-0 translate-x-8'
            }`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
              {t('whyEnboss.title')}
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('whyEnboss.description')}
            </p>
          </section>

          {/* Vision Section */}
          <section 
            ref={visionRef}
            className={`bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-2xl p-8 sm:p-10 lg:p-12 border border-purple-100 dark:border-purple-900 transition-all duration-700 hover:shadow-2xl hover:scale-[1.01] transform-gpu ${
              visionVisible 
                ? 'opacity-100 translate-y-0 animate-popFadeIn' 
                : 'opacity-0 translate-y-8'
            }`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
              {t('vision.title')}
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('vision.description')}
            </p>
          </section>

          {/* Join Section */}
          <section 
            ref={joinRef}
            className={`prose prose-lg dark:prose-invert max-w-none transition-all duration-700 ${
              joinVisible 
                ? 'opacity-100 translate-y-0 animate-fadeUpIn' 
                : 'opacity-0 translate-y-8'
            }`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
              {t('join.title')}
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              {t('join.description')}
            </p>
          </section>

          {/* Connect Section */}
          <section 
            ref={connectRef}
            className={`bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-8 sm:p-10 lg:p-12 border border-gray-200 dark:border-gray-700 transition-all duration-700 ${
              connectVisible 
                ? 'opacity-100 scale-100 animate-popFadeIn' 
                : 'opacity-0 scale-95'
            }`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 text-center text-gray-900 dark:text-white">
              {t('connect.title')}
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8">
              {/* Instagram */}
              <a
                href="https://instagram.com/enboss"
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex flex-col items-center gap-3 p-6 rounded-xl bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] dark:from-[#c49d2b] dark:via-[#b42063] dark:to-[#5e1e91] text-text-dark hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-2xl hover:rotate-3 transform-gpu ${
                  connectVisible ? 'animate-popFadeIn' : 'opacity-0'
                }`}
                style={{ animationDelay: '0.1s' }}
                aria-label={t('connect.instagram')}
                onMouseEnter={(e) => {
                  e.currentTarget.classList.add('animate-pop');
                }}
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
                className={`group flex flex-col items-center gap-3 p-6 rounded-xl bg-[#ff0033] text-white hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-2xl hover:-rotate-3 transform-gpu ${
                  connectVisible ? 'animate-popFadeIn' : 'opacity-0'
                }`}
                style={{ animationDelay: '0.2s' }}
                aria-label={t('connect.youtube')}
                onMouseEnter={(e) => {
                  e.currentTarget.classList.add('animate-pop');
                }}
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
                className={`group flex flex-col items-center gap-3 p-6 rounded-xl text-white hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-2xl hover:rotate-3 transform-gpu ${
                  connectVisible ? 'animate-popFadeIn' : 'opacity-0'
                }`}
                style={{
                  background: 'linear-gradient(to bottom right, hsla(348, 68.20%, 17.30%, 0.50) 0%, rgb(161, 32, 58) 25%, hsl(333, 18.00%, 31.60%) 50%, rgb(43, 132, 131) 75%, rgb(13, 37, 37) 100%)',
                  animationDelay: '0.3s',
                }}
                aria-label={t('connect.tiktok')}
                onMouseEnter={(e) => {
                  e.currentTarget.classList.add('animate-pop');
                }}
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
      </div>
    </div>
  );
}

