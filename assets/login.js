import { supabase } from "./supabaseClient.js";

const el = (id) => document.getElementById(id);
const statusEl = el("status");
const messageEl = el("message");
const emailEl = el("email");
const passwordEl = el("password");
const btnSignIn = el("btnSignIn");
const btnSignUp = el("btnSignUp");
const btnGoogle = el("btnGoogle");

function setMessage(msg, kind = "muted") {
  messageEl.className = kind;
  messageEl.textContent = msg || "";
}

function getSafeOrigin() {
  if (
    typeof location !== "undefined" &&
    location.origin &&
    location.origin !== "null" &&
    (location.protocol === "http:" || location.protocol === "https:")
  ) {
    return location.origin;
  }
  return null;
}

function redirectToPractice() {
  // Keep it simple: always go to practice.
  location.href = "practice.html";
}

async function refreshSession() {
  const { data } = await supabase.auth.getSession();
  const session = data?.session || null;
  if (session) {
    statusEl.textContent = `Already signed in as ${session.user.email || session.user.id}. Redirecting...`;
    redirectToPractice();
    return;
  }
  statusEl.textContent = "Not signed in.";
}

btnSignIn.addEventListener("click", async () => {
  setMessage("");
  const email = String(emailEl.value || "").trim();
  const password = String(passwordEl.value || "").trim();
  if (!email || !password) {
    setMessage("Enter email + password.", "danger");
    return;
  }

  btnSignIn.disabled = true;
  btnSignUp.disabled = true;
  btnGoogle.disabled = true;
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setMessage("Signed in. Redirecting...", "success");
    redirectToPractice();
  } catch (e) {
    setMessage(e.message || "Sign in failed.", "danger");
  } finally {
    btnSignIn.disabled = false;
    btnSignUp.disabled = false;
    btnGoogle.disabled = false;
  }
});

btnSignUp.addEventListener("click", async () => {
  setMessage("");
  const email = String(emailEl.value || "").trim();
  const password = String(passwordEl.value || "").trim();
  if (!email || !password) {
    setMessage("Enter email + password.", "danger");
    return;
  }

  btnSignIn.disabled = true;
  btnSignUp.disabled = true;
  btnGoogle.disabled = true;
  try {
    const origin = getSafeOrigin();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...(origin ? { emailRedirectTo: `${origin}/practice.html` } : {}),
      },
    });
    if (error) throw error;
    setMessage(
      "Sign up complete. If email confirmation is enabled, confirm your email, then sign in.",
      "success"
    );
  } catch (e) {
    setMessage(e.message || "Sign up failed.", "danger");
  } finally {
    btnSignIn.disabled = false;
    btnSignUp.disabled = false;
    btnGoogle.disabled = false;
  }
});

btnGoogle.addEventListener("click", async () => {
  setMessage("");
  btnSignIn.disabled = true;
  btnSignUp.disabled = true;
  btnGoogle.disabled = true;
  try {
    const origin = getSafeOrigin();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        ...(origin ? { redirectTo: `${origin}/practice.html` } : {}),
      },
    });
    if (error) throw error;
    // Redirect happens automatically.
  } catch (e) {
    setMessage(e.message || "Google sign-in failed.", "danger");
  } finally {
    btnSignIn.disabled = false;
    btnSignUp.disabled = false;
    btnGoogle.disabled = false;
  }
});

supabase.auth.onAuthStateChange(() => {
  refreshSession().catch(() => {});
});

refreshSession().catch(() => {});
