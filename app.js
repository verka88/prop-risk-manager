// PropEngine - app.js
// Full logic for the provided index.html
// Safe local version: auth/trial/pro are simulated locally

const $ = (id) => document.getElementById(id);

function parseNum(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).replace(/\s/g, "").replace(",", ".").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

function inputNum(id, fallback = 0) {
  const el = $(id);
  if (!el) return fallback;
  return parseNum(el.value, fallback);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function setValue(id, value) {
  const el = $(id);
  if (el) el.value = value;
}

function show(id, visible = true) {
  const el = $(id);
  if (!el) return;
  el.style.display = visible ? "" : "none";
}

function addClass(id, cls) {
  const el = $(id);
  if (el) el.classList.add(cls);
}

function removeClass(id, cls) {
  const el = $(id);
  if (el) el.classList.remove(cls);
}

function money(n) {
  return `${Number(n).toFixed(2)} €`;
}

function fmt(n, digits = 2) {
  return Number(n).toFixed(digits);
}

function roundToStep(value, step) {
  if (!step || step <= 0) return value;
  return Math.floor(value / step) * step;
}

function getDirection() {
  return $("direction")?.value || "LONG";
}

function isLong() {
  return getDirection() === "LONG";
}

const STORAGE_KEYS = {
  app: "propengine_app_state_v1",
  symbols: "propengine_symbols_v1",
  auth: "propengine_auth_v1",
  lock: "propengine_lock_v1",
  mode: "propengine_mode_v1",
  calcMode: "propengine_calc_mode_v1"
};

const defaultSymbols = [
  { name: "EURUSD", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
  { name: "GBPUSD", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
  { name: "XAUUSD", unitSize: 0.1, valuePerUnit: 1.0, lotStep: 0.01 },
  { name: "US30", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.1 },
  { name: "NAS100", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.1 },
  { name: "GER40", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.1 },
  { name: "BTCUSD", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.01 }
];

let symbols = [];
let state = {
  signedIn: false,
  email: "",
  pro: false,
  trialUsed: false,
  trialEndsAt: null
};

let lockState = {
  currentStreak: 0,
  lockedUntil: null
};

function saveState() {
  const ids = [
    "email", "password", "symbolSearch", "direction", "rr", "balance", "riskPct", "entry",
    "slUnits", "tpUnits", "tpBuffer", "zoneTop", "zoneBottom", "zoneSize", "zoneBuffer",
    "zoneSlUnits", "zoneTp1Units", "zoneTp2Units", "unitSize", "valuePerUnit", "lotStep",
    "maxStreak", "cooldownMin", "streakNow", "accountSize", "dailyLossPct", "maxLossPct",
    "todayPnl", "totalPnL"
  ];

  const data = {};
  ids.forEach((id) => {
    const el = $(id);
    if (el) data[id] = el.value;
  });

  localStorage.setItem(STORAGE_KEYS.app, JSON.stringify(data));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.app);
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.entries(data).forEach(([id, value]) => {
      const el = $(id);
      if (el) el.value = value;
    });
  } catch (e) {
    console.error("Failed to load app state", e);
  }
}

function saveSymbols() {
  localStorage.setItem(STORAGE_KEYS.symbols, JSON.stringify(symbols));
}

function loadSymbols() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.symbols);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        symbols = parsed;
        return;
      }
    }
  } catch (e) {
    console.error("Failed to load symbols", e);
  }
  symbols = [...defaultSymbols];
}

function saveAuth() {
  localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(state));
}

function loadAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.auth);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      state = { ...state, ...parsed };
    }
  } catch (e) {
    console.error("Failed to load auth", e);
  }
}

function saveLock() {
  lockState.currentStreak = inputNum("streakNow", lockState.currentStreak);
  localStorage.setItem(STORAGE_KEYS.lock, JSON.stringify(lockState));
}

function loadLock() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.lock);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      lockState = { ...lockState, ...parsed };
    }
  } catch (e) {
    console.error("Failed to load lock", e);
  }
}

