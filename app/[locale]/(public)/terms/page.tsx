'use client';

import { useEffect, useMemo } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
export default function TermsPage() {
  const locale = useLocale();
  const isHebrew = locale === 'he';

  const getMetaDescription = useMemo(() => {
    return isHebrew
      ? 'תנאי שימוש של ENBOSS - קרא את התנאים וההגבלות המלאים לשימוש באתר ובשירותים שלנו.'
      : 'Terms of Use for ENBOSS - Read the complete terms and conditions for using our website and services.';
  }, [isHebrew]);

  const getMetaKeywords = useMemo(() => {
    return isHebrew
      ? 'תנאי שימוש, ENBOSS, סקייטבורד, סקייטפארקים, ישראל, תנאים והגבלות'
      : 'terms of use, ENBOSS, skateboarding, skateparks, Israel, terms and conditions';
  }, [isHebrew]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  const canonicalUrl = `${siteUrl}/${locale}/terms`;
  const alternateEnUrl = `${siteUrl}/en/terms`;
  const alternateHeUrl = `${siteUrl}/he/terms`;

  useEffect(() => {
    document.title = isHebrew ? 'תנאי שימוש - ENBOSS' : 'Terms of Use - ENBOSS';

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
    const metaTitle = isHebrew ? 'תנאי שימוש - ENBOSS' : 'Terms of Use - ENBOSS';
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

  const hebrewContent = (
    <div className="space-y-6 px-2 font-medium">
      <div className="space-y-4">
        <p>
          ברוך הבא לאתר ENBOSS (להלן: "האתר" או "החברה"). שימושך באתר כפוף לתנאי השימוש המפורטים להלן. אנא קרא אותם בעיון. הכתוב מטה מתייחס באופן שווה לכל מין ומגדר, ומנוסח בלשון זכר מטעמי נוחות בלבד. מתחת לגיל 18? הכתוב מטה עשוי להיות מעט מורכב. אנא היוועץ במבוגר אחראי לפני השימוש באתר.
        </p>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>1. כללי</h2>
        <div className={blockClass}>
          <p>1.1 האתר מופעל ומנוהל על ידי ENBOSS (להלן: "החברה").</p>
          <p>1.2 כל שימוש באתר, לרבות גלישה, רכישת מוצרים, השתתפות בדירוג פארקים או כל פעילות אחרת, מהווה הסכמה לתנאי השימוש ומדיניות הפרטיות המפורטים במסמך זה.</p>
          <p>1.3 החברה שומרת לעצמה את הזכות לשנות את התנאים הללו בכל עת. שינויים מהותיים יועברו למשתמשים באמצעות דוא"ל או הודעה באתר.</p>
          <p>1.4 במקרה של סתירה בין האמור בתנאי השימוש לבין כל פרסום אחר, יגברו הוראות תנאי השימוש.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>2. גיל המשתמש</h2>
        <div className={blockClass}>
          <p>2.1 השימוש באתר לצורך רכישת מוצרים מותר למשתמשים מגיל 18 ומעלה בלבד או לקטינים בהסכמת הורה או אפוטרופוס.</p>
          <p>2.2 משתמש מתחת לגיל 18 המבצע רכישה באתר מצהיר כי קיבל את הסכמת הוריו או האפוטרופוס החוקי שלו לביצוע הרכישה.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>3. הרשמה ומסירת מידע אישי</h2>
        <div className={blockClass}>
          <p>3.1 חלק מהשירותים והפעולות באתר, לרבות רכישת מוצרים, דורשים הרשמה וחובה למסור פרטים אישיים כגון שם, כתובת, דוא"ל ומספר טלפון.</p>
          <p>3.2 המשתמש מתחייב למסור פרטים נכונים, מדויקים ומלאים, ולעדכן את פרטיו במידת הצורך.</p>
          <p>3.3 מסירת פרטים כוזבים מהווה עבירה פלילית והעושה כן צפוי להליכים משפטיים, פליליים ואזרחיים.</p>
          <p>3.4 החברה שומרת לעצמה את הזכות למנוע ממשתמש את השימוש באתר בכל מקרה של מסירת פרטים שגויים או חשד לכך.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>4. רכישת מוצרים</h2>
        <div className={blockClass}>
          <p>4.1 המוצרים המוצגים באתר הינם להמחשה בלבד. ייתכנו הבדלים בין מראה המוצר בתמונה למראהו במציאות.</p>
          <p>4.2 מחירי המוצרים כוללים מע"מ, אלא אם צוין אחרת במפורש.</p>
          <p>4.3 החברה שומרת לעצמה את הזכות לשנות את מחירי המוצרים בכל עת וללא הודעה מוקדמת.</p>
          <p>4.4 כל רכישה באתר כפופה לאישור החברה ולזמינות המוצר במלאי. במקרה של אי זמינות מוצר לאחר ביצוע ההזמנה, החברה תיצור קשר עם הלקוח ותציע לו פתרון חלופי או זיכוי.</p>
          <p>4.5 ההזמנה תאושר רק לאחר אישור העסקה על ידי חברת האשראי.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>5. משלוחים והחזרות</h2>
        <div className={blockClass}>
          <p>5.1 החברה מספקת משלוחים בתחומי מדינת ישראל בלבד.</p>
          <p>5.2 זמני האספקה המצוינים באתר הינם משוערים ואינם מהווים התחייבות מצד החברה.</p>
          <p>5.3 החברה לא תהיה אחראית לעיכובים במשלוח הנובעים מכוח עליון או מגורמים שאינם בשליטתה.</p>
          <p>5.4 מדיניות החזרת מוצרים: בהתאם להוראות חוק הגנת הצרכן, התשמ"א-1981, הלקוח רשאי לבטל את העסקה תוך 14 ימים מיום קבלת המוצר או מיום קבלת מסמך המכיל את פרטי העסקה (המאוחר מביניהם), ובתנאי שהמוצר לא נפגם ולא נעשה בו שימוש.</p>
          <p>5.5 ביטול העסקה יחויב בדמי ביטול בשיעור של 5% ממחיר העסקה או 100 ₪, לפי הנמוך ביניהם.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>6. קניין רוחני וזכויות יוצרים</h2>
        <div className={blockClass}>
          <p>6.1 כל זכויות הקניין הרוחני באתר, לרבות זכויות היוצרים, סימני המסחר והעיצובים הם רכושה הבלעדי של החברה או שהחברה קיבלה רישיון להשתמש בהם.</p>
          <p>6.2 אין להעתיק, לשכפל, להפיץ או לעשות כל שימוש מסחרי בתוכן האתר ללא אישור מפורש מראש ובכתב מהחברה.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>7. דירוג וביקורות משתמשים</h2>
        <div className={blockClass}>
          <p>7.1 האתר מאפשר למשתמשים לדרג פארקים על פי אמות מידה שונות. המשתמש מתחייב לדרג באופן אמין והוגן.</p>
          <p>7.2 החברה שומרת לעצמה את הזכות להסיר כל תוכן פוגעני, גזעני או לא ראוי, לפי שיקול דעתה הבלעדי.</p>
          <p>7.3 המשתמש מעניק לחברה רישיון בלתי חוזר להשתמש ולפרסם כל תוכן שהועלה על ידו לאתר. גם לאחר מחיקת חשבון, תוכן זה עשוי להישאר באתר באופן אנונימי.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>8. הגבלת אחריות</h2>
        <div className={blockClass}>
          <p>8.1 השימוש באתר הינו באחריות המשתמש בלבד. החברה לא תישא באחריות לכל נזק ישיר או עקיף שייגרם למשתמש כתוצאה מהשימוש באתר.</p>
          <p>8.2 החברה עושה מאמצים לוודא שהמידע באתר יהיה מדויק, אך אינה מתחייבת שהאתר יפעל ללא תקלות.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>9. יישוב סכסוכים וסמכות שיפוט</h2>
        <div className={blockClass}>
          <p>9.1 על תנאי שימוש אלו יחולו דיני מדינת ישראל בלבד. סמכות השיפוט הבלעדית תהא נתונה לבתי המשפט המוסמכים במחוז תל אביב-יפו.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>10. ביטול והשעיית חשבון</h2>
        <div className={blockClass}>
          <p>10.1 החברה שומרת לעצמה את הזכות להשעות או לבטל את חשבון המשתמש בכל עת, במקרים של הפרת תנאי השימוש או פעילות לא חוקית.</p>
          <p>10.2 המשתמש רשאי לבטל את חשבונו בכל עת על ידי פנייה לשירות הלקוחות בכתב.</p>
        </div>
      </div>

      <p className="mt-8 text-sm text-gray dark:text-gray-dark">עדכון אחרון: 13.4.2025</p>

      <p className="mt-6 text-sm">
        {isHebrew ? 'מדיניות הפרטיות שלנו: ' : 'Our Privacy Policy: '}
        <Link href={`/${locale}/privacy`} className="text-brand-main dark:text-brand-dark hover:underline">
          {isHebrew ? 'מדיניות פרטיות' : 'Privacy Policy'}
        </Link>
      </p>
    </div>
  );

  const englishContent = (
    <div className="space-y-6 px-2 font-medium">
      <div className="space-y-4 text-base text-text dark:text-text-dark">
        <p>
          Welcome to the ENBOSS website (hereinafter: "the Website" or "the Company"). Your use of the Website is subject to the Terms of Use detailed below. Please read them carefully. The content below applies equally to all genders and is written in the masculine form for convenience only. Under 18? The content below may be somewhat complex. Please consult a responsible adult before using the Website.
        </p>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>1. General</h2>
        <div className={`${blockClass} px-6`}>
          <p>1.1 The Website is operated and managed by ENBOSS (hereinafter: "the Company").</p>
          <p>1.2 Any use of the Website, including browsing, purchasing products, participating in skatepark ratings, or any other activity, constitutes agreement to the Terms of Use and Privacy Policy detailed in this document.</p>
          <p>1.3 The Company reserves the right to change these terms at any time. Material changes will be notified via email or website notice. It is the user's responsibility to stay updated on these changes from time to time.</p>
          <p>1.4 In case of contradiction between the provisions of the Terms of Use and any other publication, the provisions of the Terms of Use shall prevail.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>2. User Age</h2>
        <div className={`${blockClass} px-6`}>
          <p>2.1 The use of the Website for purchasing products is permitted only to users aged 18 and above or to minors with parental or guardian consent.</p>
          <p>2.2 A user under the age of 18 who makes a purchase on the Website declares that they have received consent from their parents or legal guardian to make the purchase.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>3. Registration and Personal Information</h2>
        <div className={`${blockClass} px-6`}>
          <p>3.1 Some services and activities on the Website, including purchasing products, require registration and mandatory submission of personal details such as name, address, email, and phone number.</p>
          <p>3.2 The user undertakes to provide correct, accurate, and complete details, and to update their details as necessary.</p>
          <p>3.3 Providing false details constitutes a criminal offense, and anyone who does so may be subject to legal, criminal, and civil proceedings.</p>
          <p>3.4 The Company reserves the right to prevent a user from using the Website in any case of providing incorrect details or suspicion thereof.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>4. Product Purchases</h2>
        <div className={`${blockClass} px-6`}>
          <p>4.1 The products displayed on the Website are for illustration purposes only. There may be differences between the appearance of the product in the image and its appearance in reality.</p>
          <p>4.2 Product prices include VAT, unless explicitly stated otherwise.</p>
          <p>4.3 The Company reserves the right to change product prices at any time without prior notice.</p>
          <p>4.4 All purchases on the Website are subject to Company approval and product availability in stock. In case of product unavailability after placing an order, the Company will contact the customer and offer an alternative solution or credit.</p>
          <p>4.5 The order will be approved only after authorization by the credit card company.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>5. Shipping and Returns</h2>
        <div className={`${blockClass} px-6`}>
          <p>5.1 The Company provides shipping within the State of Israel only.</p>
          <p>5.2 The delivery times specified on the Website are estimated and do not constitute a commitment by the Company.</p>
          <p>5.3 The Company will not be responsible for shipping delays resulting from force majeure or factors beyond its control.</p>
          <p>5.4 Product Return Policy: In accordance with the provisions of the Consumer Protection Law of 1981, the customer may cancel the transaction within 14 days from the date of receiving the product or from the date of receiving the document containing the transaction details (whichever is later), provided that the product has not been damaged and has not been used.</p>
          <p>5.5 Cancellation of the transaction will incur a cancellation fee of 5% of the transaction price or 100 NIS, whichever is lower.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>6. Intellectual Property and Copyright</h2>
        <div className={`${blockClass} px-6`}>
          <p>6.1 All intellectual property rights on the Website, including copyrights, trademarks, designs, trade names, and goodwill, are the exclusive property of the Company or the Company has received a license to use them.</p>
          <p>6.2 It is prohibited to copy, duplicate, distribute, sell, publish, or make any other commercial use of the Website content without explicit prior written approval from the Company.</p>
          <p>6.3 It is prohibited to use the Company's trademarks without explicit written approval from the Company.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>7. User Ratings and Reviews</h2>
        <div className={`${blockClass} px-6`}>
          <p>7.1 The Website allows users to rate skateparks according to various criteria such as maintenance, cleanliness, difficulty level, and more.</p>
          <p>7.2 The user undertakes to rate in a reliable and fair manner, based on their personal experience.</p>
          <p>7.3 The Company reserves the right to remove any offensive, insulting, racist, threatening, illegal, or inappropriate content, at its sole discretion.</p>
          <p>7.4 The user grants the Company an irrevocable, worldwide, royalty-free license to use, copy, distribute, and publish any content uploaded by them to the Website.</p>
          <p>7.5 In case of account deletion by the user, user-generated content (such as ratings and reviews) may be retained on the Website but will be displayed as anonymous. The license granted in section 7.4 shall continue to apply even after account deletion. The user may request removal of specific content they created by contacting customer service.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>8. Limitation of Liability</h2>
        <div className={`${blockClass} px-6`}>
          <p>8.1 The use of the Website is at the user's sole responsibility. The Company shall not be liable for any direct or indirect damage caused to the user or a third party as a result of use or reliance on the information appearing on the Website.</p>
          <p>8.2 The Company makes efforts to ensure that the information displayed on the Website is accurate and up-to-date, but does not guarantee that the information will be complete or accurate or that the Website will operate without malfunctions.</p>
          <p>8.3 The Company will not be responsible for damages resulting from unauthorized access to user information.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>9. Dispute Resolution and Jurisdiction</h2>
        <div className={`${blockClass} px-6`}>
          <p>9.1 These Terms of Use and the use of the Website shall be governed solely by the laws of the State of Israel.</p>
          <p>9.2 In any dispute arising from or related to the use of the Website, exclusive jurisdiction shall be vested in the competent courts in the Tel Aviv-Jaffa District.</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>10. Account Termination and Suspension</h2>
        <div className={`${blockClass} px-6`}>
          <p>10.1 The Company reserves the right to suspend or terminate a user's account at any time, without prior notice, in the following cases: violation of the Terms of Use, illegal activity, fraud, offensive or harassing behavior towards other users, or any other action that constitutes a violation of the law or the Company's policies.</p>
          <p>10.2 The user may terminate their account at any time by contacting customer service in writing. Account termination will take effect within 30 days of the request, unless there are ongoing transactions or other obligations that justify a longer waiting period.</p>
          <p>10.3 Upon account termination or suspension, the user will lose access to the Website's services, including their user account, purchase history, and personal preferences.</p>
          <p>10.4 Despite account termination, the Company may retain some information for legal purposes, law compliance, dispute resolution, and enforcement of the Terms of Use.</p>
        </div>
      </div>

      <p className="mt-8 text-sm text-gray dark:text-gray-dark">Last updated: 4/13/2025</p>

      <p className="mt-6 text-sm">
        Our Privacy Policy:{' '}
        <Link href={`/${locale}/privacy`} className="text-brand-main dark:text-brand-dark hover:underline">
          Privacy Policy
        </Link>
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="my-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 text-gray-900 dark:text-white leading-tight py-3">
            {isHebrew ? 'תנאי שימוש' : 'Terms of Use'}
          </h1>
        </header>
        <article>{isHebrew ? hebrewContent : englishContent}</article>
      </main>
    </div>
  );
}
