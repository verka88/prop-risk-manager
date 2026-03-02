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

function toNum(v) {
  const s = String(v ?? "").trim().replace(/\s+/g, "").replace(",", ".");
  const num = parseFloat(s);
  return Number.isFinite(num) ? num : 0;
}

function n(id) {
  const el = $(id);
  return el ? toNum(el.value) : 0;
}

function fmt2(x) { return Number.isFinite(x) ? x.toFixed(2) : "-"; }

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

function safeOn(id, evt, fn) {
  const el = typeof id === "string" ? $(id) : id;
  if (!el) return;
  el.addEventListener(evt, fn);
}

// ===== Global State =====
let isPro = false;

// ===== Symbol presets =====
const symbols = {
  "EURUSD": { unitSize: 0.0001, valuePerUnit: 9, lotStep: 0.01 },
  "USDJPY": { unitSize: 0.01, valuePerUnit: 7, lotStep: 0.01 },
  "XAUUSD": { unitSize: 0.01, valuePerUnit: 0.91, lotStep: 0.01 },
  "BTCUSD": { unitSize: 1, valuePerUnit: 0.9, lotStep: 0.001 }
};

function populateSymbols() {
  const sel = $("symbol");
  if (!sel) return;

  // avoid duplicating options
  sel.innerHTML = "";

  Object.keys(symbols).forEach(k => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    sel.appendChild(opt);
  });

  sel.value = sel.value || "EURUSD";
  applySymbolDefaults(sel.value);
}

function applySymbolDefaults(sym) {
  const cfg = symbols[sym];
  if (!cfg) return;

  if ($("unitSize")) $("unitSize").value = String(cfg.unitSize).replace(".", ",");
  if ($("valuePerUnit")) $("valuePerUnit").value = String(cfg.valuePerUnit).replace(".", ",");
  if ($("lotStep")) $("lotStep").value = String(cfg.lotStep).replace(".", ",");
}

// ===== Loss Streak Lock =====
function isLocked() {
  const until = localStorage.getItem("lockUntil");
  return until && Date.now() < parseInt(until, 10);
}

