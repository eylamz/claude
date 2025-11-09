type ErrorContext = Record<string, unknown> & {
  url?: string;
  userId?: string;
  componentStack?: string;
};

const ENDPOINT = process.env.NEXT_PUBLIC_ERROR_WEBHOOK_URL || '';
const ENV = process.env.NODE_ENV || 'development';

export async function logError(error: unknown, context: ErrorContext = {}) {
  const payload = {
    env: ENV,
    time: new Date().toISOString(),
    message: getMessage(error),
    name: getName(error),
    stack: getStack(error),
    context,
  };

  // Always log to console in dev
  if (ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('[Error]', payload);
  }

  if (!ENDPOINT) return; // Skip remote if not configured

  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Failed to send error to webhook:', (e as any)?.message || e);
  }
}

function getMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try { return JSON.stringify(error); } catch { return String(error); }
}

function getName(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

function getStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}


