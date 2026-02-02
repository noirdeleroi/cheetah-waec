import { SUPABASE_URL, supabase } from "./supabaseClient.js";

const TABLE = "questions_waec_math";
const PAGE_SIZE = 10;

const el = (id) => document.getElementById(id);

const authStatusEl = el("authStatus");
const btnSignOut = el("btnSignOut");

const modeYearWrap = el("modeYear");
const modeTopicWrap = el("modeTopic");
const yearSelect = el("yearSelect");
const domainSelect = el("domainSelect");
const topicSelect = el("topicSelect");
const difficultySelect = el("difficultySelect");
const btnStartYear = el("btnStartYear");
const btnStartTopic = el("btnStartTopic");
const filterMessageEl = el("filterMessage");

const pagerCard = el("pagerCard");
const btnPrev = el("btnPrev");
const btnNext = el("btnNext");
const pageInfo = el("pageInfo");

const questionsWrap = el("questions");

let currentMode = "year";
let currentYear = null;
let currentDomain = null;
let currentTopic = null;
let currentDifficulty = "";

let currentPage = 1;
let totalPages = 0;
let totalCount = 0;

// For topic mode random ordering.
let topicShuffledIds = [];

// Current page data lookup for button actions.
let currentQuestionsById = new Map();

function setFilterMessage(msg, kind = "muted") {
  filterMessageEl.className = kind;
  filterMessageEl.textContent = msg || "";
}

function typesetMath() {
  if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
    window.MathJax.typesetPromise().catch(() => {});
  }
}