function applyLockUI() {
  const locked = isLocked();

  const lockStatus = $("lockStatus");
  if (lockStatus) {
    lockStatus.textContent = locked ? "LOCKED ❌" : (isPro ? "Unlocked ✅" : "Pro required");
    lockStatus.className = locked ? "bad" : (isPro ? "ok" : "warn");
  }

  const calcBtn = $("calcBtn");
  const canTakeBtn = $("canTakeBtn");
  if (calcBtn) calcBtn.disabled = locked;
  if (canTakeBtn) canTakeBtn.disabled = locked || !isPro;
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

// ===== Prop Challenge Engine (Pro) =====
function runPropEngine(riskMoney) {
  if (!isPro) {
    if ($("remainingDailyOut")) $("remainingDailyOut").textContent = "-";
    if ($("remainingOverallOut")) $("remainingOverallOut").textContent = "-";
    if ($("tradeStatusOut")) $("tradeStatusOut").textContent = "-";
    if ($("decisionOut")) $("decisionOut").textContent = "Pro required 🔒";
    return { status: "Pro required 🔒" };
  }

  const acc = n("accountSize");
  const dailyPct = n("dailyLossPct");
  const maxPct = n("maxLossPct");
  const totalPnL = n("totalPnL");
  const todayPnl = n("todayPnl");

  const dailyLimit = acc * (dailyPct / 100);
  const maxLimit = acc * (maxPct / 100);

  const remainingDaily = dailyLimit + todayPnl;
  const remainingOverall = maxLimit + totalPnL;

  if ($("remainingDailyOut")) $("remainingDailyOut").textContent = fmt2(remainingDaily);
  if ($("remainingOverallOut")) $("remainingOverallOut").textContent = fmt2(remainingOverall);

  let status = "OK ✅";
  if (riskMoney > remainingDaily) status = "BLOCKED — Daily limit ❌";
  else if (riskMoney > remainingOverall) status = "BLOCKED — Overall limit ❌";

  if ($("tradeStatusOut")) $("tradeStatusOut").textContent = status;
  if ($("decisionOut")) $("decisionOut").textContent = status;

  return { status, remainingDaily, remainingOverall };
}

// ===== Calculator =====
function calculate() {
  if (isLocked()) return;

  const dirEl = $("direction");
  const dir = dirEl ? dirEl.value : "LONG";

  const balance = n("balance");
  const riskPct = n("riskPct");
  const entry = n("entry");

  const slUnits = n("slUnits");
  const tpUnitsText = $("tpUnits") ? String($("tpUnits").value).trim() : "";
  const tpUnits = tpUnitsText === "" ? NaN : toNum(tpUnitsText);

  const unitSize = n("unitSize");
  const valuePerUnit = n("valuePerUnit");
  const lotStep = n("lotStep") || 0.01;

  const rr = n("rr") || 2;
  const tpBuffer = n("tpBuffer");

  const riskMoney = balance * (riskPct / 100);
  const lossPerLot = slUnits * valuePerUnit;

  const lotsRaw = lossPerLot > 0 ? (riskMoney / lossPerLot) : 0;
  const lots = roundDownStep(lotsRaw, lotStep);

  const slDist = slUnits * unitSize;

  // SL price from entry + distance
  const slPrice = (dir === "LONG") ? (entry - slDist) : (entry + slDist);

  // TP units: if empty -> RR
  const tpUnitsFinal = (Number.isFinite(tpUnits) && tpUnits > 0) ? tpUnits : (slUnits * rr);
  const tpDist = tpUnitsFinal * unitSize;

  let tpPriceBase = (dir === "LONG") ? (entry + tpDist) : (entry - tpDist);
  // TP buffer is in PRICE
  const tpPrice = (dir === "LONG") ? (tpPriceBase - tpBuffer) : (tpPriceBase + tpBuffer);

  // outputs
  if ($("riskOut")) $("riskOut").textContent = fmt2(riskMoney);
  if ($("lossPerLotOut")) $("lossPerLotOut").textContent = fmt2(lossPerLot);
  if ($("lotsOut")) $("lotsOut").textContent = lots > 0 ? lots.toFixed(3).replace(/0+$/,'').replace(/\.$/,'') : "-";

  if ($("slUnitsOut")) $("slUnitsOut").textContent = slUnits.toFixed(2).replace(/\.00$/, "");
  if ($("tpUnitsOut")) $("tpUnitsOut").textContent = tpUnitsFinal.toFixed(2).replace(/\.00$/, "");

  if ($("slPriceOut")) $("slPriceOut").textContent = fmtPrice(slPrice);
  if ($("tpPriceOut")) $("tpPriceOut").textContent = fmtPrice(tpPrice);

  if ($("clickStatus")) $("clickStatus").textContent = "Calculated ✅";

  // engine
  runPropEngine(riskMoney);
}

// ===== Can I Take Trade =====
function canTakeTrade() {
  if (!isPro) return alert("Pro required. Please sign in.");
  if (isLocked()) return alert("Locked by loss-streak rule.");

  calculate(); // updates engine and decisionOut
  const status = $("decisionOut") ? $("decisionOut").textContent : "";
  alert(status || "Done");
}

// ===== Challenge Presets =====
function applyPreset(size) {
  if (!isPro) return alert("Pro required. Please sign in.");

  if ($("accountSize")) $("accountSize").value = String(size);
  if ($("dailyLossPct")) $("dailyLossPct").value = "5";
  if ($("maxLossPct")) $("maxLossPct").value = "10";

  calculate();
}

// ===== Login =====
function wireLogin() {
  const signUpBtn = $("signUpBtn");
  const signInBtn = $("signInBtn");
  const signOutBtn = $("signOutBtn");

  safeOn(signUpBtn, "click", async () => {
    try {
      await createUserWithEmailAndPassword(auth, ($("email")?.value || ""), ($("password")?.value || ""));
    } catch (e) {
      alert(e.message);
    }
  });

  safeOn(signInBtn, "click", async () => {
    try {
      await signInWithEmailAndPassword(auth, ($("email")?.value || ""), ($("password")?.value || ""));
    } catch (e) {
      alert(e.message);
    }
  });

  safeOn(signOutBtn, "click", async () => {
    await signOut(auth);
  });

  onAuthStateChanged(auth, (user) => {
    isPro = !!user;

    const userStatus = $("userStatus");
    if (userStatus) userStatus.textContent = user ? `Signed in: ${user.email}` : "Not signed in";

    applyLockUI();
    calculate();
  });
}

// ===== Wire UI =====
document.addEventListener("DOMContentLoaded", () => {
  populateSymbols();
  wireLogin();

  safeOn("symbol", "change", () => {
    applySymbolDefaults($("symbol").value);
    calculate();
  });

  safeOn("calcBtn", "click", (e) => { e.preventDefault(); calculate(); });
  safeOn("canTakeBtn", "click", (e) => { e.preventDefault(); canTakeTrade(); });

  // loss-streak buttons
  safeOn("lossBtn", "click", () => {
    if (!isPro) return alert("Pro required.");
    const streakEl = $("streakNow");
    const cur = toNum(streakEl?.value);
    const next = cur + 1;
    if (streakEl) streakEl.value = String(next);

    const maxS = n("maxStreak") || 3;
    if (next >= maxS) triggerLock();

    applyLockUI();
  });

  safeOn("winBtn", "click", () => {
    if (!isPro) return alert("Pro required.");
    if ($("streakNow")) $("streakNow").value = "0";
    applyLockUI();
  });

  safeOn("resetLockBtn", "click", () => {
    resetLock();
  });

  // ✅ renamed preset button IDs (Challenge)
  safeOn("presetChallenge10K", "click", () => applyPreset(10000));
  safeOn("presetChallenge25K", "click", () => applyPreset(25000));
  safeOn("presetChallenge50K", "click", () => applyPreset(50000));
  safeOn("presetChallenge100K", "click", () => applyPreset(100000));

  applyLockUI();
  calculate();
});
