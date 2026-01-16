
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