function safeJsonParse(text) {
  if (!text || typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function storagePublicUrlFromPath(path) {
  // Supports:
  // - full URL
  // - "bucket/path/to/file.png" (public storage object path)
  // - "/bucket/path/to/file.png"
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const normalized = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  return `${SUPABASE_URL}/storage/v1/object/public/${normalized}`;
}

function normalizeAnswer(a) {
  if (a == null) return "";
  return String(a).trim().toUpperCase();
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function updatePager() {
  if (!totalPages || totalPages < 1) {
    pagerCard.style.display = "none";
    return;
  }
  pagerCard.style.display = "block";
  pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${totalCount} questions)`;
  btnPrev.disabled = currentPage <= 1;
  btnNext.disabled = currentPage >= totalPages;
}

function resetQuestionsUI() {
  currentQuestionsById = new Map();
  questionsWrap.innerHTML = "";
}

function renderQuestions(rows) {
  resetQuestionsUI();
  if (!rows || rows.length === 0) {
    questionsWrap.innerHTML =
      "<div class='card'><p class='muted'>No questions found for this filter.</p></div>";
    typesetMath();
    return;
  }

  const frag = document.createDocumentFragment();

  rows.forEach((q) => {
    currentQuestionsById.set(q.question_id, q);

    const card = document.createElement("div");
    card.className = "card";
    card.dataset.qid = q.question_id;

    const meta = [];
    if (q.year) meta.push(`Year: ${q.year}`);
    if (q.number) meta.push(`No: ${q.number}`);
    if (q.domain) meta.push(`Domain: ${q.domain}`);
    if (q.topic) meta.push(`Topic: ${q.topic}`);
    if (q.problem_difficulty) meta.push(`Difficulty: ${q.problem_difficulty}`);
    meta.push(`ID: ${q.question_id}`);

    const imageUrl = storagePublicUrlFromPath(q.image_path);
    const imageHtml = imageUrl
      ? `<img class="question-image" style="display:block;" src="${imageUrl}" alt="Question image" />`
      : "";

    const choicesObj = typeof q.choices_json === "string" ? safeJsonParse(q.choices_json) : null;
    const groupName = `mcq_${q.question_id}`.replace(/[^a-zA-Z0-9_-]/g, "_");

    let choicesHtml = "";
    if (choicesObj && typeof choicesObj === "object") {
      const entries = Object.entries(choicesObj)
        .filter(([k]) => typeof k === "string" && k.trim())
        .sort(([a], [b]) => a.localeCompare(b));

      choicesHtml =
        `<div class="muted" style="margin-top:6px;">Choose one:</div>` +
        entries
          .map(
            ([key, val]) => `
              <label class="choice">
                <input type="radio" name="${groupName}" value="${key}">
                <div>
                  <div style="font-weight:700;">${key}</div>
                  <div>${val ?? ""}</div>
                </div>
              </label>
            `
          )
          .join("");
    } else {
      const inputId = `freeAnswer_${q.question_id}`.replace(/[^a-zA-Z0-9_-]/g, "_");
      choicesHtml = `
        <label style="display:block; font-weight:600; margin-bottom:6px;">Your answer</label>
        <input id="${inputId}" type="text" placeholder="Type your answer" />
      `;
    }

    const solutionBtnDisabled = q.solution_text ? "" : "disabled";
    const solutionBtnText = q.solution_text ? "Show solution" : "No solution";

    card.innerHTML = `
      <div class="meta">${meta.map((t) => `<div class="pill">${t}</div>`).join("")}</div>
      ${imageHtml}
      <div class="problem" style="margin-top:14px;">
        ${q.problem_text || "<p class='muted'>No problem_text.</p>"}
      </div>
      <div class="choices" style="margin-top:14px;">${choicesHtml}</div>
      <div class="row" style="margin-top:12px; align-items:flex-start;">
        <button type="button" data-action="check" data-qid="${q.question_id}">Check answer</button>
        <button type="button" class="secondary" data-action="solution" data-qid="${q.question_id}" ${solutionBtnDisabled}>${solutionBtnText}</button>
        <div class="status result" style="min-width:220px;"></div>
      </div>
      <div class="solution" style="margin-top:14px; display:none;"></div>
    `;

    frag.appendChild(card);
  });

  questionsWrap.appendChild(frag);
  typesetMath();
}

function getAnswerFromCard(card, q) {
  const choicesObj = typeof q.choices_json === "string" ? safeJsonParse(q.choices_json) : null;
  if (choicesObj && typeof choicesObj === "object") {
    const groupName = `mcq_${q.question_id}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    const checked = card.querySelector(`input[name="${groupName}"]:checked`);
    return checked ? String(checked.value) : "";
  }
  const inputId = `freeAnswer_${q.question_id}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  const inp = card.querySelector(`#${CSS.escape(inputId)}`);
  return inp ? String(inp.value || "").trim() : "";
}

function setCardResult(card, msg, kind) {
  const res = card.querySelector(".result");
  if (!res) return;
  res.className = `status result ${kind || ""}`.trim();
  res.textContent = msg || "";
}

function toggleSolution(card, q) {
  const sol = card.querySelector(".solution");
  const btn = card.querySelector('button[data-action="solution"]');
  if (!sol || !btn) return;

  const isOpen = sol.style.display !== "none";
  if (isOpen) {
    sol.style.display = "none";
    btn.textContent = "Show solution";
    return;
  }

  const imgUrl = storagePublicUrlFromPath(q.solution_image);
  const imgHtml = imgUrl
    ? `<img class="question-image" style="display:block;" src="${imgUrl}" alt="Solution image" />`
    : "";
  sol.innerHTML = `${imgHtml}${q.solution_text || ""}`;
  sol.style.display = "block";
  btn.textContent = "Hide solution";
  typesetMath();
}

async function requireSessionOrRedirect() {
  const { data } = await supabase.auth.getSession();
  const session = data?.session || null;
  if (!session) {
    location.href = "login.html";
    return null;
  }
  return session;
}

async function fetchDistinctValues(column, opts = {}) {
  // PostgREST doesn't support DISTINCT easily; we scan a limited number of rows and dedupe client-side.
  // Works well for low-cardinality columns (year/domain/topic/difficulty).
  const values = new Set();
  const limit = opts.limit ?? 5000;
  const pageSize = opts.pageSize ?? 1000;

  for (let from = 0; from < limit; from += pageSize) {
    let q = supabase
      .from(TABLE)
      .select(column)
      .not(column, "is", null);

    if (opts.filters) {
      for (const f of opts.filters) {
        if (f.op === "eq") q = q.eq(f.col, f.val);
        if (f.op === "ilike") q = q.ilike(f.col, f.val);
      }
    }

    // Ordering helps stable pagination; not required for dedupe.
    q = q.order(column, { ascending: true }).range(from, from + pageSize - 1);

    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      const v = row?.[column];
      if (v === null || v === undefined) continue;
      values.add(v);
    }
    if (data.length < pageSize) break;
  }

  return Array.from(values);
}

