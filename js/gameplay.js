// js/gameplay.js
(() => {
  const STORAGE_KEY = "pd_user";
  const APPS_SCRIPT_URL = window.PD_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbz6lMcYTOJYsdxjmSFHlH90RixRU68lXzPqTXfBzOQ0QOp28aD3iuxubOsanht3Gqz0jA/exec"; // 推荐在 users.js 里把 URL 暴露到 window

  const priceInput = document.querySelector(".input-price");
  const commitBtn = document.querySelector('[data-role="commit"]');
  const timeEl = document.querySelector('[data-type="time-left"]');
  const newGameBtn = document.querySelector(".button-newgame");

  if (!priceInput || !commitBtn || !timeEl) return;

  /* ===== ランクに関するルール =====　*/
  const TIERS = [
    {
      name: "D",
      minRank: 0,
      time: 80,
      rewards: [
        { minAcc: 98, pts: +250 },
        { minAcc: 90, pts: +150 },
        { minAcc: 80, pts: +80 },
        { minAcc: 70, pts: +30 },
        { minAcc: 50, pts: +20 },
      ],
      penalty: { belowAcc: 20, pts: -10 },
    },
    {
      name: "C",
      minRank: 500,
      time: 60,
      rewards: [
        { minAcc: 98, pts: +250 },
        { minAcc: 90, pts: +150 },
        { minAcc: 80, pts: +80 },
        { minAcc: 70, pts: +30 },
        { minAcc: 50, pts: +20 },
      ],
      penalty: { belowAcc: 30, pts: -25 },
    },
    {
      name: "C+",
      minRank: 750,
      time: 60,
      rewards: [
        { minAcc: 98, pts: +220 },
        { minAcc: 90, pts: +140 },
        { minAcc: 80, pts: +70 },
        { minAcc: 70, pts: +25 },
        { minAcc: 50, pts: +15 },
      ],
      penalty: [
        { belowAcc: 30, pts: -35 },
        { belowAcc: 10, pts: -50 },
      ],
    },
    {
      name: "B",
      minRank: 1000,
      time: 40,
      rewards: [
        { minAcc: 98, pts: +190 },
        { minAcc: 90, pts: +135 },
        { minAcc: 80, pts: +65 },
        { minAcc: 70, pts: +20 },
        { minAcc: 50, pts: +10 },
      ],
      penalty: [
        { belowAcc: 30, pts: -30 },
        { belowAcc: 10, pts: -50 },
      ],
    },
    {
      name: "A",
      minRank: 1500,
      time: 30,
      rewards: [
        { minAcc: 98, pts: +180 },
        { minAcc: 90, pts: +130 },
        { minAcc: 80, pts: +60 },
        { minAcc: 70, pts: +15 },
        { minAcc: 50, pts: +5 },
      ],
      penalty: [
        { belowAcc: 30, pts: -35 },
        { belowAcc: 10, pts: -65 },
      ],
    },
    {
      name: "A+",
      minRank: 1750,
      time: 30,
      rewards: [
        { minAcc: 98, pts: +150 },
        { minAcc: 90, pts: +100 },
        { minAcc: 80, pts: +50 },
        { minAcc: 70, pts: +10 },
        { minAcc: 50, pts: +5 },
      ],
      penalty: [
        { belowAcc: 30, pts: -40 },
        { belowAcc: 10, pts: -65 },
        { belowAcc: 5, pts: -80 },
      ],
    },
    {
      name: "S",
      minRank: 2000,
      time: 20,
      rewards: [
        { minAcc: 98, pts: +150 },
        { minAcc: 90, pts: +50 },
        { minAcc: 80, pts: +30 },
        { minAcc: 70, pts: +10 },
      ],
      penalty: [
        { belowAcc: 30, pts: -50 },
        { belowAcc: 10, pts: -65 },
        { belowAcc: 5, pts: -80 },
      ],
    },
    {
      name: "S+",
      minRank: 2500,
      time: 15,
      rewards: [
        { minAcc: 98, pts: +150 },
        { minAcc: 90, pts: +50 },
        { minAcc: 80, pts: +30 },
      ],
      penalty: [
        { belowAcc: 30, pts: -50 },
        { belowAcc: 10, pts: -85 },
        { belowAcc: 5, pts: -100 },
      ],
    },
  ];

  function getSession() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
    catch { return null; }
  }

  function setSession(user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    document.dispatchEvent(new CustomEvent("pd:userUpdated", { detail: user }));
  }

  function currentTier(rankPoints) {
    const r = Number(rankPoints || 0);
    const sorted = [...TIERS].sort((a, b) => a.minRank - b.minRank);
    let t = sorted[0];
    for (const item of sorted) {
      if (r >= item.minRank) t = item;
    }
    return t;
  }

  function formatYen(n) {
    if (!Number.isFinite(n)) return "";
    return "¥" + Math.round(n).toLocaleString("ja-JP");
  }

  function parseGuess(s) {
    const cleaned = String(s || "").replace(/[^\d.]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  }

  function calcAccuracyPercent(guess, actual) {
    if (!Number.isFinite(guess) || !Number.isFinite(actual) || actual <= 0) return 0;
    const err = Math.abs(guess - actual) / actual;
    const acc = Math.max(0, 1 - err) * 100;
    return acc;
  }

  function calcDeltaPoints(tier, accPercent) {
    for (const r of tier.rewards) {
      if (accPercent >= r.minAcc) return r.pts;
    }
    const p = tier.penalty;
    if (!p) return 0;

    if (Array.isArray(p)) {
      const sorted = [...p].sort((a, b) => a.belowAcc - b.belowAcc);
      for (const item of sorted) {
        if (accPercent < item.belowAcc) return item.pts;
      }
      return 0;
    }

    if (accPercent < p.belowAcc) return p.pts;
    return 0;
  }

  /** ===== JSONP Apps Script ===== */
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
    if (!APPS_SCRIPT_URL) throw new Error("缺少 APPS_SCRIPT_URL：请在 users.js 设置 window.PD_APPS_SCRIPT_URL");
    const params = new URLSearchParams({ action, ...payload });
    return await jsonp(`${APPS_SCRIPT_URL}?${params.toString()}`);
  }

  const resultBackdrop = document.createElement("div");
  resultBackdrop.className = "modal-backdrop";
  resultBackdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="result dialog">
      <div class="modal-header">
        <div class="modal-title">結果</div>
        <button class="modal-close" type="button" aria-label="close">✕</button>
      </div>
      <div data-result-body style="font-size:14px; line-height:1.6;"></div>
      <div class="actions" style="margin-top:14px;">
        <button class="btn primary" type="button" data-result-ok>OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(resultBackdrop);
  const resultBody = resultBackdrop.querySelector("[data-result-body]");
  const resultClose = resultBackdrop.querySelector(".modal-close");
  const resultOk = resultBackdrop.querySelector("[data-result-ok]");
  function openResult(html) {
    resultBody.innerHTML = html;
    resultBackdrop.classList.add("is-open");
  }
  function closeResult() {
    resultBackdrop.classList.remove("is-open");
  }
  resultBackdrop.addEventListener("click", (e) => { if (e.target === resultBackdrop) closeResult(); });
  resultClose.addEventListener("click", closeResult);
  resultOk.addEventListener("click", closeResult);

  let state = {
    running: false,
    actualPrice: NaN,
    tier: TIERS[0],
    timeLeft: 0,
    timerId: null,
  };

  function setTimeText(sec) {
    timeEl.textContent = `${Math.max(0, Math.ceil(sec))}s`;
  }

  function stopTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
  }

  function lockDuringRound(lock) {
    commitBtn.disabled = !!lock;
    priceInput.disabled = !!lock;
    if (newGameBtn) newGameBtn.disabled = !!lock;
  }

  function startRound(actualPrice) {
    const user = getSession();
    const tier = currentTier(user?.rank ?? 0);

    state.running = true;
    state.actualPrice = actualPrice;
    state.tier = tier;
    state.timeLeft = tier.time;

    priceInput.value = "";
    lockDuringRound(false);
    setTimeText(state.timeLeft);

    stopTimer();
    state.timerId = setInterval(() => {
      state.timeLeft -= 1;
      setTimeText(state.timeLeft);
      if (state.timeLeft <= 0) {
        settle("timeout");
      }
    }, 1000);
  }

  async function settle(reason) {
    if (!state.running) return;
    state.running = false;
    stopTimer();
    lockDuringRound(true);

    const user = getSession();
    const loggedIn = !!user?.username;

    const guess = parseGuess(priceInput.value);
    const actual = state.actualPrice;
    const acc = calcAccuracyPercent(guess, actual);
    const delta = calcDeltaPoints(state.tier, acc);

    const deltaText = (delta > 0 ? `+${delta}` : `${delta}`);
    const reasonText = reason === "timeout" ? "時間切れ" : "提出";

    openResult(`
      <div>段位：<b>${state.tier.name}</b></div>
      <div>方式：${reasonText}</div>
      <hr style="margin:10px 0; opacity:.3;">
      <div>正解価格：<b>${formatYen(actual)}</b></div>
      <div>あなたの回答：<b>${Number.isFinite(guess) ? formatYen(guess) : "未入力"}</b></div>
      <div>精度：<b>${acc.toFixed(1)}%</b></div>
      <div>獲得点：<b>${deltaText}</b></div>
      ${loggedIn ? "" : `<div style="margin-top:8px; color:#b00020;">※ログインすると成績が保存されます</div>`}
    `);

    if (!loggedIn) {
      lockDuringRound(false);
      if (newGameBtn) {
        newGameBtn.style.display = "";
        newGameBtn.disabled = false;
        newGameBtn.textContent = "ニューゲーム";
      }
      return;
    }

    try {
      const res = await api("submitResult", {
        username: user.username,
        accuracy: String(acc),
        delta: String(delta),
      });

      if (res?.ok && res.user) {
        setSession(res.user); 

      } else {
        console.warn(res);
        alert(res?.error || "写入成绩失败");
      }
    } catch (e) {
      console.error(e);
      alert(e?.message || "写入成绩失败");
    } finally {
      lockDuringRound(false);
      if (newGameBtn) {
        newGameBtn.style.display = "";
        newGameBtn.disabled = false;
        newGameBtn.textContent = "ニューゲーム";
      }
    }
  }

  document.addEventListener("pd:newgame", (e) => {
    const price = e?.detail?.price;
    if (!Number.isFinite(price) || price <= 0) return;
    startRound(price);
  });

  commitBtn.addEventListener("click", (e) => {
    e.preventDefault();
    settle("submit");
  });

  setTimeText(0);
})();
