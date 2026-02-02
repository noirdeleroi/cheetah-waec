import { SUPABASE_URL, supabase } from "./supabaseClient.js";

const TABLE = "questions_waec_math";
const PAGE_SIZE = 10;

const el = (id) => document.getElementById(id);

const authStatusEl = el("authStatus");
const btnSignOut = el("btnSignOut");

const modeYearWrap = el("modeYear");
const modeTopicWrap = el("modeTopic");
const btnModeYear = el("btnModeYear");
const btnModeTopic = el("btnModeTopic");

const yearChips = el("yearChips");
const btnLoadYear = el("btnLoadYear");

const domainTabs = el("domainTabs");
const topicChips = el("topicChips");
const difficultySeg = el("difficultySeg");
const btnLoadTopic = el("btnLoadTopic");
const btnShuffleTopic = el("btnShuffleTopic");

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
    card.className = "card question-card";
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
        <button type="button" class="btn" data-action="check" data-qid="${q.question_id}">Check answer</button>
        <button type="button" class="btn secondary" data-action="solution" data-qid="${q.question_id}" ${solutionBtnDisabled}>${solutionBtnText}</button>
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
  // Increase page size to reduce round-trips; cap total rows to avoid runaway scans on huge tables.
  const maxRows = opts.maxRows ?? 200000;
  const pageSize = opts.pageSize ?? 10000;

  for (let from = 0; from < maxRows; from += pageSize) {
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

function renderChipButtons(container, items, getKey, getLabel, activeKey) {
  container.innerHTML = "";
  if (!items || items.length === 0) return;
  const frag = document.createDocumentFragment();
  for (const item of items) {
    const key = getKey(item);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `chip${key === activeKey ? " active" : ""}`;
    btn.setAttribute("data-key", String(key));
    btn.textContent = getLabel(item);
    frag.appendChild(btn);
  }
  container.appendChild(frag);
}

async function loadYears() {
  yearChips.innerHTML = `<span class="muted">Loading years...</span>`;
  try {
    const rawYears = await fetchDistinctValues("year");
    const years = rawYears
      .map((y) => Number(y))
      .filter((y) => Number.isFinite(y))
      .sort((a, b) => b - a);

    if (years.length === 0) {
      yearChips.innerHTML = `<span class="muted">No years found.</span>`;
      return;
    }
    renderChipButtons(
      yearChips,
      years,
      (y) => y,
      (y) => String(y),
      currentYear
    );
  } catch (e) {
    yearChips.innerHTML = `<span class="muted">Failed to load years.</span>`;
    setFilterMessage(e.message || "Failed to load years.", "danger");
  }
}

async function loadDomains() {
  domainTabs.innerHTML = `<span class="muted">Loading domains...</span>`;
  try {
    const rawDomains = await fetchDistinctValues("domain");
    const domains = rawDomains
      .map((d) => String(d).trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    if (domains.length === 0) {
      domainTabs.innerHTML = `<span class="muted">No domains found.</span>`;
      return;
    }
    renderChipButtons(
      domainTabs,
      domains,
      (d) => d,
      (d) => d,
      currentDomain
    );
  } catch (e) {
    domainTabs.innerHTML = `<span class="muted">Failed to load domains.</span>`;
    setFilterMessage(e.message || "Failed to load domains.", "danger");
  }
}

async function loadTopicsForDomain(domain) {
  topicChips.innerHTML = `<span class="muted">${domain ? "Loading topics..." : "Select a domain above."}</span>`;
  if (!domain) return;

  try {
    const rawTopics = await fetchDistinctValues("topic", {
      filters: [{ op: "eq", col: "domain", val: domain }],
    });

    const topics = rawTopics
      .map((t) => String(t).trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    if (topics.length === 0) {
      topicChips.innerHTML = `<span class="muted">No topics found.</span>`;
      return;
    }
    renderChipButtons(
      topicChips,
      topics,
      (t) => t,
      (t) => t,
      currentTopic
    );
  } catch (e) {
    topicChips.innerHTML = `<span class="muted">Failed to load topics.</span>`;
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
  if (!Number.isFinite(Number(currentYear))) {
    setFilterMessage("Select a year first.", "danger");
    return;
  }
  currentMode = "year";
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
  if (!currentDomain) {
    setFilterMessage("Select a domain first.", "danger");
    return;
  }
  if (!currentTopic) {
    setFilterMessage("Select a topic first.", "danger");
    return;
  }
  currentMode = "topic";
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

    btnShuffleTopic.disabled = topicShuffledIds.length <= 1;
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

  btnModeYear.classList.toggle("active", mode === "year");
  btnModeTopic.classList.toggle("active", mode === "topic");

  setFilterMessage("");
  totalCount = 0;
  totalPages = 0;
  currentPage = 1;
  updatePager();
  resetQuestionsUI();
}

function syncLoadButtons() {
  btnLoadYear.disabled = !Number.isFinite(Number(currentYear));
  btnLoadTopic.disabled = !(currentDomain && currentTopic);
  btnShuffleTopic.disabled = !(currentMode === "topic" && topicShuffledIds.length > 1);
}

function onDifficultyChanged(diff) {
  currentDifficulty = String(diff || "").trim().toLowerCase();
  const btns = Array.from(difficultySeg.querySelectorAll(".chip"));
  btns.forEach((b) => b.classList.toggle("active", b.getAttribute("data-diff") === currentDifficulty));
  syncLoadButtons();

  // If the user already picked a domain+topic, refresh immediately for better UX.
  if (currentMode === "topic" && currentDomain && currentTopic) {
    startTopic().catch(() => {});
  }
}

// Events
btnModeYear.addEventListener("click", () => onModeChange("year"));
btnModeTopic.addEventListener("click", () => onModeChange("topic"));

yearChips.addEventListener("click", (e) => {
  const b = e.target && e.target.closest && e.target.closest(".chip");
  if (!b) return;
  const y = Number(b.getAttribute("data-key"));
  if (!Number.isFinite(y)) return;
  currentYear = y;
  Array.from(yearChips.querySelectorAll(".chip")).forEach((x) => x.classList.toggle("active", x === b));
  syncLoadButtons();

  if (currentMode === "year") {
    startYear().catch(() => {});
  }
});

domainTabs.addEventListener("click", async (e) => {
  const b = e.target && e.target.closest && e.target.closest(".chip");
  if (!b) return;
  const d = String(b.getAttribute("data-key") || "").trim();
  if (!d) return;
  currentDomain = d;
  currentTopic = null;
  topicShuffledIds = [];
  Array.from(domainTabs.querySelectorAll(".chip")).forEach((x) => x.classList.toggle("active", x === b));
  await loadTopicsForDomain(currentDomain);
  syncLoadButtons();
});

topicChips.addEventListener("click", (e) => {
  const b = e.target && e.target.closest && e.target.closest(".chip");
  if (!b) return;
  const t = String(b.getAttribute("data-key") || "").trim();
  if (!t) return;
  currentTopic = t;
  Array.from(topicChips.querySelectorAll(".chip")).forEach((x) => x.classList.toggle("active", x === b));
  syncLoadButtons();

  if (currentMode === "topic") {
    startTopic().catch(() => {});
  }
});

difficultySeg.addEventListener("click", (e) => {
  const b = e.target && e.target.closest && e.target.closest(".chip");
  if (!b) return;
  onDifficultyChanged(b.getAttribute("data-diff") || "");
});

btnLoadYear.addEventListener("click", startYear);
btnLoadTopic.addEventListener("click", startTopic);
btnShuffleTopic.addEventListener("click", async () => {
  if (currentMode !== "topic" || !topicShuffledIds.length) return;
  shuffleInPlace(topicShuffledIds);
  await goToPage(1);
});

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
  onDifficultyChanged("");
  syncLoadButtons();

  await Promise.all([loadYears(), loadDomains()]);
  await loadTopicsForDomain("");
})();

supabase.auth.onAuthStateChange((_event, session) => {
  if (!session) location.href = "login.html";
});
