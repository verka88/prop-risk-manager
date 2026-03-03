// ===== Firebase CDN =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// ===== Your Firebase config =====
const firebaseConfig = {
  apiKey: "AIzaSyBo2yXF4Lg-BSTA034dxm8begvAvuO-7iw",
  authDomain: "prop-risk-tool.firebaseapp.com",
  projectId: "prop-risk-tool",
  storageBucket: "prop-risk-tool.firebasestorage.app",
  messagingSenderId: "205235413030",
  appId: "1:205235413030:web:8b7fb4ebc86a48e794c6e7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ===== Helpers =====
const $ = (id) => document.getElementById(id);

function on(id, ev, fn) {
  const el = $(id);
  if (!el) return;
  el.addEventListener(ev, fn);
}

// čísla aj s čiarkou + odstráni medzery
function n(id) {
  const el = $(id);
  if (!el) return 0;
  const raw = String(el.value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".");
  const num = parseFloat(raw);
  return Number.isFinite(num) ? num : 0;
}

function setVal(id, v) {
  const el = $(id);
  if (!el) return;
  el.value = String(v);
}

function fmt2(x) {
  return Number.isFinite(x) ? x.toFixed(2) : "-";
}

function fmtLots(x) {
  if (!Number.isFinite(x)) return "-";
  // max 3 decimals, trim zeros
  return x.toFixed(3).replace(/0+$/,"").replace(/\.$/,"");
}

function fmtPrice(x) {
  if (!Number.isFinite(x)) return "-";
  const ax = Math.abs(x);
  const d = ax >= 100 ? 2 : ax >= 1 ? 4 : 6;
  return x.toFixed(d).replace(".", ","); // UI friendly
}

function roundDownStep(value, step) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return 0;
  return Math.floor(value / step) * step;
}