function saveModes() {
  const payload = {
    mainMode: $("disciplineModeBtn")?.classList.contains("active") ? "discipline" : "quick",
    calcMode: $("zoneCalcModeBtn")?.classList.contains("active") ? "zone" : "manual"
  };
  localStorage.setItem(STORAGE_KEYS.mode, payload.mainMode);
  localStorage.setItem(STORAGE_KEYS.calcMode, payload.calcMode);
}

function loadModes() {
  const mainMode = localStorage.getItem(STORAGE_KEYS.mode) || "quick";
  const calcMode = localStorage.getItem(STORAGE_KEYS.calcMode) || "manual";

  if (mainMode === "discipline") {
    setMainMode("discipline");
  } else {
    setMainMode("quick");
  }

  if (calcMode === "zone") {
    setCalcMode("zone");
  } else {
    setCalcMode("manual");
  }
}

function populateSymbols(filter = "") {
  const select = $("symbol");
  if (!select) return;

  select.innerHTML = "";

  const q = filter.trim().toLowerCase();
  const filtered = symbols.filter((s) => s.name.toLowerCase().includes(q));

  filtered.forEach((s) => {
    const option = document.createElement("option");
    option.value = s.name;
    option.textContent = s.name;
    select.appendChild(option);
  });

  if (!filtered.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No symbol found";
    select.appendChild(option);
  }
}

function getSelectedSymbol() {
  const name = $("symbol")?.value;
  return symbols.find((s) => s.name === name) || null;
}

function applySelectedSymbol() {
  const sym = getSelectedSymbol();
  if (!sym) return;
  setValue("unitSize", String(sym.unitSize).replace(".", ","));
  setValue("valuePerUnit", String(sym.valuePerUnit).replace(".", ","));
  setValue("lotStep", String(sym.lotStep).replace(".", ","));
  updateUnitLabels();
  calculateAll();
}

function addCustomSymbol() {
  const name = $("customSymbolName")?.value?.trim();
  const unitSize = parseNum($("customUnitSize")?.value, NaN);
  const valuePerUnit = parseNum($("customValuePerUnit")?.value, NaN);
  const lotStep = parseNum($("customLotStep")?.value, NaN);

  if (!name || !Number.isFinite(unitSize) || !Number.isFinite(valuePerUnit) || !Number.isFinite(lotStep)) {
    alert("Fill all custom symbol fields correctly.");
    return;
  }

  const exists = symbols.some((s) => s.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    alert("This symbol already exists.");
    return;
  }

  symbols.push({ name, unitSize, valuePerUnit, lotStep });
  symbols.sort((a, b) => a.name.localeCompare(b.name));

  saveSymbols();
  populateSymbols($("symbolSearch")?.value || "");
  $("symbol").value = name;
  applySelectedSymbol();

  setValue("customSymbolName", "");
  setValue("customUnitSize", "");
  setValue("customValuePerUnit", "");
  setValue("customLotStep", "");
  show("addSymbolBox", false);
}

function setMainMode(mode) {
  if (mode === "discipline") {
    addClass("disciplineModeBtn", "active");
    removeClass("quickModeBtn", "active");
  } else {
    addClass("quickModeBtn", "active");
    removeClass("disciplineModeBtn", "active");
  }
  saveModes();
}

function setCalcMode(mode) {
  if (mode === "zone") {
    addClass("zoneCalcModeBtn", "active");
    removeClass("manualCalcModeBtn", "active");
    addClass("manualModeFields", "hidden");
    removeClass("zoneModeFields", "hidden");
  } else {
    addClass("manualCalcModeBtn", "active");
    removeClass("zoneCalcModeBtn", "active");
    removeClass("manualModeFields", "hidden");
    addClass("zoneModeFields", "hidden");
  }
  calculateZoneDerived();
  saveModes();
}

function trialActive() {
  if (!state.trialEndsAt) return false;
  return Date.now() < state.trialEndsAt;
}

function hasProAccess() {
  return !!state.pro || trialActive();
}

function startTrial() {
  if (trialActive()) return;
  state.trialUsed = true;
  state.trialEndsAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
  saveAuth();
  renderAuth();
}

function formatTimeRemaining(ms) {
  if (ms <= 0) return "expired";
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return `${days}d ${hours}h`;
}

