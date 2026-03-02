// ===== Firebase (modular via CDN) =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ✅ YOUR CONFIG (from Firebase console)
const firebaseConfig = {
  apiKey: "AIzaSyBo2yXF4Lg-BSTA034dxm8begvAvuO-7iw",
  authDomain: "prop-risk-tool.firebaseapp.com",
  projectId: "prop-risk-tool",
  storageBucket: "prop-risk-tool.firebasestorage.app",
  messagingSenderId: "205235413030",
  appId: "1:205235413030:web:8b7fb4ebc86a48e794c6e7"
};

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);

// ===== Helpers =====
const $ = (id) => document.getElementById(id);

function n(val, fallback = 0) {
  // accepts comma decimals
  if (val === null || val === undefined) return fallback;
  const s = String(val).trim().replace(/\s/g, "").replace(",", ".");
  const x = Number(s);
  return Number.isFinite(x) ? x : fallback;
}
function roundToStep(x, step) {
  if (!Number.isFinite(x)) return 0;
  if (!Number.isFinite(step) || step <= 0) return x;
  return Math.round(x / step) * step;
}
function fmt(x, decimals = 2) {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(decimals);
}
function nowMs() { return Date.now(); }

// ===== App state (localStorage) =====
const LS = {
  proUnlocked: "proUnlocked",
  lockUntil: "lockUntil",
  streak: "streakNow",
  maxStreak: "maxStreak",
  cooldownMin: "cooldownMin",
  engine: "engineState",
  calc: "calcState"
};

function saveState() {
  const calcState = {
    symbol: $("symbol").value,
    direction: $("direction").value,
    rr: $("rr").value,
    balance: $("balance").value,
    riskPct: $("riskPct").value,
    entry: $("entry").value,
    slDist: $("slDist").value,
    tpDist: $("tpDist").value,
    valuePerUnit: $("valuePerUnit").value,
    unitSize: $("unitSize").value,
    lotStep: $("lotStep").value
  };
  localStorage.setItem(LS.calc, JSON.stringify(calcState));

  const engineState = {
    accountSize: $("accountSize").value,
    dailyLossPct: $("dailyLossPct").value,
    maxLossPct: $("maxLossPct").value,
    todayPnl: $("todayPnl").value,
    totalPnl: $("totalPnl").value
  };
  localStorage.setItem(LS.engine, JSON.stringify(engineState));

  localStorage.setItem(LS.streak, $("streakNow").value);
  localStorage.setItem(LS.maxStreak, $("maxStreak").value);
  localStorage.setItem(LS.cooldownMin, $("cooldownMin").value);
}

function loadState() {
  try {
    const c = JSON.parse(localStorage.getItem(LS.calc) || "null");
    if (c) {
      $("symbol").value = c.symbol ?? $("symbol").value;
      $("direction").value = c.direction ?? $("direction").value;
      $("rr").value = c.rr ?? $("rr").value;
      $("balance").value = c.balance ?? $("balance").value;
      $("riskPct").value = c.riskPct ?? $("riskPct").value;
      $("entry").value = c.entry ?? $("entry").value;
      $("slDist").value = c.slDist ?? $("slDist").value;
      $("tpDist").value = c.tpDist ?? $("tpDist").value;
      $("valuePerUnit").value = c.valuePerUnit ?? $("valuePerUnit").value;
      $("unitSize").value = c.unitSize ?? $("unitSize").value;
      $("lotStep").value = c.lotStep ?? $("lotStep").value;
    }
  } catch {}

  try {
    const e = JSON.parse(localStorage.getItem(LS.engine) || "null");
    if (e) {
      $("accountSize").value = e.accountSize ?? $("accountSize").value;
      $("dailyLossPct").value = e.dailyLossPct ?? $("dailyLossPct").value;
      $("maxLossPct").value = e.maxLossPct ?? $("maxLossPct").value;
      $("todayPnl").value = e.todayPnl ?? $("todayPnl").value;
      $("totalPnl").value = e.totalPnl ?? $("totalPnl").value;
    }
  } catch {}

  $("streakNow").value = localStorage.getItem(LS.streak) ?? $("streakNow").value;
  $("maxStreak").value = localStorage.getItem(LS.maxStreak) ?? $("maxStreak").value;
  $("cooldownMin").value = localStorage.getItem(LS.cooldownMin) ?? $("cooldownMin").value;
}

