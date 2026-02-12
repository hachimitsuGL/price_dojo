
(() => {
  const priceInput = document.querySelector(".input-price");
  const pad = document.querySelector(".input-buttons");
  if (!priceInput || !pad) return;

  const MAX_DIGITS = 12;

  function onlyDigits(str) {
    return String(str ?? "").replace(/[^\d]/g, "");
  }

  function setValue(next) {
    const clean = onlyDigits(next).slice(0, MAX_DIGITS);
    priceInput.value = clean;

    try {
      priceInput.focus({ preventScroll: true });
      priceInput.setSelectionRange(clean.length, clean.length);
    } catch (_) {}
  }

  function appendDigit(d) {
    if (priceInput.disabled) return;

    let cur = onlyDigits(priceInput.value);

    if (cur.length >= MAX_DIGITS) return;

    if (cur === "0") cur = "";

    setValue(cur + d);
  }

  function clearAll() {
    if (priceInput.disabled) return;
    setValue("");
  }

  pad.addEventListener("click", (e) => {
    const btn = e.target.closest("button.input-button");
    if (!btn || !pad.contains(btn)) return;

    const role = btn.dataset.role || "";

    if (role === "input-c") {
      clearAll();
      return;
    }

    const m = role.match(/^input-(\d)$/);
    if (m) {
      appendDigit(m[1]);
    }
  });

  priceInput.addEventListener("input", () => {
    setValue(priceInput.value);
  });

  priceInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.querySelector('[data-role="commit"]')?.click();
    }
  });
})();

/* ----- ゲーム説明（illustrate）モーダル ----- */
(() => {
  const illustrateBtn = document.querySelector('[data-role="illustrate"]');
  if (!illustrateBtn) return;

  // 既に存在する場合は二重生成しない
  if (document.querySelector('[data-pd-illustrate-backdrop]')) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('data-pd-illustrate-backdrop', 'true');
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="game instructions dialog">
      <div class="modal-header">
        <div class="modal-title">ゲーム説明</div>
        <button class="modal-close" type="button" aria-label="close">✕</button>
      </div>

      <div style="font-size:14px; line-height:1.7;">
        <p style="margin-bottom:10px;">
          これは商品の価格を当てるゲームです。各ラウンドではランダムに選ばれた商品が表示され、制限時間内にその価格を予想します。
        </p>
        <ul style="padding-left:18px; margin:0;">
          <li>価格を入力して「提出」をクリックすると送信されます。</li>
          <li>予想の精度が高いほど獲得できるポイントが増え、それによってランクが上がります。</li>
          <li>ランクが高くなるほどポイントは増えにくくなり、さらに予想に使える制限時間も短くなります。</li>
          <li>ログインすると成績とランキングが保存されます。</li>
        </ul>
      </div>

      <div class="actions" style="margin-top:14px;">
        <button class="btn primary" type="button" data-ill-ok>OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const closeBtn = backdrop.querySelector('.modal-close');
  const okBtn = backdrop.querySelector('[data-ill-ok]');

  function open() {
    backdrop.classList.add('is-open');
  }
  function close() {
    backdrop.classList.remove('is-open');
  }

  illustrateBtn.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  okBtn?.addEventListener('click', close);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdrop.classList.contains('is-open')) close();
  });
})();
