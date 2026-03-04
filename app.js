// ===== Firebase CDN =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

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

function parseNum(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim().replace(/\s+/g, "").replace(",", ".");
  const num = parseFloat(s);
  return Number.isFinite(num) ? num : 0;
}

function n(id) {
  const el = $(id);
  if (!el) return 0;
  return parseNum(el.value);
}

function fmt2(x) { return Number.isFinite(x) ? x.toFixed(2) : "-"; }

function fmtLots(x) {
  if (!Number.isFinite(x) || x <= 0) return "-";
  // show up to 3 decimals but trim zeros
  return x.toFixed(3).replace(/0+$/,"").replace(/\.$/,"");
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

function on(id, event, fn) {
  const el = $(id);
  if (!el) return;
  el.addEventListener(event, fn);
}

function normalizeSymbolInput(s) {
  return String(s || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ""); // removes spaces, /, -, etc.
}

// ===== Global State =====
let isPro = false;

// ===== Default symbols (editable defaults) =====
const defaultSymbols = {
  // FX
  EURUSD: { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  GBPUSD: { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  AUDUSD: { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  NZDUSD: { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  USDCAD: { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  USDCHF: { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },

  // JPY
  USDJPY: { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },
  EURJPY: { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },
  GBPJPY: { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },

  // Metals
  XAUUSD: { asset:"Metals", unitName:"ticks", unitSize:0.01, valuePerUnit:1.0, lotStep:0.01 },
  XAGUSD: { asset:"Metals", unitName:"ticks", unitSize:0.01, valuePerUnit:0.5, lotStep:0.01 },

  // Indices
  NAS100: { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  US30:   { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  SPX500: { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  GER40:  { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },

  // Crypto
  BTCUSD: { asset:"Crypto", unitName:"ticks", unitSize:1, valuePerUnit:1.0, lotStep:0.001 },
  ETHUSD: { asset:"Crypto", unitName:"ticks", unitSize:0.1, valuePerUnit:0.1, lotStep:0.001 },
  SOLUSD: { asset:"Crypto", unitName:"ticks", unitSize:0.01, valuePerUnit:0.01, lotStep:0.001 },
  XRPUSD: { asset:"Crypto", unitName:"ticks", unitSize:0.0001, valuePerUnit:0.0001, lotStep:0.001 },
};

// custom symbols persisted
const CUSTOM_KEY = "prtool_customSymbols_v1";

function loadCustomSymbols() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return (obj && typeof obj === "object") ? obj : {};
  } catch {
    return {};
  }
}

function saveCustomSymbols(custom) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
}

let customSymbols = loadCustomSymbols();

function allSymbols() {
  return { ...defaultSymbols, ...customSymbols };
}

function populateSymbols(filterText = "") {
  const sel = $("symbol");
  if (!sel) return;

  const prev = sel.value || "EURUSD";
  const f = normalizeSymbolInput(filterText);

  const symObj = allSymbols();
  const keys = Object.keys(symObj).sort();

  sel.innerHTML = "";

  keys
    .filter(k => (f ? k.includes(f) : true))
    .forEach(k => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = `${k} (${symObj[k].asset || "Custom"})`;
      sel.appendChild(opt);
    });

  // keep selection if still available
  const still = [...sel.options].some(o => o.value === prev);
  sel.value = still ? prev : (sel.options[0]?.value || "EURUSD");

  applySymbolDefaults(sel.value);
}

function applySymbolDefaults(sym) {
  const symObj = allSymbols();
  const cfg = symObj[sym];
  if (!cfg) return;

  // labels
  const slLab = $("slUnitsLabel");
  const tpLab = $("tpUnitsLabel");
  const slBufLab = $("slBufferLabel");
  const tpBufLab = $("tpBufferLabel");

  if (slLab) slLab.textContent = `SL (${cfg.unitName || "units"})`;
  if (tpLab) tpLab.textContent = `TP (${cfg.unitName || "units"})`;
  if (slBufLab) slBufLab.textContent = `SL Buffer (${cfg.unitName || "units"})`;
  if (tpBufLab) tpBufLab.textContent = `TP Buffer (${cfg.unitName || "units"})`;

  // defaults (editable)
  if ($("unitSize")) $("unitSize").value = String(cfg.unitSize ?? 0).replace(".", ",");
  if ($("valuePerUnit")) $("valuePerUnit").value = String(cfg.valuePerUnit ?? 0).replace(".", ",");
  if ($("lotStep")) $("lotStep").value = String(cfg.lotStep ?? 0.01).replace(".", ",");
}

// ===== Pro gating UI =====
function setProUI() {
  const proControls = $("proControls");
  if (proControls) {
    proControls.style.opacity = isPro ? "1" : "0.55";
    proControls.style.pointerEvents = isPro ? "auto" : "none";
  }

  const discBtn = $("disciplineModeBtn");
  if (discBtn) discBtn.textContent = isPro ? "Discipline" : "Discipline 🔒";

  // pro-only buttons
  ["canTakeBtn","winBtn","lossBtn","resetLockBtn",
   "presetChallenge10K","presetChallenge25K","presetChallenge50K","presetChallenge100K"
  ].forEach(id => {
    const b = $(id);
    if (b) b.disabled = !isPro || (id === "canTakeBtn" ? isLocked() : false);
  });

  applyLockUI();
}

// ===== Loss streak lock (PRO only) =====
const LOCK_KEY = "prtool_lockUntil_v1";

function isLocked() {
  const until = localStorage.getItem(LOCK_KEY);
  if (!until) return false;
  const t = parseInt(until, 10);
  return Number.isFinite(t) && Date.now() < t;
}

function applyLockUI() {
  const lockStatus = $("lockStatus");
  const lockHint = $("lockHint");

  if (!isPro) {
    if (lockStatus) { lockStatus.textContent = "Pro required"; lockStatus.className = "warn"; }
    if (lockHint) lockHint.textContent = "Login to unlock loss-streak lock.";
    return;
  }

  const locked = isLocked();
  if (lockStatus) {
    lockStatus.textContent = locked ? "LOCKED ❌" : "Unlocked ✅";
    lockStatus.className = locked ? "bad" : "ok";
  }

  if (lockHint) {
    if (!locked) lockHint.textContent = "";
    else {
      const until = parseInt(localStorage.getItem(LOCK_KEY) || "0", 10);
      const mins = Math.max(0, Math.ceil((until - Date.now()) / 60000));
      lockHint.textContent = `Cooldown active: ~${mins} min left`;
    }
  }

  // lock affects only PRO actions, not Calculate
  const canTake = $("canTakeBtn");
  if (canTake) canTake.disabled = locked || !isPro;
}

function triggerLock() {
  if (!isPro) return;
  const cooldownMin = n("cooldownMin") || 120;
  const until = Date.now() + cooldownMin * 60000;
  localStorage.setItem(LOCK_KEY, String(until));
  applyLockUI();
  setProUI();
}

function resetLock() {
  localStorage.removeItem(LOCK_KEY);
  applyLockUI();
  setProUI();
}

// ===== Challenge Engine (PRO) =====
function runChallengeEngine(riskMoney) {
  if (!isPro) {
    if ($("remainingDailyOut")) $("remainingDailyOut").textContent = "-";
    if ($("remainingOverallOut")) $("remainingOverallOut").textContent = "-";
    if ($("tradeStatusOut")) $("tradeStatusOut").textContent = "-";
    return { ok: true, status: "FREE" };
  }

  const acc = n("accountSize");
  const dailyPct = n("dailyLossPct");
  const maxPct = n("maxLossPct");
  const totalPnL = n("totalPnL");
  const todayPnl = n("todayPnl");

  const dailyLimit = acc * (dailyPct / 100);
  const overallLimit = acc * (maxPct / 100);

  const remainingDaily = dailyLimit + todayPnl;
  const remainingOverall = overallLimit + totalPnL;

  if ($("remainingDailyOut")) $("remainingDailyOut").textContent = fmt2(remainingDaily);
  if ($("remainingOverallOut")) $("remainingOverallOut").textContent = fmt2(remainingOverall);

  let status = "OK ✅";
  let ok = true;

  if (riskMoney > remainingDaily) { status = "BLOCK — Daily ❌"; ok = false; }
  else if (riskMoney > remainingOverall) { status = "BLOCK — Overall ❌"; ok = false; }

  if ($("tradeStatusOut")) $("tradeStatusOut").textContent = status;
  return { ok, status, remainingDaily, remainingOverall };
}

// ===== Calculator =====
function calculate() {
  const sym = $("symbol")?.value || "EURUSD";
  const cfg = allSymbols()[sym] || {};

  const balance = n("balance");
  const riskPct = n("riskPct");
  const entry = n("entry");

  const slZone = n("slUnits");
  const tpZone = parseNum(($("tpUnits")?.value || "").trim()); // can be empty -> NaN -> handled below
  const slBuffer = n("slBuffer");
  const tpBuffer = n("tpBuffer");

  const rr = n("rr") || 2;

  const unitSize = n("unitSize") || cfg.unitSize || 0;
  const valuePerUnit = n("valuePerUnit") || cfg.valuePerUnit || 0;
  const lotStep = n("lotStep") || cfg.lotStep || 0.01;

  const dir = $("direction")?.value || "LONG";

  const slUnitsReal = Math.max(0, slZone + slBuffer);

  // TP: if input empty => use RR
  const tpUnitsInput = Number.isFinite(tpZone) && tpZone > 0 ? tpZone : (slUnitsReal * rr);
  const tpUnitsReal = Math.max(0, tpUnitsInput + tpBuffer);

  const riskMoney = balance * (riskPct / 100);

  const lossPerLot = slUnitsReal * valuePerUnit;
  const lotsRaw = (lossPerLot > 0) ? (riskMoney / lossPerLot) : 0;
  const lots = roundDownStep(lotsRaw, lotStep);

  const slDistPrice = slUnitsReal * unitSize;
  const tpDistPrice = tpUnitsReal * unitSize;

  const slPrice = (dir === "LONG") ? (entry - slDistPrice) : (entry + slDistPrice);
  const tpPrice = (dir === "LONG") ? (entry + tpDistPrice) : (entry - tpDistPrice);

  const profitPerLot = tpUnitsReal * valuePerUnit;
  const profit = lots * profitPerLot;

  const rrReal = (slUnitsReal > 0) ? (tpUnitsReal / slUnitsReal) : 0;

  // outputs
  if ($("riskOut")) $("riskOut").textContent = fmt2(riskMoney);
  if ($("lossPerLotOut")) $("lossPerLotOut").textContent = fmt2(lossPerLot);
  if ($("lotsOut")) $("lotsOut").textContent = fmtLots(lots);

  if ($("slUnitsOut")) $("slUnitsOut").textContent = fmt2(slUnitsReal);
  if ($("tpUnitsOut")) $("tpUnitsOut").textContent = fmt2(tpUnitsReal);
  if ($("rrOut")) $("rrOut").textContent = rrReal ? rrReal.toFixed(2) : "-";
  if ($("profitOut")) $("profitOut").textContent = Number.isFinite(profit) ? fmt2(profit) : "-";

  if ($("slPriceOut")) $("slPriceOut").textContent = fmtPrice(slPrice);
  if ($("tpPriceOut")) $("tpPriceOut").textContent = fmtPrice(tpPrice);

  if ($("clickStatus")) {
    $("clickStatus").textContent = `Calculated ✅ (${sym} / ${cfg.asset || "Custom"})`;
  }

  // run challenge engine if pro (and fill its outputs)
  const eng = runChallengeEngine(riskMoney);

  return { riskMoney, rrReal, eng };
}

// ===== Can I take this trade? (PRO) =====
function canTakeTrade() {
  if (!isPro) return alert("Pro required. Please sign in.");
  if (isLocked()) return alert("Locked by loss-streak rule.");

  const { riskMoney, rrReal, eng } = calculate();

  // simple “value” checks traderi milujú:
  const warnings = [];
  if (rrReal && rrReal < 1.5) warnings.push("RR < 1.5");
  if (n("riskPct") > 1) warnings.push("Risk % > 1");

  if (!eng.ok) {
    if ($("decisionOut")) $("decisionOut").textContent = eng.status;
    return;
  }

  if (warnings.length) {
    if ($("decisionOut")) $("decisionOut").textContent = `WARNING ⚠️ (${warnings.join(", ")})`;
  } else {
    if ($("decisionOut")) $("decisionOut").textContent = "YES ✅ (within rules)";
  }
}

// ===== Presets (PRO) =====
function applyPreset(size) {
  if (!isPro) return alert("Pro required. Please sign in.");
  if ($("accountSize")) $("accountSize").value = String(size);
  if ($("dailyLossPct")) $("dailyLossPct").value = "5";
  if ($("maxLossPct")) $("maxLossPct").value = "10";
  calculate();
}

// ===== Add custom symbol =====
function toggleAddSymbolBox() {
  const box = $("addSymbolBox");
  if (!box) return;
  box.style.display = (box.style.display === "none" || !box.style.display) ? "block" : "none";
}

function addCustomSymbol() {
  const nameRaw = $("customSymbolName")?.value || "";
  const name = normalizeSymbolInput(nameRaw);

  if (!name) return alert("Enter symbol name (e.g. US500).");

  const asset = ($("customAsset")?.value || "Custom").trim() || "Custom";
  const unitName = ($("customUnitName")?.value || "units").trim() || "units";

  const unitSize = parseNum($("customUnitSize")?.value);
  const valuePerUnit = parseNum($("customValuePerUnit")?.value);
  const lotStep = parseNum($("customLotStep")?.value) || 0.01;

  if (!(unitSize > 0)) return alert("Unit size must be > 0");
  if (!(valuePerUnit > 0)) return alert("Value per unit must be > 0");

  customSymbols[name] = { asset, unitName, unitSize, valuePerUnit, lotStep };
  saveCustomSymbols(customSymbols);

  // refresh dropdown and select new symbol
  populateSymbols($("symbolSearch")?.value || "");
  const sel = $("symbol");
  if (sel) sel.value = name;
  applySymbolDefaults(name);
  calculate();

  // close box
  const box = $("addSymbolBox");
  if (box) box.style.display = "none";
}

// ===== Login wiring =====
function wireLogin() {
  const signUp = $("signUpBtn");
  const signIn = $("signInBtn");
  const signOutBtn = $("signOutBtn");

  if (signUp) signUp.addEventListener("click", async () => {
    try {
      await createUserWithEmailAndPassword(auth, ($("email")?.value || "").trim(), $("password")?.value || "");
    } catch (e) { alert(e.message); }
  });

  if (signIn) signIn.addEventListener("click", async () => {
    try {
      await signInWithEmailAndPassword(auth, ($("email")?.value || "").trim(), $("password")?.value || "");
    } catch (e) { alert(e.message); }
  });

  if (signOutBtn) signOutBtn.addEventListener("click", async () => {
    try { await signOut(auth); } catch (e) { alert(e.message); }
  });

  onAuthStateChanged(auth, (user) => {
    isPro = !!user;
    if ($("userStatus")) $("userStatus").textContent = user ? `Signed in: ${user.email}` : "Not signed in";
    setProUI();
    calculate();
  });
}

// ===== Wire UI =====
document.addEventListener("DOMContentLoaded", () => {
  // symbols
  populateSymbols("");

  // login
  wireLogin();

  // mode buttons (UI only)
  on("quickModeBtn", "click", () => {
    $("quickModeBtn")?.classList.add("active");
    $("disciplineModeBtn")?.classList.remove("active");
  });

  on("disciplineModeBtn", "click", () => {
    $("disciplineModeBtn")?.classList.add("active");
    $("quickModeBtn")?.classList.remove("active");
    if (!isPro) alert("Discipline features are Pro (login).");
  });

  // search
  on("symbolSearch", "input", (e) => {
    populateSymbols(e.target.value);
    calculate();
  });

  // select change
  on("symbol", "change", () => {
    applySymbolDefaults($("symbol")?.value);
    calculate();
  });

  // add custom symbol
  on("showAddSymbol", "click", toggleAddSymbolBox);
  on("addSymbolBtn", "click", addCustomSymbol);

  // calc + canTake
  on("calcBtn", "click", calculate);
  on("canTakeBtn", "click", canTakeTrade);

  // auto calc on input (free)
  [
    "balance","riskPct","entry","rr","direction",
    "slUnits","tpUnits","slBuffer","tpBuffer",
    "unitSize","valuePerUnit","lotStep"
  ].forEach(id => on(id, "input", calculate));

  // pro engine inputs
  ["accountSize","dailyLossPct","maxLossPct","todayPnl","totalPnL"].forEach(id => on(id, "input", () => {
    if (isPro) calculate();
  }));

  // loss streak lock (pro only)
  on("lossBtn", "click", () => {
    if (!isPro) return alert("Pro required. Please sign in.");
    const cur = parseInt($("streakNow")?.value || "0", 10) || 0;
    const next = cur + 1;
    if ($("streakNow")) $("streakNow").value = String(next);

    const maxS = parseInt(String(n("maxStreak") || 3), 10) || 3;
    if (next >= maxS) triggerLock();
    applyLockUI();
  });

  on("winBtn", "click", () => {
    if (!isPro) return alert("Pro required. Please sign in.");
    if ($("streakNow")) $("streakNow").value = "0";
    resetLock();
  });

  on("resetLockBtn", "click", () => {
    if (!isPro) return alert("Pro required. Please sign in.");
    resetLock();
  });

  // presets
  [
    ["presetChallenge10K", 10000],
    ["presetChallenge25K", 25000],
    ["presetChallenge50K", 50000],
    ["presetChallenge100K", 100000],
  ].forEach(([id, size]) => on(id, "click", () => applyPreset(size)));

  // initial
  setProUI();
  applyLockUI();
  calculate();
});
