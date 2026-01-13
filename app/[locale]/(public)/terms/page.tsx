'use client';

import { useEffect, useMemo } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function TermsPage() {
  const locale = useLocale();
  const isHebrew = locale === 'he';

  // SEO Meta tags
  const getMetaDescription = useMemo(() => {
    return isHebrew 
      ? 'תנאי שימוש ומדיניות פרטיות של ENBOSS - קרא את התנאים וההגבלות המלאים לשימוש באתר ובשירותים שלנו.'
      : 'Terms of Use and Privacy Policy for ENBOSS - Read the complete terms and conditions for using our website and services.';
  }, [isHebrew]);

  // Generate keywords based on language
  const getMetaKeywords = useMemo(() => {
    return isHebrew
      ? 'תנאי שימוש, מדיניות פרטיות, ENBOSS, סקייטבורד, סקייטפארקים, ישראל, תנאים והגבלות'
      : 'terms of use, privacy policy, ENBOSS, skateboarding, skateparks, Israel, terms and conditions';
  }, [isHebrew]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.com';
  const canonicalUrl = `${siteUrl}/${locale}/terms`;
  const alternateEnUrl = `${siteUrl}/en/terms`;
  const alternateHeUrl = `${siteUrl}/he/terms`;

  // Set SEO meta tags dynamically
  useEffect(() => {
    document.title = isHebrew 
      ? 'תנאי שימוש ומדיניות פרטיות - ENBOSS'
      : 'Terms of Use and Privacy Policy - ENBOSS';

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
      ? 'תנאי שימוש ומדיניות פרטיות - ENBOSS'
      : 'Terms of Use and Privacy Policy - ENBOSS';

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

  const hebrewContent = (
    <div className="space-y-6 px-2 font-medium">
      <div className="space-y-4">
        <p className="">
          ברוך הבא לאתר ENBOSS (להלן: "האתר" או "החברה"). שימושך באתר כפוף לתנאי השימוש ולמדיניות הפרטיות המפורטים להלן. אנא קרא אותם בעיון.
        </p>

        <p className="">
          ***הכתוב מטה מתייחס באופן שווה לכל מין ומגדר, ומנוסח בלשון זכר מטעמי נוחות בלבד***
        </p>

        <p className="">
          מתחת לגיל 18? הכתוב מטה עשוי להיות מעט מורכב. אנא היוועץ במבוגר אחראי לפני השימוש באתר.
        </p>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">1. כללי</h2>
        <div className="space-y-2 p-4">
          <p className="">1.1 האתר מופעל ומנוהל על ידי ENBOSS (להלן: "החברה").</p>
          <p className="">1.2 כל שימוש באתר, לרבות גלישה, רכישת מוצרים, השתתפות בדירוג פארקים או כל פעילות אחרת, מהווה הסכמה לתנאי השימוש ומדיניות הפרטיות המפורטים במסמך זה.</p>
          <p className="">1.3 החברה שומרת לעצמה את הזכות לשנות, למחוק או להוסיף על תנאי השימוש ומדיניות הפרטיות בכל עת וללא הודעה מוקדמת. באחריות המשתמש להתעדכן בשינויים אלו מעת לעת.</p>
          <p className="">1.4 במקרה של סתירה בין האמור בתנאי השימוש לבין כל פרסום אחר, יגברו הוראות תנאי השימוש.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">2. גיל המשתמש</h2>
        <div className="space-y-2 px-4">
          <p className="">2.1 השימוש באתר לצורך רכישת מוצרים מותר למשתמשים מגיל 18 ומעלה בלבד או לקטינים בהסכמת הורה או אפוטרופוס.</p>
          <p className="">2.2 משתמש מתחת לגיל 18 המבצע רכישה באתר מצהיר כי קיבל את הסכמת הוריו או האפוטרופוס החוקי שלו לביצוע הרכישה.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">3. הרשמה ומסירת מידע אישי</h2>
        <div className="space-y-2">
          <p className="">3.1 חלק מהשירותים והפעולות באתר, לרבות רכישת מוצרים, דורשים הרשמה וחובה למסור פרטים אישיים כגון שם, כתובת, דוא"ל ומספר טלפון.</p>
          <p className="">3.2 המשתמש מתחייב למסור פרטים נכונים, מדויקים ומלאים, ולעדכן את פרטיו במידת הצורך.</p>
          <p className="">3.3 מסירת פרטים כוזבים מהווה עבירה פלילית והעושה כן צפוי להליכים משפטיים, פליליים ואזרחיים.</p>
          <p className="">3.4 החברה שומרת לעצמה את הזכות למנוע ממשתמש את השימוש באתר בכל מקרה של מסירת פרטים שגויים או חשד לכך.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">4. רכישת מוצרים</h2>
        <div className="space-y-2">
          <p className="">4.1 המוצרים המוצגים באתר הינם להמחשה בלבד. ייתכנו הבדלים בין מראה המוצר בתמונה למראהו במציאות.</p>
          <p className="">4.2 מחירי המוצרים כוללים מע"מ, אלא אם צוין אחרת במפורש.</p>
          <p className="">4.3 החברה שומרת לעצמה את הזכות לשנות את מחירי המוצרים בכל עת וללא הודעה מוקדמת.</p>
          <p className="">4.4 כל רכישה באתר כפופה לאישור החברה ולזמינות המוצר במלאי. במקרה של אי זמינות מוצר לאחר ביצוע ההזמנה, החברה תיצור קשר עם הלקוח ותציע לו פתרון חלופי או זיכוי.</p>
          <p className="">4.5 ההזמנה תאושר רק לאחר אישור העסקה על ידי חברת האשראי.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">5. משלוחים והחזרות</h2>
        <div className="space-y-2">
          <p className="">5.1 החברה מספקת משלוחים בתחומי מדינת ישראל בלבד.</p>
          <p className="">5.2 זמני האספקה המצוינים באתר הינם משוערים ואינם מהווים התחייבות מצד החברה.</p>
          <p className="">5.3 החברה לא תהיה אחראית לעיכובים במשלוח הנובעים מכוח עליון או מגורמים שאינם בשליטתה.</p>
          <p className="">5.4 מדיניות החזרת מוצרים: בהתאם להוראות חוק הגנת הצרכן, התשמ"א-1981, הלקוח רשאי לבטל את העסקה תוך 14 ימים מיום קבלת המוצר או מיום קבלת מסמך המכיל את פרטי העסקה (המאוחר מביניהם), ובתנאי שהמוצר לא נפגם ולא נעשה בו שימוש.</p>
          <p className="">5.5 ביטול העסקה יחויב בדמי ביטול בשיעור של 5% ממחיר העסקה או 100 ₪, לפי הנמוך ביניהם.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">6. קניין רוחני וזכויות יוצרים</h2>
        <div className="space-y-2 text-base text-text dark:text-text-dark">
          <p className="">6.1 כל זכויות הקניין הרוחני באתר, לרבות זכויות היוצרים, סימני המסחר, העיצובים, השמות המסחריים והמוניטין הם רכושה הבלעדי של החברה או שהחברה קיבלה רישיון להשתמש בהם.</p>
          <p className="">6.2 אין להעתיק, לשכפל, להפיץ, למכור, לפרסם או לעשות כל שימוש מסחרי אחר בתוכן האתר ללא אישור מפורש מראש ובכתב מהחברה.</p>
          <p className="">6.3 אין לעשות שימוש בסימני המסחר של החברה ללא אישור מפורש בכתב מהחברה.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">7. דירוג וביקורות משתמשים</h2>
        <div className="space-y-2 text-base text-text dark:text-text-dark">
          <p className="">7.1 האתר מאפשר למשתמשים לדרג פארקים על פי אמות מידה שונות כגון תחזוקה, ניקיון, רמת קושי וכדומה.</p>
          <p className="">7.2 המשתמש מתחייב לדרג באופן אמין והוגן, על בסיס ניסיונו האישי.</p>
          <p className="">7.3 החברה שומרת לעצמה את הזכות להסיר כל תוכן פוגעני, מעליב, גזעני, מאיים, לא חוקי או לא ראוי, לפי שיקול דעתה הבלעדי.</p>
          <p className="">7.4 המשתמש מעניק לחברה רישיון בלתי חוזר, עולמי וללא תמלוגים להשתמש, להעתיק, להפיץ ולפרסם כל תוכן שהועלה על ידו לאתר.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">8. מדיניות פרטיות ואיסוף מידע</h2>
        <div className="space-y-2 text-base text-text dark:text-text-dark">
          <p className="">8.1 החברה מכבדת את פרטיות המשתמשים באתר ומחויבת לשמור על כללי הגנת הפרטיות המקובלים בישראל.</p>
          <p className="">8.2 בעת השימוש באתר ייאסף מידע אודות המשתמש, לרבות:</p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>מידע שהמשתמש מוסר בעת הרשמה ורכישה</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>מידע על אופן השימוש באתר</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>מידע טכני (כגון כתובת IP, סוג דפדפן וכדומה)</span>
            </li>
          </ul>
          <p className="">8.3 החברה עושה שימוש בקבצי עוגיות (Cookies) לצורך תפעול האתר, שיפור חווית המשתמש, התאמת תוכן ואבטחת מידע. המשתמש יכול להגדיר את הדפדפן שלו כך שיסרב לקבל עוגיות או שיתריע בפניו כאשר נשלחות עוגיות.</p>
          <p className="">8.4 החברה לא תעביר את המידע האישי של המשתמשים לצדדים שלישיים, אלא במקרים הבאים:</p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>כאשר הדבר נדרש לצורך אספקת השירות (כגון חברות שילוח, סליקת אשראי)</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>על פי דרישת רשות מוסמכת או צו שיפוטי</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>במקרה של מחלוקת משפטית בין המשתמש לחברה</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>במקרה של מיזוג, רכישה או מכירת נכסי החברה לצד שלישי</span>
            </li>
          </ul>
          <p className="">8.5 החברה תשלח הודעות שיווקיות ופרסומיות רק למשתמשים שנתנו הסכמתם המפורשת לכך בעת ההרשמה. המשתמש יוכל לבטל את הסכמתו בכל עת באמצעות הקישור להסרה המופיע בתחתית ההודעות או על ידי פנייה לשירות הלקוחות.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">9. הגבלת אחריות</h2>
        <div className="space-y-2 text-base text-text dark:text-text-dark">
          <p className="">9.1 השימוש באתר הינו באחריות המשתמש בלבד. החברה לא תישא באחריות לכל נזק ישיר או עקיף שייגרם למשתמש או לצד שלישי כתוצאה משימוש או הסתמכות על המידע המופיע באתר.</p>
          <p className="">9.2 החברה עושה מאמצים לוודא שהמידע המוצג באתר יהיה מדויק ומעודכן, אך אינה מתחייבת שהמידע יהיה מלא או מדויק או שהאתר יפעל ללא תקלות.</p>
          <p className="">9.3 החברה לא תהיה אחראית לנזקים הנובעים מגישה לא מורשית למידע של המשתמש.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">10. יישוב סכסוכים וסמכות שיפוט</h2>
        <div className="space-y-2 text-base text-text dark:text-text-dark">
          <p className="">10.1 על תנאי שימוש אלה, מדיניות הפרטיות והשימוש באתר יחולו דיני מדינת ישראל בלבד.</p>
          <p className="">10.2 בכל מחלוקת הנובעת מהשימוש באתר או הקשורה אליו, סמכות השיפוט הבלעדית תהא נתונה לבתי המשפט המוסמכים במחוז תל אביב-יפו.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">11. שירות לקוחות ויצירת קשר</h2>
        <div className="space-y-2 text-base text-text dark:text-text-dark">
          <p className="">11.1 לכל שאלה או בירור בנוגע לאתר, למוצרים או לתנאי השימוש ניתן לפנות לשירות הלקוחות באמצעות:</p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>דואר אלקטרוני: enbossblading@gmail.com</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">12. שונות</h2>
        <div className="space-y-2 text-base text-text dark:text-text-dark">
          <p className="">12.1 אם הוראה כלשהי בתנאי שימוש אלה תימצא בלתי חוקית, בטלה או בלתי ניתנת לאכיפה מכל סיבה שהיא, הדבר לא ישפיע על תוקפן ואכיפתן של שאר ההוראות.</p>
          <p className="">12.2 אי עמידה של החברה על קיום הוראה כלשהי מתנאי השימוש אינה מהווה ויתור מצידה על זכות כלשהי.</p>
        </div>
      </div>

      <p className="mt-8 text-sm text-gray dark:text-gray-dark">
        עדכון אחרון: 13.4.2025
      </p>
    </div>
  );

  const englishContent = (
    <div className="space-y-6 px-2 font-medium">
      <div className="space-y-4 text-base text-text dark:text-text-dark">
        <p className="">
          Welcome to the ENBOSS website (hereinafter: "the Website" or "the Company").
        </p>

        <p className="">
          Your use of the Website is subject to the Terms of Use and Privacy Policy detailed below. Please read them carefully.
        </p>

        <p className="">
          ***The content below applies equally to all genders and is written in the masculine form for convenience only***
        </p>

        <p className="">
          Under 18? The content below may be somewhat complex. Please consult a responsible adult before using the Website.
        </p>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">1. General</h2>
        <div className="space-y-2 px-6 text-base text-text dark:text-text-dark">
          <p className="">1.1 The Website is operated and managed by ENBOSS (hereinafter: "the Company").</p>
          <p className="">1.2 Any use of the Website, including browsing, purchasing products, participating in skatepark ratings, or any other activity, constitutes agreement to the Terms of Use and Privacy Policy detailed in this document.</p>
          <p className="">1.3 The Company reserves the right to change, delete, or add to the Terms of Use and Privacy Policy at any time without prior notice. It is the user's responsibility to stay updated on these changes from time to time.</p>
          <p className="">1.4 In case of contradiction between the provisions of the Terms of Use and any other publication, the provisions of the Terms of Use shall prevail.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">2. User Age</h2>
        <div className="space-y-2 px-6 text-base text-text dark:text-text-dark">
          <p className="">2.1 The use of the Website for purchasing products is permitted only to users aged 18 and above or to minors with parental or guardian consent.</p>
          <p className="">2.2 A user under the age of 18 who makes a purchase on the Website declares that they have received consent from their parents or legal guardian to make the purchase.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">3. Registration and Personal Information</h2>
        <div className="space-y-2 px-6 text-base text-text dark:text-text-dark">
          <p className="">3.1 Some services and activities on the Website, including purchasing products, require registration and mandatory submission of personal details such as name, address, email, and phone number.</p>
          <p className="">3.2 The user undertakes to provide correct, accurate, and complete details, and to update their details as necessary.</p>
          <p className="">3.3 Providing false details constitutes a criminal offense, and anyone who does so may be subject to legal, criminal, and civil proceedings.</p>
          <p className="">3.4 The Company reserves the right to prevent a user from using the Website in any case of providing incorrect details or suspicion thereof.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">4. Product Purchases</h2>
        <div className="space-y-2 px-6 text-base text-text dark:text-text-dark">
          <p className="">4.1 The products displayed on the Website are for illustration purposes only. There may be differences between the appearance of the product in the image and its appearance in reality.</p>
          <p className="">4.2 Product prices include VAT, unless explicitly stated otherwise.</p>
          <p className="">4.3 The Company reserves the right to change product prices at any time without prior notice.</p>
          <p className="">4.4 All purchases on the Website are subject to Company approval and product availability in stock. In case of product unavailability after placing an order, the Company will contact the customer and offer an alternative solution or credit.</p>
          <p className="">4.5 The order will be approved only after authorization by the credit card company.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">5. Shipping and Returns</h2>
        <div className="space-y-2 px-6 text-base text-text dark:text-text-dark">
          <p className="">5.1 The Company provides shipping within the State of Israel only.</p>
          <p className="">5.2 The delivery times specified on the Website are estimated and do not constitute a commitment by the Company.</p>
          <p className="">5.3 The Company will not be responsible for shipping delays resulting from force majeure or factors beyond its control.</p>
          <p className="">5.4 Product Return Policy: In accordance with the provisions of the Consumer Protection Law of 1981, the customer may cancel the transaction within 14 days from the date of receiving the product or from the date of receiving the document containing the transaction details (whichever is later), provided that the product has not been damaged and has not been used.</p>
          <p className="">5.5 Cancellation of the transaction will incur a cancellation fee of 5% of the transaction price or 100 NIS, whichever is lower.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">6. Intellectual Property and Copyright</h2>
        <div className="space-y-2 px-6 text-base text-text dark:text-text-dark">
          <p className="">6.1 All intellectual property rights on the Website, including copyrights, trademarks, designs, trade names, and goodwill, are the exclusive property of the Company or the Company has received a license to use them.</p>
          <p className="">6.2 It is prohibited to copy, duplicate, distribute, sell, publish, or make any other commercial use of the Website content without explicit prior written approval from the Company.</p>
          <p className="">6.3 It is prohibited to use the Company's trademarks without explicit written approval from the Company.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">7. User Ratings and Reviews</h2>
        <div className="space-y-2 px-6 text-base text-text dark:text-text-dark">
          <p className="">7.1 The Website allows users to rate skateparks according to various criteria such as maintenance, cleanliness, difficulty level, and more.</p>
          <p className="">7.2 The user undertakes to rate in a reliable and fair manner, based on their personal experience.</p>
          <p className="">7.3 The Company reserves the right to remove any offensive, insulting, racist, threatening, illegal, or inappropriate content, at its sole discretion.</p>
          <p className="">7.4 The user grants the Company an irrevocable, worldwide, royalty-free license to use, copy, distribute, and publish any content uploaded by them to the Website.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">8. Privacy Policy and Information Collection</h2>
        <div className="space-y-2 px-6 text-base text-text dark:text-text-dark">
          <p className="">8.1 The Company respects the privacy of the Website users and is committed to maintaining the privacy protection rules accepted in Israel.</p>
          <p className="">8.2 During the use of the Website, information about the user will be collected, including:</p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Information provided by the user during registration and purchase</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Information about how the Website is used</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Technical information (such as IP address, browser type, etc.)</span>
            </li>
          </ul>
          <p className="">8.3 The Company uses cookies for Website operation, improving user experience, customizing content, and information security. The user can configure their browser to refuse cookies or to alert them when cookies are being sent.</p>
          <p className="">8.4 The Company will not transfer users' personal information to third parties, except in the following cases:</p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>When required for service provision (such as shipping companies, credit clearing)</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>By request of a competent authority or judicial order</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>In case of a legal dispute between the user and the Company</span>
            </li>
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>In case of merger, acquisition, or sale of Company assets to a third party</span>
            </li>
          </ul>
          <p className="">8.5 The Company will send marketing and promotional messages only to users who have explicitly consented to it during registration. The user may withdraw their consent at any time via the unsubscribe link appearing at the bottom of the messages or by contacting customer service.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">9. Limitation of Liability</h2>
        <div className="space-y-2 px-6  text-base text-text dark:text-text-dark">
          <p className="">9.1 The use of the Website is at the user's sole responsibility. The Company shall not be liable for any direct or indirect damage caused to the user or a third party as a result of use or reliance on the information appearing on the Website.</p>
          <p className="">9.2 The Company makes efforts to ensure that the information displayed on the Website is accurate and up-to-date, but does not guarantee that the information will be complete or accurate or that the Website will operate without malfunctions.</p>
          <p className="">9.3 The Company will not be responsible for damages resulting from unauthorized access to user information.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">10. Dispute Resolution and Jurisdiction</h2>
        <div className="space-y-2 px-6 text-base text-text dark:text-text-dark">
          <p className="">10.1 These Terms of Use, Privacy Policy, and the use of the Website shall be governed solely by the laws of the State of Israel.</p>
          <p className="">10.2 In any dispute arising from or related to the use of the Website, exclusive jurisdiction shall be vested in the competent courts in the Tel Aviv-Jaffa District.</p>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">11. Customer Service and Contact</h2>
        <div className="space-y-2 px-6  text-base text-text dark:text-text-dark">
          <p className="">11.1 For any question or inquiry regarding the Website, products, or Terms of Use, you may contact customer service via:</p>
          <ul className="my-6 space-y-3 list-none pl-0">
            <li className="text-lg text-text dark:text-text-dark leading-relaxed flex gap-3">
              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
              <span>Email: enbossblading@gmail.com</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="">
        <h2 className="text-lg sm:text-3xl font-bold mb-2  text-gray-900 dark:text-white">12. Miscellaneous</h2>
        <div className="space-y-2 px-6 text-base text-text dark:text-text-dark">
          <p className="">12.1 If any provision of these Terms of Use is found to be illegal, void, or unenforceable for any reason, it will not affect the validity and enforceability of the remaining provisions.</p>
          <p className="">12.2 The Company's failure to enforce any provision of the Terms of Use does not constitute a waiver of any right.</p>
        </div>
      </div>

      <p className="mt-8 text-sm text-gray dark:text-gray-dark">
        Last updated: 4/13/2025
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
            {isHebrew ? 'תנאי שימוש ומדיניות פרטיות' : 'Terms of Use and Privacy Policy'}
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

