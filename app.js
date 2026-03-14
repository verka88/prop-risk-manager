// ===== Firebase CDN =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ===== Firebase config =====
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
const db = getFirestore(app);

// ===== Helpers =====
const $ = (id) => document.getElementById(id);

function parseNum(v) {
  const val = String(v ?? "").trim().replace(/\s+/g, "").replace(",", ".");
  const num = parseFloat(val);
  return Number.isFinite(num) ? num : 0;
}

function n(id) {
  const el = $(id);
  if (!el) return 0;
  return parseNum(el.value);
}

function strWithComma(x) {
  if (!Number.isFinite(x)) return "";
  return String(x).replace(".", ",");
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

function on(id, event, fn) {
  const el = $(id);
  if (!el) return;
  el.addEventListener(event, fn);
}

// ===== Global state =====
let isSignedIn = false;
let isPro = false;
let currentUid = "";
let stopEntitlementWatch = null;

const TRIAL_DAYS = 7;
const STRIPE_CHECKOUT_URL = "https://api-fzx6pauknq-uc.a.run.app/create-checkout-session";

// ===== Trial / Pro logic =====
function computeIsProFromDoc(data) {
  const now = Date.now();

  const trialEndsMs =
    data?.trialEndsAt?.toMillis?.() ??
    (data?.trialEndsAt?.seconds ? data.trialEndsAt.seconds * 1000 : 0);

  const trialActive = trialEndsMs > now;
  const sub = String(data?.subscriptionStatus || "").toLowerCase();
  const subActive = sub === "active" || sub === "trialing";

  return {
    isPro: trialActive || subActive,
    trialEndsMs,
    trialActive,
    sub
  };
}

async function ensureUserDoc(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const ends = Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000;
    await setDoc(
      ref,
      {
        email: user.email || "",
        createdAt: Timestamp.now(),
        trialEndsAt: Timestamp.fromMillis(ends),
        subscriptionStatus: "none"
      },
      { merge: true }
    );
    return;
  }

  const data = snap.data() || {};
  if (!data.trialEndsAt) {
    const ends = Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000;
    await setDoc(ref, { trialEndsAt: Timestamp.fromMillis(ends) }, { merge: true });
  }
}

function watchEntitlement(user) {
  if (stopEntitlementWatch) {
    stopEntitlementWatch();
    stopEntitlementWatch = null;
  }

  if (!user) {
    isPro = false;
    return;
  }

  const ref = doc(db, "users", user.uid);

  stopEntitlementWatch = onSnapshot(
    ref,
    (snap) => {
      const data = snap.exists() ? snap.data() : {};
      const r = computeIsProFromDoc(data);
      isPro = r.isPro;

      const banner = $("trialBanner");
      const upgradeBtn = $("upgradeBtn");

      if (banner) {
        if (r.trialActive) {
          const daysLeft = Math.max(
            0,
            Math.ceil((r.trialEndsMs - Date.now()) / (24 * 60 * 60 * 1000))
          );
          banner.textContent = `PropEngine Trial active — ${daysLeft} day(s) left.`;
        } else if (r.sub === "active" || r.sub === "trialing") {
          banner.textContent = "PropEngine Pro active ✅";
        } else {
          banner.textContent = "Trial ended. Upgrade to unlock Pro features.";
        }
      }

      if (upgradeBtn) {
        upgradeBtn.style.display = r.isPro ? "none" : "block";
      }

      setProUI();
      calculate();
    },
    (err) => {
      console.log("Entitlement error:", err);
      isPro = false;
      setProUI();
      calculate();
    }
  );
}

