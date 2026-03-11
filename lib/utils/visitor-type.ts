/**
 * Classify request as user, crawler, bot, or other based on User-Agent.
 * Used by analytics track API to store visitorType on events.
 */
export type VisitorType = 'user' | 'crawler' | 'bot' | 'other';

const CRAWLER_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i, // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /rogerbot/i, // Moz
  /linkedinbot/i,
  /embedly/i,
  /quora link preview/i,
  /showyoubot/i,
  /outbrain/i,
  /pinterest/i,
  /slackbot/i,
  /vkshare/i,
  /w3c_validator/i,
  /redditbot/i,
  /applebot/i,
  /whatsapp/i,
  /flipboard/i,
  /tumblr/i,
  /bitlybot/i,
  /skypeuripreview/i,
  /nuzzel/i,
  /discordbot/i,
  /qwantify/i,
  /pinterestbot/i,
  /bitrix link preview/i,
  /xing-contenttabreceiver/i,
  /chrome-lighthouse/i,
  /telegrambot/i,
  /petalbot/i,
  /ahrefsbot/i,
  /semrushbot/i,
  /dotbot/i,
  /screaming frog/i,
];

const BOT_PATTERNS = [
  /bot\b/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /axios/i,
  /node-fetch/i,
  /java\s*\d*/i, // Java HTTP clients
  /go-http-client/i,
  /php\//i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /http\s*client/i,
  /feed\s*validator/i,
  /monitor/i,
  /check\s*url/i,
  /preview/i,
  /fetcher/i,
];

/**
 * Returns visitor type from User-Agent string.
 * Crawlers: known SEO/social crawlers (treated as "good" bots).
 * Bots: generic bots, scripts, headless browsers.
 * User: normal browser or unknown (default).
 */
export function getVisitorTypeFromUserAgent(userAgent: string | null): VisitorType {
  if (!userAgent || typeof userAgent !== 'string' || userAgent.trim() === '') {
    return 'user';
  }
  const ua = userAgent.trim();
  for (const re of CRAWLER_PATTERNS) {
    if (re.test(ua)) return 'crawler';
  }
  for (const re of BOT_PATTERNS) {
    if (re.test(ua)) return 'bot';
  }
  return 'user';
}
