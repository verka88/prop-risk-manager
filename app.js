// Pro Challenge Risk Tool (FREE, stable, null-safe)

const $ = (id) => document.getElementById(id);
const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };

function parseNum(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim().replace(/\s+/g, "").replace(",", ".");
  const num = parseFloat(s);
  return Number.isFinite(num) ? num : 0;
}
function n(id) { const el = $(id); return el ? parseNum(el.value) : 0; }

function fmt2(x) { return Number.isFinite(x) ? x.toFixed(2) : "-"; }
function fmtLots(x) {
  if (!Number.isFinite(x) || x <= 0) return "-";
  const s = x.toFixed(3);
  return s.replace(/0+$/,"").replace(/\.$/,"");
}
function fmtPrice(x) {
  if (!Number.isFinite(x)) return "-";
  const ax = Math.abs(x);
  const d = ax >= 100 ? 2 : ax >= 1 ? 4 : 6;
  return x.toFixed(d);
}
function roundDownStep(value, step) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return 0;
  return Math.floor(value / step) * step;
}

/* ---------------- Symbols (built-in + custom) ---------------- */

const BUILT_IN = {
  "EURUSD": { unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01, unitLabel:"pips" },
  "GBPUSD": { unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01, unitLabel:"pips" },
  "USDJPY": { unitSize:0.01,   valuePerUnit:7.0, lotStep:0.01, unitLabel:"pips" },
  "XAUUSD": { unitSize:0.01,   valuePerUnit:0.91, lotStep:0.01, unitLabel:"ticks" },
  "BTCUSD": { unitSize:1,      valuePerUnit:0.90, lotStep:0.001, unitLabel:"ticks" },
  "ETHUSD": { unitSize:0.1,    valuePerUnit:0.09, lotStep:0.01, unitLabel:"ticks" },
  "NAS100": { unitSize:1,      valuePerUnit:0.90, lotStep:0.01, unitLabel:"points" },
  "US30":   { unitSize:1,      valuePerUnit:0.90, lotStep:0.01, unitLabel:"points" },
};

const LS_KEY = "customSymbols_v1";

function loadCustomSymbols() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return (obj && typeof obj === "object") ? obj : {};
  } catch {
    return {};
  }
}
function saveCustomSymbols(obj) {
  localStorage.setItem(LS_KEY, JSON.stringify(obj));
}

function getAllSymbols() {
  return { ...BUILT_IN, ...loadCustomSymbols() };
}

function populateSymbols(filterText = "") {
  const sel = $("symbol");
  if (!sel) return;

  const all = getAllSymbols();
  const keys = Object.keys(all).sort((a,b)=>a.localeCompare(b));

  const f = String(filterText || "").trim().toUpperCase();

  sel.innerHTML = "";
  keys
    .filter(k => !f || k.includes(f))
    .forEach(k => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      sel.appendChild(opt);
    });

  // keep selection if still exists
  if (sel.options.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No matches";
    sel.appendChild(opt);
    applySymbolDefaults(null);
    return;
  }

  // select first if nothing selected
  if (!sel.value || sel.value === "No matches") sel.value = sel.options[0].value;
  applySymbolDefaults(sel.value);
}

function applySymbolDefaults(sym) {
  const all = getAllSymbols();
  const cfg = sym ? all[sym] : null;

  if (!cfg) return;

  if ($("unitSize")) $("unitSize").value = String(cfg.unitSize).replace(".", ",");
  if ($("valuePerUnit")) $("valuePerUnit").value = String(cfg.valuePerUnit).replace(".", ",");
  if ($("lotStep")) $("lotStep").value = String(cfg.lotStep).replace(".", ",");
  if ($("slUnitsLabel")) $("slUnitsLabel").textContent = `SL (${cfg.unitLabel || "units"})`;
  if ($("tpUnitsLabel")) $("tpUnitsLabel").textContent = `TP (${cfg.unitLabel || "units"})`;
}

