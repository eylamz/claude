'use client';

import { useEffect, useMemo } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';

export default function PrivacyPage() {
  const locale = useLocale();
  const isHebrew = locale === 'he';

  const getMetaDescription = useMemo(() => {
    return isHebrew
      ? 'מדיניות פרטיות של ENBOSS - כיצד אנו אוספים, משתמשים ומגנים על המידע שלך.'
      : 'Privacy Policy for ENBOSS - How we collect, use, and protect your information.';
  }, [isHebrew]);

  const getMetaKeywords = useMemo(() => {
    return isHebrew
      ? 'מדיניות פרטיות, ENBOSS, הגנת מידע, עוגיות, פרטיות, ישראל'
      : 'privacy policy, ENBOSS, data protection, cookies, privacy, Israel';
  }, [isHebrew]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  const canonicalUrl = `${siteUrl}/${locale}/privacy`;
  const alternateEnUrl = `${siteUrl}/en/privacy`;
  const alternateHeUrl = `${siteUrl}/he/privacy`;

  useEffect(() => {
    document.title = isHebrew ? 'מדיניות פרטיות - ENBOSS' : 'Privacy Policy - ENBOSS';

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
    if (getMetaKeywords) setMetaTag('keywords', getMetaKeywords);
    if (canonicalUrl) {
      setLinkTag('canonical', canonicalUrl);
      setLinkTag('alternate', alternateEnUrl, 'en');
      setLinkTag('alternate', alternateHeUrl, 'he');
      setLinkTag('alternate', alternateEnUrl, 'x-default');
    }
    const metaTitle = isHebrew ? 'מדיניות פרטיות - ENBOSS' : 'Privacy Policy - ENBOSS';
    setMetaTag('og:title', metaTitle, true);
    setMetaTag('og:description', getMetaDescription, true);
    if (canonicalUrl) setMetaTag('og:url', canonicalUrl, true);
    setMetaTag('og:type', 'website', true);
    setMetaTag('og:locale', locale === 'he' ? 'he_IL' : 'en_US', true);
    if (locale === 'en') setMetaTag('og:locale:alternate', 'he_IL', true);
    else setMetaTag('og:locale:alternate', 'en_US', true);
    setMetaTag('twitter:card', 'summary');
    setMetaTag('twitter:title', metaTitle);
    setMetaTag('twitter:description', getMetaDescription);
  }, [locale, isHebrew, getMetaDescription, getMetaKeywords, canonicalUrl, alternateEnUrl, alternateHeUrl]);

  const sectionClass = '';
  const headingClass = 'text-lg sm:text-3xl font-bold mb-2 text-gray-900 dark:text-white';
  const blockClass = 'space-y-2 text-base text-text dark:text-text-dark';
  const listClass = 'my-6 space-y-3 list-none pl-0';
  const listItemClass = 'text-lg text-text dark:text-text-dark leading-relaxed flex gap-3';
  const bulletClass = 'text-brand-main dark:text-brand-dark font-bold flex-shrink-0';

  const hebrewContent = (
    <div className="space-y-6 px-2 font-medium">
      <div className={sectionClass}>
        <h2 className={headingClass}>1. כללי</h2>
        <div className={blockClass}>
          <p>1.1 החברה מכבדת את פרטיות המשתמשים ומחויבת לשמור על כללי הגנת הפרטיות המקובלים בישראל.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>2. איסוף מידע</h2>
        <div className={blockClass}>
          <p>2.1 בעת השימוש באתר ייאסף מידע אודות המשתמש, לרבות:</p>
          <ul className={listClass}>
            <li className={listItemClass}>
              <span className={bulletClass}>•</span>
              <span>מידע שהמשתמש מוסר בעת הרשמה ורכישה (שם, כתובת, דוא"ל, טלפון).</span>
            </li>
            <li className={listItemClass}>
              <span className={bulletClass}>•</span>
              <span>מידע על אופן השימוש באתר ומידע טכני (IP, סוג דפדפן).</span>
            </li>
          </ul>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>3. עוגיות (Cookies)</h2>
        <div className={blockClass}>
          <p>3.1 החברה עושה שימוש בקבצי עוגיות לצורך תפעול האתר ואבטחת מידע. המשתמש יכול להגדיר את הדפדפן לסרב לעוגיות.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>4. העברת מידע לצדדים שלישיים</h2>
        <div className={blockClass}>
          <p>4.1 החברה לא תעביר מידע אישי לצדדים שלישיים, אלא לצורך אספקת השירות (שילוח, סליקה), על פי צו שיפוטי, או במקרה של מחלוקת משפטית.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>5. דיוור שיווקי</h2>
        <div className={blockClass}>
          <p>5.1 הודעות שיווקיות יישלחו רק למשתמשים שנתנו הסכמתם המפורשת. ניתן לבטל הסכמה זו בכל עת דרך הקישור להסרה בגוף ההודעה או פנייה למייל enbossblading@gmail.com.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>6. זכויות המשתמש</h2>
        <div className={blockClass}>
          <p>6.1 למשתמש זכות לבקש גישה למידע האישי שלו, לתקנו או לבקש את מחיקתו. בקשות אלו יטופלו תוך 30 ימים.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>7. שמירת מידע</h2>
        <div className={blockClass}>
          <p>7.1 מידע הקשור לעסקאות יישמר למשך 7 שנים כנדרש בחוק. מידע אחר יימחק לאחר תקופת חוסר פעילות או לפי בקשת המשתמש.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>8. אבטחת מידע והתראה על הפרה</h2>
        <div className={blockClass}>
          <p>8.1 במקרה של הפרת אבטחה העלולה להשפיע על הפרטיות, החברה מחויבת להודיע למשתמשים הנפגעים תוך 72 שעות מגילוי ההפרה.</p>
        </div>
      </div>

      <p className="mt-8 text-sm text-gray dark:text-gray-dark">עדכון אחרון: 13.4.2025</p>

      <p className="mt-6 text-sm">
        {isHebrew ? 'תנאי השימוש שלנו: ' : 'Our Terms of Use: '}
        <Link href={`/${locale}/terms`} className="text-brand-main dark:text-brand-dark hover:underline">
          {isHebrew ? 'תנאי שימוש' : 'Terms of Use'}
        </Link>
      </p>
    </div>
  );

  const englishContent = (
    <div className="space-y-6 px-2 font-medium">
      <div className={sectionClass}>
        <h2 className={headingClass}>1. General</h2>
        <div className={`${blockClass} px-6`}>
          <p>1.1 The Company respects the privacy of the Website users and is committed to maintaining the privacy protection rules accepted in Israel.</p>
          <p>1.2 This policy explains how we collect, use, and protect your information.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>2. Information Collection</h2>
        <div className={`${blockClass} px-6`}>
          <p>2.1 During the use of the Website, information about the user will be collected, including:</p>
          <ul className={listClass}>
            <li className={listItemClass}>
              <span className={bulletClass}>•</span>
              <span>Information provided by the user during registration and purchase (Name, address, email, phone).</span>
            </li>
            <li className={listItemClass}>
              <span className={bulletClass}>•</span>
              <span>Information about how the Website is used.</span>
            </li>
            <li className={listItemClass}>
              <span className={bulletClass}>•</span>
              <span>Technical information (such as IP address, browser type, etc.).</span>
            </li>
          </ul>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>3. Cookies</h2>
        <div className={`${blockClass} px-6`}>
          <p>3.1 The Company uses cookies for Website operation, improving user experience, customizing content, and information security. The user can configure their browser to refuse cookies or to alert them when cookies are being sent.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>4. Transfer of Information to Third Parties</h2>
        <div className={`${blockClass} px-6`}>
          <p>4.1 The Company will not transfer users' personal information to third parties, except in the following cases:</p>
          <ul className={listClass}>
            <li className={listItemClass}>
              <span className={bulletClass}>•</span>
              <span>When required for service provision (such as shipping companies, credit clearing).</span>
            </li>
            <li className={listItemClass}>
              <span className={bulletClass}>•</span>
              <span>By request of a competent authority or judicial order.</span>
            </li>
            <li className={listItemClass}>
              <span className={bulletClass}>•</span>
              <span>In case of a legal dispute between the user and the Company.</span>
            </li>
            <li className={listItemClass}>
              <span className={bulletClass}>•</span>
              <span>In case of merger, acquisition, or sale of Company assets to a third party.</span>
            </li>
          </ul>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>5. Marketing Communications</h2>
        <div className={`${blockClass} px-6`}>
          <p>5.1 The Company will send marketing and promotional messages only to users who have explicitly consented to it during registration. The user may withdraw their consent at any time via the unsubscribe link appearing at the bottom of the messages or by contacting customer service at enbossblading@gmail.com.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>6. User Rights</h2>
        <div className={`${blockClass} px-6`}>
          <p>6.1 User Rights to Access and Delete Data: The user has the right to request access to their personal information, to correct inaccurate information, and to request deletion of their personal information. Such requests must be submitted in writing to the customer service email address. The Company will process these requests within 30 days of receipt, unless there are legal obligations or ongoing transactions that justify retaining the information.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>7. Data Retention</h2>
        <div className={`${blockClass} px-6`}>
          <p>7.1 The Company will retain users' personal information for different periods depending on the type of information and legal or business necessity. Information related to transactions will be retained for the period required by law, typically 7 years. Other information will be automatically deleted after a period of inactivity or upon user request, subject to legal obligations.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>8. Data Security and Breach Notification</h2>
        <div className={`${blockClass} px-6`}>
          <p>8.1 In case of a security breach that may affect user privacy, the Company is committed to notifying affected users within 72 hours of discovering the breach. The notification will be sent to the registered email address and will include details about the nature of the breach, the information that was exposed, and the steps taken to prevent recurrence.</p>
        </div>
      </div>

      <p className="mt-8 text-sm text-gray dark:text-gray-dark">Last updated: 4/13/2025</p>

      <p className="mt-6 text-sm">
        Our Terms of Use:{' '}
        <Link href={`/${locale}/terms`} className="text-brand-main dark:text-brand-dark hover:underline">
          Terms of Use
        </Link>
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="my-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 text-gray-900 dark:text-white leading-tight py-3">
            {isHebrew ? 'מדיניות פרטיות' : 'Privacy Policy'}
          </h1>
        </header>
        <article>{isHebrew ? hebrewContent : englishContent}</article>
      </main>
    </div>
  );
}