function normKey(s) {
  // BTC usd / btc-usd / btc/usd -> BTCUSD
  return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// ===== State =====
let isPro = false;

// ===== Default symbols (FREE) =====
// valuePerUnit = EUR value per 1 unit at 1.0 lot
const baseSymbols = {
  "EURUSD": { unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
  "GBPUSD": { unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
  "EURGBP": { unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
  "USDJPY": { unitSize: 0.01,   valuePerUnit: 7.0, lotStep: 0.01 },
  "XAUUSD": { unitSize: 0.01,   valuePerUnit: 0.91, lotStep: 0.01 },
  "NAS100": { unitSize: 1,      valuePerUnit: 0.90, lotStep: 0.01 },
  "US30":   { unitSize: 1,      valuePerUnit: 0.90, lotStep: 0.01 },
  "DE40":   { unitSize: 1,      valuePerUnit: 1.00, lotStep: 0.01 },
  "BTCUSD": { unitSize: 1,      valuePerUnit: 0.90, lotStep: 0.001 },
  "ETHUSD": { unitSize: 0.1,    valuePerUnit: 0.09, lotStep: 0.01 },
};

function loadCustomSymbols() {
  try {
    const raw = localStorage.getItem("customSymbols");
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function saveCustomSymbols(obj) {
  localStorage.setItem("customSymbols", JSON.stringify(obj));
}

function getAllSymbols() {
  return { ...baseSymbols, ...loadCustomSymbols() };
}

// ===== Modal (Add Custom Symbol) =====
function openModal() {
  const bg = $("modalBg");
  if (!bg) return;

  // predvyplň názov zo search
  const s = $("symbolSearch") ? $("symbolSearch").value : "";
  const guessed = normKey(s);
  if ($("csName")) $("csName").value = guessed || "";

  $("customMsg").textContent = "";
  bg.style.display = "flex";
}

function closeModal() {
  const bg = $("modalBg");
  if (!bg) return;
  bg.style.display = "none";
}

function saveCustomSymbol() {
  const nameRaw = $("csName") ? $("csName").value : "";
  const name = normKey(nameRaw);

  const unitSize = n("csUnitSize");
  const valuePerUnit = n("csValuePerUnit");
  const lotStep = n("csLotStep") || 0.01;

  if (!name || name.length < 3) {
    $("customMsg").textContent = "❌ Please enter a valid symbol name (e.g. BTCUSD).";
    return;
  }
  if (!Number.isFinite(unitSize) || unitSize <= 0) {
    $("customMsg").textContent = "❌ Unit size must be > 0.";
    return;
  }
  if (!Number.isFinite(valuePerUnit) || valuePerUnit <= 0) {
    $("customMsg").textContent = "❌ Value per unit must be > 0.";
    return;
  }

  const custom = loadCustomSymbols();
  custom[name] = { unitSize, valuePerUnit, lotStep };

  saveCustomSymbols(custom);
  $("customMsg").textContent = `✅ Saved: ${name}`;

  populateSymbols($("symbolSearch") ? $("symbolSearch").value : "");
  // vyber novy symbol
  const sel = $("symbol");
  if (sel) sel.value = name;
  applySymbolDefaults(name);
  calculate();
}

// ===== Symbol UI =====
function populateSymbols(filterText = "") {
  const sel = $("symbol");
  if (!sel) return;

  const all = getAllSymbols();
  const keys = Object.keys(all).sort();

  const f = normKey(filterText);

  const current = sel.value;
  sel.innerHTML = "";

  keys
    .filter(k => !f || normKey(k).includes(f))
    .forEach(k => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      sel.appendChild(opt);
    });

  // fallback selection
  if (sel.options.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No matches";
    sel.appendChild(opt);
    return;
  }

  // keep current if possible
  const exists = Array.from(sel.options).some(o => o.value === current);
  sel.value = exists ? current : sel.options[0].value;
}

function applySymbolDefaults(sym) {
  const all = getAllSymbols();
  const cfg = all[sym];
  if (!cfg) return;

  // set inputs
  setVal("unitSize", String(cfg.unitSize).replace(".", ","));
  setVal("valuePerUnit", String(cfg.valuePerUnit).replace(".", ","));
  setVal("lotStep", String(cfg.lotStep).replace(".", ","));

  // label (units)
  const sl = $("slUnitsLabel");
  const tp = $("tpUnitsLabel");
  if (sl) sl.textContent = "SL (units)";
  if (tp) tp.textContent = "TP (units)";
}

// ===== PRO gating =====
function setProUI() {
  // discipline tab label
  const disc = $("disciplineModeBtn");
  if (disc) disc.textContent = isPro ? "Discipline (PRO)" : "Discipline (PRO 🔒)";

  // PRO controls disabled if not pro
  const proControls = $("proControls");
  if (proControls) {
    proControls.style.opacity = isPro ? "1" : "0.55";
    proControls.style.pointerEvents = isPro ? "auto" : "none";
  }

  // buttons
  const canTake = $("canTakeBtn");
  if (canTake) canTake.disabled = !isPro || isLocked();

  // lock status label
  applyLockUI();
}

// ===== Loss-streak lock (PRO) =====
function isLocked() {
  const until = localStorage.getItem("lockUntil");
  const t = until ? parseInt(until, 10) : 0;
  return t && Date.now() < t;
}

function triggerLock() {
  const cooldownMin = n("cooldownMin") || 120;
  const until = Date.now() + cooldownMin * 60000;
  localStorage.setItem("lockUntil", String(until));
  applyLockUI();
}

function resetLock() {
  localStorage.removeItem("lockUntil");
  applyLockUI();
}

function applyLockUI() {
  const locked = isLocked();
  const lockStatus = $("lockStatus");
  const hint = $("lockHint");

  if (lockStatus) {
    if (!isPro) {
      lockStatus.textContent = "Pro required";
      lockStatus.className = "warn";
    } else if (locked) {
      lockStatus.textContent = "LOCKED ❌";
      lockStatus.className = "bad";
    } else {
      lockStatus.textContent = "Unlocked ✅";
      lockStatus.className = "ok";
    }
  }

  if (hint) {
    if (!isPro) {
      hint.textContent = "Login to unlock loss-streak protection.";
    } else if (locked) {
      const until = parseInt(localStorage.getItem("lockUntil") || "0", 10);
      const mins = Math.max(0, Math.ceil((until - Date.now()) / 60000));
      hint.textContent = `Cooldown active: ~${mins} min remaining.`;
    } else {
      hint.textContent = "After max streak → locks buttons for cooldown minutes.";
    }
  }

  const calcBtn = $("calcBtn");
  if (calcBtn) calcBtn.disabled = locked;

  const canTakeBtn = $("canTakeBtn");
  if (canTakeBtn) canTakeBtn.disabled = !isPro || locked;

  // Presets disabled if not pro
  ["presetChallenge10K","presetChallenge25K","presetChallenge50K","presetChallenge100K"].forEach(id => {
    const el = $(id);
    if (el) el.disabled = !isPro;
  });

  // streak buttons disabled if not pro
  ["winBtn","lossBtn","resetLockBtn"].forEach(id => {
    const el = $(id);
    if (el) el.disabled = !isPro;
  });
}

// ===== Calculator =====
function calculate() {
  if (isLocked()) return;

  const all = getAllSymbols();
  const sym = $("symbol") ? $("symbol").value : "EURUSD";
  const cfg = all[sym] || { unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 };

  const balance = n("balance");
  const riskPct = n("riskPct");
  const entry = n("entry");

  const slUnits = n("slUnits");
  const tpUnitsRaw = ($("tpUnits") ? String($("tpUnits").value || "").trim() : "");
  const tpUnits = tpUnitsRaw ? n("tpUnits") : 0;

  const rr = n("rr") || 2;
  const tpBuffer = n("tpBuffer");

  const unitSize = n("unitSize") || cfg.unitSize;
  const valuePerUnit = n("valuePerUnit") || cfg.valuePerUnit;
  const lotStep = n("lotStep") || cfg.lotStep;

  const dir = $("direction") ? $("direction").value : "LONG";

  const riskMoney = balance * (riskPct / 100);
  const lossPerLot = slUnits * valuePerUnit;

  const lotsRaw = lossPerLot > 0 ? riskMoney / lossPerLot : 0;
  const lots = roundDownStep(lotsRaw, lotStep);

  const slDistPrice = slUnits * unitSize;

  // TP distance: if empty -> RR * SL
  const tpUnitsUsed = tpUnitsRaw ? tpUnits : (slUnits * rr);
  const tpDistPrice = tpUnitsUsed * unitSize;

  const slPrice = dir === "LONG" ? (entry - slDistPrice) : (entry + slDistPrice);
  let tpPrice = dir === "LONG" ? (entry + tpDistPrice) : (entry - tpDistPrice);

  // buffer adjustment (optional)
  if (tpBuffer) {
    tpPrice = dir === "LONG" ? (tpPrice - tpBuffer) : (tpPrice + tpBuffer);
  }

  if ($("riskOut")) $("riskOut").textContent = fmt2(riskMoney).replace(".", ",");
  if ($("lossPerLotOut")) $("lossPerLotOut").textContent = fmt2(lossPerLot).replace(".", ",");
  if ($("lotsOut")) $("lotsOut").textContent = fmtLots(lots).replace(".", ",");

  if ($("slUnitsOut")) $("slUnitsOut").textContent = String(slUnits).replace(".", ",");
  if ($("tpUnitsOut")) $("tpUnitsOut").textContent = String(tpUnitsUsed).replace(".", ",");

  if ($("slPriceOut")) $("slPriceOut").textContent = fmtPrice(slPrice);
  if ($("tpPriceOut")) $("tpPriceOut").textContent = fmtPrice(tpPrice);

  if ($("clickStatus")) $("clickStatus").textContent = `Calculated ✅ (${sym})`;

  // run engine if pro
  runChallengeEngine(riskMoney);
}

// ===== Challenge Engine (PRO) =====
function runChallengeEngine(riskMoney) {
  if (!isPro) {
    if ($("remainingDailyOut")) $("remainingDailyOut").textContent = "-";
    if ($("remainingOverallOut")) $("remainingOverallOut").textContent = "-";
    if ($("tradeStatusOut")) $("tradeStatusOut").textContent = "-";
    if ($("decisionOut")) $("decisionOut").textContent = "FREE mode";
    return;
  }

  const acc = n("accountSize");
  const dailyPct = n("dailyLossPct");
  const maxPct = n("maxLossPct");
  const totalPnL = n("totalPnL");
  const todayPnl = n("todayPnl");

  // simple rules
  const dailyLimit = acc * (dailyPct / 100);
  const maxLimit = acc * (maxPct / 100);

  const remainingDaily = dailyLimit + todayPnl;
  const remainingOverall = maxLimit + totalPnL;

  if ($("remainingDailyOut")) $("remainingDailyOut").textContent = fmt2(remainingDaily).replace(".", ",");
  if ($("remainingOverallOut")) $("remainingOverallOut").textContent = fmt2(remainingOverall).replace(".", ",");

  let status = "OK ✅";
  if (riskMoney > remainingDaily) status = "BLOCKED — breaks Daily Rule ❌";
  else if (riskMoney > remainingOverall) status = "BLOCKED — breaks Overall Rule ❌";

  if ($("tradeStatusOut")) $("tradeStatusOut").textContent = status;
  if ($("decisionOut")) $("decisionOut").textContent = status;
}

// ===== Can I take this trade (PRO) =====
function canTakeTrade() {
  if (!isPro) {
    alert("PRO required: login to unlock.");
    return;
  }
  if (isLocked()) {
    alert("Locked by loss-streak rule. Wait cooldown or reset lock.");
    return;
  }
  calculate();
}

// ===== Presets (PRO) =====
function applyPreset(size) {
  if (!isPro) return alert("PRO required: login to unlock.");
  setVal("accountSize", String(size).replace(".", ","));
  setVal("dailyLossPct", "5");
  setVal("maxLossPct", "10");
  calculate();
}

// ===== Login wiring =====
function wireLogin() {
  on("signUpBtn", "click", async () => {
    try {
      const email = ($("email")?.value || "").trim();
      const pass = $("password")?.value || "";
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      alert(e.message);
    }
  });

  on("signInBtn", "click", async () => {
    try {
      const email = ($("email")?.value || "").trim();
      const pass = $("password")?.value || "";
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      alert(e.message);
    }
  });

  on("signOutBtn", "click", async () => {
    try {
      await signOut(auth);
    } catch (e) {
      alert(e.message);
    }
  });

  onAuthStateChanged(auth, (user) => {
    isPro = !!user;
    if ($("userStatus")) {
      $("userStatus").textContent = user ? `Signed in: ${user.email} (PRO unlocked)` : "Not signed in (FREE mode)";
    }
    setProUI();
    calculate();
  });
}

// ===== Mode buttons (UI only) =====
function wireModes() {
  on("quickModeBtn", "click", () => {
    $("quickModeBtn")?.classList.add("active");
    $("disciplineModeBtn")?.classList.remove("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  on("disciplineModeBtn", "click", () => {
    if (!isPro) {
      alert("PRO required: login to unlock Discipline features.");
      return;
    }
    $("disciplineModeBtn")?.classList.add("active");
    $("quickModeBtn")?.classList.remove("active");
    $("proCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// ===== UI wiring =====
function wireUI() {
  // Symbol search
  on("symbolSearch", "input", () => {
    populateSymbols($("symbolSearch")?.value || "");
  });

  on("symbol", "change", () => {
    applySymbolDefaults($("symbol")?.value || "");
    calculate();
  });

  // Modal buttons
  on("addCustomBtn", "click", openModal);
  on("closeModalBtn", "click", closeModal);
  on("saveCustomBtn", "click", saveCustomSymbol);

  // close modal on background click
  on("modalBg", "click", (e) => {
    if (e.target && e.target.id === "modalBg") closeModal();
  });

  // Calc + canTake
  on("calcBtn", "click", calculate);
  on("canTakeBtn", "click", canTakeTrade);

  // Auto calculate on key inputs (FREE)
  [
    "balance","riskPct","entry","direction","rr","tpBuffer",
    "slUnits","tpUnits","unitSize","valuePerUnit","lotStep"
  ].forEach(id => on(id, "input", () => calculate()));

  // PRO engine inputs
  ["accountSize","dailyLossPct","maxLossPct","todayPnl","totalPnL"].forEach(id => on(id, "input", () => calculate()));

  // Presets
  on("presetChallenge10K", "click", () => applyPreset(10000));
  on("presetChallenge25K", "click", () => applyPreset(25000));
  on("presetChallenge50K", "click", () => applyPreset(50000));
  on("presetChallenge100K", "click", () => applyPreset(100000));

  // Loss-streak buttons
  on("lossBtn", "click", () => {
    if (!isPro) return alert("PRO required: login to unlock.");
    const cur = parseInt(String($("streakNow")?.value || "0"), 10) || 0;
    const next = cur + 1;
    setVal("streakNow", String(next));
    const maxS = n("maxStreak") || 3;
    if (next >= maxS) triggerLock();
    applyLockUI();
  });

  on("winBtn", "click", () => {
    if (!isPro) return alert("PRO required: login to unlock.");
    setVal("streakNow", "0");
    applyLockUI();
  });

  on("resetLockBtn", "click", () => {
    if (!isPro) return alert("PRO required: login to unlock.");
    resetLock();
  });
}

// ===== Boot =====
document.addEventListener("DOMContentLoaded", () => {
  // Populate symbols first
  populateSymbols("");
  // Set defaults for selected
  const first = $("symbol")?.value || "EURUSD";
  applySymbolDefaults(first);

  // Wire everything
  wireModes();
  wireLogin();
  wireUI();

  // Initial UI state
  setProUI();
  calculate();
});
