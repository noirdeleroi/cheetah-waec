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

/** === LOGGING HELPERS (added; no behavior changes) === */
function rid() {
  return crypto.randomUUID();
}
function nowMs() {
  return performance.now();
}
function safeLen(s: string) {
  return s?.length ?? 0;
}
// short preview to avoid massive HTML/PII in logs
function preview(s: string, n = 140) {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length <= n ? t : t.slice(0, n) + "…";
}
function log(event: string, meta: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...meta }));
}
/** === END LOGGING HELPERS === */

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
  requestId?: string; // added (optional; does not change call sites unless provided)
}): Promise<ModelJudgement> {
  const _t0 = nowMs();
  log("openrouter.call.start", {
    requestId: args.requestId,
    model: args.model,
    user_answer_len: safeLen(args.user_answer),
    problem_text_len: safeLen(args.problem_text),
    correct_answer_len: safeLen(args.correct_answer),
    user_answer_preview: preview(args.user_answer),
    correct_answer_preview: preview(args.correct_answer),
  });

  const prompt = [
    "You are a strict but fair WAEC mathematics answer checker.",
    "IMPORTANT: if the answer contains 'graph', or if a problem statetement requires graph, diagram, or some other image, then do not require from student to include it. Always mark this part of question as answered right.",
    "Decide whether the student's answer is correct given the problem and the official correct answer.",
    "Treat equivalent mathematical expressions as correct.",
    "Ignore whitespace/case; allow common formatting differences (e.g. 0.6 vs 3/5).",
    "If the correct answer is a set/list, accept any order unless order is explicitly required.",
    "If the student gives multiple answers, mark correct only if the final answer matches the correct answer and no contradictory final answer is given.",
    "",
    "If the answer is wrong, include key 'explanation' with a SHORT student-facing note.",
    "EXPLANATION RULES:",
    "- Max 20 words. One sentence only.",
    "- Do NOT restate the problem, do NOT explain the rubric, do NOT add generic commentary.",
    "- Do NOT speculate about student intent (no 'assuming', 'seems', 'intended', 'maybe').",
    "- Say exactly what is wrong. If applicable, reference parts (e.g., '(b)(ii) wrong: expected 60, got 62').",
    "- If the only issue is missing/extra parts, say that (e.g., 'Incomplete: missing (b)(i) and (b)(ii)').",
    "",
    "IMPORTANT: the problem may have subproblems like A), B), C) etc., the answers to these subproblems are separated by symbol ';' and they are given in the usual order. For example, answer 'x, u; y; w, z' to problem with subproblems 'A),B),C)' means that 'x, u' is answer to 'A)', 'y' is answer to 'B)', 'w, z' is answer to 'C)'.",
    "Return ONLY valid JSON (no markdown).",
    "Output format:",
    "- If correct=true: {\"correct\": true}",
    "- If correct=false: {\"correct\": false, \"explanation\": \"<brief note>\"}",
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

  log("openrouter.prompt.meta", {
    requestId: args.requestId,
    prompt_len: safeLen(prompt),
  });

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

  log("openrouter.call.http", {
    requestId: args.requestId,
    status: resp.status,
    ok: resp.ok,
    elapsed_ms: Math.round(nowMs() - _t0),
    // Some providers set request-id headers; log if present (harmless if null)
    x_request_id:
      resp.headers.get("x-request-id") ??
      resp.headers.get("x-requestid") ??
      resp.headers.get("cf-ray") ??
      undefined,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    log("openrouter.call.http_error", {
      requestId: args.requestId,
      status: resp.status,
      body_len: safeLen(text),
      body_preview: preview(text, 300),
    });
    throw new Error(`OpenRouter error: HTTP ${resp.status} ${text}`.slice(0, 800));
  }

  const data = await resp.json();
  log("openrouter.call.json_shape", {
    requestId: args.requestId,
    has_choices: Array.isArray(data?.choices),
    choices_len: Array.isArray(data?.choices) ? data.choices.length : 0,
    top_keys: data && typeof data === "object" ? Object.keys(data).slice(0, 12) : [],
  });

  const content: string =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.delta?.content ??
    "";

  log("openrouter.call.content", {
    requestId: args.requestId,
    content_len: safeLen(String(content || "")),
    content_preview: preview(String(content || ""), 220),
  });

  const parsed = extractJsonObject(String(content || ""));
  log("openrouter.parse.attempt", {
    requestId: args.requestId,
    parsed_is_null: parsed === null,
    parsed_type: parsed === null ? "null" : typeof parsed,
    parsed_keys:
      parsed && typeof parsed === "object" ? Object.keys(parsed).slice(0, 12) : [],
  });

  if (!parsed || typeof parsed.correct !== "boolean") {
    log("openrouter.parse.fail", {
      requestId: args.requestId,
      reason: "Model returned non-JSON or missing 'correct'.",
    });
    throw new Error("Model returned non-JSON or missing 'correct'.");
  }

  const confidenceRaw = Number(parsed.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(1, confidenceRaw))
    : undefined;

  const result: ModelJudgement = {
    correct: parsed.correct,
    confidence,
    explanation: typeof parsed.explanation === "string" ? parsed.explanation : undefined,
  };

  log("openrouter.call.success", {
    requestId: args.requestId,
    correct: result.correct,
    confidence: result.confidence,
    has_explanation: !!result.explanation,
    total_elapsed_ms: Math.round(nowMs() - _t0),
  });

  return result;
}

Deno.serve(async (req) => {
  const requestId = rid();
  const _t0 = nowMs();

  log("http.request.start", {
    requestId,
    method: req.method,
    url: req.url,
    origin: req.headers.get("origin"),
    content_type: req.headers.get("content-type"),
    content_length: req.headers.get("content-length"),
    user_agent: req.headers.get("user-agent"),
  });

  if (req.method === "OPTIONS") {
    log("http.request.cors_preflight", { requestId });
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    log("http.request.reject_method", { requestId, method: req.method });
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const apiKey = Deno.env.get("OPENROATER_FOR_CHEETAH") || "";
  // Do NOT log apiKey. Just log whether it exists.
  log("config.apikey.present", { requestId, present: !!apiKey });

  if (!apiKey) {
    log("config.apikey.missing", { requestId });
    return jsonResponse(500, { error: "Missing OPENROATER_FOR_CHEETAH secret" });
  }

  let body: RequestBody;
  try {
    body = await req.json();
    log("http.request.json_parsed", {
      requestId,
      body_type: body === null ? "null" : typeof body,
      body_keys: body && typeof body === "object" ? Object.keys(body as any) : [],
    });
  } catch (e) {
    log("http.request.json_parse_fail", {
      requestId,
      error: String((e as any)?.message || e),
      elapsed_ms: Math.round(nowMs() - _t0),
    });
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const user_answer = String(body.user_answer || "").trim();
  const problem_text = String(body.problem_text || "").trim();
  const correct_answer = String(body.correct_answer || "").trim();

  log("http.request.payload_meta", {
    requestId,
    user_answer_len: safeLen(user_answer),
    problem_text_len: safeLen(problem_text),
    correct_answer_len: safeLen(correct_answer),
    user_answer_preview: preview(user_answer),
    correct_answer_preview: preview(correct_answer),
    // don't preview problem_text; it can be large HTML/LaTeX (keep meta only)
  });

  if (!user_answer || !problem_text || !correct_answer) {
    log("http.request.validation_fail", {
      requestId,
      missing: {
        user_answer: !user_answer,
        problem_text: !problem_text,
        correct_answer: !correct_answer,
      },
      elapsed_ms: Math.round(nowMs() - _t0),
    });

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
      requestId, // added
    });

    log("http.request.success", {
      requestId,
      correct: result.correct,
      confidence: result.confidence,
      elapsed_ms: Math.round(nowMs() - _t0),
    });

    return jsonResponse(200, { success: true, data: result });
  } catch (e) {
    log("http.request.fail", {
      requestId,
      error: String((e as any)?.message || e),
      elapsed_ms: Math.round(nowMs() - _t0),
    });

    return jsonResponse(500, { error: "Grading failed", details: String(e?.message || e) });
  }
});
