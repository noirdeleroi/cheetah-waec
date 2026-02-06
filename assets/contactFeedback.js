import { supabase } from "./supabaseClient.js";

const mount = document.getElementById("feedbackMount");
if (!mount) {
  console.warn("contactFeedback: missing #feedbackMount");
} else {
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

  async function insertFeedback({ user, message }) {
    const payload = {
      user_id: user.id,
      email: user.email || null,
      message,
    };

    const { error } = await supabase.from("feedback_messages").insert(payload);
    if (error) throw error;
  }

  async function init() {
    mount.innerHTML = "";

    let user = null;
    try {
      user = await getSessionUser();
    } catch (e) {
      mount.appendChild(
        el("div", { className: "fb-muted fb-danger", text: e?.message || "Auth check failed." })
      );
      return;
    }

    if (!user) {
      // Requirement: do not show the form to logged-out users.
      return;
    }

    const title = el("h3", { text: "Send feedback" });
    title.style.margin = "0 0 8px 0";

    const note = el("div", {
      className: "fb-muted",
      text: `Signed in as ${user.email || user.id}. Your message goes straight to the team.`,
    });

    const label = el("label", { for: "fbMessage", text: "Write any feedback or message" });

    const textarea = el("textarea", {
      id: "fbMessage",
      maxlength: "2000",
      placeholder: "Type your message here...",
    });

    const status = el("div", { className: "fb-muted", text: "" });

    const btn = el("button", { type: "button", className: "fb-btn", text: "Send" });
    btn.style.marginLeft = "auto";

    btn.addEventListener("click", async () => {
      const message = String(textarea.value || "").trim();
      if (!message) {
        setStatus(status, "Message can't be empty.", "fb-muted fb-danger");
        return;
      }
      if (message.length > 2000) {
        setStatus(status, "Message is too long (max 2000 characters).", "fb-muted fb-danger");
        return;
      }

      btn.disabled = true;
      textarea.disabled = true;
      setStatus(status, "Sending...", "fb-muted");
      try {
        await insertFeedback({ user, message });
        textarea.value = "";
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
        textarea.disabled = false;
      }
    });

    const row = el("div", { className: "fb-row" }, [
      el("div", { className: "fb-muted", text: "Max 2000 characters." }),
      btn,
    ]);

    mount.appendChild(title);
    mount.appendChild(note);
    mount.appendChild(el("div", {}, [label, textarea, row, status]));
  }

  supabase.auth.onAuthStateChange(() => {
    init().catch(() => {});
  });

  init().catch(() => {});
}

