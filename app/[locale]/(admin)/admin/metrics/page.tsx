'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent, Button, SelectWrapper, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Skeleton, Input } from '@/components/ui';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

interface MetricsData {
  enabled: boolean;
  message?: string;
  from?: string;
  to?: string;
  days?: number;
  groupBy?: 'day' | 'hour';
  pageViewsByPath: Array<{ path: string; count: number }>;
  avgTimeOnPageByPath: Array<{ path: string; avgTimeOnPageMs: number }>;
  sessionsSummary: { totalSessions: number; avgSessionDurationMs: number };
  deviceBreakdown: {
    byCategory: Array<{ category: string; count: number }>;
    byType: Array<{ deviceType: string; count: number }>;
  };
  consentBreakdown: Array<{ choice: string; count: number }>;
  referrerBreakdown: Array<{ referrerCategory: string; count: number }>;
  countryBreakdown: Array<{ country: string; count: number }>;
  navigationPatterns?: Array<{ fromPath: string; toPath: string; count: number }>;
  topPages: Array<{ path: string; count: number }>;
  searchQueries?: Array<{ query: string; deviceCategory: string; count: number }>;
  searchClicks?: Array<{ resultType: string; resultSlug: string; deviceCategory: string; count: number }>;
  popularSearchHidden?: Array<{ resultType: string; resultSlug: string }>;
  sessionsByDay?: Array<{ date: string; count: number }>;
  pageViewsByDay?: Array<{ date: string; count: number }>;
  visitorTypeBreakdown?: Array<{ visitorType: string; count: number }>;
  visitorTypeFilter?: 'all' | 'user' | 'crawler' | 'bot' | 'other';
  skateparkVisitsBySession?: Array<{ slug: string; count: number }>;
}

const DEVICE_COLORS = ['#3caa41', '#1d4ed8', '#e49a43', '#8B5CF6', '#EC4899'];
const CONSENT_COLORS = ['#1d4ed8', '#e49a43', '#6366F1'];
const REFERRER_COLORS = ['#3caa41', '#1d4ed8', '#e49a43', '#8B5CF6', '#EC4899'];

