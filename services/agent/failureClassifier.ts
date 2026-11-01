// =============================================================================
// TerraPulse — Failure Taxonomy & Error Classifier
// =============================================================================

export type FailureClass =
  | "NETWORK_ERROR"
  | "RATE_LIMIT"
  | "SCHEMA_VIOLATION"
  | "MISSING_DATA"
  | "UNKNOWN_ERROR";

export interface SelfHealingAction {
  actionType: "RETRY" | "SCHEMA_FEEDBACK" | "DEGRADE_GRACEFULLY" | "ABORT";
  failureClass: FailureClass;
  message: string;
  attempt: number;
}

/**
 * Classifies an error to determine whether it is retryable
 */
export function classifyFailure(error: unknown): FailureClass {
  if (!error) return "UNKNOWN_ERROR";
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const status =
    (error as { status?: number; statusCode?: number }).status ||
    (error as { status?: number; statusCode?: number }).statusCode;

  if (status === 429 || msg.includes("rate limit") || msg.includes("quota")) {
    return "RATE_LIMIT";
  }
  if (
    msg.includes("fetch failed") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    status === 503
  ) {
    return "NETWORK_ERROR";
  }
  if (msg.includes("schema") || msg.includes("validation") || msg.includes("zod")) {
    return "SCHEMA_VIOLATION";
  }
  if (msg.includes("not found") || msg.includes("offline") || msg.includes("unavailable")) {
    return "MISSING_DATA";
  }
  return "UNKNOWN_ERROR";
}