/* ---------------- Loss-streak lock ---------------- */

function lockUntilMs() {
  const v = localStorage.getItem("lockUntilMs");
  const ms = v ? parseInt(v, 10) : 0;
  return Number.isFinite(ms) ? ms : 0;
}
function isLocked() {
  const until = lockUntilMs();
  return until > Date.now();
}
function setLock(minutes) {
  const until = Date.now() + (minutes * 60_000);
  localStorage.setItem("lockUntilMs", String(until));
}
function clearLock() {
  localStorage.removeItem("lockUntilMs");
}

function refreshLockUI() {
  const locked = isLocked();
  const lockEl = $("lockStatus");
  const hintEl = $("lockHint");

  if (lockEl) {
    if (locked) {
      lockEl.textContent = "LOCKED ❌";
      lockEl.className = "bad";
    } else {
      lockEl.textContent = "Unlocked ✅";
      lockEl.className = "ok";
    }
  }

  if (hintEl) {
    if (locked) {
      const leftMs = Math.max(0, lockUntilMs() - Date.now());
      const leftMin = Math.ceil(leftMs / 60000);
      hintEl.textContent = `Cooldown left: ~${leftMin} min`;
    } else {
      hintEl.textContent = "";
    }
  }

  const calcBtn = $("calcBtn");
  const canTakeBtn = $("canTakeBtn");
  if (calcBtn) calcBtn.disabled = locked;
  if (canTakeBtn) canTakeBtn.disabled = locked;
}

/* ---------------- Challenge Engine ---------------- */

function runChallengeEngine(riskMoney) {
  const accountSize = n("accountSize");
  const dailyLossPct = n("dailyLossPct");
  const maxLossPct = n("maxLossPct");
  const todayPnl = n("todayPnl");
  const totalPnL = n("totalPnL");

  // simple MVP
  const equity = accountSize + totalPnL;
  const dailyLimit = equity * (dailyLossPct / 100);
  const overallLimit = accountSize * (maxLossPct / 100);

  const remainingDaily = dailyLimit + todayPnl;
  const remainingOverall = overallLimit + totalPnL;

  if ($("remainingDailyOut")) $("remainingDailyOut").textContent = fmt2(remainingDaily);
  if ($("remainingOverallOut")) $("remainingOverallOut").textContent = fmt2(remainingOverall);

  let status = "OK ✅";
  if (riskMoney > remainingDaily) status = "BLOCKED — Daily rule ❌";
  else if (riskMoney > remainingOverall) status = "BLOCKED — Overall rule ❌";

  if ($("tradeStatusOut")) $("tradeStatusOut").textContent = status;
  return { status, remainingDaily, remainingOverall };
}

/* ---------------- Calculator ---------------- */