// ISO 3166-1 alpha-2 → full country name (for tooltips)
const COUNTRY_NAMES: Record<string, string> = {
  AD: 'Andorra', AE: 'United Arab Emirates', AF: 'Afghanistan', AG: 'Antigua and Barbuda', AI: 'Anguilla',
  AL: 'Albania', AM: 'Armenia', AO: 'Angola', AR: 'Argentina', AS: 'American Samoa', AT: 'Austria',
  AU: 'Australia', AW: 'Aruba', AX: 'Åland Islands', AZ: 'Azerbaijan', BA: 'Bosnia and Herzegovina',
  BB: 'Barbados', BD: 'Bangladesh', BE: 'Belgium', BF: 'Burkina Faso', BG: 'Bulgaria', BH: 'Bahrain',
  BI: 'Burundi', BJ: 'Benin', BL: 'Saint Barthélemy', BM: 'Bermuda', BN: 'Brunei', BO: 'Bolivia',
  BQ: 'Caribbean Netherlands', BR: 'Brazil', BS: 'Bahamas', BT: 'Bhutan', BW: 'Botswana', BY: 'Belarus',
  BZ: 'Belize', CA: 'Canada', CC: 'Cocos (Keeling) Islands', CD: 'Democratic Republic of the Congo',
  CF: 'Central African Republic', CG: 'Republic of the Congo', CH: 'Switzerland', CI: 'Ivory Coast',
  CK: 'Cook Islands', CL: 'Chile', CM: 'Cameroon', CN: 'China', CO: 'Colombia', CR: 'Costa Rica',
  CU: 'Cuba', CV: 'Cape Verde', CW: 'Curaçao', CX: 'Christmas Island', CY: 'Cyprus', CZ: 'Czech Republic',
  DE: 'Germany', DJ: 'Djibouti', DK: 'Denmark', DM: 'Dominica', DO: 'Dominican Republic', DZ: 'Algeria',
  EC: 'Ecuador', EE: 'Estonia', EG: 'Egypt', EH: 'Western Sahara', ER: 'Eritrea', ES: 'Spain',
  ET: 'Ethiopia', FI: 'Finland', FJ: 'Fiji', FK: 'Falkland Islands', FM: 'Micronesia', FO: 'Faroe Islands',
  FR: 'France', GA: 'Gabon', GB: 'United Kingdom', GD: 'Grenada', GE: 'Georgia', GF: 'French Guiana',
  GG: 'Guernsey', GH: 'Ghana', GI: 'Gibraltar', GL: 'Greenland', GM: 'Gambia', GN: 'Guinea',
  GP: 'Guadeloupe', GQ: 'Equatorial Guinea', GR: 'Greece', GT: 'Guatemala', GU: 'Guam', GW: 'Guinea-Bissau',
  GY: 'Guyana', HK: 'Hong Kong', HN: 'Honduras', HR: 'Croatia', HT: 'Haiti', HU: 'Hungary',
  ID: 'Indonesia', IE: 'Ireland', IL: 'Israel', IM: 'Isle of Man', IN: 'India', IO: 'British Indian Ocean Territory',
  IQ: 'Iraq', IR: 'Iran', IS: 'Iceland', IT: 'Italy', JE: 'Jersey', JM: 'Jamaica', JO: 'Jordan',
  JP: 'Japan', KE: 'Kenya', KG: 'Kyrgyzstan', KH: 'Cambodia', KI: 'Kiribati', KM: 'Comoros',
  KN: 'Saint Kitts and Nevis', KP: 'North Korea', KR: 'South Korea', KW: 'Kuwait', KY: 'Cayman Islands',
  KZ: 'Kazakhstan', LA: 'Laos', LB: 'Lebanon', LC: 'Saint Lucia', LI: 'Liechtenstein', LK: 'Sri Lanka',
  LR: 'Liberia', LS: 'Lesotho', LT: 'Lithuania', LU: 'Luxembourg', LV: 'Latvia', LY: 'Libya',
  MA: 'Morocco', MC: 'Monaco', MD: 'Moldova', ME: 'Montenegro', MF: 'Saint Martin', MG: 'Madagascar',
  MH: 'Marshall Islands', MK: 'North Macedonia', ML: 'Mali', MM: 'Myanmar', MN: 'Mongolia', MO: 'Macau',
  MP: 'Northern Mariana Islands', MQ: 'Martinique', MR: 'Mauritania', MS: 'Montserrat', MT: 'Malta',
  MU: 'Mauritius', MV: 'Maldives', MW: 'Malawi', MX: 'Mexico', MY: 'Malaysia', MZ: 'Mozambique',
  NA: 'Namibia', NC: 'New Caledonia', NE: 'Niger', NF: 'Norfolk Island', NG: 'Nigeria', NI: 'Nicaragua',
  NL: 'Netherlands', NO: 'Norway', NP: 'Nepal', NR: 'Nauru', NU: 'Niue', NZ: 'New Zealand',
  OM: 'Oman', PA: 'Panama', PE: 'Peru', PF: 'French Polynesia', PG: 'Papua New Guinea', PH: 'Philippines',
  PK: 'Pakistan', PL: 'Poland', PM: 'Saint Pierre and Miquelon', PR: 'Puerto Rico', PS: 'Palestine',
  PT: 'Portugal', PW: 'Palau', PY: 'Paraguay', QA: 'Qatar', RE: 'Réunion', RO: 'Romania', RS: 'Serbia',
  RU: 'Russia', RW: 'Rwanda', SA: 'Saudi Arabia', SB: 'Solomon Islands', SC: 'Seychelles', SD: 'Sudan',
  SE: 'Sweden', SG: 'Singapore', SH: 'Saint Helena', SI: 'Slovenia', SJ: 'Svalbard and Jan Mayen',
  SK: 'Slovakia', SL: 'Sierra Leone', SM: 'San Marino', SN: 'Senegal', SO: 'Somalia', SR: 'Suriname',
  SS: 'South Sudan', ST: 'São Tomé and Príncipe', SV: 'El Salvador', SX: 'Sint Maarten', SY: 'Syria',
  SZ: 'Eswatini', TC: 'Turks and Caicos Islands', TD: 'Chad', TG: 'Togo', TH: 'Thailand', TJ: 'Tajikistan',
  TK: 'Tokelau', TL: 'Timor-Leste', TM: 'Turkmenistan', TN: 'Tunisia', TO: 'Tonga', TR: 'Turkey',
  TT: 'Trinidad and Tobago', TV: 'Tuvalu', TW: 'Taiwan', TZ: 'Tanzania', UA: 'Ukraine', UG: 'Uganda',
  US: 'United States', UY: 'Uruguay', UZ: 'Uzbekistan', VA: 'Vatican City', VC: 'Saint Vincent and the Grenadines',
  VE: 'Venezuela', VG: 'British Virgin Islands', VI: 'United States Virgin Islands', VN: 'Vietnam', VU: 'Vanuatu',
  WF: 'Wallis and Futuna', WS: 'Samoa', XK: 'Kosovo', YE: 'Yemen', YT: 'Mayotte', ZA: 'South Africa',
  ZM: 'Zambia', ZW: 'Zimbabwe',
};