function renderAuth() {
  const signedIn = !!state.signedIn;
  show("authSignedOut", !signedIn);
  show("authSignedIn", signedIn);

  if (signedIn) {
    const pro = hasProAccess();
    const suffix = state.pro ? " • Pro" : trialActive() ? " • Trial" : " • Free";
    setText("userStatus", `${state.email || "Signed in"}${suffix}`);

    if (trialActive()) {
      const left = state.trialEndsAt - Date.now();
      setText("trialBanner", `Trial active: ${formatTimeRemaining(left)} remaining.`);
    } else if (!state.pro && state.trialUsed) {
      setText("trialBanner", "Trial expired. Upgrade to unlock Pro tools.");
    } else if (!state.pro) {
      setText("trialBanner", "You are on Free plan.");
    } else {
      setText("trialBanner", "Pro is active.");
    }

    show("upgradeBtn", !state.pro);
  } else {
    show("upgradeBtn", false);
  }

  updateProUI();
}

function updateProUI() {
  const pro = hasProAccess();

  setText("lockStatus", pro ? "Ready" : "Pro required");
  $("lockStatus")?.classList.remove("ok", "warn", "bad");
  $("lockStatus")?.classList.add(pro ? "ok" : "warn");

  if (!pro) {
    setText("lockHint", "Start trial or upgrade to use discipline tools.");
  } else {
    updateLockStatus();
  }
}

function signUp() {
  const email = $("email")?.value?.trim() || "";
  const password = $("password")?.value || "";

  if (!email || !password || password.length < 6) {
    alert("Enter valid email and password with at least 6 characters.");
    return;
  }

  state.signedIn = true;
  state.email = email;
  if (!state.trialUsed && !state.pro) startTrial();
  saveAuth();
  renderAuth();
}

function signIn() {
  const email = $("email")?.value?.trim() || "";
  const password = $("password")?.value || "";

  if (!email || !password) {
    alert("Enter email and password.");
    return;
  }

  state.signedIn = true;
  state.email = email;
  if (!state.trialUsed && !state.pro) startTrial();
  saveAuth();
  renderAuth();
}

function signOut() {
  state.signedIn = false;
  saveAuth();
  renderAuth();
}

function upgradeToPro() {
  state.signedIn = true;
  state.pro = true;
  saveAuth();
  renderAuth();
  alert("Pro unlocked locally for this version.");
}

function showHelp() {
  alert(
    "How it works:\n\n" +
    "1. Set symbol, balance, risk, entry and SL/TP.\n" +
    "2. Manual mode = enter SL/TP distances manually.\n" +
    "3. Zone mode = zone size computes SL and TP1/TP2 automatically.\n" +
    "4. Pro tools are unlocked by trial or upgrade."
  );
}

function updateUnitLabels() {
  const sym = getSelectedSymbol();
  const label = sym ? `${sym.name} units` : "pips/ticks";
  if ($("slUnitsLabel")) $("slUnitsLabel").textContent = `SL (${label})`;
  if ($("tpUnitsLabel")) $("tpUnitsLabel").textContent = `TP (${label})`;
}

function calculateZoneDerived() {
  const top = inputNum("zoneTop");
  const bottom = inputNum("zoneBottom");
  const buffer = inputNum("zoneBuffer");
  const size = Math.abs(top - bottom);

  setValue("zoneSize", size ? fmt(size, 5) : "");
  const zoneSl = size + buffer;
  setValue("zoneSlUnits", zoneSl ? fmt(zoneSl, 5) : "");
  setValue("zoneTp1Units", zoneSl ? fmt(zoneSl * 1, 5) : "");
  setValue("zoneTp2Units", zoneSl ? fmt(zoneSl * 2, 5) : "");
}

function getCalcInputs() {
  const balance = inputNum("balance");
  const riskPct = inputNum("riskPct");
  const entry = inputNum("entry");
  const rr = inputNum("rr", 2);
  const unitSize = inputNum("unitSize");
  const valuePerUnit = inputNum("valuePerUnit");
  const lotStep = inputNum("lotStep", 0.01);
  const tpBuffer = inputNum("tpBuffer", 0);

  let slUnits = 0;
  let tpUnits = 0;

  const zoneMode = $("zoneCalcModeBtn")?.classList.contains("active");

  if (zoneMode) {
    calculateZoneDerived();
    slUnits = inputNum("zoneSlUnits");
    tpUnits = inputNum("zoneTp2Units");
  } else {
    slUnits = inputNum("slUnits");
    tpUnits = inputNum("tpUnits");
    if (!tpUnits || tpUnits <= 0) {
      tpUnits = slUnits * rr;
    }
    tpUnits += tpBuffer;
  }

  return {
    balance,
    riskPct,
    entry,
    rr,
    unitSize,
    valuePerUnit,
    lotStep,
    slUnits,
    tpUnits
  };
}

