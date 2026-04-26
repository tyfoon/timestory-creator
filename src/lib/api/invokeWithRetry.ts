import { supabase } from "@/integrations/supabase/client";

/**
 * Invoke a Supabase edge function with automatic retry on transient
 * 503 / SUPABASE_EDGE_RUNTIME_ERROR responses caused by concurrent bursts.
 */
export async function invokeWithRetry<T = any>(
  functionName: string,
  options: { body?: unknown } = {},
  retryOpts: { retries?: number; baseDelayMs?: number } = {}
): Promise<{ data: T | null; error: any }> {
  const retries = retryOpts.retries ?? 2;
  const baseDelay = retryOpts.baseDelayMs ?? 400;

  let lastError: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { data, error } = await supabase.functions.invoke(functionName, options as any);
    if (!error) return { data: data as T, error: null };

    lastError = error;
    const status = (error as any)?.context?.status ?? (error as any)?.status;
    const msg = String((error as any)?.message ?? "");
    const isTransient =
      status === 503 ||
      status === 504 ||
      status === 429 ||
      msg.includes("SUPABASE_EDGE_RUNTIME_ERROR") ||
      msg.includes("temporarily unavailable");

    if (!isTransient || attempt === retries) break;

    const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 200;
    await new Promise((r) => setTimeout(r, delay));
  }
  return { data: null, error: lastError };
}

/**
 * Same idea for raw fetch() calls to edge functions.
 * Retries on 503/504/429 with exponential backoff + jitter.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retryOpts: { retries?: number; baseDelayMs?: number } = {}
): Promise<Response> {
  const retries = retryOpts.retries ?? 2;
  const baseDelay = retryOpts.baseDelayMs ?? 400;

  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(input, init);
    if (res.status !== 503 && res.status !== 504 && res.status !== 429) return res;
    lastResponse = res;
    if (attempt === retries) break;
    const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 200;
    await new Promise((r) => setTimeout(r, delay));
  }
  return lastResponse!;
}