// ===== Symbols =====
const defaultSymbols = {
  EURUSD: { asset: "FX", unitName: "pips", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
  GBPUSD: { asset: "FX", unitName: "pips", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
  AUDUSD: { asset: "FX", unitName: "pips", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
  NZDUSD: { asset: "FX", unitName: "pips", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
  USDCAD: { asset: "FX", unitName: "pips", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
  USDCHF: { asset: "FX", unitName: "pips", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },

  EURGBP: { asset: "FX", unitName: "pips", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
  EURCHF: { asset: "FX", unitName: "pips", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
  EURAUD: { asset: "FX", unitName: "pips", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
  GBPAUD: { asset: "FX", unitName: "pips", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },

  USDJPY: { asset: "FX", unitName: "pips", unitSize: 0.01, valuePerUnit: 7.0, lotStep: 0.01 },
  EURJPY: { asset: "FX", unitName: "pips", unitSize: 0.01, valuePerUnit: 7.0, lotStep: 0.01 },
  GBPJPY: { asset: "FX", unitName: "pips", unitSize: 0.01, valuePerUnit: 7.0, lotStep: 0.01 },
  AUDJPY: { asset: "FX", unitName: "pips", unitSize: 0.01, valuePerUnit: 7.0, lotStep: 0.01 },

  XAUUSD: { asset: "Metals", unitName: "ticks", unitSize: 0.01, valuePerUnit: 1.0, lotStep: 0.01 },
  XAGUSD: { asset: "Metals", unitName: "ticks", unitSize: 0.01, valuePerUnit: 0.5, lotStep: 0.01 },

  NAS100: { asset: "Index", unitName: "points", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.01 },
  US30: { asset: "Index", unitName: "points", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.01 },
  SPX500: { asset: "Index", unitName: "points", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.01 },
  GER40: { asset: "Index", unitName: "points", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.01 },
  UK100: { asset: "Index", unitName: "points", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.01 },

  BTCUSD: { asset: "Crypto", unitName: "ticks", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.001 },
  ETHUSD: { asset: "Crypto", unitName: "ticks", unitSize: 0.1, valuePerUnit: 0.1, lotStep: 0.001 },
  SOLUSD: { asset: "Crypto", unitName: "ticks", unitSize: 0.01, valuePerUnit: 0.01, lotStep: 0.001 },
  XRPUSD: { asset: "Crypto", unitName: "ticks", unitSize: 0.0001, valuePerUnit: 0.0001, lotStep: 0.001 }
};

function loadCustomSymbols() {
  try {
    const raw = localStorage.getItem("customSymbols_v1");
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function saveCustomSymbols(custom) {
  localStorage.setItem("customSymbols_v1", JSON.stringify(custom));
}

function mergedSymbols() {
  return { ...defaultSymbols, ...loadCustomSymbols() };
}

function populateSymbols(filteredList = null) {
  const sel = $("symbol");
  if (!sel) return;

  const all = mergedSymbols();
  const current = sel.value || "EURUSD";
  sel.innerHTML = "";

  const keys = filteredList ?? Object.keys(all);

  keys.forEach((k) => {
    const cfg = all[k];
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${k}${cfg?.asset ? ` (${cfg.asset})` : ""}`;
    sel.appendChild(opt);
  });

  if (keys.includes(current)) sel.value = current;
  else sel.value = keys[0] || "EURUSD";

  applySymbolDefaults(sel.value);
}

function applySymbolDefaults(sym) {
  const cfg = mergedSymbols()[sym];
  if (!cfg) return;

  const slLab = $("slUnitsLabel");
  const tpLab = $("tpUnitsLabel");

  if (slLab) slLab.textContent = `SL (${cfg.unitName})`;
  if (tpLab) tpLab.textContent = `TP (${cfg.unitName})`;

  if ($("unitSize")) $("unitSize").value = strWithComma(cfg.unitSize);
  if ($("valuePerUnit")) $("valuePerUnit").value = strWithComma(cfg.valuePerUnit);
  if ($("lotStep")) $("lotStep").value = strWithComma(cfg.lotStep);
}

// ===== Optional zone sync =====
function syncZoneIfExists() {
  const unitSize = n("unitSize") || 0;
  const topEl = $("zoneTop");
  const botEl = $("zoneBottom");
  const zoneSizeEl = $("zoneSize");

  if (!topEl || !botEl || !zoneSizeEl) return;

  const top = n("zoneTop");
  const bottom = n("zoneBottom");

  if (unitSize > 0 && top > 0 && bottom > 0) {
    const zoneUnits = Math.abs(top - bottom) / unitSize;
    zoneSizeEl.value = strWithComma(Number(zoneUnits.toFixed(2)));
  }
}

// ===== Loss streak lock =====
function lockKey() {
  return `lockUntil_${currentUid || "anon"}`;
}

function isLocked() {
  const until = localStorage.getItem(lockKey());
  return until && Date.now() < parseInt(until, 10);
}

function triggerLock() {
  const cooldownMin = n("cooldownMin") || 120;
  const until = Date.now() + cooldownMin * 60000;
  localStorage.setItem(lockKey(), String(until));
  applyLockUI();
}

function resetLock() {
  localStorage.removeItem(lockKey());
  applyLockUI();
}

// ===== Auth UI =====
function setAuthUI(user) {
  const signedOut = $("authSignedOut");
  const signedIn = $("authSignedIn");
  const email = $("email");
  const pass = $("password");

  if (user) {
    if (signedOut) signedOut.style.display = "none";
    if (signedIn) signedIn.style.display = "block";
    if (email) email.disabled = true;
    if (pass) pass.disabled = true;
  } else {
    if (signedOut) signedOut.style.display = "block";
    if (signedIn) signedIn.style.display = "none";
    if (email) email.disabled = false;
    if (pass) pass.disabled = false;
  }
}

// ===== Pro UI =====
function setProUI() {
  const proControls = $("proControls");
  if (proControls) {
    proControls.style.opacity = isPro ? "1" : "0.55";
    proControls.style.pointerEvents = isPro ? "auto" : "none";
  }

  const discBtn = $("disciplineModeBtn");
  if (discBtn) discBtn.textContent = isPro ? "Discipline" : "Discipline 🔒";

  [
    "presetChallenge10K",
    "presetChallenge25K",
    "presetChallenge50K",
    "presetChallenge100K",
    "winBtn",
    "lossBtn",
    "resetLockBtn"
  ].forEach((id) => {
    const b = $(id);
    if (b) b.disabled = !isPro;
  });

  const canTakeBtn = $("canTakeBtn");
  if (canTakeBtn) canTakeBtn.disabled = !isPro || isLocked();

  const calcBtn = $("calcBtn");
  if (calcBtn) calcBtn.disabled = isLocked();

  applyLockUI();
}

function applyLockUI() {
  const locked = isLocked();
  const lockStatus = $("lockStatus");

  if (lockStatus) {
    lockStatus.textContent = !isPro ? "Pro required" : locked ? "LOCKED ❌" : "Unlocked ✅";
    lockStatus.className = !isPro ? "warn" : locked ? "bad" : "ok";
  }

  const lockHint = $("lockHint");
  if (lockHint) {
    if (!isPro) {
      lockHint.textContent = "Sign in + Trial/Pro required.";
    } else if (locked) {
      const until = parseInt(localStorage.getItem(lockKey()) || "0", 10);
      const mins = Math.max(0, Math.ceil((until - Date.now()) / 60000));
      lockHint.textContent = `Cooldown active: ~${mins} min left`;
    } else {
      lockHint.textContent = "";
    }
  }

  const calcBtn = $("calcBtn");
  if (calcBtn) calcBtn.disabled = locked;

  const canTakeBtn = $("canTakeBtn");
  if (canTakeBtn) canTakeBtn.disabled = locked || !isPro;
}

// ===== Prop Engine =====
function runPropEngine(riskMoney) {
  if (!isPro) {
    if ($("remainingDailyOut")) $("remainingDailyOut").textContent = "-";
    if ($("remainingOverallOut")) $("remainingOverallOut").textContent = "-";
    if ($("tradeStatusOut")) $("tradeStatusOut").textContent = "-";
    return "Pro required";
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
  if (riskMoney > remainingDaily) status = "BLOCK Daily ❌";
  else if (riskMoney > remainingOverall) status = "BLOCK Overall ❌";

  if ($("tradeStatusOut")) $("tradeStatusOut").textContent = status;
  return status;
}

// ===== Calculator =====
function calculate() {
  if (isLocked()) return;

  syncZoneIfExists();

  const balance = n("balance");
  const riskPct = n("riskPct");
  const entry = n("entry");
  const unitSize = n("unitSize");
  const valuePerUnit = n("valuePerUnit");
  const lotStep = n("lotStep") || 0.01;

  const slUnits = n("slUnits");
  const rr = n("rr") || 2;
  const tpUnitsInput = n("tpUnits");
  const tpUnitsFinal = tpUnitsInput > 0 ? tpUnitsInput : slUnits * rr;
  const tpBufferPrice = n("tpBuffer");
  const dir = $("direction") ? $("direction").value : "LONG";

  const riskMoney = balance * (riskPct / 100);
  const lossPerLot = slUnits * valuePerUnit;
  const lotsRaw = lossPerLot > 0 ? riskMoney / lossPerLot : 0;
  const lots = roundDownStep(lotsRaw, lotStep);

  const slDist = slUnits * unitSize;
  const tpDist = tpUnitsFinal * unitSize;

  const slPrice = dir === "LONG" ? entry - slDist : entry + slDist;

  let tpPrice = dir === "LONG" ? entry + tpDist : entry - tpDist;
  if (tpBufferPrice) tpPrice = tpPrice + (dir === "LONG" ? tpBufferPrice : -tpBufferPrice);

  if ($("riskOut")) $("riskOut").textContent = fmt2(riskMoney);
  if ($("lossPerLotOut")) $("lossPerLotOut").textContent = fmt2(lossPerLot);
  if ($("lotsOut")) $("lotsOut").textContent = lots > 0 ? lots.toFixed(3) : "-";
  if ($("slUnitsOut")) $("slUnitsOut").textContent = slUnits ? slUnits.toFixed(2) : "-";
  if ($("tpUnitsOut")) $("tpUnitsOut").textContent = tpUnitsFinal ? tpUnitsFinal.toFixed(2) : "-";
  if ($("slPriceOut")) $("slPriceOut").textContent = fmtPrice(slPrice);
  if ($("tpPriceOut")) $("tpPriceOut").textContent = fmtPrice(tpPrice);

  const status = runPropEngine(riskMoney);
  if ($("decisionOut")) $("decisionOut").textContent = isPro ? status : "-";
  if ($("clickStatus")) $("clickStatus").textContent = "Calculated ✅";

  applyLockUI();
  setProUI();
}

function canTakeTrade() {
  if (!isPro) return alert("Trial/Pro required.");
  if (isLocked()) return alert("Locked by loss-streak rule.");
  calculate();
}

// ===== Presets =====
function applyPreset(size) {
  if (!isPro) return alert("Trial/Pro required.");
  if ($("accountSize")) $("accountSize").value = String(size);
  if ($("dailyLossPct")) $("dailyLossPct").value = "5";
  if ($("maxLossPct")) $("maxLossPct").value = "10";
  calculate();
}

// ===== Custom Symbol UI =====
function wireSymbolSearch() {
  on("symbolSearch", "input", (e) => {
    const all = mergedSymbols();
    const search = String(e.target.value || "").toUpperCase().trim();
    const keys = Object.keys(all).filter((sym) => sym.includes(search));
    populateSymbols(keys.length ? keys : Object.keys(all));
  });

  on("showAddSymbol", "click", () => {
    const box = $("addSymbolBox");
    if (!box) return;
    box.style.display = box.style.display === "none" || !box.style.display ? "block" : "none";
  });

  on("addSymbolBtn", "click", () => {
    const name = String($("customSymbolName")?.value || "").trim().toUpperCase();
    if (!name) return alert("Enter symbol name.");

    const unitSize = parseNum($("customUnitSize")?.value);
    const valuePerUnit = parseNum($("customValuePerUnit")?.value);
    const lotStep = parseNum($("customLotStep")?.value);

    if (unitSize <= 0 || valuePerUnit <= 0 || lotStep <= 0) {
      return alert("Fill Unit size, Value per unit, Lot step (> 0).");
    }

    const custom = loadCustomSymbols();
    custom[name] = {
      asset: "Custom",
      unitName: "units",
      unitSize,
      valuePerUnit,
      lotStep
    };

    saveCustomSymbols(custom);
    populateSymbols();

    if ($("symbol")) $("symbol").value = name;
    applySymbolDefaults(name);

    const box = $("addSymbolBox");
    if (box) box.style.display = "none";

    calculate();
  });
}

// ===== Login =====
function wireLogin() {
  const signUp = $("signUpBtn");
  const signIn = $("signInBtn");
  const signOutBtn = $("signOutBtn");
  const upgradeBtn = $("upgradeBtn");
  const helpBtn = $("helpBtn");

  if (signUp) {
    signUp.onclick = async () => {
      try {
        await createUserWithEmailAndPassword(
          auth,
          ($("email")?.value || "").trim(),
          $("password")?.value || ""
        );
      } catch (e) {
        alert(e.message);
      }
    };
  }

  if (signIn) {
    signIn.onclick = async () => {
      try {
        await signInWithEmailAndPassword(
          auth,
          ($("email")?.value || "").trim(),
          $("password")?.value || ""
        );
      } catch (e) {
        alert(e.message);
      }
    };
  }

  if (signOutBtn) {
    signOutBtn.onclick = async () => {
      try {
        await signOut(auth);
      } catch (e) {
        alert(e.message);
      }
    };
  }

  if (upgradeBtn) {
    upgradeBtn.onclick = () => {
      window.location.href = STRIPE_CHECKOUT_URL;
    };
  }

  if (helpBtn) {
    helpBtn.onclick = () => {
      alert("Create an account to start your 7-day PropEngine trial. Upgrade anytime to unlock Pro features.");
    };
  }

  onAuthStateChanged(auth, async (user) => {
    isSignedIn = !!user;
    currentUid = user?.uid || "";

    if ($("userStatus")) {
      $("userStatus").textContent = user ? `Signed in: ${user.email}` : "Not signed in";
    }

    setAuthUI(user);

    if (!user) {
      isPro = false;

      if ($("trialBanner")) {
        $("trialBanner").textContent = "Create an account to start your 7-day PropEngine trial.";
      }

      if ($("upgradeBtn")) {
        $("upgradeBtn").style.display = "none";
      }

      setProUI();
      calculate();
      return;
    }

    try {
      await ensureUserDoc(user);
    } catch (e) {
      console.log(e);
    }

    watchEntitlement(user);
    setProUI();
    calculate();
  });
}

// ===== Wire UI =====
document.addEventListener("DOMContentLoaded", () => {
  populateSymbols();
  wireSymbolSearch();
  wireLogin();

  on("symbol", "change", () => {
    applySymbolDefaults($("symbol")?.value);
    calculate();
  });

  on("calcBtn", "click", calculate);
  on("canTakeBtn", "click", canTakeTrade);

  [
    ["presetChallenge10K", 10000],
    ["presetChallenge25K", 25000],
    ["presetChallenge50K", 50000],
    ["presetChallenge100K", 100000]
  ].forEach(([id, size]) => {
    $(id)?.addEventListener("click", () => applyPreset(size));
  });

  on("lossBtn", "click", () => {
    if (!isPro) return alert("Trial/Pro required.");

    const sEl = $("streakNow");
    const cur = parseInt(sEl?.value || "0", 10);
    const next = cur + 1;

    if (sEl) sEl.value = String(next);
    if (next >= (n("maxStreak") || 3)) triggerLock();

    applyLockUI();
    setProUI();
  });

  on("winBtn", "click", () => {
    if (!isPro) return alert("Trial/Pro required.");
    if ($("streakNow")) $("streakNow").value = "0";
    applyLockUI();
    setProUI();
  });

  on("resetLockBtn", "click", () => {
    if (!isPro) return alert("Trial/Pro required.");
    resetLock();
    setProUI();
  });

  [
    "balance",
    "riskPct",
    "entry",
    "direction",
    "rr",
    "slUnits",
    "tpUnits",
    "tpBuffer",
    "unitSize",
    "valuePerUnit",
    "lotStep",
    "accountSize",
    "dailyLossPct",
    "maxLossPct",
    "todayPnl",
    "totalPnL",
    "zoneTop",
    "zoneBottom",
    "zoneSize"
  ].forEach((id) => on(id, "input", calculate));

  setAuthUI(null);
  setProUI();
  calculate();
});
