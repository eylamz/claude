import { NextResponse } from 'next/server';

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string[]>; // field -> errors
}

export function errorResponse(message: string, status = 500, extra?: Partial<ApiError>) {
  const body: ApiError = { error: message, ...extra };
  return NextResponse.json(body, { status });
}

export function validationError(details: Record<string, string[]>, message = 'Validation failed', status = 422) {
  return errorResponse(message, status, { details, code: 'VALIDATION_ERROR' });
}

export function badRequest(message = 'Bad request') { return errorResponse(message, 400); }
export function unauthorized(message = 'Unauthorized') { return errorResponse(message, 401); }
export function forbidden(message = 'Forbidden') { return errorResponse(message, 403); }
export function notFound(message = 'Not found') { return errorResponse(message, 404); }

/** For AuthError: return generic message by status (never expose error.message). */
export function authErrorResponse(status: number): NextResponse {
  const message = status === 401 ? 'Unauthorized' : 'Forbidden';
  return NextResponse.json({ error: message }, { status });
}

/**
 * Use in catch blocks: logs full error server-side, returns generic message to client.
 * Prevents leaking infrastructure/DB/SDK details via error.message.
 */
export function internalError(error: unknown, context?: string): NextResponse {
  const prefix = context ? `[${context}] ` : '';
  // eslint-disable-next-line no-console
  console.error(prefix + 'Internal error:', error);
  return errorResponse('Internal server error', 500);
}

export function withApiHandler<T extends (...args: any[]) => Promise<Response>>(handler: T) {
  return async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('API error:', e);
      return errorResponse('Internal server error', 500);
    }
  };
}

// Client helper: parse error into user-friendly message
export async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error || res.statusText || 'Request failed';
  } catch {
    return res.statusText || 'Request failed';
  }
}


