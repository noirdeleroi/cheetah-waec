import { corsHeaders } from "../_shared/cors.ts";

type RequestBody = {
  user_answer?: string;
  problem_text?: string;
  correct_answer?: string;
};

type ModelJudgement = {
  correct: boolean;
  confidence?: number;
  explanation?: string;
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractJsonObject(text: string): any | null {
  // Best-effort: try direct JSON parse first, then extract the first {...} block.
  try {
    return JSON.parse(text);
  } catch {
    // continue
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

async function callOpenRouter(args: {
  apiKey: string;
  model: string;
  user_answer: string;
  problem_text: string;
  correct_answer: string;
}): Promise<ModelJudgement> {
  const prompt = [
    "You are a strict but fair WAEC mathematics answer checker.",
    "",
    "Decide whether the student's answer is correct given the problem and the official correct answer.",
    "Treat equivalent mathematical expressions as correct.",
    "Ignore whitespace/case; allow common formatting differences (e.g. 0.6 vs 3/5).",
    "If the correct answer is a set/list, accept any order unless order is explicitly required.",
    "If the student gives multiple answers, mark correct only if the final answer matches the correct answer and no contradictory final answer is given.",
    "",
    "Return ONLY valid JSON (no markdown) in this format:",
    '{"correct": boolean, "confidence": number, "explanation": string}',
    "",
    "Problem (HTML with LaTeX):",
    args.problem_text,
    "",
    "Official correct answer:",
    args.correct_answer,
    "",
    "Student answer:",
    args.user_answer,
  ].join("\n");

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      // Optional but recommended by OpenRouter for analytics/rate-limits.
      "HTTP-Referer": "https://cheetahwaec.com",
      "X-Title": "Cheetah WAEC Practice",
    },
    body: JSON.stringify({
      model: args.model,
      temperature: 0,
      max_tokens: 300,
      messages: [
        { role: "system", content: "You are an answer checker." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`OpenRouter error: HTTP ${resp.status} ${text}`.slice(0, 800));
  }

  const data = await resp.json();
  const content: string =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.delta?.content ??
    "";

  const parsed = extractJsonObject(String(content || ""));
  if (!parsed || typeof parsed.correct !== "boolean") {
    throw new Error("Model returned non-JSON or missing 'correct'.");
  }

  const confidenceRaw = Number(parsed.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(1, confidenceRaw))
    : undefined;

  return {
    correct: parsed.correct,
    confidence,
    explanation: typeof parsed.explanation === "string" ? parsed.explanation : undefined,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const apiKey = Deno.env.get("OPENROATER_FOR_CHEETAH") || "";
  if (!apiKey) {
    return jsonResponse(500, { error: "Missing OPENROATER_FOR_CHEETAH secret" });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const user_answer = String(body.user_answer || "").trim();
  const problem_text = String(body.problem_text || "").trim();
  const correct_answer = String(body.correct_answer || "").trim();

  if (!user_answer || !problem_text || !correct_answer) {
    return jsonResponse(400, {
      error: "Missing required fields: user_answer, problem_text, correct_answer",
    });
  }

  try {
    const result = await callOpenRouter({
      apiKey,
      model: "google/gemini-2.5-flash-lite-preview-09-2025",
      user_answer,
      problem_text,
      correct_answer,
    });
    return jsonResponse(200, { success: true, data: result });
  } catch (e) {
    return jsonResponse(500, { error: "Grading failed", details: String(e?.message || e) });
  }
});