function computeTrade() {
  const {
    balance, riskPct, entry, unitSize, valuePerUnit, lotStep, slUnits, tpUnits
  } = getCalcInputs();

  const riskAmount = balance * (riskPct / 100);
  const lossPerLot = slUnits * valuePerUnit;

  let lots = 0;
  if (lossPerLot > 0) {
    lots = riskAmount / lossPerLot;
  }

  lots = roundToStep(lots, lotStep);

  const directionLong = isLong();

  const slPrice = directionLong
    ? entry - (slUnits * unitSize)
    : entry + (slUnits * unitSize);

  const tpPrice = directionLong
    ? entry + (tpUnits * unitSize)
    : entry - (tpUnits * unitSize);

  const totalLot = lots;
  const lot1 = roundToStep(totalLot * 0.5, lotStep);
  let lot2 = roundToStep(totalLot - lot1, lotStep);
  if (lot2 < 0) lot2 = 0;

  const tp1Units = slUnits;
  const tp2Units = slUnits * 2;

  const tp1Price = directionLong
    ? entry + (tp1Units * unitSize)
    : entry - (tp1Units * unitSize);

  const tp2Price = directionLong
    ? entry + (tp2Units * unitSize)
    : entry - (tp2Units * unitSize);

  const profitTp1 = lot1 * tp1Units * valuePerUnit;
  const profitTp2 = lot2 * tp2Units * valuePerUnit;
  const balanceAfterSl = balance - riskAmount;

  return {
    balance,
    riskAmount,
    lossPerLot,
    lots,
    slUnits,
    tpUnits,
    slPrice,
    tpPrice,
    totalLot,
    lot1,
    lot2,
    tp1Price,
    tp2Price,
    profitTp1,
    profitTp2,
    balanceAfterSl,
    valuePerUnit
  };
}

function renderTradeResults(result) {
  setText("riskOut", money(result.riskAmount));
  setText("lossPerLotOut", money(result.lossPerLot));
  setText("lotsOut", fmt(result.lots, 2));
  setText("slUnitsOut", fmt(result.slUnits, 2));
  setText("tpUnitsOut", fmt(result.tpUnits, 2));
  setText("slPriceOut", fmt(result.slPrice, 5));
  setText("tpPriceOut", fmt(result.tpPrice, 5));

  setText("totalLotOut", fmt(result.totalLot, 2));
  setText("lot1Out", fmt(result.lot1, 2));
  setText("lot2Out", fmt(result.lot2, 2));
  setText("tp1PriceOut", fmt(result.tp1Price, 5));
  setText("tp2PriceOut", fmt(result.tp2Price, 5));
  setText("beAfterTp1Out", "Yes");

  setText("balanceAfterSlOut", money(result.balanceAfterSl));
  setText("profitTp1Out", money(result.profitTp1));
  setText("profitTp2Out", money(result.profitTp2));
}

function getChallenge() {
  const accountSize = inputNum("accountSize");
  const dailyLossPct = inputNum("dailyLossPct");
  const maxLossPct = inputNum("maxLossPct");
  const todayPnl = inputNum("todayPnl");
  const totalPnL = inputNum("totalPnL");

  const dailyLimit = accountSize * (dailyLossPct / 100);
  const overallLimit = accountSize * (maxLossPct / 100);

  const remainingDaily = dailyLimit + todayPnl;
  const remainingOverall = overallLimit + totalPnL;

  return {
    accountSize,
    dailyLimit,
    overallLimit,
    remainingDaily,
    remainingOverall,
    todayPnl,
    totalPnL
  };
}

