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
  const v = el ? parseFloat(el.value) : NaN;
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

// ===== PRO gating (Login = Pro) =====
let isPro = false;

function setProUI() {
  const proControls = $("proControls");         // discipline content wrapper (you already have)
  const discBtn = $("disciplineModeBtn");       // button/tab (you already have)

  if (proControls) {
    proControls.style.opacity = isPro ? "1" : "0.55";
    proControls.style.pointerEvents = isPro ? "auto" : "none";
  }
  if (discBtn) {
    discBtn.textContent = isPro ? "Discipline" : "Discipline 🔒";
  }
}

// ===== Universal symbol defaults (editable) =====
// valuePerUnit is in EUR per 1 unit (pip/tick/point) at 1.00 lot.
// User can override in the inputs.
const symbols = {
  "EURUSD": { asset: "FX", unitName: "pips", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
  "GBPUSD": { asset: "FX", unitName: "pips", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
  "USDJPY": { asset: "FX", unitName: "pips", unitSize: 0.01,   valuePerUnit: 7.0, lotStep: 0.01 },

  "XAUUSD": { asset: "Gold", unitName: "ticks", unitSize: 0.01, valuePerUnit: 0.91, lotStep: 0.01 },

  "BTCUSD": { asset: "Crypto", unitName: "ticks", unitSize: 1,  valuePerUnit: 0.90, lotStep: 0.001 },
  "ETHUSD": { asset: "Crypto", unitName: "ticks", unitSize: 0.1, valuePerUnit: 0.09, lotStep: 0.01 },

  "NAS100": { asset: "Index", unitName: "points", unitSize: 1, valuePerUnit: 0.90, lotStep: 0.01 },
  "US30":   { asset: "Index", unitName: "points", unitSize: 1, valuePerUnit: 0.90, lotStep: 0.01 },
  "DE40":   { asset: "Index", unitName: "points", unitSize: 1, valuePerUnit: 1.00, lotStep: 0.01 }
};

function populateSymbols() {
  const sel = $("symbol");
  if (!sel) return;

  // If it's already populated, don't duplicate
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

  if ($("slUnitsLabel")) $("slUnitsLabel").textContent = `SL distance (${cfg.unitName})`;
  if ($("unitsHint")) $("unitsHint").textContent = `Units = ${cfg.unitName}. You can override any field below.`;

  if ($("unitSize")) $("unitSize").value = cfg.unitSize;
  if ($("valuePerUnit")) $("valuePerUnit").value = cfg.valuePerUnit;
  if ($("lotStep")) $("lotStep").value = cfg.lotStep;
}

function calculate() {
  // IDs based on your Universal Risk Calculator page
  const sym = $("symbol") ? $("symbol").value : "EURUSD";
  const cfg = symbols[sym] || { asset: "", unitName: "units" };

  const balance = n("balance");
  const riskPct = n("riskPct");
  const entry = n("entry");
  const slUnits = n("slUnits");
  const rr = n("rr") || 2;

  const unitSize = n("unitSize");
  const valuePerUnit = n("valuePerUnit");
  const lotStep = n("lotStep") || 0.01;
  const tpBuffer = n("tpBuffer");

  const dir = $("direction") ? $("direction").value : "LONG";

  const riskMoney = balance * (riskPct / 100);
  const lossPerLot = slUnits * valuePerUnit;

  const lotsRaw = lossPerLot > 0 ? (riskMoney / lossPerLot) : 0;
  const lots = roundDownStep(lotsRaw, lotStep);

  // price distances
  const slPriceDist = slUnits * unitSize;
  const slPrice = dir === "LONG" ? entry - slPriceDist : entry + slPriceDist;

  const tpDist = slPriceDist * rr;
  const tpBase = dir === "LONG" ? entry + tpDist : entry - tpDist;
  const tpPrice = dir === "LONG" ? tpBase - tpBuffer : tpBase + tpBuffer;

  if ($("riskOut")) $("riskOut").textContent = fmt2(riskMoney);
  if ($("lossPerLotOut")) $("lossPerLotOut").textContent = fmt2(lossPerLot);
  if ($("lotsOut")) $("lotsOut").textContent = lots > 0 ? lots.toFixed(3).replace(/0+$/,'').replace(/\.$/,'') : "-";
  if ($("slPriceOut")) $("slPriceOut").textContent = fmtPrice(slPrice);
  if ($("tpPriceOut")) $("tpPriceOut").textContent = fmtPrice(tpPrice);

  // Discipline (Pro only)
  if (isPro) {
    const dailyLimit = n("dailyLimit");
    const todayPnl = n("todayPnl");
    const remaining = dailyLimit + todayPnl;

    if ($("remainingDaily")) $("remainingDaily").textContent = fmt2(remaining);
    const tradesLeft = riskMoney > 0 ? Math.max(0, Math.floor(remaining / riskMoney)) : 0;
    if ($("tradesLeft")) $("tradesLeft").textContent = String(tradesLeft);
  } else {
    if ($("remainingDaily")) $("remainingDaily").textContent = "-";
    if ($("tradesLeft")) $("tradesLeft").textContent = "-";
  }

  if ($("clickStatus")) $("clickStatus").textContent = `Calculated ✅ (${sym}${cfg.asset ? " / " + cfg.asset : ""})`;
}

// ===== Login wiring =====
function wireLoginUI() {
  const email = $("email");
  const password = $("password");
  const signUpBtn = $("signUpBtn");
  const signInBtn = $("signInBtn");
  const signOutBtn = $("signOutBtn");
  const userStatus = $("userStatus");

  if (signUpBtn) {
    signUpBtn.addEventListener("click", async () => {
      try {
        await createUserWithEmailAndPassword(auth, (email?.value || "").trim(), password?.value || "");
      } catch (e) {
        alert(e.message);
      }
    });
  }

  if (signInBtn) {
    signInBtn.addEventListener("click", async () => {
      try {
        await signInWithEmailAndPassword(auth, (email?.value || "").trim(), password?.value || "");
      } catch (e) {
        alert(e.message);
      }
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
      } catch (e) {
        alert(e.message);
      }
    });
  }

  onAuthStateChanged(auth, (user) => {
    isPro = !!user;

    if (userStatus) {
      userStatus.textContent = user ? `Signed in: ${user.email}` : "Not signed in";
    }

    setProUI();
    // refresh discipline outputs
    calculate();
  });
}

// ===== UI wiring =====
function wireCalculatorUI() {
  populateSymbols();

  if ($("symbol")) {
    $("symbol").addEventListener("change", () => {
      applySymbolDefaults($("symbol").value);
      calculate();
    });
    // apply initial defaults
    applySymbolDefaults($("symbol").value || "EURUSD");
  }

  if ($("calcBtn")) {
    $("calcBtn").addEventListener("click", (e) => {
      e.preventDefault();
      calculate();
    });
  }

  // auto-calc on input changes
  [
    "balance","riskPct","entry","slUnits","rr","unitSize","valuePerUnit","lotStep","tpBuffer","direction",
    "dailyLimit","todayPnl"
  ].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("input", () => calculate());
  });

  // quick / discipline buttons (optional UI)
  if ($("quickModeBtn") && $("disciplineModeBtn")) {
    $("quickModeBtn").addEventListener("click", () => {
      $("quickModeBtn").classList.add("active");
      $("disciplineModeBtn").classList.remove("active");
    });
    $("disciplineModeBtn").addEventListener("click", () => {
      $("disciplineModeBtn").classList.add("active");
      $("quickModeBtn").classList.remove("active");
    });
  }

  // init UI
  setProUI();
  calculate();
}

document.addEventListener("DOMContentLoaded", () => {
  wireLoginUI();
  wireCalculatorUI();
});
