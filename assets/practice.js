import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase project config (anon key is public by design).
const SUPABASE_URL = "https://casohrqgydyyvcclqwqm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhc29ocnFneWR5eXZjY2xxd3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1MTY2MzYsImV4cCI6MjA2MzA5MjYzNn0.ct9XbPcvqZSG_HBLMzxRmxoH4dWfMArlRNw9s3wYt9I";

const TABLE = "questions_waec_math";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const el = (id) => document.getElementById(id);

const authStatusEl = el("authStatus");
const authMessageEl = el("authMessage");
const emailEl = el("email");
const passwordEl = el("password");
const btnSignIn = el("btnSignIn");
const btnSignUp = el("btnSignUp");
const btnSignOut = el("btnSignOut");

const practiceCard = el("practiceCard");
const btnRandom = el("btnRandom");
const btnCheck = el("btnCheck");
const btnShowSolution = el("btnShowSolution");
const questionMeta = el("questionMeta");
const questionImage = el("questionImage");
const problemEl = el("problem");
const choicesEl = el("choices");
const resultEl = el("result");
const solutionEl = el("solution");

let currentQuestion = null;
let currentChoices = null;
let solutionShown = false;

function setAuthMessage(msg, kind = "muted") {
  authMessageEl.className = kind;
  authMessageEl.textContent = msg || "";
}

function setResult(msg, kind = "") {
  resultEl.className = `status ${kind}`.trim();
  resultEl.textContent = msg || "";
}

function resetQuestionUI() {
  currentQuestion = null;
  currentChoices = null;
  solutionShown = false;
  questionMeta.style.display = "none";
  questionMeta.innerHTML = "";
  questionImage.style.display = "none";
  questionImage.removeAttribute("src");
  problemEl.innerHTML = "";
  choicesEl.innerHTML = "";
  solutionEl.style.display = "none";
  solutionEl.innerHTML = "";
  btnCheck.disabled = true;
  btnShowSolution.disabled = true;
  setResult("");
}

function storagePublicUrlFromImagePath(imagePath) {
  // Supports:
  // - full URL: https://...
  // - "bucket/path/to/file.png" (recommended)
  // - "/bucket/path/to/file.png"
  if (!imagePath || typeof imagePath !== "string") return null;
  const trimmed = imagePath.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const normalized = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  return `${SUPABASE_URL}/storage/v1/object/public/${normalized}`;
}