// ISO 3166-1 alpha-2 → Hebrew country name (for tooltips when locale is he)
const COUNTRY_NAMES_HE: Record<string, string> = {
  AD: 'אנדורה', AE: 'איחוד האמירויות', AF: 'אפגניסטן', AG: 'אנטיגואה וברבודה', AI: 'אנגווילה',
  AL: 'אלבניה', AM: 'ארמניה', AO: 'אנגולה', AR: 'ארגנטינה', AS: 'סמואה האמריקנית', AT: 'אוסטריה',
  AU: 'אוסטרליה', AW: 'ארובה', AX: 'איי אולנד', AZ: 'אזרבייג\'ן', BA: 'בוסניה והרצגובינה',
  BB: 'ברבדוס', BD: 'בנגלדש', BE: 'בלגיה', BF: 'בורקינה פאסו', BG: 'בולגריה', BH: 'בחריין',
  BI: 'בורונדי', BJ: 'בנין', BL: 'סן ברתלמי', BM: 'ברמודה', BN: 'ברוניי', BO: 'בוליביה',
  BQ: 'האנטילים ההולנדיים', BR: 'ברזיל', BS: 'איי בהאמה', BT: 'בהוטן', BW: 'בוטסואנה', BY: 'בלארוס',
  BZ: 'בליז', CA: 'קנדה', CC: 'איי קוקוס', CD: 'קונגו (DRC)', CF: 'הרפובליקה המרכז-אפריקאית',
  CG: 'קונגו', CH: 'שווייץ', CI: 'חוף השנהב', CK: 'איי קוק', CL: 'צ\'ילה', CM: 'קמרון', CN: 'סין',
  CO: 'קולומביה', CR: 'קוסטה ריקה', CU: 'קובה', CV: 'כף ורדה', CW: 'קוראסאו', CX: 'אי חג המולד',
  CY: 'קפריסין', CZ: 'צ\'כיה', DE: 'גרמניה', DJ: 'ג\'יבוטי', DK: 'דנמרק', DM: 'דומיניקה',
  DO: 'הרפובליקה הדומיניקנית', DZ: 'אלג\'יריה', EC: 'אקוודור', EE: 'אסטוניה', EG: 'מצרים',
  EH: 'סהרה המערבית', ER: 'אריתריאה', ES: 'ספרד', ET: 'אתיופיה', FI: 'פינלנד', FJ: 'פיג\'י',
  FK: 'איי פוקלנד', FM: 'מיקרונזיה', FO: 'איי פארו', FR: 'צרפת', GA: 'גבון', GB: 'בריטניה',
  GD: 'גרנדה', GE: 'גאורגיה', GF: 'גיאנה הצרפתית', GG: 'גרנזי', GH: 'גאנה', GI: 'גיברלטר',
  GL: 'גרינלנד', GM: 'גמביה', GN: 'גינאה', GP: 'גוואדלופ', GQ: 'גינאה המשוונית', GR: 'יוון',
  GT: 'גואטמלה', GU: 'גואם', GW: 'גינאה-ביסאו', GY: 'גיאנה', HK: 'הונג קונג', HN: 'הונדורס',
  HR: 'קרואטיה', HT: 'האיטי', HU: 'הונגריה', ID: 'אינדונזיה', IE: 'אירלנד', IL: 'ישראל',
  IM: 'האי מאן', IN: 'הודו', IO: 'טריטוריית האוקיינוס ההודי', IQ: 'עיראק', IR: 'איראן', IS: 'איסלנד',
  IT: 'איטליה', JE: 'ג\'רסי', JM: 'ג\'מייקה', JO: 'ירדן', JP: 'יפן', KE: 'קניה', KG: 'קירגיזסטן',
  KH: 'קמבודיה', KI: 'קיריבטי', KM: 'קומורו', KN: 'סנט קיטס ונוויס', KP: 'צפון קוריאה', KR: 'דרום קוריאה',
  KW: 'כווית', KY: 'איי קיימן', KZ: 'קזחסטן', LA: 'לאוס', LB: 'לבנון', LC: 'סנט לוסיה',
  LI: 'ליכטנשטיין', LK: 'סרי לנקה', LR: 'ליבריה', LS: 'לסוטו', LT: 'ליטא', LU: 'לוקסמבורג',
  LV: 'לטביה', LY: 'לוב', MA: 'מרוקו', MC: 'מונקו', MD: 'מולדובה', ME: 'מונטנגרו', MF: 'סן מרטן',
  MG: 'מדגסקר', MH: 'איי מרשל', MK: 'מקדוניה הצפונית', ML: 'מאלי', MM: 'מיאנמר', MN: 'מונגוליה',
  MO: 'מקאו', MP: 'איי מריאנה הצפוניים', MQ: 'מרטיניק', MR: 'מאוריטניה', MS: 'מונטסראט', MT: 'מלטה',
  MU: 'מאוריציוס', MV: 'האיים המלדיביים', MW: 'מלאווי', MX: 'מקסיקו', MY: 'מלזיה', MZ: 'מוזמביק',
  NA: 'נמיביה', NC: 'קלדוניה החדשה', NE: 'ניז\'ר', NF: 'אי נורפוק', NG: 'ניגריה', NI: 'ניקרגואה',
  NL: 'הולנד', NO: 'נורווגיה', NP: 'נפאל', NR: 'נאורו', NU: 'ניואה', NZ: 'ניו זילנד',
  OM: 'עומאן', PA: 'פנמה', PE: 'פרו', PF: 'פולינזיה הצרפתית', PG: 'פפואה גינאה החדשה', PH: 'הפיליפינים',
  PK: 'פקיסטן', PL: 'פולין', PM: 'סן פייר ומיקלון', PR: 'פורטו ריקו', PS: 'פלסטין', PT: 'פורטוגל',
  PW: 'פלאו', PY: 'פרגוואי', QA: 'קטר', RE: 'ראוניון', RO: 'רומניה', RS: 'סרביה', RU: 'רוסיה',
  RW: 'רואנדה', SA: 'ערב הסעודית', SB: 'איי שלמה', SC: 'סיישל', SD: 'סודן', SE: 'שוודיה',
  SG: 'סינגפור', SH: 'סנט הלנה', SI: 'סלובניה', SJ: 'סבאלברד ויאן מאיין', SK: 'סלובקיה',
  SL: 'סיירה לאון', SM: 'סן מרינו', SN: 'סנגל', SO: 'סומליה', SR: 'סורינאם', SS: 'דרום סודן',
  ST: 'סאו טומה ופרינסיפה', SV: 'אל סלבדור', SX: 'סן מרטן', SY: 'סוריה', SZ: 'אסווטיני',
  TC: 'איי טורקס וקייקס', TD: 'צ\'אד', TG: 'טוגו', TH: 'תאילנד', TJ: 'טג\'יקיסטן', TK: 'טוקלאו',
  TL: 'מזרח טימור', TM: 'טורקמניסטן', TN: 'תוניסיה', TO: 'טונגה', TR: 'טורקיה',
  TT: 'טרינידד וטובגו', TV: 'טובאלו', TW: 'טאיוואן', TZ: 'טנזניה', UA: 'אוקראינה', UG: 'אוגנדה',
  US: 'ארצות הברית', UY: 'אורוגוואי', UZ: 'אוזבקיסטן', VA: 'הוותיקן', VC: 'סנט וינסנט והגרנדינים',
  VE: 'ונצואלה', VG: 'איי הבתולה הבריטיים', VI: 'איי הבתולה של ארה"ב', VN: 'וייטנאם', VU: 'ונואטו',
  WF: 'ווליס ופוטונה', WS: 'סמואה', XK: 'קוסובו', YE: 'תימן', YT: 'מאיוט', ZA: 'דרום אפריקה',
  ZM: 'זמביה', ZW: 'זימבבואה',
};

