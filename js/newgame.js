// js/newgame.js
(() => {
  const SPREADSHEET_ID = "1FXUs_MujumvuAfRag_uYK2iPlPUUjCl27p1bA1QytkE";
  const GID = "0";

  const COL_SOURCE = "元サイト";
  const COL_NAME = "商品名";
  const COL_IMAGE = "商品写真";
  const COL_PRICE = "商品価格";

  const sourceEl = document.querySelector('[data-type="product-source"]');
  const nameEl = document.querySelector('[data-type="product-name"]');

  const imgEl = document.querySelector('[data-type="product-image"]');
  const newGameBtn = document.querySelector(".button-newgame");

  if (!sourceEl || !nameEl || !imgEl || !newGameBtn) return;

  function gvizJsonp(spreadsheetId, gid) {
    return new Promise((resolve, reject) => {
      const cbName = "__gviz_cb_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");

      const cleanup = (err) => {
        try { delete window[cbName]; } catch { }
        if (script.parentNode) script.parentNode.removeChild(script);
        if (err) reject(err);
      };

      const timer = setTimeout(() => cleanup(new Error("请求 Google Sheet 超时")), 15000);

      window[cbName] = (resp) => {
        clearTimeout(timer);
        cleanup();
        resolve(resp);
      };

      script.onerror = () => {
        clearTimeout(timer);
        cleanup(new Error("加载 Google Sheet 失败：可能是权限未公开 / 网络问题"));
      };

      const tq = encodeURIComponent("select *");
      const src =
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq` +
        `?gid=${encodeURIComponent(gid)}` +
        `&tq=${tq}` +
        `&tqx=out:json;responseHandler:${cbName}`;

      script.src = src;
      document.head.appendChild(script);
    });
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function cellValue(row, idx) {
    const c = row?.c?.[idx];
    return (c && c.v != null) ? String(c.v) : "";
  }

  function parsePriceToNumber(v) {
    const s = String(v || "").replace(/[^\d.]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  async function onNewGameClick() {
    newGameBtn.disabled = true;
    newGameBtn.style.display = "none";
    const oldText = newGameBtn.textContent;
    newGameBtn.textContent = "Loading...";

    try {
      const resp = await gvizJsonp(SPREADSHEET_ID, GID);
      if (!resp || resp.status !== "ok" || !resp.table) {
        throw new Error("Sheet 返回数据格式不正确（请确认表格对“任何拥有链接的人”可查看）");
      }

      const { cols, rows } = resp.table;

      const colIndex = {};
      (cols || []).forEach((c, i) => {
        const label = (c?.label || "").trim();
        if (label) colIndex[label] = i;
      });

      const idxSource = (COL_SOURCE in colIndex) ? colIndex[COL_SOURCE] : 1;
      const idxName = (COL_NAME in colIndex) ? colIndex[COL_NAME] : 2;
      const idxImage = (COL_IMAGE in colIndex) ? colIndex[COL_IMAGE] : 3;
      const idxPrice = (COL_PRICE in colIndex) ? colIndex[COL_PRICE] : -1;

      const validRows = (rows || []).filter(r => {
        const n = cellValue(r, idxName).trim();
        const im = cellValue(r, idxImage).trim();
        return n || im;
      });

      if (validRows.length === 0) throw new Error("Sheet 里没有可用数据行");

      const row = pickRandom(validRows);
      const source = cellValue(row, idxSource).trim();
      const name = cellValue(row, idxName).trim();
      const img = cellValue(row, idxImage).trim();

      const priceStr = idxPrice >= 0 ? cellValue(row, idxPrice).trim() : "";
      const price = parsePriceToNumber(priceStr);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("题库缺少有效价格：请在题库 sheet 添加「価格」列并填入数字价格");
      }

      if (source) sourceEl.textContent = source;

      nameEl.textContent = name || "";

      nameEl.classList.remove("is-long", "is-very-long");

      const len = (name || "").length;
      if (len >= 100) nameEl.classList.add("is-very-long");
      else if (len >= 60) nameEl.classList.add("is-long");

      if (img) {
        imgEl.src = img;
        imgEl.alt = name || "product image";
      }

      newGameBtn.textContent = "ニューゲーム";
      newGameBtn.disabled = false;
      newGameBtn.style.display = "none";


      document.dispatchEvent(new CustomEvent("pd:newgame", {
        detail: { source, name, img, price }
      }));
    } catch (err) {
      console.error(err);

      newGameBtn.style.display = "";
      newGameBtn.disabled = false;
      newGameBtn.textContent = oldText;

      alert(err?.message || "读取商品失败");
    }
  }

  newGameBtn.addEventListener("click", onNewGameClick, { once: false });
})();
