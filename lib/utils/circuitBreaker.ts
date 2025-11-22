/**
 * Circuit Breaker Utility
 * 
 * Prevents database calls after 5 consecutive 404 errors for the same endpoint/ID combination.
 * This helps avoid unnecessary database load when repeatedly querying non-existent resources.
 */

interface CircuitBreakerState {
  consecutive404s: number;
  lastErrorTime: number;
  blocked: boolean;
}

// Map to store circuit breaker state per endpoint/ID combination
// Format: "endpoint:id" -> CircuitBreakerState
const circuitBreakerMap = new Map<string, CircuitBreakerState>();

// Configuration
const MAX_CONSECUTIVE_404S = 5;
const RESET_WINDOW_MS = 15 * 60 * 1000; // 15 minutes - reset counter if last error was long ago

/**
 * Get a unique key for an endpoint and ID combination
 */
function getKey(endpoint: string, id: string): string {
  return `${endpoint}:${id}`;
}

/**
 * Check if the endpoint/ID combination is blocked due to too many 404 errors
 * @param endpoint - The API endpoint path (e.g., '/api/admin/users/[id]')
 * @param id - The resource ID being queried
 * @returns true if blocked (should not make database call), false otherwise
 */
export function isBlocked(endpoint: string, id: string): boolean {
  const key = getKey(endpoint, id);
  const state = circuitBreakerMap.get(key);

  if (!state) {
    return false; // Not blocked if no previous errors
  }

  // Reset if last error was long ago
  const timeSinceLastError = Date.now() - state.lastErrorTime;
  if (timeSinceLastError > RESET_WINDOW_MS) {
    circuitBreakerMap.delete(key);
    return false;
  }

  return state.blocked || state.consecutive404s >= MAX_CONSECUTIVE_404S;
}

/**
 * Record a 404 error for an endpoint/ID combination
 * @param endpoint - The API endpoint path
 * @param id - The resource ID that returned 404
 */
export function record404(endpoint: string, id: string): void {
  const key = getKey(endpoint, id);
  const state = circuitBreakerMap.get(key) || {
    consecutive404s: 0,
    lastErrorTime: 0,
    blocked: false,
  };

  state.consecutive404s += 1;
  state.lastErrorTime = Date.now();

  // Block if we've reached the limit
  if (state.consecutive404s >= MAX_CONSECUTIVE_404S) {
    state.blocked = true;
    console.warn(
      `[Circuit Breaker] Blocked ${endpoint} for ID ${id} after ${state.consecutive404s} consecutive 404s`
    );
  }

  circuitBreakerMap.set(key, state);
}

/**
 * Record a successful response (non-404) for an endpoint/ID combination
 * This resets the counter
 * @param endpoint - The API endpoint path
 * @param id - The resource ID that returned successfully
 */
export function recordSuccess(endpoint: string, id: string): void {
  const key = getKey(endpoint, id);
  const existingState = circuitBreakerMap.get(key);

  if (existingState && existingState.consecutive404s > 0) {
    // Reset counter on success
    circuitBreakerMap.delete(key);
    console.log(
      `[Circuit Breaker] Reset counter for ${endpoint} ID ${id} after successful response`
    );
  }
}

/**
 * Clear all circuit breaker state (useful for testing or manual reset)
 */
export function clearAll(): void {
  circuitBreakerMap.clear();
}

/**
 * Get current state for debugging
 */
export function getState(endpoint: string, id: string): CircuitBreakerState | undefined {
  return circuitBreakerMap.get(getKey(endpoint, id));
}