// Custom tooltip for line charts (light/dark mode, matches admin skateparks style)
const LineChartTooltip = ({
  active,
  payload,
  valueLabel,
  byHour,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { date: string } }>;
  valueLabel: string;
  byHour?: boolean;
}) => {
  if (!active || !payload?.length) return null;
  const dateStr = payload[0].payload?.date;
  const value = payload[0].value ?? 0;
  const label = dateStr
    ? byHour && dateStr.includes('T')
      ? new Date(dateStr + ':00:00').toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      : new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
    : dateStr;
  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
      <div className="font-semibold text-gray-900 dark:text-white mb-1">{label}</div>
      <div className="text-sm text-gray-700 dark:text-gray-300">
        {value} {valueLabel}
      </div>
    </div>
  );
};

// Custom tooltip for bar charts (e.g. top pages) – light/dark mode
const BarChartTooltip = ({
  active,
  payload,
  labelKey = 'path',
  valueLabel,
  labelFormatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: Record<string, unknown> }>;
  labelKey?: string;
  valueLabel: string;
  labelFormatter?: (label: string) => string;
}) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  let label = row ? String(row[labelKey] ?? payload[0].value) : '';
  if (labelFormatter) label = labelFormatter(label);
  const value = payload[0].value ?? 0;
  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
      <div className="font-semibold text-gray-900 dark:text-white mb-1 break-all max-w-xs">{label}</div>
      <div className="text-sm text-gray-700 dark:text-gray-300">
        {value} {valueLabel}
      </div>
    </div>
  );
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const min = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${min}m ${s}s`;
}

export default function AdminMetricsPage() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MetricsData | null>(null);
  const [days, setDays] = useState('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [visitorType, setVisitorType] = useState<'all' | 'user' | 'crawler' | 'bot' | 'other'>('all');
  const [showUnknownCountry, setShowUnknownCountry] = useState(false);
  const [updatingHidden, setUpdatingHidden] = useState<string | null>(null);
  const [openGraph, setOpenGraph] = useState<'sessions' | 'pageViews' | null>(null);
  const [showNavigationPatterns, setShowNavigationPatterns] = useState(false);
  const [showSkateparkVisits, setShowSkateparkVisits] = useState(false);

  const hiddenSet = useMemo(
    () =>
      new Set(
        (data?.popularSearchHidden || []).map((h) => `${h.resultType}\0${h.resultSlug}`)
      ),
    [data?.popularSearchHidden]
  );

  const popularSearchesAggregated = useMemo(() => {
    const map = new Map<string, { resultType: string; resultSlug: string; count: number }>();
    for (const row of data?.searchClicks ?? []) {
      const key = `${row.resultType}\0${row.resultSlug}`;
      const cur = map.get(key);
      if (!cur) {
        map.set(key, { resultType: row.resultType, resultSlug: row.resultSlug, count: row.count });
      } else {
        cur.count += row.count;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 25);
  }, [data?.searchClicks]);

  const fetchMetrics = async () => {
    try {
      setError(null);
      setLoading(true);
      const isCustom = days === 'custom';
      const base =
        isCustom && customStart && customEnd
          ? `/api/admin/metrics?days=custom&from=${encodeURIComponent(customStart)}&to=${encodeURIComponent(customEnd)}`
          : `/api/admin/metrics?days=${days}`;
      const url = visitorType === 'all' ? base : `${base}&visitorType=${encodeURIComponent(visitorType)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const json = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (days !== 'custom') {
      fetchMetrics();
    } else if (customStart && customEnd) {
      fetchMetrics();
    }
  }, [days, customStart, customEnd, visitorType]);

  const handleRefresh = async () => {
    try {
      setError(null);
      setLoading(true);
      const isCustom = days === 'custom';
      const base =
        isCustom && customStart && customEnd
          ? `/api/admin/metrics?days=custom&from=${encodeURIComponent(customStart)}&to=${encodeURIComponent(customEnd)}`
          : `/api/admin/metrics?days=${days}`;
      const url = visitorType === 'all' ? base : `${base}&visitorType=${encodeURIComponent(visitorType)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const json = await res.json();
      setData(json);
      toast({
        title: t('metrics.toastSuccess'),
        description: t('metrics.toastRefreshed'),
        variant: 'success',
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePopularHidden = async (
    resultType: string,
    resultSlug: string,
    currentlyHidden: boolean
  ) => {
    const key = `${resultType}\0${resultSlug}`;
    setUpdatingHidden(key);
    try {
      const current = data?.popularSearchHidden || [];
      const next = currentlyHidden
        ? current.filter((h) => h.resultType !== resultType || h.resultSlug !== resultSlug)
        : [...current, { resultType, resultSlug }];
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ popularSearchHidden: next }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setData((prev) => (prev ? { ...prev, popularSearchHidden: next } : null));
      toast({
        title: t('metrics.toastSuccess'),
        description: currentlyHidden ? t('metrics.popularRestored') : t('metrics.popularRemoved'),
        variant: 'success',
      });
    } catch {
      toast({
        title: t('metrics.toastError'),
        description: t('metrics.popularUpdateFailed'),
        variant: 'destructive',
      });
    } finally {
      setUpdatingHidden(null);
    }
  };

  if (error) {
    return (
      <div className="pt-16 space-y-6 w-full max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('metrics.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('metrics.subtitle')}
          </p>
        </div>
        <Card className="bg-card dark:bg-card-dark">
          <CardContent className="p-4">
            <p className="text-red dark:text-red-dark mb-4">{error}</p>
            <Button variant="secondary" onClick={() => fetchMetrics()}>{t('metrics.tryAgain')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isIlCookiePolicy = process.env.NEXT_PUBLIC_SET_IL_COOKIE_POLICY === 'true';

  return (
    <div className="pt-16 space-y-6 w-full max-w-6xl mx-auto">
      <Toaster />
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('metrics.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('metrics.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-36">
            <SelectWrapper
              value={days}
              onChange={(e) => setDays(e.target.value)}
              options={[
                { value: '7', label: t('metrics.days7') },
                { value: '30', label: t('metrics.days30') },
                { value: '90', label: t('metrics.days90') },
                { value: '365', label: t('metrics.days365') },
                { value: 'custom', label: t('metrics.daysCustom') },
              ]}
            />
          </div>
          <div className="w-40">
            <SelectWrapper
              value={visitorType}
              onChange={(e) => setVisitorType(e.target.value as 'all' | 'user' | 'crawler' | 'bot' | 'other')}
              options={[
                { value: 'all', label: t('metrics.visitorTypeAll') },
                { value: 'user', label: t('metrics.visitorTypeUser') },
                { value: 'crawler', label: t('metrics.visitorTypeCrawler') },
                { value: 'bot', label: t('metrics.visitorTypeBot') },
                { value: 'other', label: t('metrics.visitorTypeOther') },
              ]}
            />
          </div>
          {days === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <label htmlFor="metrics-from" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {t('metrics.dateFrom')}
                </label>
                <Input
                  id="metrics-from"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-1">
                <label htmlFor="metrics-to" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {t('metrics.dateTo')}
                </label>
                <Input
                  id="metrics-to"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
          )}
          <Button
            variant="gray"
            className="flex items-center gap-1"
            onClick={handleRefresh}
            disabled={loading || (days === 'custom' && (!customStart || !customEnd))}
            title={t('metrics.refreshTitle')}
          >
            <svg
              className={`w-4 h-4 transition-transform ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('metrics.refresh')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card dark:bg-card-dark">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <>
          {!data.enabled && (
            <Card className="border border-red-border dark:border-red-border-dark bg-red-bg dark:bg-red-bg-dark">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-red dark:text-red-dark">
                  {data.message ?? t('metrics.disabledMessage')}
                </p>
              </CardContent>
            </Card>
          )}
          {/* Visitor type breakdown (page views in period; filter hint when not "all") */}
          {(data?.visitorTypeBreakdown?.length || visitorType !== 'all') && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">{t('metrics.visitorTypeBreakdown')}:</span>
              {data?.visitorTypeBreakdown?.map((row) => (
                <span key={row.visitorType} className="text-gray-600 dark:text-gray-400">
                  {t(`metrics.visitorType.${row.visitorType}` as const)} {row.count.toLocaleString()}
                </span>
              ))}
              {visitorType !== 'all' && (
                <span className="text-amber-600 dark:text-amber-400">
                  ({t('metrics.visitorTypeFilterActive', { type: t(`metrics.visitorType.${visitorType}` as const) })})
                </span>
              )}
            </div>
          )}
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <Card className="bg-card dark:bg-card-dark">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('metrics.totalPageViews')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {data?.pageViewsByPath.reduce((s, p) => s + p.count, 0) ?? 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('metrics.lastDays', { days: data?.days ?? Number(days) ?? 30 })}</p>
                <Button
                  variant={openGraph === 'pageViews' ? 'red' : 'purple'}
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setOpenGraph((g) => (g === 'pageViews' ? null : 'pageViews'))}
                >
                  {openGraph === 'pageViews' ? t('metrics.hideGraph') : t('metrics.viewByDay')}
                </Button>
              </CardContent>
            </Card>
            <Card className="bg-card dark:bg-card-dark">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('metrics.totalSessions')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {data?.sessionsSummary?.totalSessions ?? 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('metrics.lastDays', { days: data?.days ?? Number(days) ?? 30 })}</p>
                <Button
                  variant={openGraph === 'sessions' ? 'red' : 'purple'}
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setOpenGraph((g) => (g === 'sessions' ? null : 'sessions'))}
                >
                  {openGraph === 'sessions' ? t('metrics.hideGraph') : t('metrics.viewByDay')}
                </Button>
              </CardContent>
            </Card>
            <Card className="bg-card dark:bg-card-dark">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('metrics.avgTimeOnSite')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatDuration(data?.sessionsSummary?.avgSessionDurationMs ?? 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('metrics.perSession')}</p>
              </CardContent>
            </Card>
            <Card className="bg-card dark:bg-card-dark">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('metrics.skateparkVisitsTitle')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {(data?.skateparkVisitsBySession ?? []).reduce((s, p) => s + p.count, 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('metrics.skateparkVisitsSubtitle')}</p>
                <Button
                  variant={showSkateparkVisits ? 'red' : 'purple'}
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setShowSkateparkVisits((v) => !v)}
                >
                  {showSkateparkVisits ? t('metrics.hideGraph') : t('metrics.skateparkVisitsViewGraph')}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sessions per day graph (opened by button in Total sessions card) */}
          {openGraph === 'sessions' && (
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-gray-900 dark:text-white">{t('metrics.sessionsByDayTitle')}</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('metrics.sessionsByDayDescription')}</p>
                </div>
                <Button variant="gray" size="sm" onClick={() => setOpenGraph(null)}>
                  {t('metrics.close')}
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.sessionsByDay?.length ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={data.sessionsByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: 'currentColor' }}
                        className="text-text-secondary dark:text-text-dark"
                        tickFormatter={(value) => {
                          const d = new Date(value.includes('T') ? value + ':00:00' : value);
                          return data?.groupBy === 'hour'
                            ? d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: 'currentColor' }} className="text-text-secondary dark:text-text-secondary-dark" />
                      <Tooltip content={<LineChartTooltip valueLabel={t('metrics.sessions')} byHour={data?.groupBy === 'hour'} />} />
                      <Line type="monotone" dataKey="count" stroke="#9dff00" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name={t('metrics.sessions')} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noDataYet')}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Page views per day graph (opened by button in Total page views card) */}
          {openGraph === 'pageViews' && (
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-gray-900 dark:text-white">{t('metrics.pageViewsByDayTitle')}</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('metrics.pageViewsByDayDescription')}</p>
                </div>
                <Button variant="gray" size="sm" onClick={() => setOpenGraph(null)}>
                  {t('metrics.close')}
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.pageViewsByDay?.length ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={data.pageViewsByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: 'currentColor' }}
                        className="text-text-secondary dark:text-text-dark"
                        tickFormatter={(value) => {
                          const d = new Date(value.includes('T') ? value + ':00:00' : value);
                          return data?.groupBy === 'hour'
                            ? d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: 'currentColor' }} className="text-text-secondary dark:text-text-secondary-dark" />
                      <Tooltip content={<LineChartTooltip valueLabel={t('metrics.views')} byHour={data?.groupBy === 'hour'} />} />
                      <Line type="monotone" dataKey="count" stroke="#47b84d" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name={t('metrics.views')} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noDataYet')}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Skatepark visits by session (unique session per park; opened by button in Skatepark visits card) */}
          {showSkateparkVisits && (
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-gray-900 dark:text-white">{t('metrics.skateparkVisitsBySessionTitle')}</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('metrics.skateparkVisitsBySessionDescription')}</p>
                </div>
                <Button variant="gray" size="sm" onClick={() => setShowSkateparkVisits(false)}>
                  {t('metrics.close')}
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.skateparkVisitsBySession?.length ? (
                  <ResponsiveContainer width="100%" height={Math.max(300, Math.min(500, (data.skateparkVisitsBySession.length ?? 0) * 28))}>
                    <BarChart data={data.skateparkVisitsBySession.slice(0, 25)} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border dark:stroke-border-dark" />
                      <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 12 }} />
                      <YAxis type="category" dataKey="slug" width={140} tick={{ fill: 'currentColor', fontSize: 11 }} tickFormatter={(v) => (v && v.length > 28 ? v.slice(0, 26) + '…' : v)} />
                      <Tooltip content={<BarChartTooltip labelKey="slug" valueLabel={t('metrics.skateparkVisitsLabel')} />} />
                      <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} name={t('metrics.skateparkVisitsLabel')} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noSkateparkVisitsData')}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Top pages & Page views chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.topPages')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.topPages?.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.topPages.slice(0, 10)} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border dark:stroke-border-dark" />
                      <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 12 }} />
                      <YAxis type="category" dataKey="path" width={120} tick={{ fill: 'currentColor', fontSize: 11 }} tickFormatter={(v) => (v.length > 30 ? v.slice(0, 28) + '…' : v)} />
                      <Tooltip content={<BarChartTooltip labelKey="path" valueLabel={t('metrics.views')} />} />
                      <Bar dataKey="count" fill="#47b84d" radius={[0, 4, 4, 0]} name={t('metrics.views')} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noPageViewData')}</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.trafficSources')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {(() => {
                  const acquisitionOnly = (data?.referrerBreakdown ?? []).filter((r) => r.referrerCategory !== 'internal');
                  return acquisitionOnly.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={acquisitionOnly.map((r) => ({ name: t(`metrics.referrer.${r.referrerCategory}` as const), value: r.count }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {acquisitionOnly.map((_, i) => (
                          <Cell key={i} fill={REFERRER_COLORS[i % REFERRER_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: unknown) => [value as React.ReactNode, t('metrics.views')]} />
                      <Legend formatter={(value, entry) => `${value} (${entry?.payload?.value ?? 0})`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noReferrerData')}</p>
                );
                })()}
                <Button
                  variant={showNavigationPatterns ? 'red' : 'gray'}
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => setShowNavigationPatterns((v) => !v)}
                >
                  {showNavigationPatterns ? t('metrics.hideNavigationPatterns') : t('metrics.showNavigationPatterns')}
                </Button>
              </CardContent>
            </Card>

          {/* Navigation patterns (internal: from path → to path, top to low) */}
          {showNavigationPatterns && (
            <Card className="bg-card dark:bg-card-dark lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.navigationPatternsTitle')}</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t('metrics.navigationPatternsDescription')}
                </p>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {(data?.navigationPatterns?.length ?? 0) > 0 ? (
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('metrics.fromPath')}</TableHead>
                          <TableHead>{t('metrics.toPath')}</TableHead>
                          <TableHead className="text-right">{t('metrics.views')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.navigationPatterns ?? []).map((row, i) => (
                          <TableRow key={`${row.fromPath}-${row.toPath}-${i}`}>
                            <TableCell className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[200px]" title={row.fromPath}>{row.fromPath || '—'}</TableCell>
                            <TableCell className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[200px]" title={row.toPath}>{row.toPath || '—'}</TableCell>
                            <TableCell className="text-right text-gray-700 dark:text-gray-300">{row.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noNavigationPatterns')}</p>
                )}
              </CardContent>
            </Card>
          )}
          </div>

          {/* Popular searches (shown to users in header/sidebar/search page) – manage visibility */}
          <Card className="bg-card dark:bg-card-dark">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">{t('metrics.popularSearchesTitle')}</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('metrics.popularSearchesDescription')}
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {popularSearchesAggregated.length > 0 ? (
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('metrics.resultType')}</TableHead>
                        <TableHead>{t('metrics.path')}</TableHead>
                        <TableHead className="text-right">{t('metrics.views')}</TableHead>
                        <TableHead className="text-right w-32">{t('metrics.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {popularSearchesAggregated.map((row) => {
                        const key = `${row.resultType}\0${row.resultSlug}`;
                        const isHidden = hiddenSet.has(key);
                        const isUpdating = updatingHidden === key;
                        return (
                          <TableRow key={key}>
                            <TableCell className="text-xs text-gray-900 dark:text-white">{row.resultType}</TableCell>
                            <TableCell className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[200px]" title={row.resultSlug}>
                              {row.resultSlug || '—'}
                              {isHidden && (
                                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">({t('metrics.hiddenFromPopular')})</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-gray-700 dark:text-gray-300">{row.count}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant={isHidden ? 'blue' : 'red'}
                                size="sm"
                                disabled={isUpdating}
                                onClick={() => handleTogglePopularHidden(row.resultType, row.resultSlug, isHidden)}
                              >
                                {isUpdating ? t('metrics.saving') : isHidden ? t('metrics.restore') : t('metrics.remove')}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noSearchData')}</p>
              )}
            </CardContent>
          </Card>

          {/* Search results */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.searchQueries')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.searchQueries?.length ? (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('metrics.searchQuery')}</TableHead>
                          <TableHead>{t('metrics.device')}</TableHead>
                          <TableHead className="text-right">{t('metrics.views')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.searchQueries.slice(0, 25).map((row, i) => (
                          <TableRow key={`${row.query}-${row.deviceCategory}-${i}`}>
                            <TableCell className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[200px]" title={row.query}>{row.query || '—'}</TableCell>
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{t(`metrics.os.${row.deviceCategory}` as const)}</TableCell>
                            <TableCell className="text-right text-gray-700 dark:text-gray-300">{row.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noSearchData')}</p>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.searchClicks')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.searchClicks?.length ? (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('metrics.resultType')}</TableHead>
                          <TableHead>{t('metrics.path')}</TableHead>
                          <TableHead>{t('metrics.device')}</TableHead>
                          <TableHead className="text-right">{t('metrics.views')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.searchClicks.slice(0, 25).map((row, i) => (
                          <TableRow key={`${row.resultType}-${row.resultSlug}-${row.deviceCategory}-${i}`}>
                            <TableCell className="text-xs text-gray-900 dark:text-white">{row.resultType}</TableCell>
                            <TableCell className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[180px]" title={row.resultSlug}>{row.resultSlug || '—'}</TableCell>
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{t(`metrics.os.${row.deviceCategory}` as const)}</TableCell>
                            <TableCell className="text-right text-gray-700 dark:text-gray-300">{row.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noSearchData')}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Device & Consent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.devices')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.deviceBreakdown?.byCategory?.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.deviceBreakdown.byCategory.map((d) => ({ name: t(`metrics.os.${d.category}` as const), value: d.count }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.deviceBreakdown.byCategory.map((_, i) => (
                          <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: unknown) => [value as React.ReactNode, t('metrics.sessions')]} />
                      <Legend formatter={(value, entry) => `${value} (${entry?.payload?.value ?? 0})`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noDeviceData')}</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.operatingSystem')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.deviceBreakdown?.byType?.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.deviceBreakdown.byType.map((d) => ({
                          name: t(`metrics.os.${d.deviceType}` as const),
                          value: d.count,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.deviceBreakdown.byType.map((_, i) => (
                          <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: unknown) => [value as React.ReactNode, t('metrics.sessions')]} />
                      <Legend formatter={(value, entry) => `${value} (${entry?.payload?.value ?? 0})`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noOsData')}</p>
                )}
              </CardContent>
            </Card>

            {!isIlCookiePolicy && (
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.cookieConsent')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.consentBreakdown?.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.consentBreakdown.map((c) => ({ name: t(`metrics.consent.${c.choice}` as const), value: c.count }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.consentBreakdown.map((_, i) => (
                          <Cell key={i} fill={CONSENT_COLORS[i % CONSENT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: unknown) => [value as React.ReactNode, t('metrics.users')]} />
                      <Legend formatter={(value, entry) => `${value} (${entry?.payload?.value ?? 0})`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noConsentData')}</p>
                )}
              </CardContent>
            </Card>
            )}

            {/* IL Cookie consent: X button vs Confirm button */}
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.ilCookieConsent')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {(() => {
                  const ilChoices = ['il_consent_x', 'il_consent_confirm'] as const;
                  const ilBreakdown =
                    data?.consentBreakdown?.filter((c) => ilChoices.includes(c.choice as (typeof ilChoices)[number])) ?? [];
                  if (ilBreakdown.length > 0) {
                    return (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={ilBreakdown.map((c) => ({
                              name: t(`metrics.consent.${c.choice}` as const),
                              value: c.count,
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {ilBreakdown.map((_, i) => (
                              <Cell key={i} fill={CONSENT_COLORS[i % CONSENT_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: unknown) => [value as React.ReactNode, t('metrics.users')]} />
                          <Legend formatter={(value, entry) => `${value} (${entry?.payload?.value ?? 0})`} />
                        </PieChart>
                      </ResponsiveContainer>
                    );
                  }
                  return (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {t('metrics.noConsentData')}
                    </p>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Users by country (from IP) – LOCAL excluded by API; unknown hidden until "Show unknown" */}
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-gray-900 dark:text-white">{t('metrics.usersByCountry')}</CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('metrics.usersByCountryHint')}
                  </p>
                </div>
                {(() => {
                  const unknownEntry = data?.countryBreakdown?.find((c) => c.country === 'unknown');
                  const unknownCount = unknownEntry?.count ?? 0;
                  if (unknownCount === 0) return null;
                  return (
                    <Button
                      variant={showUnknownCountry ? 'red' : 'gray'}
                      size="sm"
                      onClick={() => setShowUnknownCountry((v) => !v)}
                      className="shrink-0"
                    >
                      {showUnknownCountry
                        ? t('metrics.hideUnknown')
                        : t('metrics.showUnknownCount', { count: unknownCount })}
                    </Button>
                  );
                })()}
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {(() => {
                  const full = data?.countryBreakdown ?? [];
                  const countryData = showUnknownCountry
                    ? [...full.filter((c) => c.country !== 'unknown').slice(0, 14), ...full.filter((c) => c.country === 'unknown')].slice(0, 15)
                    : full.filter((c) => c.country !== 'unknown').slice(0, 15);
                  if (!countryData.length) {
                    return (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noCountryData')}</p>
                    );
                  }
                  return (
                    <>
                      {showUnknownCountry && (() => {
                        const unknownEntry = data?.countryBreakdown?.find((c) => c.country === 'unknown');
                        const n = unknownEntry?.count ?? 0;
                        if (n === 0) return null;
                        return (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {t('metrics.unknownCountryCount', { count: n })}
                          </p>
                        );
                      })()}
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={countryData} margin={{ bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border dark:stroke-border-dark" />
                          <XAxis
                            type="category"
                            dataKey="country"
                            tick={{ fill: 'currentColor', fontSize: 11 }}
                          />
                          <YAxis type="number" tick={{ fill: 'currentColor', fontSize: 12 }} />
                          <Tooltip
                            content={
                              <BarChartTooltip
                                labelKey="country"
                                valueLabel={t('metrics.sessions')}
                                labelFormatter={(code) => (locale === 'he' ? COUNTRY_NAMES_HE[code.toUpperCase()] : COUNTRY_NAMES[code.toUpperCase()]) ?? code}
                              />
                            }
                          />
                          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name={t('metrics.sessions')} />
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Tables: Page views by path, Avg time on page */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.pageViewsByPath')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.pageViewsByPath?.length ? (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('metrics.path')}</TableHead>
                          <TableHead className="text-right">{t('metrics.views')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.pageViewsByPath.slice(0, 25).map((row) => (
                          <TableRow key={row.path}>
                            <TableCell className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[200px]" title={row.path}>{row.path}</TableCell>
                            <TableCell className="text-right text-gray-700 dark:text-gray-300">{row.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noDataYet')}</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.avgTimeOnPage')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.avgTimeOnPageByPath?.length ? (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('metrics.path')}</TableHead>
                          <TableHead className="text-right">{t('metrics.avgTime')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.avgTimeOnPageByPath.slice(0, 25).map((row) => (
                          <TableRow key={row.path}>
                            <TableCell className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[200px]" title={row.path}>{row.path}</TableCell>
                            <TableCell className="text-right text-gray-700 dark:text-gray-300">{formatDuration(row.avgTimeOnPageMs)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noDataYet')}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
