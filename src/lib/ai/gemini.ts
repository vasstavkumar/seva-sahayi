import "server-only";
import { GoogleGenAI, type Part } from "@google/genai";
import { z } from "zod";
import type { AiMeta, Lang } from "../types";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
// 3.8-flash returns 503/429 a lot on the free tier, so fall back to lite.
const MODELS = [
  ...new Set([
    MODEL,
    ...(process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.5-flash-lite")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean),
  ]),
];
const BUDGET_MS = 50_000;
const PER_CALL_MS = 30_000;
const TRANSIENT = new Set([429, 500, 502, 503, 504]);

function statusOf(err: unknown): number | undefined {
  const status = (err as { status?: unknown })?.status;
  return typeof status === "number" ? status : undefined;
}

let client: GoogleGenAI | null = null;

export function aiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getClient(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export type AiResult<T> = { ok: true; data: T; meta: AiMeta } | { ok: false; error: "not_configured" | "failed" };

// gemini rejects $schema
function toGeminiSchema(schema: z.ZodType): unknown {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

export function languageInstruction(lang: Lang): string {
  return lang === "te"
    ? "Write every free-text field in simple, formal Telugu (తెలుగు) as used in Telangana revenue offices. Keep names, numbers and rupee amounts as digits."
    : "Write every free-text field in simple, plain English.";
}

// Structured call; reply is validated with the same zod schema.
export async function generateStructured<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  parts: Part[];
  lang: Lang;
}): Promise<AiResult<z.infer<S>>> {
  if (!aiEnabled()) return { ok: false, error: "not_configured" };

  const started = Date.now();
  // try each model, then back off and retry (max 3 rounds within budget)
  const attempts = [0, 1_500, 4_000].flatMap((wait) => MODELS.map((model, i) => ({ model, wait: i === 0 ? wait : 0 })));
  for (const { model, wait } of attempts) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    const remaining = BUDGET_MS - (Date.now() - started);
    if (remaining < 3_000) break;
    try {
      const response = await getClient().models.generateContent({
        model,
        contents: [{ role: "user", parts: opts.parts }],
        config: {
          systemInstruction: `${opts.system}\n\n${languageInstruction(opts.lang)}`,
          responseMimeType: "application/json",
          responseJsonSchema: toGeminiSchema(opts.schema),
          temperature: 0.2,
          abortSignal: AbortSignal.timeout(Math.min(PER_CALL_MS, remaining)),
        },
      });
      const parsed = opts.schema.safeParse(JSON.parse(response.text ?? ""));
      if (!parsed.success) {
        console.error(`[ai] ${model}: schema validation failed`, parsed.error.issues.slice(0, 3));
        continue;
      }
      return {
        ok: true,
        data: parsed.data,
        meta: { model, ms: Date.now() - started, at: new Date().toISOString(), lang: opts.lang },
      };
    } catch (err) {
      const status = statusOf(err);
      // don't log the message, it can contain request data
      console.error(`[ai] ${model}: request failed`, status ?? (err instanceof Error ? err.name : "unknown"));
      const badJson = err instanceof SyntaxError;
      const timedOut = err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
      const transient = status !== undefined && TRANSIENT.has(status);
      if (!badJson && !timedOut && !transient) break; // 400/401/403: retrying won't help
    }
  }
  return { ok: false, error: "failed" };
}
