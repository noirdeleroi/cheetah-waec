import { supabase } from "./supabaseClient.js";

const mount = document.getElementById("feedbackMount");
if (!mount) {
  console.warn("contactFeedback: missing #feedbackMount");
} else if (mount.dataset.feedbackInit === "1") {
  // Prevent duplicate rendering if this module is loaded multiple times.
  console.warn("contactFeedback: already initialized");
} else {
  mount.dataset.feedbackInit = "1";
  let initSeq = 0;

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "className") node.className = String(v || "");
      else if (k === "text") node.textContent = String(v ?? "");
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, String(v));
    }
    for (const c of children || []) {
      if (c == null) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }

  function setStatus(box, msg, kind = "fb-muted") {
    box.className = kind;
    box.textContent = msg || "";
  }

  async function getSessionUser() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data?.session?.user || null;
  }

  async function insertFeedback({ user, email, message }) {
    const payload = {
      user_id: user?.id ?? null,
      email: email || user?.email || null,
      message,
    };

    const { error } = await supabase.from("feedback_messages").insert(payload);
    if (error) throw error;
  }

  async function init() {
    const seq = ++initSeq;
    mount.innerHTML = "";

    let user = null;
    try {
      user = await getSessionUser();
    } catch (e) {
      if (seq !== initSeq) return;
      mount.appendChild(
        el("div", { className: "fb-muted fb-danger", text: e?.message || "Auth check failed." })
      );
      return;
    }
    if (seq !== initSeq) return;

    const title = el("h3", { text: "Send feedback" });
    title.style.margin = "0 0 8px 0";

    const noteText = user
      ? `Signed in as ${user.email || user.id}.`
      : "Not signed in. Please include your email so we can reply.";

    const note = el("div", { className: "fb-muted", text: noteText });

    const emailLabel = el("label", { for: "fbEmail", text: "Email (required)" });
    const emailInput = el("input", {
      id: "fbEmail",
      type: "email",
      autocomplete: "email",
      placeholder: "you@example.com",
      class: "fb-field",
    });

    const label = el("label", { for: "fbMessage", text: "Write any feedback or message" });

    const textarea = el("textarea", {
      id: "fbMessage",
      maxlength: "2000",
      placeholder: "Type your message here...",
    });
    textarea.className = "fb-field fb-textarea";

    const status = el("div", { className: "fb-muted", text: "" });

    const btn = el("button", { type: "button", className: "fb-btn", text: "Send" });
    btn.style.marginLeft = "auto";

    btn.addEventListener("click", async () => {
      const email = String(emailInput.value || "").trim();
      const message = String(textarea.value || "").trim();

      if (!user && !email) {
        setStatus(status, "Email is required when you're not signed in.", "fb-muted fb-danger");
        return;
      }
      if (!message) {
        setStatus(status, "Message can't be empty.", "fb-muted fb-danger");
        return;
      }
      if (message.length > 2000) {
        setStatus(status, "Message is too long (max 2000 characters).", "fb-muted fb-danger");
        return;
      }

      btn.disabled = true;
      emailInput.disabled = true;
      textarea.disabled = true;
      setStatus(status, "Sending...", "fb-muted");
      try {
        await insertFeedback({ user, email, message });
        textarea.value = "";
        if (!user) emailInput.value = "";
        setStatus(status, "Thanks! Feedback received.", "fb-muted fb-success");
      } catch (e) {
        setStatus(
          status,
          e?.message ||
            "Failed to send feedback. (Check Supabase RLS policy for feedback_messages.)",
          "fb-muted fb-danger"
        );
      } finally {
        btn.disabled = false;
        emailInput.disabled = false;
        textarea.disabled = false;
      }
    });

    const row = el("div", { className: "fb-row" }, [
      el("div", { className: "fb-muted", text: "Max 2000 characters." }),
      btn,
    ]);

    mount.appendChild(title);
    mount.appendChild(note);

    if (!user) {
      mount.appendChild(emailLabel);
      mount.appendChild(emailInput);
    }

    mount.appendChild(el("div", {}, [label, textarea, row, status]));
  }

  supabase.auth.onAuthStateChange(() => {
    init().catch(() => {});
  });

  init().catch(() => {});
}