// ===== Pro unlock logic =====
const PRO_CODE = "ABC"; // you said ABC

function isProUnlocked() {
  return localStorage.getItem(LS.proUnlocked) === "true";
}
function setProUnlocked(v) {
  localStorage.setItem(LS.proUnlocked, v ? "true" : "false");
  applyProUI();
}
function applyProUI() {
  const pro = isProUnlocked();

  $("proEngineBox").classList.toggle("hide", !pro);
  $("proEngineLockedMsg").classList.toggle("hide", pro);

  $("lossLockBox").classList.toggle("hide", !pro);
  $("lossLockedMsg").classList.toggle("hide", pro);

  $("canTakeBtn").disabled = !pro;
  if (!pro) {
    $("canTakeBtn").textContent = "Can I take this trade? (Pro)";
  } else {
    $("canTakeBtn").textContent = "Can I take this trade?";
  }
}

// ===== Symbol presets (simple) =====
function applySymbolDefaults() {
  const [sym, type] = $("symbol").value.split("|");
  if (type === "fx") {
    $("unitSize").value = "0.0001";
    $("lotStep").value = "0.01";
    $("valuePerUnit").value = "9"; // EUR account approx, user can override
    $("slLabel").textContent = "SL distance (pips)";
    $("tpLabel").textContent = "TP distance (pips)";
  } else if (type === "fxjpy") {
    $("unitSize").value = "0.01";
    $("lotStep").value = "0.01";
    $("valuePerUnit").value = "9";
    $("slLabel").textContent = "SL distance (pips)";
    $("tpLabel").textContent = "TP distance (pips)";
  } else if (type === "gold") {
    $("unitSize").value = "0.01";
    $("lotStep").value = "0.01";
    $("valuePerUnit").value = "1";
    $("slLabel").textContent = "SL distance (ticks)";
    $("tpLabel").textContent = "TP distance (ticks)";
  } else if (type === "crypto") {
    $("unitSize").value = "1";
    $("lotStep").value = "0.001";
    $("valuePerUnit").value = "1";
    $("slLabel").textContent = "SL distance (ticks)";
    $("tpLabel").textContent = "TP distance (ticks)";
  }
}

// ===== Calculator core =====
function calcTrade() {
  const balance = n($("balance").value, 0);
  const riskPct = n($("riskPct").value, 0);
  const entry = n($("entry").value, 0);
  const slDist = n($("slDist").value, 0);
  const tpDist = n($("tpDist").value, 0);
  const valuePerUnit = n($("valuePerUnit").value, 0);
  const unitSize = n($("unitSize").value, 0);
  const lotStep = n($("lotStep").value, 0.01);
  const dir = $("direction").value;

  const riskMoney = balance * (riskPct / 100);
  const lossPerLot = slDist * valuePerUnit; // universal (distance * value per unit)
  const rawLots = lossPerLot > 0 ? (riskMoney / lossPerLot) : 0;
  const lots = roundToStep(rawLots, lotStep);

  // SL/TP price derived from entry + distance * unitSize
  const slPrice = dir === "LONG" ? (entry - slDist * unitSize) : (entry + slDist * unitSize);
  const tpPrice = dir === "LONG" ? (entry + tpDist * unitSize) : (entry - tpDist * unitSize);

  $("outRisk").textContent = fmt(riskMoney, 2);
  $("outLossPerLot").textContent = fmt(lossPerLot, 2);
  $("outLots").textContent = fmt(lots, Math.max(2, String(lotStep).includes("0.001") ? 3 : 2));
  $("outSlPrice").textContent = Number.isFinite(slPrice) ? slPrice.toFixed(5) : "—";
  $("outTpPrice").textContent = Number.isFinite(tpPrice) ? tpPrice.toFixed(5) : "—";

  saveState();
  return { riskMoney, lots };
}

