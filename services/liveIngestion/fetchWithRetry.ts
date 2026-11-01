// =============================================================================
// TerraPulse — Shared fetch utilities with retry and latency measurement
// =============================================================================

import { API_TIMEOUT_MS, EXPONENTIAL_BACKOFF_BASE_MS } from "../../lib/constants.ts";

/**
 * Fetch with exponential-backoff retry.
 * Delays: 1 s, 2 s, 4 s (base × 2^attempt).
 * Each attempt is guarded by an AbortSignal that times out after 12 s.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    // Exponential back-off before every retry (not before the first attempt)
    if (attempt > 0) {
      const delayMs = EXPONENTIAL_BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }

    // Per-attempt timeout via AbortSignal
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      API_TIMEOUT_MS
    );

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // 5xx errors are transient — retry; 4xx are permanent — throw immediately
      if (response.status >= 500) {
        lastError = new Error(
          `HTTP ${response.status} from ${url} (attempt ${attempt + 1})`
        );
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      // On the last attempt, fall through and rethrow below
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`fetchWithRetry failed after ${retries} attempts: ${String(lastError)}`);
}

/**
 * Wraps fetchWithRetry and measures wall-clock latency.
 */
export async function timedFetch(
  url: string,
  options: RequestInit = {}
): Promise<{ response: Response; latencyMs: number }> {
  const start = Date.now();
  const response = await fetchWithRetry(url, options);
  const latencyMs = Date.now() - start;
  return { response, latencyMs };
}