function safeJsonParse(text) {
  if (!text || typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function typesetMath() {
  // MathJax is loaded async; call if present.
  if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
    window.MathJax.typesetPromise().catch(() => {});
  }
}

function renderChoices(choicesObj) {
  choicesEl.innerHTML = "";

  if (!choicesObj || typeof choicesObj !== "object") {
    // Fallback: free-form answer (still uses correct_answer in DB for this test page).
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <label style="display:block; font-weight:600; margin-bottom:6px;">Your answer</label>
      <input id="freeAnswer" type="text" placeholder="Type your answer" />
      <p class="muted" style="margin:8px 0 0 0;">No choices_json found for this question.</p>
    `;
    choicesEl.appendChild(wrapper);
    return;
  }

  const entries = Object.entries(choicesObj)
    .filter(([k]) => typeof k === "string" && k.trim())
    .sort(([a], [b]) => a.localeCompare(b));

  const title = document.createElement("div");
  title.className = "muted";
  title.style.marginTop = "6px";
  title.textContent = "Choose one:";
  choicesEl.appendChild(title);

  entries.forEach(([key, value]) => {
    const row = document.createElement("label");
    row.className = "choice";
    row.innerHTML = `
      <input type="radio" name="mcq" value="${key}" />
      <div>
        <div style="font-weight:700;">${key}</div>
        <div>${value ?? ""}</div>
      </div>
    `;
    choicesEl.appendChild(row);
  });
}

function renderQuestion(q) {
  resetQuestionUI();
  currentQuestion = q;

  const meta = [];
  if (q.year) meta.push(`Year: ${q.year}`);
  if (q.number) meta.push(`No: ${q.number}`);
  if (q.topic) meta.push(`Topic: ${q.topic}`);
  if (q.problem_difficulty) meta.push(`Difficulty: ${q.problem_difficulty}`);
  meta.push(`ID: ${q.question_id}`);

  questionMeta.style.display = "flex";
  questionMeta.innerHTML = meta.map((t) => `<div class="pill">${t}</div>`).join("");

  const imgUrl = storagePublicUrlFromImagePath(q.image_path);
  if (imgUrl) {
    questionImage.src = imgUrl;
    questionImage.style.display = "block";
  }

  // problem_text is stored as HTML containing MathJax-compatible LaTeX.
  problemEl.innerHTML = q.problem_text || "<p class='muted'>No problem_text.</p>";

  currentChoices = safeJsonParse(q.choices_json);
  renderChoices(currentChoices);

  btnCheck.disabled = false;
  btnShowSolution.disabled = !q.solution_text;

  typesetMath();
}

async function getRandomQuestion() {
  setResult("");
  setAuthMessage("");
  btnRandom.disabled = true;
  btnCheck.disabled = true;
  btnShowSolution.disabled = true;

  try {
    // Count rows (exact count is OK for this test page; we can optimize later via an Edge Function / RPC).
    const countResp = await supabase
      .from(TABLE)
      .select("question_id", { count: "exact", head: true });

    if (countResp.error) throw countResp.error;
    const count = countResp.count || 0;
    if (!count) throw new Error("No questions found in questions_waec_math.");

    const offset = Math.floor(Math.random() * count);

    const { data, error } = await supabase
      .from(TABLE)
      .select(
        "question_id, year, number, topic, problem_difficulty, problem_text, choices_json, correct_answer, image_path, solution_text, solution_image"
      )
      .order("question_id", { ascending: true })
      .range(offset, offset);

    if (error) throw error;
    const q = Array.isArray(data) ? data[0] : null;
    if (!q) throw new Error("Random question query returned no row.");

    renderQuestion(q);
  } catch (e) {
    resetQuestionUI();
    const msg =
      (e && typeof e.message === "string" && e.message) ||
      "Failed to load a random question.";
    setResult(msg, "danger");
  } finally {
    btnRandom.disabled = false;
    btnCheck.disabled = !currentQuestion;
    btnShowSolution.disabled = !currentQuestion?.solution_text;
  }
}

function getUserAnswer() {
  if (!currentQuestion) return null;

  if (currentChoices && typeof currentChoices === "object") {
    const checked = document.querySelector("input[name='mcq']:checked");
    return checked ? String(checked.value) : null;
  }

  const free = el("freeAnswer");
  return free ? String(free.value || "").trim() : null;
}

function normalizeAnswer(a) {
  if (a == null) return "";
  return String(a).trim().toUpperCase();
}

function toggleSolution() {
  if (!currentQuestion || !currentQuestion.solution_text) return;
  solutionShown = !solutionShown;
  solutionEl.style.display = solutionShown ? "block" : "none";
  btnShowSolution.textContent = solutionShown ? "Hide solution" : "Show solution";

  if (solutionShown) {
    const imgUrl = storagePublicUrlFromImagePath(currentQuestion.solution_image);
    const imgHtml = imgUrl
      ? `<img class="question-image" style="display:block;" src="${imgUrl}" alt="Solution image" />`
      : "";
    solutionEl.innerHTML = `${imgHtml}${currentQuestion.solution_text}`;
    typesetMath();
  }
}

function checkAnswer() {
  if (!currentQuestion) return;
  setResult("");

  const userAnswer = getUserAnswer();
  if (!userAnswer) {
    setResult("Select (or type) an answer first.", "danger");
    return;
  }

  // For the test integration page we compare locally.
  // Later we should move this to a Supabase Edge Function to avoid exposing answers.
  const expected = normalizeAnswer(currentQuestion.correct_answer);
  const got = normalizeAnswer(userAnswer);

  if (!expected) {
    setResult("This question has no correct_answer in DB.", "danger");
    return;
  }

  if (got === expected) {
    setResult("Correct.", "success");
  } else {
    setResult(`Wrong. Your answer: ${got}.`, "danger");
  }
}

async function refreshUIFromSession() {
  const { data } = await supabase.auth.getSession();
  const session = data?.session || null;

  if (!session) {
    authStatusEl.textContent = "Not signed in.";
    btnSignOut.style.display = "none";
    practiceCard.style.display = "none";
    resetQuestionUI();
    return;
  }

  authStatusEl.textContent = `Signed in as ${session.user.email || session.user.id}`;
  btnSignOut.style.display = "inline-block";
  practiceCard.style.display = "block";
}

btnSignIn.addEventListener("click", async () => {
  setAuthMessage("");
  const email = String(emailEl.value || "").trim();
  const password = String(passwordEl.value || "").trim();
  if (!email || !password) {
    setAuthMessage("Enter email + password.", "danger");
    return;
  }

  btnSignIn.disabled = true;
  btnSignUp.disabled = true;
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setAuthMessage("Signed in.", "success");
  } catch (e) {
    setAuthMessage(e.message || "Sign in failed.", "danger");
  } finally {
    btnSignIn.disabled = false;
    btnSignUp.disabled = false;
  }
});

btnSignUp.addEventListener("click", async () => {
  setAuthMessage("");
  const email = String(emailEl.value || "").trim();
  const password = String(passwordEl.value || "").trim();
  if (!email || !password) {
    setAuthMessage("Enter email + password.", "danger");
    return;
  }

  btnSignIn.disabled = true;
  btnSignUp.disabled = true;
  try {
    const origin =
      typeof location !== "undefined" &&
      location.origin &&
      location.origin !== "null" &&
      (location.protocol === "http:" || location.protocol === "https:")
        ? location.origin
        : null;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...(origin ? { emailRedirectTo: `${origin}/practice.html` } : {}),
      },
    });
    if (error) throw error;
    setAuthMessage(
      "Sign up complete. If email confirmation is enabled, check your inbox to confirm, then sign in.",
      "success"
    );
  } catch (e) {
    setAuthMessage(e.message || "Sign up failed.", "danger");
  } finally {
    btnSignIn.disabled = false;
    btnSignUp.disabled = false;
  }
});

btnSignOut.addEventListener("click", async () => {
  setAuthMessage("");
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setAuthMessage("Signed out.", "success");
  } catch (e) {
    setAuthMessage(e.message || "Sign out failed.", "danger");
  }
});

btnRandom.addEventListener("click", getRandomQuestion);
btnCheck.addEventListener("click", checkAnswer);
btnShowSolution.addEventListener("click", toggleSolution);

supabase.auth.onAuthStateChange(() => {
  refreshUIFromSession().catch(() => {});
});

// Initial state
refreshUIFromSession().catch(() => {});