// ===== Prop Engine (Pro) =====
function calcEngine(riskMoney) {
  const acc = n($("accountSize").value, 0);
  const dailyPct = n($("dailyLossPct").value, 0);
  const maxPct = n($("maxLossPct").value, 0);
  const today = n($("todayPnl").value, 0);
  const total = n($("totalPnl").value, 0);

  const dailyLimit = acc * (dailyPct / 100);
  const maxLimit = acc * (maxPct / 100);

  // remaining is what you can still lose today / overall
  const remDaily = Math.max(0, dailyLimit + today);   // today is negative when losing
  const remOverall = Math.max(0, maxLimit + total);   // total is negative when losing

  $("remDaily").textContent = fmt(remDaily, 2);
  $("remOverall").textContent = fmt(remOverall, 2);

  let status = "OK ✅";
  let cls = "ok";
  let hint = "";

  if (!Number.isFinite(riskMoney) || riskMoney <= 0) {
    status = "Enter trade risk first";
    cls = "warn";
    hint = "Press Calculate to compute Risk €.";
  } else if (riskMoney > remDaily || riskMoney > remOverall) {
    status = "BLOCK ❌";
    cls = "bad";
    hint = `Risk (€${fmt(riskMoney,2)}) is bigger than remaining limit (Daily €${fmt(remDaily,2)} / Overall €${fmt(remOverall,2)}).`;
  } else if (riskMoney > remDaily * 0.8 || riskMoney > remOverall * 0.8) {
    status = "WARNING ⚠️";
    cls = "warn";
    hint = "This trade uses a big part of your remaining limit.";
  } else {
    hint = "Within limits.";
  }

  $("tradeStatus").textContent = status;
  $("tradeStatus").className = `status ${cls}`;
  $("engineHint").textContent = hint;

  saveState();

  return { remDaily, remOverall, status };
}

// ===== Loss-streak lock (Pro) =====
function isLocked() {
  const until = n(localStorage.getItem(LS.lockUntil), 0);
  return until && nowMs() < until;
}
function setLockedMinutes(min) {
  const until = nowMs() + min * 60 * 1000;
  localStorage.setItem(LS.lockUntil, String(until));
  applyLockUI();
}
function resetLock() {
  localStorage.setItem(LS.lockUntil, "0");
  applyLockUI();
}
function applyLockUI() {
  const locked = isLocked();
  const until = n(localStorage.getItem(LS.lockUntil), 0);

  // Disable trade actions if locked
  $("calcBtn").disabled = locked;
  $("canTakeBtn").disabled = locked || !isProUnlocked();
  $("symbol").disabled = locked;
  $("direction").disabled = locked;
  $("rr").disabled = locked;
  $("balance").disabled = locked;
  $("riskPct").disabled = locked;
  $("entry").disabled = locked;
  $("slDist").disabled = locked;
  $("tpDist").disabled = locked;
  $("valuePerUnit").disabled = locked;
  $("unitSize").disabled = locked;
  $("lotStep").disabled = locked;

  if (!isProUnlocked()) {
    $("lockStatus").textContent = "Pro locked";
    $("lockStatus").className = "status warn";
    $("lockHint").textContent = "";
    return;
  }

  if (locked) {
    const minsLeft = Math.max(0, Math.ceil((until - nowMs()) / 60000));
    $("lockStatus").textContent = `LOCKED (${minsLeft} min left)`;
    $("lockStatus").className = "status bad";
    $("lockHint").textContent = "Calculator is locked because of loss streak. Use Reset lock if needed.";
  } else {
    $("lockStatus").textContent = "Unlocked";
    $("lockStatus").className = "status ok";
    $("lockHint").textContent = "If streak reaches max, it locks for cooldown minutes.";
  }
}

// ===== Presets =====
function applyPreset(key) {
  // FTMO style (common): daily 5%, max 10%
  const presets = {
    FTMO10K: { size: 10000, daily: 5, max: 10 },
    FTMO25K: { size: 25000, daily: 5, max: 10 },
    FTMO50K: { size: 50000, daily: 5, max: 10 },
    FTMO100K:{ size: 100000, daily: 5, max: 10 }
  };
  const p = presets[key];
  if (!p) return;
  $("accountSize").value = String(p.size);
  $("dailyLossPct").value = String(p.daily);
  $("maxLossPct").value = String(p.max);
  saveState();
}

// ===== AUTH UI =====
function setAuthUI(user) {
  const signed = !!user;
  $("authDot").style.background = signed ? "#22c55e" : "#777";
  $("authText").textContent = signed ? `Signed in: ${user.email}` : "Not signed in";
  $("authBox").classList.toggle("hide", signed);
  $("signOutBtn").classList.toggle("hide", !signed);
}