function renderChallenge(result) {
  setText("remainingDailyOut", money(result.remainingDaily));
  setText("remainingOverallOut", money(result.remainingOverall));
}

function updateTradeStatus(trade) {
  const ch = getChallenge();
  const risk = trade.riskAmount;

  renderChallenge(ch);

  let status = "OK";
  let cls = "ok";

  if (ch.remainingDaily <= 0 || ch.remainingOverall <= 0) {
    status = "Blocked: challenge limit already breached";
    cls = "bad";
  } else if (risk > ch.remainingDaily) {
    status = "Blocked: risk exceeds remaining daily limit";
    cls = "bad";
  } else if (risk > ch.remainingOverall) {
    status = "Blocked: risk exceeds remaining overall limit";
    cls = "bad";
  } else if (risk > ch.remainingDaily * 0.5) {
    status = "Caution: trade uses large part of daily limit";
    cls = "warn";
  }

  setText("tradeStatusOut", status);
  $("tradeStatusOut")?.classList.remove("ok", "warn", "bad");
  $("tradeStatusOut")?.classList.add(cls);

  const dailyUsePct = ch.remainingDaily > 0 ? (risk / ch.remainingDaily) * 100 : 0;
  setText("dailyUsePctOut", `${fmt(dailyUsePct, 2)}%`);

  let reality = "Healthy";
  let realityClass = "ok";

  if (dailyUsePct >= 100) {
    reality = "No – this trade would violate daily risk";
    realityClass = "bad";
  } else if (dailyUsePct >= 60) {
    reality = "Careful – very heavy relative to daily room";
    realityClass = "warn";
  }

  setText("realityCheckOut", reality);
  $("realityCheckOut")?.classList.remove("ok", "warn", "bad");
  $("realityCheckOut")?.classList.add(realityClass);

  return { status, cls };
}

function canTakeTrade() {
  const trade = computeTrade();
  const { status, cls } = updateTradeStatus(trade);

  let decision = "YES";
  let decisionClass = "ok";

  if (cls === "bad") {
    decision = "NO";
    decisionClass = "bad";
  } else if (cls === "warn") {
    decision = "MAYBE";
    decisionClass = "warn";
  }

  if (hasLockActive()) {
    decision = "NO – LOSS STREAK LOCK";
    decisionClass = "bad";
  }

  setText("decisionOut", decision);
  $("decisionOut")?.classList.remove("ok", "warn", "bad");
  $("decisionOut")?.classList.add(decisionClass);

  setText("clickStatus", status);
}

function calculateAll() {
  calculateZoneDerived();
  const trade = computeTrade();
  renderTradeResults(trade);
  updateTradeStatus(trade);
  saveState();
}

function applyChallengePreset(size) {
  setValue("accountSize", size);
  setValue("balance", size);
  setValue("dailyLossPct", 5);
  setValue("maxLossPct", 10);
  calculateAll();
}

function hasLockActive() {
  if (!lockState.lockedUntil) return false;
  return Date.now() < lockState.lockedUntil;
}

function updateLockStatus() {
  const pro = hasProAccess();
  if (!pro) {
    setText("lockStatus", "Pro required");
    $("lockStatus")?.classList.remove("ok", "bad");
    $("lockStatus")?.classList.add("warn");
    setText("lockHint", "Start trial or upgrade to use this.");
    return;
  }

  const streak = inputNum("streakNow", lockState.currentStreak);
  const maxStreak = inputNum("maxStreak", 3);

  if (hasLockActive()) {
    const ms = lockState.lockedUntil - Date.now();
    const minutes = Math.ceil(ms / (1000 * 60));
    setText("lockStatus", "LOCKED");
    $("lockStatus")?.classList.remove("ok", "warn");
    $("lockStatus")?.classList.add("bad");
    setText("lockHint", `Cooldown active: about ${minutes} min remaining.`);
    return;
  }

  if (streak >= maxStreak) {
    setText("lockStatus", "Ready to lock");
    $("lockStatus")?.classList.remove("ok", "bad");
    $("lockStatus")?.classList.add("warn");
    setText("lockHint", "Next loss will start cooldown.");
    return;
  }

  setText("lockStatus", "Ready");
  $("lockStatus")?.classList.remove("warn", "bad");
  $("lockStatus")?.classList.add("ok");
  setText("lockHint", `Current streak: ${streak}/${maxStreak}`);
}