async function loadYears() {
  yearSelect.innerHTML = `<option value="">Loading years...</option>`;
  try {
    const rawYears = await fetchDistinctValues("year");
    const years = rawYears
      .map((y) => Number(y))
      .filter((y) => Number.isFinite(y))
      .sort((a, b) => b - a);

    if (years.length === 0) {
      yearSelect.innerHTML = `<option value="">No years found</option>`;
      return;
    }
    yearSelect.innerHTML =
      `<option value="">Select a year</option>` +
      years.map((y) => `<option value="${y}">${y}</option>`).join("");
  } catch (e) {
    yearSelect.innerHTML = `<option value="">Failed to load years</option>`;
    setFilterMessage(e.message || "Failed to load years.", "danger");
  }
}

async function loadDomains() {
  domainSelect.innerHTML = `<option value="">Loading domains...</option>`;
  try {
    const rawDomains = await fetchDistinctValues("domain");
    const domains = rawDomains
      .map((d) => String(d).trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    if (domains.length === 0) {
      domainSelect.innerHTML = `<option value="">No domains found</option>`;
      return;
    }
    domainSelect.innerHTML =
      `<option value="">Select a domain</option>` +
      domains.map((d) => `<option value="${d}">${d}</option>`).join("");
  } catch (e) {
    domainSelect.innerHTML = `<option value="">Failed to load domains</option>`;
    setFilterMessage(e.message || "Failed to load domains.", "danger");
  }
}

async function loadTopicsForDomain(domain) {
  topicSelect.innerHTML = `<option value="">Loading topics...</option>`;
  if (!domain) {
    topicSelect.innerHTML = `<option value="">Select a domain first</option>`;
    return;
  }

  try {
    const rawTopics = await fetchDistinctValues("topic", {
      filters: [{ op: "eq", col: "domain", val: domain }],
    });

    const topics = rawTopics
      .map((t) => String(t).trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    if (topics.length === 0) {
      topicSelect.innerHTML = `<option value="">No topics found</option>`;
      return;
    }

    topicSelect.innerHTML =
      `<option value="">Select a topic</option>` +
      topics.map((t) => `<option value="${t}">${t}</option>`).join("");
  } catch (e) {
    topicSelect.innerHTML = `<option value="">Failed to load topics</option>`;
    setFilterMessage(e.message || "Failed to load topics.", "danger");
  }
}

async function fetchYearCount(year) {
  const { error, count } = await supabase
    .from(TABLE)
    .select("question_id", { count: "exact", head: true })
    .eq("year", year);
  if (error) throw error;
  return count || 0;
}

async function fetchYearPage(year, page) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      "question_id, year, number, domain, topic, problem_difficulty, problem_text, choices_json, correct_answer, image_path, solution_text, solution_image"
    )
    .eq("year", year)
    .order("question_id", { ascending: true })
    .range(from, to);

  if (error) throw error;
  return data || [];
}

async function fetchTopicIds(domain, topic, difficulty) {
  const ids = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let q = supabase
      .from(TABLE)
      .select("question_id")
      .eq("domain", domain)
      .eq("topic", topic)
      .order("question_id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (difficulty) {
      q = q.ilike("problem_difficulty", `%${difficulty}%`);
    }

    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (row?.question_id) ids.push(String(row.question_id));
    }
    if (data.length < pageSize) break;
  }
  return ids;
}