function calculate() {
  if (isLocked()) {
    if ($("clickStatus")) $("clickStatus").textContent = "Locked by loss-streak rule.";
    return null;
  }

  const balance = n("balance");
  const riskPct = n("riskPct");
  const entry = n("entry");
  const slUnits = n("slUnits");
  const tpUnitsRaw = parseNum($("tpUnits") ? $("tpUnits").value : "0");
  const rr = n("rr") || 2;
  const tpBuffer = n("tpBuffer");

  const unitSize = n("unitSize");
  const valuePerUnit = n("valuePerUnit");
  const lotStep = n("lotStep") || 0.01;
  const dir = $("direction") ? $("direction").value : "LONG";

  const riskMoney = balance * (riskPct / 100);
  const lossPerLot = slUnits * valuePerUnit;
  const lotsRaw = (lossPerLot > 0) ? (riskMoney / lossPerLot) : 0;
  const lots = roundDownStep(lotsRaw, lotStep);

  const slDistPrice = slUnits * unitSize;

  // TP units: if empty/0 -> from RR
  const tpUnits = (tpUnitsRaw && tpUnitsRaw > 0) ? tpUnitsRaw : (slUnits * rr);
  const tpDistPrice = tpUnits * unitSize;

  const slPrice = (dir === "LONG") ? (entry - slDistPrice) : (entry + slDistPrice);
  let tpPrice = (dir === "LONG") ? (entry + tpDistPrice) : (entry - tpDistPrice);

  // buffer (price)
  if (tpBuffer && tpBuffer !== 0) {
    tpPrice = (dir === "LONG") ? (tpPrice - tpBuffer) : (tpPrice + tpBuffer);
  }

  if ($("riskOut")) $("riskOut").textContent = fmt2(riskMoney);
  if ($("lossPerLotOut")) $("lossPerLotOut").textContent = fmt2(lossPerLot);
  if ($("lotsOut")) $("lotsOut").textContent = fmtLots(lots);

  if ($("slUnitsOut")) $("slUnitsOut").textContent = String(slUnits);
  if ($("tpUnitsOut")) $("tpUnitsOut").textContent = String(tpUnits);

  if ($("slPriceOut")) $("slPriceOut").textContent = fmtPrice(slPrice);
  if ($("tpPriceOut")) $("tpPriceOut").textContent = fmtPrice(tpPrice);

  const sym = $("symbol") ? $("symbol").value : "";
  if ($("clickStatus")) $("clickStatus").textContent = sym ? `Calculated ✅ (${sym})` : "Calculated ✅";

  const engine = runChallengeEngine(riskMoney);

  return { riskMoney, lots, lossPerLot, slUnits, tpUnits, slPrice, tpPrice, engine };
}

function canTakeTrade() {
  if (isLocked()) {
    if ($("decisionOut")) $("decisionOut").textContent = "NO — Locked by loss-streak ❌";
    alert("Locked by loss-streak rule.");
    return;
  }
  const r = calculate();
  if (!r) return;

  const status = r.engine?.status || "OK ✅";
  const ok = status.startsWith("OK");

  if ($("decisionOut")) $("decisionOut").textContent = ok ? "YES ✅" : "NO ❌";
  if (!ok) alert(status);
}

/* ---------------- Presets ---------------- */

function applyChallengePreset(size) {
  if ($("accountSize")) $("accountSize").value = String(size);
  if ($("dailyLossPct")) $("dailyLossPct").value = "5";
  if ($("maxLossPct")) $("maxLossPct").value = "10";
  calculate();
}

/* ---------------- Custom symbol modal ---------------- */

function openModal() {
  const back = $("modalBack");
  if (back) back.style.display = "flex";

  const sel = $("symbol");
  const selected = sel ? sel.value : "";
  const custom = loadCustomSymbols();
  const cfg = custom[selected];

  if ($("modalHint")) {
    $("modalHint").textContent = cfg
      ? `Selected custom: ${selected} (you can delete it)`
      : "Fill values and save. Name will be uppercased.";
  }
}

function closeModal() {
  const back = $("modalBack");
  if (back) back.style.display = "none";
}

function saveCustomSymbol() {
  const name = ($("csName") ? $("csName").value : "").trim().toUpperCase().replace(/\s+/g,"");
  if (!name) { alert("Enter symbol name."); return; }

  const unitSize = parseNum($("csUnitSize") ? $("csUnitSize").value : "0");
  const vpu = parseNum($("csValuePerUnit") ? $("csValuePerUnit").value : "0");
  const lotStep = parseNum($("csLotStep") ? $("csLotStep").value : "0.01");
  const unitLabel = ($("csUnitLabel") ? $("csUnitLabel").value : "").trim() || "units";

  if (!(unitSize > 0) || !(vpu > 0) || !(lotStep > 0)) {
    alert("Unit size, value per unit and lot step must be > 0.");
    return;
  }

  const custom = loadCustomSymbols();
  custom[name] = { unitSize, valuePerUnit: vpu, lotStep, unitLabel };
  saveCustomSymbols(custom);

  // refresh list and select it
  populateSymbols($("symbolSearch") ? $("symbolSearch").value : "");
  const sel = $("symbol");
  if (sel) sel.value = name;
  applySymbolDefaults(name);

  closeModal();
  calculate();
}

