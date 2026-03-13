'use client';

import { useEffect, useMemo } from 'react';
import { useLocale } from 'next-intl';

export default function TermsAndPrivacyPage() {
  const locale = useLocale();
  const isHebrew = locale === 'he';

  const getMetaDescription = useMemo(() => {
    return isHebrew
      ? 'תנאי שימוש ומדיניות פרטיות של ENBOSS - קרא את התנאים וההגבלות המלאים לשימוש באתר ובשירותים שלנו.'
      : 'Terms of Use and Privacy Policy for ENBOSS - Read the complete terms, conditions, and privacy policy for using our website and services.';
  }, [isHebrew]);

  const getMetaKeywords = useMemo(() => {
    return isHebrew
      ? 'תנאי שימוש, מדיניות פרטיות, ENBOSS, סקייטבורד, סקייטפארקים, ישראל'
      : 'terms of use, privacy policy, ENBOSS, skateboarding, skateparks, Israel';
  }, [isHebrew]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  const canonicalUrl = `${siteUrl}/${locale}/terms`;
  const alternateEnUrl = `${siteUrl}/en/terms`;
  const alternateHeUrl = `${siteUrl}/he/terms`;

  useEffect(() => {
    const pageTitle = isHebrew ? 'תנאי שימוש ומדיניות פרטיות - ENBOSS' : 'Terms of Use and Privacy Policy - ENBOSS';
    document.title = pageTitle;

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
    setMetaTag('og:title', pageTitle, true);
    setMetaTag('og:description', getMetaDescription, true);
    if (canonicalUrl) setMetaTag('og:url', canonicalUrl, true);
    setMetaTag('og:type', 'website', true);
    setMetaTag('og:locale', locale === 'he' ? 'he_IL' : 'en_US', true);
    if (locale === 'en') setMetaTag('og:locale:alternate', 'he_IL', true);
    else setMetaTag('og:locale:alternate', 'en_US', true);
    setMetaTag('twitter:card', 'summary');
    setMetaTag('twitter:title', pageTitle);
    setMetaTag('twitter:description', getMetaDescription);
  }, [locale, isHebrew, getMetaDescription, getMetaKeywords, canonicalUrl, alternateEnUrl, alternateHeUrl]);

  const sectionClass = '';
  const headingClass = 'text-lg sm:text-3xl font-bold mb-2 text-gray-900 dark:text-white';
  const blockClass = 'space-y-2 text-base text-text dark:text-text-dark';

  const hebrewContent = (
    <div className="space-y-6 px-2 font-medium">
      <div className="space-y-4">
        <p>
          ברוך הבא לאתר ENBOSS (להלן: &quot;האתר&quot;). האתר מופעל ומנוהל על ידי ENBOSS (להלן: &quot;החברה&quot;). השימוש באתר, בתכניו ובשירותיו כפוף לתנאי השימוש ומדיניות הפרטיות המפורטים להלן. אנא קרא אותם בעיון, שכן גלישה באתר או ביצוע פעולה בו מהווים הסכמה לכל האמור במסמך זה.
        </p>
        <p className="text-sm">
          המסמך מנוסח בלשון זכר מטעמי נוחות בלבד, אך פונה לכל המינים והמגדרים באופן שווה.
        </p>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>1. כללי והסכמה לתנאים</h2>
        <div className={blockClass}>
          <p>1.1. כל שימוש באתר, לרבות גלישה, רכישת מוצרים, השתתפות בדירוג פארקים, מילוי טפסים (לרבות רישום לאירועים, שאלוני &quot;המרחב&quot;, Growth Lab וכיו&quot;ב), מהווה הסכמה בלתי מסויגת לתנאי שימוש אלו.</p>
          <p>1.2. החברה שומרת לעצמה את הזכות לעדכן או לשנות את תנאי השימוש מעת לעת, לפי שיקול דעתה הבלעדי וללא חובת הודעה מוקדמת. שינויים מהותיים יפורסמו באתר או יישלחו בדוא&quot;ל למשתמשים רשומים. המשך השימוש באתר לאחר העדכון מהווה הסכמה לתנאים החדשים.</p>
          <p>1.3. במקרה של סתירה בין הוראות מסמך זה לבין פרסום אחר של החברה, יגברו הוראות מסמך זה.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>2. כשירות המשתמש וגיל</h2>
        <div className={blockClass}>
          <p>2.1. האתר מיועד לשימוש משתמשים בני 18 ומעלה. משתמש מתחת לגיל 18 (להלן: &quot;קטין&quot;) נדרש לקבל הסכמת הורה או אפוטרופוס חוקי טרם השימוש באתר או מסירת פרטים אישיים.</p>
          <p>2.2. ביצוע רכישה על ידי קטין מהווה הצהרה כי ניתן לכך אישור מהוריו או מהאפוטרופוס החוקי שלו.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>3. הרשמה ומסירת מידע</h2>
        <div className={blockClass}>
          <p>3.1. חלק מהשירותים (רכישה, רישום לאירועים, סקרים) מחייבים מסירת פרטים אישיים (שם, טלפון, דוא&quot;ל וכו&apos;). המשתמש מתחייב למסור פרטים נכונים ומדויקים בלבד.</p>
          <p>3.2. מסירת פרטים כוזבים הנה אסורה בהחלט ועשויה להוות עבירה פלילית. החברה שומרת לעצמה את הזכות לנקוט בהליכים משפטיים כנגד מוסרי פרטים כוזבים וכן לחסום את גישתם לאתר לאלתר.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>4. רכישת מוצרים ומדיניות מחירים</h2>
        <div className={blockClass}>
          <p>4.1. תמונות המוצרים באתר נועדו להמחשה בלבד; ייתכנו שינויים קלים בין מראה המוצר בתמונה לבין המוצר בפועל.</p>
          <p>4.2. מחירי המוצרים כוללים מע&quot;מ כחוק, אלא אם צוין אחרת. החברה רשאית לעדכן מחירים בכל עת.</p>
          <p>4.3. השלמת רכישה מותנית בזמינות המוצר במלאי ובאישור חברת האשראי. במידה ומוצר אזל מהמלאי לאחר ההזמנה, החברה תציע מוצר חלופי או ביטול עסקה והשבה כספית מלאה.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>5. אספקה, ביטולים והחזרות</h2>
        <div className={blockClass}>
          <p>5.1. המשלוחים מבוצעים בתחומי מדינת ישראל בלבד. זמני האספקה המצוינים באתר הם משוערים בלבד. החברה לא תישא באחריות לעיכובים הנובעים מכוח עליון, שביתות או גורמים שאינם בשליטתה.</p>
          <p>5.2. ביטול עסקה: בהתאם לחוק הגנת הצרכן, התשמ&quot;א-1981, המשתמש רשאי לבטל עסקת מכר מרחוק תוך 14 ימים מיום קבלת המוצר או מסמך הגילוי (המאוחר מביניהם), ובתנאי שהמוצר יוחזר ללא פגם ומבלי שנעשה בו שימוש.</p>
          <p>5.3. בעת ביטול שלא עקב פגם, ינוכו דמי ביטול בשיעור 5% ממחיר העסקה או 100 ש&quot;ח (לפי הנמוך מביניהם).</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>6. קניין רוחני</h2>
        <div className={blockClass}>
          <p>6.1. מלוא זכויות הקניין הרוחני באתר, לרבות סימני מסחר, עיצובים, קוד מקור, טקסטים ותמונות, שייכים ל-ENBOSS בלבד (או לצדדים שלישיים שהעניקו לה רישיון).</p>
          <p>6.2. אין להעתיק, להפיץ, להציג בפומבי או לעשות שימוש מסחרי בתוכן האתר ללא אישור מפורש ובכתב מהחברה.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>7. תוכן משתמשים ודירוג פארקים</h2>
        <div className={blockClass}>
          <p>7.1. האתר מאפשר דירוג פארקים ופרסום חוות דעת. המשתמש מתחייב כי התוכן אמין ואינו פוגעני, גזעני או מפר חוק.</p>
          <p>7.2. בהעלאת תוכן, המשתמש מעניק לחברה רישיון בלתי חוזר, ללא תמלוגים, להשתמש ולפרסם את התוכן בכל מדיה.</p>
          <p>7.3. החברה שומרת על זכותה להמשיך להציג חוות דעת ודירוגים גם לאחר סגירת חשבון המשתמש, לצורך שמירה על רצף המידע באתר.</p>
        </div>
      </div>

      <div className={sectionClass} id="privacy-policy">
        <h2 className={headingClass}>8. מדיניות פרטיות ואבטחת מידע</h2>
        <div className={blockClass}>
          <p>8.1. החברה אוספת מידע שהוזן מרצון (בטפסים ורכישות) ומידע טכני (IP, Cookies).</p>
          <p>8.2. שימוש במידע: המידע ישמש לתפעול האתר, שיפור חוויית המשתמש, אנליטיקה, ודיוור שיווקי (בכפוף להסכמה).</p>
          <p>8.3. העברת מידע: המידע לא יועבר לצד ג&apos;, למעט לצורך השלמת השירות (חברות שילוח, סליקה, מארגני אירועים אליהם נרשם המשתמש) או על פי צו שיפוטי.</p>
          <p>8.4. זכויות המשתמש: למשתמש זכות לעיין במידע, לתקנו או לבקש מחיקתו (בכפוף לחובות שמירת מידע על פי חוק – לרוב 7 שנים לעסקאות).</p>
          <p>8.5. הפרת אבטחה: במקרה של אירוע אבטחה חמור, החברה תפעל בהתאם להוראות הדין ותעדכן את המשתמשים הרלוונטיים במידת הצורך.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>9. הגבלת אחריות</h2>
        <div className={blockClass}>
          <p>9.1. השירות באתר ניתן לשימוש כמות שהוא (AS-IS). החברה לא תישא באחריות לכל נזק ישיר, עקיף או תוצאתי הנובע משימוש באתר או מהסתמכות על התוכן המופיע בו.</p>
          <p>9.2. החברה אינה מתחייבת שהאתר יהיה חסין מתקלות או מגישה בלתי מורשית, ואינה אחראית לנזק שייגרם כתוצאה מפעילות עוינת של צדדים שלישיים.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>10. יישוב סכסוכים</h2>
        <div className={blockClass}>
          <p>10.1. על הסכם זה יחולו דיני מדינת ישראל בלבד. סמכות השיפוט הבלעדית בכל מחלוקת תהא לבתי המשפט המוסמכים במחוז תל אביב-יפו.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>11. יצירת קשר</h2>
        <div className={blockClass}>
          <p>לכל שאלה ניתן לפנות בדוא&quot;ל: enbossblading@gmail.com.</p>
        </div>
      </div>

      <p className="mt-8 text-sm text-gray dark:text-gray-dark">
        {isHebrew ? 'עדכון אחרון: 11.2.2026' : 'Last updated: 2/11/2026'}
      </p>
    </div>
  );

  const englishContent = (
    <div className="space-y-6 px-2 font-medium">
      <div className="space-y-4">
        <p>
          Welcome to ENBOSS (hereinafter: &quot;the Site&quot;). The Site is operated and managed by ENBOSS (hereinafter: &quot;the Company&quot;). Your use of the Site, its content, and services is subject to the Terms of Use and Privacy Policy detailed below. Please read them carefully, as browsing or performing any action on the Site constitutes your unconditional agreement to all terms in this document.
        </p>
        <p className="text-sm">
          This document is drafted in the masculine gender for convenience purposes only, but applies equally to all genders.
        </p>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>1. General and Consent to Terms</h2>
        <div className={blockClass}>
          <p>1.1. Any use of the Site, including browsing, purchasing products, participating in park ratings, filling out forms (including event registration, &quot;Ha-Merchav&quot; surveys, Growth Lab, etc.), constitutes unreserved consent to these Terms of Use.</p>
          <p>1.2. The Company reserves the right to update or change these Terms of Use from time to time, at its sole discretion and without prior notice. Material changes will be published on the Site or sent via email to registered users. Continued use of the Site following an update constitutes consent to the new terms.</p>
          <p>1.3. In the event of a contradiction between the provisions of this document and any other publication by the Company, the provisions of this document shall prevail.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>2. User Eligibility and Age</h2>
        <div className={blockClass}>
          <p>2.1. The Site is intended for users aged 18 and over. Users under the age of 18 (hereinafter: &quot;Minors&quot;) are required to obtain the consent of a parent or legal guardian prior to using the Site or providing personal information.</p>
          <p>2.2. A purchase made by a Minor constitutes a declaration that approval was granted by their parents or legal guardian.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>3. Registration and Information Submission</h2>
        <div className={blockClass}>
          <p>3.1. Certain services (purchases, event registration, surveys) require the submission of personal details (name, phone, email, etc.). The user undertakes to provide only accurate and complete information.</p>
          <p>3.2. Providing false information is strictly prohibited and may constitute a criminal offense. The Company reserves the right to take legal action against those providing false information and to block their access to the Site immediately.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>4. Product Purchases and Pricing Policy</h2>
        <div className={blockClass}>
          <p>4.1. Product images on the Site are for illustrative purposes only; slight variations may occur between the product image and the actual product.</p>
          <p>4.2. Product prices include VAT as required by law, unless stated otherwise. The Company may update prices at any time.</p>
          <p>4.3. Completion of a purchase is subject to product availability and credit card company approval. If a product is out of stock after an order is placed, the Company will offer an alternative product or a full refund.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>5. Delivery, Cancellations, and Returns</h2>
        <div className={blockClass}>
          <p>5.1. Deliveries are provided within the borders of the State of Israel only. Delivery times stated on the Site are estimates only. The Company shall not be held liable for delays resulting from force majeure, strikes, or factors beyond its control.</p>
          <p>5.2. Cancellation of Transaction: In accordance with the Israeli Consumer Protection Law, 1981, a user may cancel a remote sales transaction within 14 days of receiving the product or the disclosure document (whichever is later), provided the product is returned undamaged and unused.</p>
          <p>5.3. Upon cancellation not due to a defect, a cancellation fee of 5% of the transaction price or 100 NIS (whichever is lower) will be deducted.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>6. Intellectual Property</h2>
        <div className={blockClass}>
          <p>6.1. All intellectual property rights on the Site, including trademarks, designs, source code, texts, and images, belong exclusively to ENBOSS (or third parties who have granted a license).</p>
          <p>6.2. No part of the Site&apos;s content may be copied, distributed, publicly displayed, or used for commercial purposes without express written permission from the Company.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>7. User Content and Park Ratings</h2>
        <div className={blockClass}>
          <p>7.1. The Site allows for park ratings and reviews. The user undertakes that the content is authentic and not offensive, racist, or in violation of any law.</p>
          <p>7.2. By uploading content, the user grants the Company an irrevocable, royalty-free, worldwide license to use and publish the content in any media.</p>
          <p>7.3. The Company reserves the right to continue displaying ratings and reviews even after a user account is closed, to maintain information continuity on the Site.</p>
        </div>
      </div>

      <div className={sectionClass} id="privacy-policy">
        <h2 className={headingClass}>8. Privacy Policy and Data Security</h2>
        <div className={blockClass}>
          <p>8.1. The Company collects information voluntarily provided (via forms and purchases) and technical information (IP address, Cookies).</p>
          <p>8.2. Use of Information: The information will be used for operating the Site, improving user experience, analytics, and marketing communications (subject to consent).</p>
          <p>8.3. Information Transfer: Information will not be transferred to third parties, except as necessary to complete the service (shipping companies, clearing services, event organizers) or by judicial order.</p>
          <p>8.4. User Rights: The user has the right to review their information, correct it, or request its deletion (subject to legal data retention obligations – typically 7 years for transactions).</p>
          <p>8.5. Security Breach: In the event of a severe security incident, the Company will act in accordance with legal requirements and update relevant users as necessary.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>9. Limitation of Liability</h2>
        <div className={blockClass}>
          <p>9.1. The service on the Site is provided on an &quot;AS-IS&quot; and &quot;AS-AVAILABLE&quot; basis. The Company shall not be held liable for any direct, indirect, or consequential damage resulting from the use of the Site or reliance on its content.</p>
          <p>9.2. The Company does not guarantee that the Site will be immune to malfunctions or unauthorized access and is not responsible for damage caused by hostile activity from third parties.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>10. Jurisdiction and Dispute Resolution</h2>
        <div className={blockClass}>
          <p>10.1. This agreement shall be governed solely by the laws of the State of Israel. Exclusive jurisdiction over any dispute shall be granted to the competent courts in the District of Tel Aviv-Jaffa.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>11. Contact Information</h2>
        <div className={blockClass}>
          <p>For any questions, please contact us via email: enbossblading@gmail.com.</p>
        </div>
      </div>

      <p className="mt-8 text-sm text-gray dark:text-gray-dark">
        Last updated: 2/11/2026
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="my-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 text-gray-900 dark:text-white leading-tight py-3">
            {isHebrew ? 'תנאי שימוש ומדיניות פרטיות' : 'Terms of Use and Privacy Policy'}
          </h1>
        </header>
        <article>{isHebrew ? hebrewContent : englishContent}</article>
      </main>
    </div>
  );
}
