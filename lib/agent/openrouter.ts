// openrouter.ts — thin OpenRouter chat client used by the agent pipeline.
// Gemma has no native tool-calling, so workers are prompted to return JSON and
// we extract it defensively here.

export const DEFAULT_MODEL = "google/gemma-4-26b-a4b-it:free";

export function hasOpenRouter(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

export function modelFor(role: "router" | "analyst" | "comm"): string {
  const base = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  // allow per-role overrides (e.g. a Gemini Flash for comms) but default to one model
  const perRole = {
    router: process.env.OPENROUTER_MODEL_ROUTER,
    analyst: process.env.OPENROUTER_MODEL_ANALYST,
    comm: process.env.OPENROUTER_MODEL_COMM,
  }[role];
  return perRole || base;
}

interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Call OpenRouter chat completions and return the raw assistant text. */
export async function chat(
  model: string,
  messages: ChatMsg[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/o2mediaco/flightai",
      "X-Title": "Cleared Travel AI",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: opts.maxTokens ?? 400,
      temperature: opts.temperature ?? 0.4,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("OpenRouter: empty response");
  return content;
}

/**
 * Extract the first balanced JSON object from a model response. Handles
 * ```json fences, leading prose, and trailing commentary that small models
 * often add around their JSON.
 */
export function extractJson<T = unknown>(text: string): T | null {
  if (!text) return null;
  // strip code fences
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();

  const start = s.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        const slice = s.slice(start, i + 1);
        const tryParse = (txt: string): T | null => {
          try {
            return JSON.parse(txt) as T;
          } catch {
            return null;
          }
        };
        // parse as-is, else repair trailing commas (a common small-model slip)
        return tryParse(slice) ?? tryParse(slice.replace(/,(\s*[}\]])/g, "$1"));
      }
    }
  }
  return null;
}

/** Call a worker and parse its JSON, with one retry nudging toward valid JSON. */
export async function chatJson<T = unknown>(
  model: string,
  messages: ChatMsg[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<{ json: T | null; raw: string }> {
  const raw = await chat(model, messages, opts);
  let json = extractJson<T>(raw);
  if (json === null) {
    const retry = await chat(
      model,
      [
        ...messages,
        { role: "assistant", content: raw },
        { role: "user", content: "Return ONLY valid minified JSON. No prose, no code fences." },
      ],
      { ...opts, temperature: 0 }
    );
    json = extractJson<T>(retry);
    return { json, raw: retry };
  }
  return { json, raw };
}