// ===== Main =====
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  applySymbolDefaults();
  applyProUI();
  applyLockUI();

  // keep engine outputs updated when inputs change
  const engineInputs = ["accountSize","dailyLossPct","maxLossPct","todayPnl","totalPnl"];
  engineInputs.forEach(id => $(id).addEventListener("input", () => {
    if (isProUnlocked()) calcEngine(n($("balance").value,0) * (n($("riskPct").value,0)/100));
    saveState();
  }));

  // symbol defaults
  $("symbol").addEventListener("change", () => {
    applySymbolDefaults();
    saveState();
  });

  // calculate
  $("calcBtn").addEventListener("click", () => {
    if (isLocked()) return;
    const { riskMoney } = calcTrade();
    if (isProUnlocked()) calcEngine(riskMoney);
  });

  // Can I take this trade?
  $("canTakeBtn").addEventListener("click", () => {
    if (!isProUnlocked() || isLocked()) return;
    const { riskMoney } = calcTrade();
    const res = calcEngine(riskMoney);
    alert(res.status === "BLOCK ❌"
      ? "BLOCK ❌ — This trade would break prop limits."
      : (res.status === "WARNING ⚠️" ? "WARNING ⚠️ — Close to limits." : "OK ✅ — You can take this trade."));
  });

  // Pro unlock
  $("unlockBtn").addEventListener("click", () => {
    const code = ($("proCodeInput").value || "").trim();
    if (code === PRO_CODE) {
      setProUnlocked(true);
      alert("Pro unlocked ✅");
    } else {
      alert("Wrong code ❌");
    }
  });

  // Loss streak buttons
  $("winBtn").addEventListener("click", () => {
    if (!isProUnlocked()) return;
    $("streakNow").value = "0";
    saveState();
    applyLockUI();
  });

  $("lossBtn").addEventListener("click", () => {
    if (!isProUnlocked()) return;

    const streak = n($("streakNow").value, 0) + 1;
    $("streakNow").value = String(streak);

    const maxS = n($("maxStreak").value, 3);
    const cool = n($("cooldownMin").value, 120);

    saveState();

    if (streak >= maxS) {
      setLockedMinutes(cool);
      alert(`LOCKED ❌ — Loss streak ${streak}/${maxS}. Cooldown ${cool} minutes.`);
    } else {
      applyLockUI();
    }
  });

  $("resetLockBtn").addEventListener("click", () => {
    resetLock();
    alert("Lock reset ✅");
  });

  // If user manually edits streak values
  ["streakNow","maxStreak","cooldownMin"].forEach(id => {
    $(id).addEventListener("input", () => { saveState(); applyLockUI(); });
  });

  // Preset buttons
  document.querySelectorAll(".presetBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!isProUnlocked()) {
        alert("Pro locked — unlock Pro to use presets.");
        return;
      }
      applyPreset(btn.dataset.preset);
      // refresh engine view using current calculated risk (if any)
      const riskMoney = n($("balance").value,0) * (n($("riskPct").value,0)/100);
      calcEngine(riskMoney);
    });
  });

  // Auth: sign in (or create if not exists)
  $("signInBtn").addEventListener("click", async () => {
    const email = ($("email").value || "").trim();
    const pass = $("password").value || "";
    if (!email || pass.length < 6) {
      alert("Enter email + password (min 6 chars).");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      // If user not found, create
      const msg = String(e?.code || "");
      if (msg.includes("auth/user-not-found") || msg.includes("auth/invalid-credential")) {
        try {
          await createUserWithEmailAndPassword(auth, email, pass);
        } catch (e2) {
          alert(`Auth error: ${e2?.code || e2?.message}`);
        }
      } else {
        alert(`Auth error: ${e?.code || e?.message}`);
      }
    }
  });

  $("signOutBtn").addEventListener("click", async () => {
    await signOut(auth);
  });

  // Auth state listener
  onAuthStateChanged(auth, (user) => {
    setAuthUI(user);
  });

  // auto-calc once on load (so UI not empty)
  try {
    const { riskMoney } = calcTrade();
    if (isProUnlocked()) calcEngine(riskMoney);
  } catch {}
});
