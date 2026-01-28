'use client';

import { useEffect, useMemo } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';

export default function CookiePolicyPage() {
  const locale = useLocale();
  const isHebrew = locale === 'he';

  // SEO Meta tags
  const getMetaDescription = useMemo(() => {
    return isHebrew 
      ? 'מדיניות עוגיות של ENBOSS - למד כיצד אנו משתמשים בעוגיות באתר שלנו וכיצד תוכל לנהל את העדפות העוגיות שלך.'
      : 'Cookie Policy for ENBOSS - Learn how we use cookies on our website and how you can manage your cookie preferences.';
  }, [isHebrew]);

  // Generate keywords based on language
  const getMetaKeywords = useMemo(() => {
    return isHebrew
      ? 'מדיניות עוגיות, עוגיות, ENBOSS, פרטיות, ניהול עוגיות, ישראל'
      : 'cookie policy, cookies, ENBOSS, privacy, cookie management, Israel';
  }, [isHebrew]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  const canonicalUrl = `${siteUrl}/${locale}/cookies`;
  const alternateEnUrl = `${siteUrl}/en/cookies`;
  const alternateHeUrl = `${siteUrl}/he/cookies`;

  // Set SEO meta tags dynamically
  useEffect(() => {
    document.title = isHebrew 
      ? 'מדיניות עוגיות - ENBOSS'
      : 'Cookie Policy - ENBOSS';

    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const setLinkTag = (rel: string, href: string, hreflang?: string) => {
      const selector = hreflang 
        ? `link[rel="${rel}"][hreflang="${hreflang}"]`
        : `link[rel="${rel}"]`;
      let link = document.querySelector(selector);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        if (hreflang) link.setAttribute('hreflang', hreflang);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    setMetaTag('description', getMetaDescription);
    if (getMetaKeywords) {
      setMetaTag('keywords', getMetaKeywords);
    }

    if (canonicalUrl) {
      setLinkTag('canonical', canonicalUrl);
      setLinkTag('alternate', alternateEnUrl, 'en');
      setLinkTag('alternate', alternateHeUrl, 'he');
      setLinkTag('alternate', alternateEnUrl, 'x-default');
    }

    const metaTitle = isHebrew 
      ? 'מדיניות עוגיות - ENBOSS'
      : 'Cookie Policy - ENBOSS';

    setMetaTag('og:title', metaTitle, true);
    setMetaTag('og:description', getMetaDescription, true);
    if (canonicalUrl) {
      setMetaTag('og:url', canonicalUrl, true);
    }
    setMetaTag('og:type', 'website', true);
    setMetaTag('og:locale', locale === 'he' ? 'he_IL' : 'en_US', true);
    if (locale === 'en') {
      setMetaTag('og:locale:alternate', 'he_IL', true);
    } else {
      setMetaTag('og:locale:alternate', 'en_US', true);
    }

    setMetaTag('twitter:card', 'summary');
    setMetaTag('twitter:title', metaTitle);
    setMetaTag('twitter:description', getMetaDescription);
  }, [locale, isHebrew, getMetaDescription, getMetaKeywords, canonicalUrl, alternateEnUrl, alternateHeUrl]);

  // Hebrew content
  const hebrewContent = (
    <div className="space-y-6 px-2 font-medium">
      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">1. מה הן עוגיות?</h2>
        <div className="space-y-2 text-base text-text dark:text-text-dark">
          <p className="">
            עוגיות הן קבצי טקסט קטנים המאוחסנים במכשיר שלך (מחשב, טאבלט או טלפון) כאשר אתה מבקר באתר שלנו. 
            עוגיות מאפשרות לאתר לזכור את הפעולות וההעדפות שלך, כך שאינך צריך להזין אותן מחדש בכל פעם שאתה חוזר לאתר או עובר מדף אחד למשנהו.
          </p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">2. אילו סוגי עוגיות אנו משתמשים?</h2>
        <div className="space-y-2 text-base text-text dark:text-text-dark">
          <p className="">2.1 עוגיות חיוניות</p>
          <p className="">
            עוגיות אלה נחוצות לתפקוד הבסיסי של האתר ואינן יכולות להיות מושבתות. הן כוללות:
          </p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>עוגיות אימות - לניהול סשן המשתמש והתחברות</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>עוגיות אבטחה - להגנה מפני פעילות זדונית</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>עוגיות תפקודיות בסיסיות - להבטחת פעולת האתר</span>
            </li>
          </ul>
          <p className="">2.2 עוגיות אנליטיקה</p>
          <p className="">
            עוגיות אלה עוזרות לנו להבין כיצד מבקרים משתמשים באתר שלנו. הן אוספות מידע באופן אנונימי על:
          </p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>מספר המבקרים והדפים שהם מבקרים</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>זמן הביקור באתר</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>דפים שמהם הגיעו המבקרים</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>ביצועי האתר</span>
            </li>
          </ul>
          <p className="">
            אנו משתמשים ב-Google Analytics לאיסוף מידע זה. תוכל לקרוא עוד על מדיניות הפרטיות של Google 
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-main dark:text-brand-dark hover:underline ml-1">
              כאן
            </a>.
          </p>
          <p className="">2.3 עוגיות פונקציונליות</p>
          <p className="">
            עוגיות אלה מאפשרות לאתר לזכור את ההעדפות שלך ולספק תכונות משופרות:
          </p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>העדפות שפה - זכירת השפה שבחרת</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>העדפות ערכת נושא - זכירת מצב כהה/בהיר</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>הגדרות אחרות - כל העדפה אישית אחרת</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">3. ניהול העדפות עוגיות</h2>
        <div className="space-y-2 text-base text-text dark:text-text-dark">
          <p className="">
            אתה יכול לנהל את העדפות העוגיות שלך בכל עת. כאשר אתה מבקר באתר שלנו בפעם הראשונה, 
            תראה באנר עוגיות המאפשר לך לבחור אילו סוגי עוגיות אתה מסכים לקבל.
          </p>
          <p className="">
            אתה יכול גם לשנות את ההעדפות שלך בכל עת על ידי:
          </p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>מחיקת העוגיות בדפדפן שלך</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>שימוש בהגדרות הדפדפן שלך לחסימת עוגיות</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>ביטול הסכמה לעוגיות מסוימות דרך באנר העוגיות</span>
            </li>
          </ul>
          <p className="">
            <strong>הערה:</strong> חסימת עוגיות מסוימות עלולה להשפיע על חוויית השימוש שלך באתר.
          </p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">4. עוגיות של צד שלישי</h2>
        <div className="space-y-2 text-base text-text dark:text-text-dark">
          <p className="">
            אנו משתמשים בשירותים של צד שלישי שעשויים להגדיר עוגיות במכשיר שלך:
          </p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>
                <strong>Google Analytics:</strong> לאיסוף נתונים אנליטיים על השימוש באתר. 
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-main dark:text-brand-dark hover:underline ml-1">
                  מדיניות הפרטיות של Google
                </a>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">5. משך זמן אחסון עוגיות</h2>
        <div className="space-y-2 text-base text-text dark:text-text-dark">
          <p className="">
            עוגיות שונות נשמרות לפרקי זמן שונים:
          </p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span><strong>עוגיות סשן:</strong> נמחקות כאשר אתה סוגר את הדפדפן</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span><strong>עוגיות קבועות:</strong> נשמרות עד שנה או עד שאתה מוחק אותן</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span><strong>עוגיות העדפות:</strong> נשמרות עד שנה או עד שאתה משנה את ההעדפות שלך</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">6. זכויותיך</h2>
        <div className="space-y-2 text-base text-text dark:text-text-dark">
          <p className="">
            יש לך זכות:
          </p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>לדעת אילו עוגיות אנו משתמשים ולמה</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>לבחור אילו עוגיות אתה מסכים לקבל</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>לבטל את הסכמתך בכל עת</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>למחוק עוגיות קיימות</span>
            </li>
          </ul>
          <p className="">
            אם יש לך שאלות או חששות לגבי השימוש שלנו בעוגיות, אנא 
            <Link href={`/${locale}/contact`} className="text-brand-main dark:text-brand-dark hover:underline">
              צור קשר
            </Link> איתנו.
          </p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">7. שינויים במדיניות</h2>
        <div className="space-y-2 text-base text-text dark:text-text-dark">
          <p className="">
            אנו עשויים לעדכן מדיניות עוגיות זו מעת לעת. כל שינוי יפורסם בדף זה עם תאריך העדכון. 
            אנו ממליצים לך לבדוק דף זה מעת לעת כדי להישאר מעודכן.
          </p>
        </div>
      </div>

      <p className="mt-8 text-sm text-gray dark:text-gray-dark">
        עדכון אחרון: {new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );

  // English content
  const englishContent = (
    <div className="space-y-6 px-2 font-medium">
      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">1. What Are Cookies?</h2>
        <div className="space-y-2 px-6 text-base text-text dark:text-text-dark">
          <p className="">
            Cookies are small text files that are stored on your device (computer, tablet, or phone) when you visit our website. 
            Cookies allow the website to remember your actions and preferences, so you don't have to re-enter them every time 
            you return to the site or navigate from one page to another.
          </p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">2. What Types of Cookies Do We Use?</h2>
        <div className="space-y-2 px-6 text-base text-text dark:text-text-dark">
          <p className="">2.1 Essential Cookies</p>
          <p className="">
            These cookies are necessary for the basic functioning of the website and cannot be disabled. They include:
          </p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Authentication cookies - for managing user sessions and login</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Security cookies - for protection against malicious activity</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Basic functional cookies - to ensure website operation</span>
            </li>
          </ul>
          <p className="">2.2 Analytics Cookies</p>
          <p className="">
            These cookies help us understand how visitors use our website. They collect information anonymously about:
          </p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>The number of visitors and pages they visit</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Time spent on the website</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Pages visitors came from</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Website performance</span>
            </li>
          </ul>
          <p className="">
            We use Google Analytics to collect this information. You can read more about Google's privacy policy 
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-main dark:text-brand-dark hover:underline ml-1">
              here
            </a>.
          </p>
          <p className="">2.3 Functional Cookies</p>
          <p className="">
            These cookies allow the website to remember your preferences and provide enhanced features:
          </p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Language preferences - remembering your selected language</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Theme preferences - remembering dark/light mode</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Other settings - any other personal preferences</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">3. Managing Cookie Preferences</h2>
        <div className="space-y-2 px-6 text-base text-text dark:text-text-dark">
          <p className="">
            You can manage your cookie preferences at any time. When you first visit our website, 
            you will see a cookie banner that allows you to choose which types of cookies you agree to receive.
          </p>
          <p className="">
            You can also change your preferences at any time by:
          </p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Deleting cookies in your browser</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Using your browser settings to block cookies</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Withdrawing consent for certain cookies through the cookie banner</span>
            </li>
          </ul>
          <p className="">
            <strong>Note:</strong> Blocking certain cookies may affect your experience using the website.
          </p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">4. Third-Party Cookies</h2>
        <div className="space-y-2 px-6 text-base text-text dark:text-text-dark">
          <p className="">
            We use third-party services that may set cookies on your device:
          </p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>
                <strong>Google Analytics:</strong> For collecting analytical data about website usage. 
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-main dark:text-brand-dark hover:underline ml-1">
                  Google's Privacy Policy
                </a>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">5. Cookie Storage Duration</h2>
        <div className="space-y-2 px-6 text-base text-text dark:text-text-dark">
          <p className="">
            Different cookies are stored for different periods:
          </p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span><strong>Session cookies:</strong> Deleted when you close your browser</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span><strong>Persistent cookies:</strong> Stored for up to one year or until you delete them</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span><strong>Preference cookies:</strong> Stored for up to one year or until you change your preferences</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">6. Your Rights</h2>
        <div className="space-y-2 px-6 text-base text-text dark:text-text-dark">
          <p className="">
            You have the right to:
          </p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Know which cookies we use and why</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Choose which cookies you agree to receive</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Withdraw your consent at any time</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Delete existing cookies</span>
            </li>
          </ul>
          <p className="">
            If you have questions or concerns about our use of cookies, please 
            <Link href={`/${locale}/contact`} className="text-brand-main dark:text-brand-dark hover:underline">
              contact us
            </Link>.
          </p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">7. Changes to This Policy</h2>
        <div className="space-y-2 px-6 text-base text-text dark:text-text-dark">
          <p className="">
            We may update this Cookie Policy from time to time. Any changes will be posted on this page with the update date. 
            We recommend that you check this page periodically to stay informed.
          </p>
        </div>
      </div>

      <p className="mt-8 text-sm text-gray dark:text-gray-dark">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Article Header - Duolingo Style */}
        <header className="my-10">
          {/* Title - Large and bold */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 text-gray-900 dark:text-white leading-tight py-3">
            {isHebrew ? 'מדיניות עוגיות' : 'Cookie Policy'}
          </h1>
        </header>

        {/* Article Content */}
        <article className="">
          {isHebrew ? hebrewContent : englishContent}
        </article>

      </main>
    </div>
  );
}
