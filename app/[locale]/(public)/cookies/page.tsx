'use client';

import { useEffect, useMemo } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function CookiePolicyPage() {
  const locale = useLocale();
  const isHebrew = locale === 'he';

  // SEO Meta tags
  const getMetaDescription = useMemo(() => {
    return isHebrew 
      ? 'מדיניות עוגיות של ENBOSS - למד כיצד אנו משתמשים בעוגיות באתר שלנו וכיצד תוכל לנהל את העדפות העוגיות שלך.'
      : 'Cookie Policy for ENBOSS - Learn how we use cookies on our website and how you can manage your cookie preferences.';
  }, [isHebrew]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  const canonicalUrl = `${siteUrl}/${locale}/cookies`;

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

    setMetaTag('description', getMetaDescription);
    setMetaTag('og:title', isHebrew ? 'מדיניות עוגיות - ENBOSS' : 'Cookie Policy - ENBOSS', true);
    setMetaTag('og:description', getMetaDescription, true);
    setMetaTag('og:url', canonicalUrl, true);
    setMetaTag('og:type', 'website', true);
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', isHebrew ? 'מדיניות עוגיות - ENBOSS' : 'Cookie Policy - ENBOSS');
    setMetaTag('twitter:description', getMetaDescription);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [isHebrew, getMetaDescription, canonicalUrl]);

  // Hebrew content
  const hebrewContent = (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-dark mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          חזרה לעמוד הבית
        </Link>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
          מדיניות עוגיות
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          עודכן לאחרונה: {new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-white">1. מה הן עוגיות?</h2>
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300">
            <p>
              עוגיות הן קבצי טקסט קטנים המאוחסנים במכשיר שלך (מחשב, טאבלט או טלפון) כאשר אתה מבקר באתר שלנו. 
              עוגיות מאפשרות לאתר לזכור את הפעולות וההעדפות שלך, כך שאינך צריך להזין אותן מחדש בכל פעם שאתה חוזר לאתר או עובר מדף אחד למשנהו.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-white">2. אילו סוגי עוגיות אנו משתמשים?</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">2.1 עוגיות חיוניות</h3>
              <p className="text-base text-gray-700 dark:text-gray-300 mb-3">
                עוגיות אלה נחוצות לתפקוד הבסיסי של האתר ואינן יכולות להיות מושבתות. הן כוללות:
              </p>
              <ul className="space-y-2 list-disc list-inside text-base text-gray-700 dark:text-gray-300">
                <li>עוגיות אימות - לניהול סשן המשתמש והתחברות</li>
                <li>עוגיות אבטחה - להגנה מפני פעילות זדונית</li>
                <li>עוגיות תפקודיות בסיסיות - להבטחת פעולת האתר</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">2.2 עוגיות אנליטיקה</h3>
              <p className="text-base text-gray-700 dark:text-gray-300 mb-3">
                עוגיות אלה עוזרות לנו להבין כיצד מבקרים משתמשים באתר שלנו. הן אוספות מידע באופן אנונימי על:
              </p>
              <ul className="space-y-2 list-disc list-inside text-base text-gray-700 dark:text-gray-300">
                <li>מספר המבקרים והדפים שהם מבקרים</li>
                <li>זמן הביקור באתר</li>
                <li>דפים שמהם הגיעו המבקרים</li>
                <li>ביצועי האתר</li>
              </ul>
              <p className="text-base text-gray-700 dark:text-gray-300 mt-3">
                אנו משתמשים ב-Google Analytics לאיסוף מידע זה. תוכל לקרוא עוד על מדיניות הפרטיות של Google 
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-main dark:text-brand-dark hover:underline ml-1">
                  כאן
                </a>.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">2.3 עוגיות פונקציונליות</h3>
              <p className="text-base text-gray-700 dark:text-gray-300 mb-3">
                עוגיות אלה מאפשרות לאתר לזכור את ההעדפות שלך ולספק תכונות משופרות:
              </p>
              <ul className="space-y-2 list-disc list-inside text-base text-gray-700 dark:text-gray-300">
                <li>העדפות שפה - זכירת השפה שבחרת</li>
                <li>העדפות ערכת נושא - זכירת מצב כהה/בהיר</li>
                <li>הגדרות אחרות - כל העדפה אישית אחרת</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-white">3. ניהול העדפות עוגיות</h2>
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300">
            <p>
              אתה יכול לנהל את העדפות העוגיות שלך בכל עת. כאשר אתה מבקר באתר שלנו בפעם הראשונה, 
              תראה באנר עוגיות המאפשר לך לבחור אילו סוגי עוגיות אתה מסכים לקבל.
            </p>
            <p>
              אתה יכול גם לשנות את ההעדפות שלך בכל עת על ידי:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>מחיקת העוגיות בדפדפן שלך</li>
              <li>שימוש בהגדרות הדפדפן שלך לחסימת עוגיות</li>
              <li>ביטול הסכמה לעוגיות מסוימות דרך באנר העוגיות</li>
            </ul>
            <p className="mt-4">
              <strong>הערה:</strong> חסימת עוגיות מסוימות עלולה להשפיע על חוויית השימוש שלך באתר.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-white">4. עוגיות של צד שלישי</h2>
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300">
            <p>
              אנו משתמשים בשירותים של צד שלישי שעשויים להגדיר עוגיות במכשיר שלך:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                <strong>Google Analytics:</strong> לאיסוף נתונים אנליטיים על השימוש באתר. 
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-main dark:text-brand-dark hover:underline ml-1">
                  מדיניות הפרטיות של Google
                </a>
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-white">5. משך זמן אחסון עוגיות</h2>
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300">
            <p>
              עוגיות שונות נשמרות לפרקי זמן שונים:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong>עוגיות סשן:</strong> נמחקות כאשר אתה סוגר את הדפדפן</li>
              <li><strong>עוגיות קבועות:</strong> נשמרות עד שנה או עד שאתה מוחק אותן</li>
              <li><strong>עוגיות העדפות:</strong> נשמרות עד שנה או עד שאתה משנה את ההעדפות שלך</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-white">6. זכויותיך</h2>
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300">
            <p>
              יש לך זכות:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>לדעת אילו עוגיות אנו משתמשים ולמה</li>
              <li>לבחור אילו עוגיות אתה מסכים לקבל</li>
              <li>לבטל את הסכמתך בכל עת</li>
              <li>למחוק עוגיות קיימות</li>
            </ul>
            <p className="mt-4">
              אם יש לך שאלות או חששות לגבי השימוש שלנו בעוגיות, אנא 
              <Link href={`/${locale}/contact`} className="text-brand-main dark:text-brand-dark hover:underline">
                צור קשר
              </Link> איתנו.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-white">7. שינויים במדיניות</h2>
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300">
            <p>
              אנו עשויים לעדכן מדיניות עוגיות זו מעת לעת. כל שינוי יפורסם בדף זה עם תאריך העדכון. 
              אנו ממליצים לך לבדוק דף זה מעת לעת כדי להישאר מעודכן.
            </p>
          </div>
        </section>

        <section className="pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            לשאלות נוספות, אנא עיין ב-
            <Link href={`/${locale}/privacy`} className="text-brand-main dark:text-brand-dark hover:underline mx-1">
              מדיניות הפרטיות
            </Link>
            שלנו או
            <Link href={`/${locale}/terms`} className="text-brand-main dark:text-brand-dark hover:underline mx-1">
              תנאי השימוש
            </Link>.
          </p>
        </section>
      </div>
    </div>
  );

  // English content
  const englishContent = (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-brand-main dark:hover:text-brand-dark mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
          Cookie Policy
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-white">1. What Are Cookies?</h2>
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300">
            <p>
              Cookies are small text files that are stored on your device (computer, tablet, or phone) when you visit our website. 
              Cookies allow the website to remember your actions and preferences, so you don't have to re-enter them every time 
              you return to the site or navigate from one page to another.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-white">2. What Types of Cookies Do We Use?</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">2.1 Essential Cookies</h3>
              <p className="text-base text-gray-700 dark:text-gray-300 mb-3">
                These cookies are necessary for the basic functioning of the website and cannot be disabled. They include:
              </p>
              <ul className="space-y-2 list-disc list-inside text-base text-gray-700 dark:text-gray-300">
                <li>Authentication cookies - for managing user sessions and login</li>
                <li>Security cookies - for protection against malicious activity</li>
                <li>Basic functional cookies - to ensure website operation</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">2.2 Analytics Cookies</h3>
              <p className="text-base text-gray-700 dark:text-gray-300 mb-3">
                These cookies help us understand how visitors use our website. They collect information anonymously about:
              </p>
              <ul className="space-y-2 list-disc list-inside text-base text-gray-700 dark:text-gray-300">
                <li>The number of visitors and pages they visit</li>
                <li>Time spent on the website</li>
                <li>Pages visitors came from</li>
                <li>Website performance</li>
              </ul>
              <p className="text-base text-gray-700 dark:text-gray-300 mt-3">
                We use Google Analytics to collect this information. You can read more about Google's privacy policy 
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-main dark:text-brand-dark hover:underline ml-1">
                  here
                </a>.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">2.3 Functional Cookies</h3>
              <p className="text-base text-gray-700 dark:text-gray-300 mb-3">
                These cookies allow the website to remember your preferences and provide enhanced features:
              </p>
              <ul className="space-y-2 list-disc list-inside text-base text-gray-700 dark:text-gray-300">
                <li>Language preferences - remembering your selected language</li>
                <li>Theme preferences - remembering dark/light mode</li>
                <li>Other settings - any other personal preferences</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-white">3. Managing Cookie Preferences</h2>
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300">
            <p>
              You can manage your cookie preferences at any time. When you first visit our website, 
              you will see a cookie banner that allows you to choose which types of cookies you agree to receive.
            </p>
            <p>
              You can also change your preferences at any time by:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Deleting cookies in your browser</li>
              <li>Using your browser settings to block cookies</li>
              <li>Withdrawing consent for certain cookies through the cookie banner</li>
            </ul>
            <p className="mt-4">
              <strong>Note:</strong> Blocking certain cookies may affect your experience using the website.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-white">4. Third-Party Cookies</h2>
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300">
            <p>
              We use third-party services that may set cookies on your device:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                <strong>Google Analytics:</strong> For collecting analytical data about website usage. 
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-main dark:text-brand-dark hover:underline ml-1">
                  Google's Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-white">5. Cookie Storage Duration</h2>
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300">
            <p>
              Different cookies are stored for different periods:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong>Session cookies:</strong> Deleted when you close your browser</li>
              <li><strong>Persistent cookies:</strong> Stored for up to one year or until you delete them</li>
              <li><strong>Preference cookies:</strong> Stored for up to one year or until you change your preferences</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-white">6. Your Rights</h2>
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300">
            <p>
              You have the right to:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Know which cookies we use and why</li>
              <li>Choose which cookies you agree to receive</li>
              <li>Withdraw your consent at any time</li>
              <li>Delete existing cookies</li>
            </ul>
            <p className="mt-4">
              If you have questions or concerns about our use of cookies, please 
              <Link href={`/${locale}/contact`} className="text-brand-main dark:text-brand-dark hover:underline">
                contact us
              </Link>.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-white">7. Changes to This Policy</h2>
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300">
            <p>
              We may update this Cookie Policy from time to time. Any changes will be posted on this page with the update date. 
              We recommend that you check this page periodically to stay informed.
            </p>
          </div>
        </section>

        <section className="pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            For additional questions, please refer to our 
            <Link href={`/${locale}/privacy`} className="text-brand-main dark:text-brand-dark hover:underline mx-1">
              Privacy Policy
            </Link>
            or
            <Link href={`/${locale}/terms`} className="text-brand-main dark:text-brand-dark hover:underline mx-1">
              Terms of Service
            </Link>.
          </p>
        </section>
      </div>
    </div>
  );

  return isHebrew ? hebrewContent : englishContent;
}
