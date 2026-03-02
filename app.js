// ===== Firebase CDN (NO npm) =====
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

function n(id) {
  const el = $(id);
  if (!el) return 0;
  const v = parseFloat(el.value);
  return Number.isFinite(v) ? v : 0;
}

function fmt2(x) {
  return Number.isFinite(x) ? x.toFixed(2) : "-";
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

// ===== PRO gating (Login = Pro for MVP) =====
let isPro = false;

function setProUI() {
  const proControls = $("proControls");
  const discBtn = $("disciplineModeBtn");

  if (proControls) {
    proControls.style.opacity = isPro ? "1" : "0.55";
    proControls.style.pointerEvents = isPro ? "auto" : "none";
  }
  if (discBtn) {
    discBtn.textContent = isPro ? "Discipline" : "Discipline 🔒";
  }
}

// ===== Symbol defaults (editable) =====
// valuePerUnit = EUR per 1 unit (pip/tick/point) at 1.00 lot.
// Users can override in UI (works across brokers).
const symbols = {
  "EURUSD": { asset: "FX", unitName: "pips", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
  "GBPUSD": { asset: "FX", unitName: "pips", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
  "USDJPY": { asset: "FX", unitName: "pips", unitSize: 0.01,   valuePerUnit: 7.0, lotStep: 0.01 },
  "XAUUSD": { asset: "Gold", unitName: "ticks", unitSize: 0.01, valuePerUnit: 0.91, lotStep: 0.01 },
  "BTCUSD": { asset: "Crypto", unitName: "ticks", unitSize: 1,   valuePerUnit: 0.90, lotStep: 0.001 },
  "ETHUSD": { asset: "Crypto", unitName: "ticks", unitSize: 0.1, valuePerUnit: 0.09, lotStep: 0.01 },
  "NAS100": { asset: "Index", unitName: "points", unitSize: 1, valuePerUnit: 0.90, lotStep: 0.01 },
  "US30":   { asset: "Index", unitName: "points", unitSize: 1, valuePerUnit: 0.90, lotStep: 0.01 },
  "DE40":   { asset: "Index", unitName: "points", unitSize: 1, valuePerUnit: 1.00, lotStep: 0.01 }
};

function populateSymbols() {
  const sel = $("symbol");
  if (!sel) return;

  if (sel.options && sel.options.length > 0) return;

  Object.keys(symbols).forEach((k) => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${k} (${symbols[k].asset})`;
    sel.appendChild(opt);
  });

  if (!sel.value) sel.value = "EURUSD";
}

function applySymbolDefaults(sym) {
  const cfg = symbols[sym];
  if (!cfg) return;

  if ($("slUnitsLabel")) $("slUnitsLabel").textContent = `SL distance (${cfg.unitName}) (advanced)`;
  if ($("unitsHint")) $("unitsHint").textContent = `Units = ${cfg.unitName}. Used only if SL price is empty.`;

  $("unitSize").value = cfg.unitSize;
  $("valuePerUnit").value = cfg.valuePerUnit;
  $("lotStep").value = cfg.lotStep;
}

// ===== PROP RULE ENGINE (PRO) =====
function runPropEngine(riskMoney) {
  if (!isPro) {
    if ($("remainingDailyOut")) $("remainingDailyOut").textContent = "-";
    if ($("remainingOverallOut")) $("remainingOverallOut").textContent = "-";
    if ($("tradeStatusOut")) $("tradeStatusOut").textContent = "-";
    return;
  }

  const accountSize = n("accountSize");
  const dailyPct = n("dailyLossPct");
  const maxPct = n("maxLossPct");
  const totalPnL = n("totalPnL");
  const todayPnl = n("todayPnl");

  // equity (simple MVP)
  const equity = accountSize + totalPnL;

  const dailyLimit = equity * (dailyPct / 100);
  const overallLimit = accountSize * (maxPct / 100);

  const remainingDaily = dailyLimit + todayPnl;
  const remainingOverall = overallLimit + totalPnL;

  if ($("remainingDailyOut")) $("remainingDailyOut").textContent = fmt2(remainingDaily);
  if ($("remainingOverallOut")) $("remainingOverallOut").textContent = fmt2(remainingOverall);

  let status = "OK ✅";

  if (riskMoney > remainingDaily) {
    status = "BLOCKED — breaks Daily Rule ❌";
  } else if (riskMoney > remainingOverall) {
    status = "BLOCKED — breaks Overall Rule ❌";
  }

  if ($("tradeStatusOut")) $("tradeStatusOut").textContent = status;
}

// ===== Calculator =====
function calculate() {
  const sym = $("symbol").value;
  const cfg = symbols[sym] || { asset: "", unitName: "units" };

  const balance = n("balance");
  const riskPct = n("riskPct");
  const entry = n("entry");

  const unitSize = n("unitSize");
  const valuePerUnit = n("valuePerUnit");
  const lotStep = n("lotStep") || 0.01;

  const rr = n("rr") || 2;
  const tpBuffer = n("tpBuffer");
  const dir = $("direction").value;

  // SL/TP in PRICE (like cTrader)
  const slPriceIn = n("slPriceIn"); // user SL price
  const tpPriceIn = n("tpPriceIn"); // user TP price (optional)

  // fallback: SL units (advanced)
  let slUnits = n("slUnits");
  if (slPriceIn > 0 && entry > 0 && unitSize > 0) {
    slUnits = Math.abs(entry - slPriceIn) / unitSize;
  }

  const riskMoney = balance * (riskPct / 100);
  const lossPerLot = slUnits * valuePerUnit;

  const lotsRaw = lossPerLot > 0 ? (riskMoney / lossPerLot) : 0;
  const lots = roundDownStep(lotsRaw, lotStep);

  // price distances from units
  const slPriceDist = slUnits * unitSize;

  // SL: prefer input price
  const slPrice = (slPriceIn > 0)
    ? slPriceIn
    : (dir === "LONG" ? entry - slPriceDist : entry + slPriceDist);

  // TP: prefer input price, else RR
  const tpDist = slPriceDist * rr;
  const tpBase = dir === "LONG" ? entry + tpDist : entry - tpDist;

  const tpPrice = (tpPriceIn > 0)
    ? tpPriceIn
    : (dir === "LONG" ? tpBase - tpBuffer : tpBase + tpBuffer);

  // outputs
  $("riskOut").textContent = fmt2(riskMoney);
  $("lossPerLotOut").textContent = fmt2(lossPerLot);
  $("lotsOut").textContent = lots > 0 ? lots.toFixed(3).replace(/0+$/,'').replace(/\.$/,'') : "-";
  $("slPriceOut").textContent = fmtPrice(slPrice);
  $("tpPriceOut").textContent = fmtPrice(tpPrice);

  $("clickStatus").textContent = `Calculated ✅ (${sym} / ${cfg.asset})`;

  // run engine (Pro)
  runPropEngine(riskMoney);
}

// ===== Login wiring =====
function wireLoginUI() {
  const email = $("email");
  const password = $("password");
  const signUpBtn = $("signUpBtn");
  const signInBtn = $("signInBtn");
  const signOutBtn = $("signOutBtn");
  const userStatus = $("userStatus");

  signUpBtn.addEventListener("click", async () => {
    try {
      await createUserWithEmailAndPassword(auth, (email.value || "").trim(), password.value || "");
    } catch (e) {
      alert(e.message);
    }
  });

  signInBtn.addEventListener("click", async () => {
    try {
      await signInWithEmailAndPassword(auth, (email.value || "").trim(), password.value || "");
    } catch (e) {
      alert(e.message);
    }
  });

  signOutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (e) {
      alert(e.message);
    }
  });

  onAuthStateChanged(auth, (user) => {
    isPro = !!user;
    userStatus.textContent = user ? `Signed in: ${user.email}` : "Not signed in";
    setProUI();
    calculate();
  });
}

// ===== UI wiring =====
function wireUI() {
  // mode buttons (UI only)
  $("quickModeBtn").addEventListener("click", () => {
    $("quickModeBtn").classList.add("active");
    $("disciplineModeBtn").classList.remove("active");
  });
  $("disciplineModeBtn").addEventListener("click", () => {
    $("disciplineModeBtn").classList.add("active");
    $("quickModeBtn").classList.remove("active");
  });

  populateSymbols();
  applySymbolDefaults($("symbol").value || "EURUSD");

  $("symbol").addEventListener("change", () => {
    applySymbolDefaults($("symbol").value);
    calculate();
  });

  $("calcBtn").addEventListener("click", (e) => {
    e.preventDefault();
    calculate();
  });

  // auto-calc on changes
  [
    "balance","riskPct","entry","rr","direction",
    "slPriceIn","tpPriceIn","tpBuffer",
    "slUnits","unitSize","valuePerUnit","lotStep",
    // engine inputs
    "accountSize","dailyLossPct","maxLossPct","todayPnl","totalPnL"
  ].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("input", calculate);
  });

  setProUI();
  calculate();
}

document.addEventListener("DOMContentLoaded", () => {
  wireLoginUI();
  wireUI();
});