function deleteSelectedCustom() {
  const sel = $("symbol");
  const selected = sel ? sel.value : "";
  if (!selected) return;

  const custom = loadCustomSymbols();
  if (!custom[selected]) {
    alert("Selected symbol is not custom.");
    return;
  }

  if (!confirm(`Delete custom symbol: ${selected}?`)) return;

  delete custom[selected];
  saveCustomSymbols(custom);

  populateSymbols($("symbolSearch") ? $("symbolSearch").value : "");
  closeModal();
  calculate();
}

/* ---------------- Wire UI safely ---------------- */

function wireUI() {
  // Mode buttons (UI only)
  on("quickModeBtn", "click", () => {
    $("quickModeBtn")?.classList.add("active");
    $("disciplineModeBtn")?.classList.remove("active");
  });
  on("disciplineModeBtn", "click", () => {
    $("disciplineModeBtn")?.classList.add("active");
    $("quickModeBtn")?.classList.remove("active");
  });

  // Symbols
  populateSymbols("");
  on("symbolSearch", "input", () => populateSymbols($("symbolSearch").value));
  on("symbol", "change", () => { applySymbolDefaults($("symbol").value); calculate(); });

  // Buttons
  on("calcBtn", "click", () => calculate());
  on("canTakeBtn", "click", () => canTakeTrade());

  // Auto-calc
  const autoIds = [
    "balance","riskPct","entry","slUnits","tpUnits","rr","tpBuffer",
    "unitSize","valuePerUnit","lotStep","direction",
    "accountSize","dailyLossPct","maxLossPct","todayPnl","totalPnL"
  ];
  autoIds.forEach(id => on(id, "input", () => calculate()));

  // Lock buttons
  on("lossBtn","click", () => {
    const sEl = $("streakNow");
    const cur = sEl ? parseInt(sEl.value || "0", 10) : 0;
    const next = Number.isFinite(cur) ? cur + 1 : 1;
    if (sEl) sEl.value = String(next);

    const maxS = n("maxStreak") || 3;
    if (next >= maxS) {
      const cd = n("cooldownMin") || 120;
      setLock(cd);
    }
    refreshLockUI();
    calculate();
  });

  on("winBtn","click", () => {
    if ($("streakNow")) $("streakNow").value = "0";
    refreshLockUI();
    calculate();
  });

  on("resetLockBtn","click", () => {
    clearLock();
    refreshLockUI();
    calculate();
  });

  // Presets
  on("presetChallenge10K","click", () => applyChallengePreset(10000));
  on("presetChallenge25K","click", () => applyChallengePreset(25000));
  on("presetChallenge50K","click", () => applyChallengePreset(50000));
  on("presetChallenge100K","click", () => applyChallengePreset(100000));

  // Modal
  on("addCustomBtn", "click", () => openModal());
  on("closeModalBtn", "click", () => closeModal());
  on("cancelCustomBtn", "click", () => closeModal());
  on("saveCustomBtn", "click", () => saveCustomSymbol());
  on("deleteCustomBtn", "click", () => deleteSelectedCustom());

  // Close modal on background click
  on("modalBack", "click", (e) => {
    if (e.target && e.target.id === "modalBack") closeModal();
  });

  refreshLockUI();
  calculate();
}

// Hard safety: never die silently
window.addEventListener("error", (e) => {
  console.log("JS ERROR:", e?.message || e);
});

document.addEventListener("DOMContentLoaded", () => {
  try {
    wireUI();
  } catch (e) {
    console.log("BOOT ERROR:", e);
    alert("App boot error. Open Console for details.");
  }
});
