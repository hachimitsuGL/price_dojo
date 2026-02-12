// js/ranklist.js
(() => {
  // 和 newgame.js 使用同一个 Spreadsheet
  const SPREADSHEET_ID = "1FXUs_MujumvuAfRag_uYK2iPlPUUjCl27p1bA1QytkE";
  const USERS_SHEET_NAME = "users";

  const root = document.querySelector(".right .rank-list");
  if (!root) return;

  /** =====================
   *  Top1（div）：
   *  - .rank-list-username.ranktop1
   *  - .rank-list-rank.ranktop1
   *  - .rank-list-numofplays.ranktop1
   *  - .rank-list-accuracy.ranktop1
   *  ===================== */
  const top1UserEl = root.querySelector(".rank-list-username.ranktop1");
  const top1RankEl = root.querySelector(".rank-list-rank.ranktop1");
  const top1PlaysEl = root.querySelector(".ranktop1 .rank-list-numofplays");
  const top1AccEl = root.querySelector(".ranktop1 .rank-list-accuracy");

  if (top1UserEl) top1UserEl.textContent = "Loading...";
  if (top1RankEl) top1RankEl.textContent = "-";
  if (top1PlaysEl) top1PlaysEl.textContent = "-";
  if (top1AccEl) top1AccEl.textContent = "-";

  function toNumberLike(raw, fallback = NaN) {
    const s = raw == null ? "" : String(raw);
    const n = Number(s.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : fallback;
  }

  function formatPlays(raw) {
    const n = toNumberLike(raw, NaN);
    if (!Number.isFinite(n)) return "-";
    return Math.max(0, Math.floor(n)).toLocaleString("ja-JP");
  }

  function formatAccuracy(raw) {
    const s = raw == null ? "" : String(raw).trim();
    if (!s) return "-";
    const n = toNumberLike(s, NaN);
    if (!Number.isFinite(n)) return s;
    // 0~1 或 0~100
    const pct = n <= 1 ? n * 100 : n;
    return `${pct.toFixed(1)}%`;
  }

  function rankBadge(rankPoints) {
    const r = Number(rankPoints || 0);
    if (r >= 2000) return "S+";
    if (r >= 1750) return "A+";
    if (r >= 1500) return "A";
    if (r >= 1000) return "B";
    if (r >= 750) return "C+";
    if (r >= 500) return "C";
    return "D";
  }

  function rankText(rankPoints) {
    const r = Number(rankPoints || 0);
    return `${rankBadge(r)}(${r})`;
  }

  function gvizJsonp(spreadsheetId, sheetName) {
    return new Promise((resolve, reject) => {
      const cbName = "__gviz_users_cb_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");

      const cleanup = (err) => {
        try { delete window[cbName]; } catch { }
        if (script.parentNode) script.parentNode.removeChild(script);
        if (err) reject(err);
      };

      const timer = setTimeout(() => cleanup(new Error("users sheet 超时")), 15000);

      window[cbName] = (resp) => {
        clearTimeout(timer);
        cleanup();
        resolve(resp);
      };

      script.onerror = () => {
        clearTimeout(timer);
        cleanup(new Error("users sheet 加载失败（权限/网络）"));
      };

      const tq = encodeURIComponent("select *");
      const url =
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq` +
        `?sheet=${encodeURIComponent(sheetName)}` +
        `&tq=${tq}` +
        `&tqx=out:json;responseHandler:${cbName}`;

      script.src = url;
      document.head.appendChild(script);
    });
  }

  function cellValue(row, idx) {
    const c = row?.c?.[idx];
    return (c && c.v != null) ? String(c.v) : "";
  }

  function pickCol(colIndex, candidates) {
    for (const k of candidates) {
      if (k in colIndex) return colIndex[k];
    }
    return null;
  }

  function fillRow(tr, pos, user) {
    tr.textContent = "";

    const tdPos = document.createElement("td");
    tdPos.textContent = String(pos);

    const tdName = document.createElement("td");
    tdName.textContent = user?.username ? String(user.username) : "-";

    const tdRank = document.createElement("td");
    tdRank.textContent = user ? rankText(user.rank) : "-";

    const tdPlays = document.createElement("td");
    tdPlays.textContent = user ? formatPlays(user.plays) : "-";

    const tdAcc = document.createElement("td");
    tdAcc.textContent = user ? formatAccuracy(user.accuracy) : "-";

    tr.append(tdPos, tdName, tdRank, tdPlays, tdAcc);
  }

  function renderTop10(list) {
    const items = Array.isArray(list) ? list.slice(0, 10) : [];

    // Top1
    if (items[0]) {
      if (top1UserEl) top1UserEl.textContent = items[0].username ?? "-";
      if (top1RankEl) top1RankEl.textContent = rankText(items[0].rank);
      if (top1PlaysEl) top1PlaysEl.textContent = formatPlays(items[0].plays);
      if (top1AccEl) top1AccEl.textContent = formatAccuracy(items[0].accuracy);
    } else {
      if (top1UserEl) top1UserEl.textContent = "-";
      if (top1RankEl) top1RankEl.textContent = "-";
      if (top1PlaysEl) top1PlaysEl.textContent = "-";
      if (top1AccEl) top1AccEl.textContent = "-";
    }

    // 2~10
    for (let pos = 2; pos <= 10; pos++) {
      const tr = root.querySelector(`tr.ranktop${pos}`);
      if (!tr) continue;
      fillRow(tr, pos, items[pos - 1] || null);
    }
  }

  /**
   * 兼容 users.js：它会调用 window.PD_updateRankList(list)
   * list 内部字段可能是：numberPlays / number_plays / plays
   */
  window.PD_updateRankList = (list) => {
    const items = (Array.isArray(list) ? list : []).map(u => ({
      username: u?.username ?? "",
      rank: toNumberLike(u?.rank, 0),
      plays: (u?.number-plays ?? u?.number_plays ?? u?.plays ?? u?.playCount ?? u?.totalPlays ?? ""),
      accuracy: (u?.accuracy ?? ""),
    }));
    renderTop10(items);
  };

  async function refreshRankList() {
    try {
      const resp = await gvizJsonp(SPREADSHEET_ID, USERS_SHEET_NAME);

      if (!resp || resp.status !== "ok" || !resp.table) {
        throw new Error("users sheet 返回格式不正确");
      }

      const { cols, rows } = resp.table;

      const colIndex = {};
      (cols || []).forEach((c, i) => {
        const label = (c?.label || "").trim();
        if (label) colIndex[label] = i;
      });

      const idxUser = pickCol(colIndex, ["username", "user", "name"]);
      const idxRank = pickCol(colIndex, ["rank", "rankPoints", "points"]);
      const idxAcc = pickCol(colIndex, ["accuracy", "acc", "avgAccuracy", "avg_accuracy", "平均推測精度", "推測精度"]);
      const idxPlays = pickCol(colIndex, ["number-plays", "number_plays", "plays", "playCount", "totalPlays", "total_plays", "総プレー数"]);

      if (idxUser == null || idxRank == null) {
        throw new Error("users sheet 缺少表头 username / rank");
      }

      const users = (rows || [])
        .map(r => ({
          username: cellValue(r, idxUser).trim(),
          rank: toNumberLike(cellValue(r, idxRank), 0),
          plays: idxPlays == null ? "" : cellValue(r, idxPlays).trim(),
          accuracy: idxAcc == null ? "" : cellValue(r, idxAcc).trim(),
        }))
        .filter(u => u.username)
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 10);

      renderTop10(users);
    } catch (e) {
      console.warn(e);
      if (top1UserEl) top1UserEl.textContent = "ランキング取得失敗";
      if (top1RankEl) top1RankEl.textContent = "-";
      if (top1PlaysEl) top1PlaysEl.textContent = "-";
      if (top1AccEl) top1AccEl.textContent = "-";

      for (let pos = 2; pos <= 10; pos++) {
        const tr = root.querySelector(`tr.ranktop${pos}`);
        if (tr) fillRow(tr, pos, null);
      }
    }
  }

  window.PD_refreshRankList = refreshRankList;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refreshRankList);
  } else {
    refreshRankList();
  }

  document.addEventListener("pd:userUpdated", () => refreshRankList());
})();
