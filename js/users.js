// js/users.js
(() => {
  /** ========= 配置 ========= */
  const STORAGE_KEY = "pd_user"; // 登录态
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz6lMcYTOJYsdxjmSFHlH90RixRU68lXzPqTXfBzOQ0QOp28aD3iuxubOsanht3Gqz0jA/exec";    // TODO: 粘贴 Apps Script Web App URL（.../exec）

  /** ========= Header Buttons ========= */
  const loginBtn = document.querySelector('[data-role="login"]');
  const signonBtn = document.querySelector('[data-role="signon"]');
  if (!loginBtn || !signonBtn) return;

  /** ========= Right Panel ========= */
  const rankListEl = document.querySelector(".right .rank-list");
  const loginSpanEl = document.querySelector(".right .user-data .login"); // <span class="login">
  const dataListEl = document.querySelector(".right .user-data .data");   // <ul class="data">
  const playsEl = document.querySelector(".right .user-data .num-plays");
  const accEl = document.querySelector(".right .user-data .accuracy");
  const rankEl = document.querySelector(".right .user-data .rank");
  const rankMarkEl = document.querySelector(".right .user-data .rank-mark");

  const hintP = loginSpanEl?.closest("p");

  /** ========= UI: Auth Modal ========= */
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="auth dialog">
      <div class="modal-header">
        <div class="modal-title" data-auth-title>ログイン</div>
        <button class="modal-close" type="button" aria-label="close">✕</button>
      </div>

      <form data-auth-form>
        <div class="field">
          <label>Username</label>
          <input name="username" autocomplete="username" required maxlength="16" />
        </div>

        <div class="field">
          <label>Password</label>
          <input name="password" type="password" autocomplete="current-password" required maxlength="64" />
        </div>

        <div class="field" data-confirm-field style="display:none;">
          <label>Confirm Password</label>
          <input name="confirm" type="password" autocomplete="new-password" maxlength="64" />
        </div>

        <div class="actions">
          <button class="btn" type="button" data-auth-cancel>キャンセル</button>
          <button class="btn primary" type="submit" data-auth-submit>送信</button>
        </div>

        <div class="msg" data-auth-msg></div>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);

  const closeBtn = backdrop.querySelector(".modal-close");
  const cancelBtn = backdrop.querySelector("[data-auth-cancel]");
  const form = backdrop.querySelector("[data-auth-form]");
  const titleEl = backdrop.querySelector("[data-auth-title]");
  const msgEl = backdrop.querySelector("[data-auth-msg]");
  const confirmField = backdrop.querySelector("[data-confirm-field]");
  const submitBtn = backdrop.querySelector("[data-auth-submit]");

  let mode = "login"; // "login" | "register"

  function openModal(nextMode) {
    mode = nextMode;
    msgEl.textContent = "";
    form.reset();

    titleEl.textContent = mode === "login" ? "ログイン" : "新規登録";
    confirmField.style.display = mode === "register" ? "" : "none";

    const pwd = form.elements.password;
    pwd.autocomplete = mode === "register" ? "new-password" : "current-password";

    backdrop.classList.add("is-open");
    setTimeout(() => form.elements.username?.focus(), 0);
  }

  function closeModal() {
    backdrop.classList.remove("is-open");
    msgEl.textContent = "";
  }

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });
  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  /** ========= Session ========= */
  function getSession() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
    catch { return null; }
  }
  function setSession(user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    applyUIState();
  }
  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
    applyUIState();
  }

  /** ========= Utils ========= */
  async function sha256Hex(str) {
    const buf = new TextEncoder().encode(str);
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function jsonp(url, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      const cbName = `__pd_cb_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const s = document.createElement("script");
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("请求超时，请重试"));
      }, timeoutMs);

      function cleanup() {
        clearTimeout(timer);
        try { delete window[cbName]; } catch { }
        s.remove();
      }

      window[cbName] = (data) => { cleanup(); resolve(data); };
      s.onerror = () => { cleanup(); reject(new Error("网络错误或接口不可用")); };

      const sep = url.includes("?") ? "&" : "?";
      s.src = `${url}${sep}callback=${encodeURIComponent(cbName)}`;
      document.body.appendChild(s);
    });
  }

  async function api(action, payload = {}) {
    if (!APPS_SCRIPT_URL) throw new Error("未配置 APPS_SCRIPT_URL（users.js）");
    const params = new URLSearchParams({ action, ...payload });
    return await jsonp(`${APPS_SCRIPT_URL}?${params.toString()}`);
  }

  function showMsg(text) { msgEl.textContent = text || ""; }
  function setSubmitting(on) {
    submitBtn.disabled = !!on;
    submitBtn.textContent = on ? "送信中..." : "送信";
  }

  function formatAccuracy(raw) {
    const n = Number(raw);
    if (Number.isNaN(n)) return raw ?? "";
    const pct = n <= 1 ? n * 100 : n;
    return `${pct.toFixed(1)}%`;
  }

  function rankBadge(rankPoints) {
  const r = Number(rankPoints || 0);
  if (r >= 2000) return "S+";
  if (r >= 1750) return "A+";
  if (r >= 1500) return "A";
  if (r >= 1000) return "B";
  if (r >= 750)  return "C+";
  if (r >= 500)  return "C";
  return "D";
}

  /** ========= Render Right Panel ========= */
  function renderUserPanel(user) {
    if (!loginSpanEl || !dataListEl) return;

    if (!user?.username) {
      loginSpanEl.textContent = "ログイン";
      if (hintP) hintP.innerHTML = `<span class="login">ログイン</span>して自分のデータがチェックできる`;
      dataListEl.style.display = "none";
      if (playsEl) playsEl.textContent = "";
      if (accEl) accEl.textContent = "";
      if (rankEl) rankEl.textContent = "";
      if (rankMarkEl) rankMarkEl.textContent = "";
      return;
    }

    if (hintP) hintP.textContent = `ようこそ、${user.username} さん`;
    dataListEl.style.display = "";
    if (playsEl) playsEl.textContent = String(user.numberPlays ?? user.number_plays ?? 0);
    if (accEl) accEl.textContent = formatAccuracy(user.accuracy ?? 0);
    if (rankEl) rankEl.textContent = String(user.rank ?? 0);

    const badge = rankBadge(user.rank ?? 0);
    if (rankMarkEl) rankMarkEl.textContent = badge ? `${badge}` : "";
  }

  function renderLeaderboard(list, currentUsername) {
    if (window.PD_updateRankList) {
      window.PD_updateRankList(list, currentUsername);
      return;
    }
  }

  async function refreshUserFromServer() {
    const sess = getSession();
    if (!sess?.username) return null;
    const res = await api("getUser", { username: sess.username });
    if (!res?.ok) return sess;
    setSession(res.user);
    return res.user;
  }

  async function refreshLeaderboard() {
    const sess = getSession();
    try {
      const res = await api("leaderboard", { limit: "10" });
      if (res?.ok) renderLeaderboard(res.list, sess?.username);
    } catch (e) {
      console.warn(e);
    }
  }

  /** ========= Apply UI State ========= */
  function applyUIState() {
    const user = getSession();
    if (user?.username) {
      loginBtn.textContent = user.username;
      signonBtn.textContent = "Logout";
    } else {
      loginBtn.textContent = "ログイン";
      signonBtn.textContent = "新規登録";
    }

    renderUserPanel(user);
    refreshLeaderboard();
  }

  /** ========= Auth Submit ========= */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showMsg("");

    const username = (form.elements.username.value || "").trim();
    const password = (form.elements.password.value || "").trim();
    const confirm = (form.elements.confirm?.value || "").trim();

    if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
      showMsg("Username は 3〜16 文字（英数字と _ ）にしてください。");
      return;
    }
    if (password.length < 6) {
      showMsg("Password は 6 文字以上にしてください。");
      return;
    }
    if (mode === "register" && password !== confirm) {
      showMsg("Confirm Password が一致しません。");
      return;
    }

    try {
      setSubmitting(true);
      const passHash = await sha256Hex(password);

      if (mode === "register") {
        const res = await api("register", { username, password: passHash });
        if (!res?.ok) throw new Error(res?.error || "登録に失敗しました");
        setSession(res.user);
        closeModal();
        return;
      }

      if (mode === "login") {
        const res = await api("login", { username, password: passHash });
        if (!res?.ok) throw new Error(res?.error || "ログインに失敗しました");
        setSession(res.user);
        closeModal();
        return;
      }
    } catch (err) {
      console.error(err);
      showMsg(err?.message || "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  });

  /** ========= Header Click ========= */
  loginBtn.addEventListener("click", async () => {
    const user = getSession();
    if (user?.username) {
      try { await refreshUserFromServer(); } catch { }
      renderUserPanel(getSession());
      return;
    }
    openModal("login");
  });

  signonBtn.addEventListener("click", () => {
    const user = getSession();
    if (user?.username) {
      clearSession();
      return;
    }
    openModal("register");
  });

  (async () => {
    applyUIState();
    document.addEventListener("pd:userUpdated", (e) => {
      if (e?.detail?.username) {
        localStorage.setItem("pd_user", JSON.stringify(e.detail));
      }
      applyUIState();
    });
    try { await refreshUserFromServer(); } catch { }
    applyUIState();
  })();
})();
