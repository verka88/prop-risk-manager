const $ = (id) => document.getElementById(id);

// ✅ accepts comma OR dot decimals (0,04 or 0.04)
function toNum(val) {
  if (val === null || val === undefined) return 0;
  const s = String(val).trim().replace(/\s+/g, "").replace(",", ".");
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : 0;
}
function n(id) {
  const el = $(id);
  return el ? toNum(el.value) : 0;
}

function fmt2(x) {
  return Number.isFinite(x) ? x.toFixed(2) : "-";
}
function fmtUnits(x) {
  if (!Number.isFinite(x)) return "-";
  const s = x.toFixed(2);
  return s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
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

/** ---------------- SYMBOLS ---------------- */
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
  sel.innerHTML = "";
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
  if ($("slUnitsLabel")) $("slUnitsLabel").textContent = `SL (${cfg.unitName})`;
  if ($("tpUnitsLabel")) $("tpUnitsLabel").textContent = `TP (${cfg.unitName})`;
  if ($("unitSize")) $("unitSize").value = cfg.unitSize;
  if ($("valuePerUnit")) $("valuePerUnit").value = cfg.valuePerUnit;
  if ($("lotStep")) $("lotStep").value = cfg.lotStep;
}

/** ---------------- PRO (LOGIN) OPTIONAL ---------------- */
let isPro = false;

function setProUI() {
  const proControls = $("proControls");
  const discBtn = $("disciplineModeBtn");
  if (proControls) {
    proControls.style.opacity = isPro ? "1" : "0.55";
    proControls.style.pointerEvents = isPro ? "auto" : "none";
  }
  if (discBtn) discBtn.textContent = isPro ? "Discipline" : "Discipline 🔒";
}

function runPropEngine(riskMoney) {
  // If not pro, keep outputs but show "-"
  if (!isPro) {
    if ($("remainingDailyOut")) $("remainingDailyOut").textContent = "-";
    if ($("remainingOverallOut")) $("remainingOverallOut").textContent = "-";
    if ($("tradeStatusOut")) $("tradeStatusOut").textContent = "Login required 🔒";
    return;
  }

  const accountSize = n("accountSize");
  const dailyPct = n("dailyLossPct");
  const maxPct = n("maxLossPct");
  const totalPnL = n("totalPnL");
  const todayPnl = n("todayPnl");

  const equity = accountSize + totalPnL;

  const dailyLimit = equity * (dailyPct / 100);
  const overallLimit = accountSize * (maxPct / 100);

  const remainingDaily = dailyLimit + todayPnl;
  const remainingOverall = overallLimit + totalPnL;

  if ($("remainingDailyOut")) $("remainingDailyOut").textContent = fmt2(remainingDaily);
  if ($("remainingOverallOut")) $("remainingOverallOut").textContent = fmt2(remainingOverall);

  let status = "OK ✅";
  if (riskMoney > remainingDaily) status = "BLOCKED — breaks Daily Rule ❌";
  else if (riskMoney > remainingOverall) status = "BLOCKED — breaks Overall Rule ❌";

  if ($("tradeStatusOut")) $("tradeStatusOut").textContent = status;
}