function recordWin() {
  if (!hasProAccess()) {
    alert("Pro required.");
    return;
  }
  lockState.currentStreak = 0;
  lockState.lockedUntil = null;
  setValue("streakNow", 0);
  saveLock();
  updateLockStatus();
}

function recordLoss() {
  if (!hasProAccess()) {
    alert("Pro required.");
    return;
  }

  let streak = inputNum("streakNow", 0) + 1;
  const maxStreak = inputNum("maxStreak", 3);
  const cooldownMin = inputNum("cooldownMin", 120);

  setValue("streakNow", streak);
  lockState.currentStreak = streak;

  if (streak >= maxStreak) {
    lockState.lockedUntil = Date.now() + cooldownMin * 60 * 1000;
  }

  saveLock();
  updateLockStatus();
}

function resetLock() {
  lockState.currentStreak = 0;
  lockState.lockedUntil = null;
  setValue("streakNow", 0);
  saveLock();
  updateLockStatus();
}

function bindEvents() {
  $("signUpBtn")?.addEventListener("click", signUp);
  $("signInBtn")?.addEventListener("click", signIn);
  $("signOutBtn")?.addEventListener("click", signOut);
  $("upgradeBtn")?.addEventListener("click", upgradeToPro);
  $("helpBtn")?.addEventListener("click", showHelp);

  $("quickModeBtn")?.addEventListener("click", () => setMainMode("quick"));
  $("disciplineModeBtn")?.addEventListener("click", () => setMainMode("discipline"));

  $("manualCalcModeBtn")?.addEventListener("click", () => setCalcMode("manual"));
  $("zoneCalcModeBtn")?.addEventListener("click", () => setCalcMode("zone"));

  $("showAddSymbol")?.addEventListener("click", () => {
    const box = $("addSymbolBox");
    if (!box) return;
    box.style.display = box.style.display === "none" || !box.style.display ? "block" : "none";
  });

  $("addSymbolBtn")?.addEventListener("click", addCustomSymbol);
  $("symbolSearch")?.addEventListener("input", (e) => populateSymbols(e.target.value));
  $("symbol")?.addEventListener("change", () => {
    applySelectedSymbol();
    updateUnitLabels();
  });

  [
    "direction", "rr", "balance", "riskPct", "entry", "slUnits", "tpUnits", "tpBuffer",
    "zoneTop", "zoneBottom", "zoneBuffer", "unitSize", "valuePerUnit", "lotStep",
    "accountSize", "dailyLossPct", "maxLossPct", "todayPnl", "totalPnL", "streakNow",
    "maxStreak", "cooldownMin"
  ].forEach((id) => {
    $(id)?.addEventListener("input", () => {
      calculateAll();
      updateLockStatus();
    });
  });

  $("calcBtn")?.addEventListener("click", calculateAll);
  $("canTakeBtn")?.addEventListener("click", canTakeTrade);

  $("presetChallenge10K")?.addEventListener("click", () => applyChallengePreset(10000));
  $("presetChallenge25K")?.addEventListener("click", () => applyChallengePreset(25000));
  $("presetChallenge50K")?.addEventListener("click", () => applyChallengePreset(50000));
  $("presetChallenge100K")?.addEventListener("click", () => applyChallengePreset(100000));

  $("winBtn")?.addEventListener("click", recordWin);
  $("lossBtn")?.addEventListener("click", recordLoss);
  $("resetLockBtn")?.addEventListener("click", resetLock);
}

function init() {
  loadSymbols();
  loadState();
  loadAuth();
  loadLock();

  populateSymbols();
  if ($("symbol") && $("symbol").options.length > 0) {
    if (!$("symbol").value) $("symbol").selectedIndex = 0;
  }

  applySelectedSymbol();
  renderAuth();
  loadModes();
  bindEvents();
  calculateAll();

  if (lockState.currentStreak !== undefined) {
    setValue("streakNow", lockState.currentStreak);
  }
  updateLockStatus();

  setInterval(updateLockStatus, 30000);
}

document.addEventListener("DOMContentLoaded", init);