async function fetchQuestionsByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      "question_id, year, number, domain, topic, problem_difficulty, problem_text, choices_json, correct_answer, image_path, solution_text, solution_image"
    )
    .in("question_id", ids);
  if (error) throw error;

  const byId = new Map((data || []).map((r) => [r.question_id, r]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

async function startYear() {
  setFilterMessage("");
  const y = Number(yearSelect.value);
  if (!Number.isFinite(y)) {
    setFilterMessage("Select a year first.", "danger");
    return;
  }
  currentMode = "year";
  currentYear = y;
  currentPage = 1;

  try {
    totalCount = await fetchYearCount(currentYear);
    totalPages = Math.ceil(totalCount / PAGE_SIZE) || 0;
    updatePager();
    const rows = await fetchYearPage(currentYear, currentPage);
    renderQuestions(rows);
  } catch (e) {
    setFilterMessage(e.message || "Failed to load year questions.", "danger");
    totalCount = 0;
    totalPages = 0;
    updatePager();
    renderQuestions([]);
  }
}

async function startTopic() {
  setFilterMessage("");
  const d = String(domainSelect.value || "").trim();
  const t = String(topicSelect.value || "").trim();
  if (!d) {
    setFilterMessage("Select a domain first.", "danger");
    return;
  }
  if (!t) {
    setFilterMessage("Select a topic first.", "danger");
    return;
  }

  currentMode = "topic";
  currentDomain = d;
  currentTopic = t;
  currentDifficulty = String(difficultySelect.value || "").trim().toLowerCase();
  currentPage = 1;

  try {
    const ids = await fetchTopicIds(currentDomain, currentTopic, currentDifficulty);
    topicShuffledIds = shuffleInPlace(ids);
    totalCount = topicShuffledIds.length;
    totalPages = Math.ceil(totalCount / PAGE_SIZE) || 0;
    updatePager();

    const slice = topicShuffledIds.slice(0, PAGE_SIZE);
    const rows = await fetchQuestionsByIds(slice);
    renderQuestions(rows);
  } catch (e) {
    setFilterMessage(e.message || "Failed to load topic questions.", "danger");
    topicShuffledIds = [];
    totalCount = 0;
    totalPages = 0;
    updatePager();
    renderQuestions([]);
  }
}

async function goToPage(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  updatePager();

  try {
    if (currentMode === "year") {
      const rows = await fetchYearPage(currentYear, currentPage);
      renderQuestions(rows);
      return;
    }

    const from = (currentPage - 1) * PAGE_SIZE;
    const slice = topicShuffledIds.slice(from, from + PAGE_SIZE);
    const rows = await fetchQuestionsByIds(slice);
    renderQuestions(rows);
  } catch (e) {
    setFilterMessage(e.message || "Failed to load page.", "danger");
  }
}

function onModeChange(mode) {
  currentMode = mode;
  modeYearWrap.style.display = mode === "year" ? "block" : "none";
  modeTopicWrap.style.display = mode === "topic" ? "block" : "none";
  setFilterMessage("");
  totalCount = 0;
  totalPages = 0;
  currentPage = 1;
  updatePager();
  resetQuestionsUI();
}

// Events
document.addEventListener("change", (e) => {
  const r = e.target && e.target.closest && e.target.closest('input[name="mode"]');
  if (!r) return;
  onModeChange(r.value);
});

domainSelect.addEventListener("change", async () => {
  setFilterMessage("");
  await loadTopicsForDomain(String(domainSelect.value || "").trim());
});

btnStartYear.addEventListener("click", startYear);
btnStartTopic.addEventListener("click", startTopic);

btnPrev.addEventListener("click", () => goToPage(currentPage - 1));
btnNext.addEventListener("click", () => goToPage(currentPage + 1));

btnSignOut.addEventListener("click", async () => {
  try {
    await supabase.auth.signOut();
  } finally {
    location.href = "login.html";
  }
});

questionsWrap.addEventListener("click", (e) => {
  const btn = e.target && e.target.closest && e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.getAttribute("data-action");
  const qid = btn.getAttribute("data-qid");
  if (!qid) return;

  const card = btn.closest(".card");
  const q = currentQuestionsById.get(qid);
  if (!card || !q) return;

  if (action === "check") {
    const userAns = normalizeAnswer(getAnswerFromCard(card, q));
    if (!userAns) {
      setCardResult(card, "Select (or type) an answer first.", "danger");
      return;
    }
    const expected = normalizeAnswer(q.correct_answer);
    if (!expected) {
      setCardResult(card, "No correct_answer in DB for this question.", "danger");
      return;
    }
    if (userAns === expected) {
      setCardResult(card, "Correct.", "success");
    } else {
      setCardResult(card, `Wrong. Your answer: ${userAns}.`, "danger");
    }
    return;
  }

  if (action === "solution") {
    if (!q.solution_text) return;
    toggleSolution(card, q);
  }
});

// Init
(async () => {
  const session = await requireSessionOrRedirect();
  if (!session) return;

  authStatusEl.textContent = session.user.email || session.user.id;
  updatePager();

  await Promise.all([loadYears(), loadDomains()]);
  await loadTopicsForDomain("");
})();

supabase.auth.onAuthStateChange((_event, session) => {
  if (!session) location.href = "login.html";
});