/** ---------------- CALC ---------------- */
function calculate() {
  const symSel = $("symbol");
  const sym = symSel ? symSel.value : "EURUSD";
  const cfg = symbols[sym] || { asset: "", unitName: "units" };

  const balance = n("balance");
  const riskPct = n("riskPct");
  const entry = n("entry");

  const slUnits = n("slUnits");                 // e.g. 15 pips
  const tpUnitsText = $("tpUnits") ? $("tpUnits").value.trim() : "";
  const tpUnits = tpUnitsText === "" ? NaN : toNum(tpUnitsText);

  const unitSize = n("unitSize");
  const valuePerUnit = n("valuePerUnit");
  const lotStep = n("lotStep") || 0.01;

  const rr = n("rr") || 2;
  const tpBuffer = n("tpBuffer");
  const dir = $("direction") ? $("direction").value : "LONG";

  const riskMoney = balance * (riskPct / 100);
  const lossPerLot = slUnits * valuePerUnit;

  const lotsRaw = lossPerLot > 0 ? (riskMoney / lossPerLot) : 0;
  const lots = roundDownStep(lotsRaw, lotStep);

  const slPriceDist = slUnits * unitSize;
  const slPrice = dir === "LONG" ? (entry - slPriceDist) : (entry + slPriceDist);

  const tpUnitsFinal = (Number.isFinite(tpUnits) && tpUnits > 0) ? tpUnits : (slUnits * rr);
  const tpPriceDist = tpUnitsFinal * unitSize;

  const tpBase = dir === "LONG" ? (entry + tpPriceDist) : (entry - tpPriceDist);
  const tpPrice = dir === "LONG" ? (tpBase - tpBuffer) : (tpBase + tpBuffer);

  if ($("riskOut")) $("riskOut").textContent = fmt2(riskMoney);
  if ($("lossPerLotOut")) $("lossPerLotOut").textContent = fmt2(lossPerLot);
  if ($("lotsOut")) $("lotsOut").textContent = lots > 0 ? lots.toFixed(3).replace(/0+$/,'').replace(/\.$/,'') : "-";

  // ✅ show units first (what you wanted)
  if ($("slUnitsOut")) $("slUnitsOut").textContent = fmtUnits(slUnits);
  if ($("tpUnitsOut")) $("tpUnitsOut").textContent = fmtUnits(tpUnitsFinal);

  // still show prices
  if ($("slPriceOut")) $("slPriceOut").textContent = fmtPrice(slPrice);
  if ($("tpPriceOut")) $("tpPriceOut").textContent = fmtPrice(tpPrice);

  if ($("clickStatus")) $("clickStatus").textContent = `Calculated ✅ (${sym} / ${cfg.asset})`;

  runPropEngine(riskMoney);
}

/** ---------------- UI WIRE ---------------- */
function wireUI() {
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

  populateSymbols();
  applySymbolDefaults($("symbol") ? $("symbol").value : "EURUSD");

  if ($("symbol")) {
    $("symbol").addEventListener("change", () => {
      applySymbolDefaults($("symbol").value);
      calculate();
    });
  }

  if ($("calcBtn")) {
    $("calcBtn").addEventListener("click", (e) => {
      e.preventDefault();
      calculate();
    });
  }

  [
    "balance","riskPct","entry","rr","direction",
    "slUnits","tpUnits","tpBuffer",
    "unitSize","valuePerUnit","lotStep",
    "accountSize","dailyLossPct","maxLossPct","todayPnl","totalPnL"
  ].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("input", calculate);
  });

  setProUI();
  calculate();
}

/** ---------------- FIREBASE LOGIN (dynamic import so calc works even if it fails) ---------------- */
async function wireFirebaseLoginOptional() {
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const {
      getAuth,
      createUserWithEmailAndPassword,
      signInWithEmailAndPassword,
      signOut,
      onAuthStateChanged
    } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");

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

    const email = $("email");
    const password = $("password");
    const signUpBtn = $("signUpBtn");
    const signInBtn = $("signInBtn");
    const signOutBtn = $("signOutBtn");
    const userStatus = $("userStatus");

    if (signUpBtn) {
      signUpBtn.addEventListener("click", async () => {
        try {
          await createUserWithEmailAndPassword(auth, (email.value || "").trim(), password.value || "");
        } catch (e) { alert(e.message); }
      });
    }

    if (signInBtn) {
      signInBtn.addEventListener("click", async () => {
        try {
          await signInWithEmailAndPassword(auth, (email.value || "").trim(), password.value || "");
        } catch (e) { alert(e.message); }
      });
    }

    if (signOutBtn) {
      signOutBtn.addEventListener("click", async () => {
        try { await signOut(auth); } catch (e) { alert(e.message); }
      });
    }

    onAuthStateChanged(auth, (user) => {
      isPro = !!user;
      if (userStatus) userStatus.textContent = user ? `Signed in: ${user.email}` : "Not signed in";
      setProUI();
      calculate();
    });

  } catch (e) {
    // Firebase failed → calculator still works
    if ($("userStatus")) $("userStatus").textContent = "Login unavailable (Firebase error). Calculator still works.";
    isPro = false;
    setProUI();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  wireUI();
  wireFirebaseLoginOptional();
});
