// =====================================
// PropEngine - full app.js
// matched to the latest provided index.html
// =====================================

const $ = (id) => document.getElementById(id);

const STORAGE = {
  APP: "propengine_app_state_v2",
  AUTH: "propengine_auth_state_v2",
  LOCK: "propengine_lock_state_v2",
  SYMBOLS: "propengine_symbols_v2",
  MODES: "propengine_modes_v2"
};

// ---------------------
// helpers
// ---------------------
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

function fmt(n, digits = 2) {
  return Number(n).toFixed(digits);
}

function money(n) {
  return `${Number(n).toFixed(2)}`;
}

function floorToStep(value, step) {
  if (!step || step <= 0) return value;
  return Math.floor(value / step) * step;
}

function isLong() {
  return ($("direction")?.value || "LONG") === "LONG";
}

function setStatusClass(id, type) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("ok", "warn", "bad");

  if (type === "ok") el.classList.add("ok");
  if (type === "warn") el.classList.add("warn");
  if (type === "bad") el.classList.add("bad");
}

// ---------------------
// symbols
// ---------------------
const defaultSymbols = [
  { name: "EURUSD (FX)", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01, slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "GBPUSD (FX)", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01, slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "XAUUSD (Gold)", unitSize: 0.1, valuePerUnit: 1.0, lotStep: 0.01, slLabel: "SL (points)", tpLabel: "TP (points)" },
  { name: "NAS100 (Index)", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.01, slLabel: "SL (points)", tpLabel: "TP (points)" },
  { name: "US30 (Index)", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.01, slLabel: "SL (points)", tpLabel: "TP (points)" },
  { name: "GER40 (Index)", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.01, slLabel: "SL (points)", tpLabel: "TP (points)" },
  { name: "BTCUSD (Crypto)", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.01, slLabel: "SL (points)", tpLabel: "TP (points)" }
];

let symbols = [];
let authState = {
  signedIn: false,
  email: "",
  trialEndsAt: null,
  pro: false
};

let lockState = {
  currentStreak: 0,
  lockedUntil: null
};

// ---------------------
// auth
// ---------------------
function loadAuth() {
  try {
    const raw = localStorage.getItem(STORAGE.AUTH);
    if (!raw) return;
    authState = { ...authState, ...JSON.parse(raw) };
  } catch (e) {
    console.error("Auth load error", e);
  }
}

function saveAuth() {
  localStorage.setItem(STORAGE.AUTH, JSON.stringify(authState));
}

function trialActive() {
  return !!authState.trialEndsAt && Date.now() < authState.trialEndsAt;
}

function hasProAccess() {
  return !!authState.pro || trialActive();
}

function startTrial() {
  authState.trialEndsAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  saveAuth();
}

function trialDaysLeft() {
  if (!trialActive()) return 0;
  return Math.ceil((authState.trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000));
}

function renderAuth() {
  if (authState.signedIn) {
    show("authSignedOut", false);
    show("authSignedIn", true);
    setText("userStatus", `Signed in: ${authState.email}`);

    if (authState.pro) {
      setText("trialBanner", "PropEngine Pro active.");
      show("upgradeBtn", false);
    } else if (trialActive()) {
      setText("trialBanner", `PropEngine Trial active — ${trialDaysLeft()} day(s) left.`);
      show("upgradeBtn", true);
    } else {
      setText("trialBanner", "Trial expired. Upgrade to unlock Pro features.");
      show("upgradeBtn", true);
    }
  } else {
    show("authSignedOut", true);
    show("authSignedIn", false);
  }

  updateProUi();
}

function signUp() {
  const email = $("email")?.value?.trim() || "";
  const password = $("password")?.value || "";

  if (!email || !password || password.length < 6) {
    alert("Enter valid email and password (min. 6 chars).");
    return;
  }

  authState.signedIn = true;
  authState.email = email;

  if (!authState.pro && !trialActive()) {
    startTrial();
  }

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

  authState.signedIn = true;
  authState.email = email;

  if (!authState.pro && !trialActive()) {
    startTrial();
  }

  saveAuth();
  renderAuth();
}

function signOut() {
  authState.signedIn = false;
  saveAuth();
  renderAuth();
}

function upgradeToPro() {
  authState.signedIn = true;
  authState.pro = true;
  saveAuth();
  renderAuth();
  alert("Pro unlocked locally.");
}

function showHelp() {
  alert(
    "PropEngine help:\n\n" +
    "1. Select symbol.\n" +
    "2. Enter balance, risk, entry and SL.\n" +
    "3. Leave TP empty to use RR.\n" +
    "4. In Zone mode, zone size + buffer creates SL and TP levels.\n" +
    "5. Pro tools are unlocked by Trial or Pro."
  );
}

// ---------------------
// symbols logic
// ---------------------
function loadSymbols() {
  try {
    const raw = localStorage.getItem(STORAGE.SYMBOLS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        symbols = parsed;
        return;
      }
    }
  } catch (e) {
    console.error("Symbols load error", e);
  }

  symbols = [...defaultSymbols];
}

function saveSymbols() {
  localStorage.setItem(STORAGE.SYMBOLS, JSON.stringify(symbols));
}

function populateSymbols(filter = "") {
  const select = $("symbol");
  if (!select) return;

  const q = filter.toLowerCase().trim();
  const filtered = symbols.filter((s) => s.name.toLowerCase().includes(q));

  select.innerHTML = "";

  filtered.forEach((sym) => {
    const option = document.createElement("option");
    option.value = sym.name;
    option.textContent = sym.name;
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
  const name = $("symbol")?.value || "";
  return symbols.find((s) => s.name === name) || null;
}

function applySelectedSymbol() {
  const sym = getSelectedSymbol();
  if (!sym) return;

  setValue("unitSize", String(sym.unitSize).replace(".", ","));
  setValue("valuePerUnit", String(sym.valuePerUnit).replace(".", ","));
  setValue("lotStep", String(sym.lotStep).replace(".", ","));

  if ($("slUnitsLabel")) $("slUnitsLabel").textContent = sym.slLabel;
  if ($("tpUnitsLabel")) $("tpUnitsLabel").textContent = sym.tpLabel;
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

  symbols.push({
    name,
    unitSize,
    valuePerUnit,
    lotStep,
    slLabel: "SL (units)",
    tpLabel: "TP (units)"
  });

  symbols.sort((a, b) => a.name.localeCompare(b.name));
  saveSymbols();
  populateSymbols($("symbolSearch")?.value || "");
  $("symbol").value = name;
  applySelectedSymbol();
  calculateAll();

  setValue("customSymbolName", "");
  setValue("customUnitSize", "");
  setValue("customValuePerUnit", "");
  setValue("customLotStep", "");
  show("addSymbolBox", false);
}

// ---------------------
// modes
// ---------------------
function saveModes() {
  const payload = {
    main: $("disciplineModeBtn")?.classList.contains("active") ? "discipline" : "quick",
    calc: $("zoneCalcModeBtn")?.classList.contains("active") ? "zone" : "manual"
  };
  localStorage.setItem(STORAGE.MODES, JSON.stringify(payload));
}

function loadModes() {
  try {
    const raw = localStorage.getItem(STORAGE.MODES);
    if (!raw) {
      setMainMode("quick");
      setCalcMode("manual");
      return;
    }
    const parsed = JSON.parse(raw);
    setMainMode(parsed.main || "quick");
    setCalcMode(parsed.calc || "manual");
  } catch {
    setMainMode("quick");
    setCalcMode("manual");
  }
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

// ---------------------
// app state
// ---------------------
function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE.APP);
    if (!raw) return;
    const data = JSON.parse(raw);

    Object.entries(data).forEach(([id, value]) => {
      const el = $(id);
      if (el) el.value = value;
    });
  } catch (e) {
    console.error("App state load error", e);
  }
}

function saveAppState() {
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

  localStorage.setItem(STORAGE.APP, JSON.stringify(data));
}

// ---------------------
// lock state
// ---------------------
function loadLockState() {
  try {
    const raw = localStorage.getItem(STORAGE.LOCK);
    if (!raw) return;
    lockState = { ...lockState, ...JSON.parse(raw) };
  } catch (e) {
    console.error("Lock load error", e);
  }
}

function saveLockState() {
  localStorage.setItem(STORAGE.LOCK, JSON.stringify(lockState));
}

function hasActiveLock() {
  return !!lockState.lockedUntil && Date.now() < lockState.lockedUntil;
}

function updateLockStatus() {
  const statusEl = $("lockStatus");
  const hintEl = $("lockHint");
  if (!statusEl || !hintEl) return;

  if (!hasProAccess()) {
    setText("lockStatus", "Pro required");
    setStatusClass("lockStatus", "warn");
    setText("lockHint", "Sign in + Trial/Pro required.");
    return;
  }

  if (hasActiveLock()) {
    const mins = Math.ceil((lockState.lockedUntil - Date.now()) / (1000 * 60));
    setText("lockStatus", "Locked ❌");
    setStatusClass("lockStatus", "bad");
    setText("lockHint", `Cooldown active: ${mins} min left.`);
    return;
  }

  setText("lockStatus", "Unlocked ✅");
  setStatusClass("lockStatus", "ok");
  setText("lockHint", "");
}

function updateProUi() {
  updateLockStatus();
}

function recordWin() {
  if (!hasProAccess()) {
    alert("Pro required.");
    return;
  }

  lockState.currentStreak = 0;
  lockState.lockedUntil = null;
  setValue("streakNow", 0);
  saveLockState();
  updateLockStatus();
}

function recordLoss() {
  if (!hasProAccess()) {
    alert("Pro required.");
    return;
  }

  const maxStreak = inputNum("maxStreak", 3);
  const cooldownMin = inputNum("cooldownMin", 120);
  const next = inputNum("streakNow", 0) + 1;

  setValue("streakNow", next);
  lockState.currentStreak = next;

  if (next >= maxStreak) {
    lockState.lockedUntil = Date.now() + cooldownMin * 60 * 1000;
  }

  saveLockState();
  updateLockStatus();
}

function resetLock() {
  lockState.currentStreak = 0;
  lockState.lockedUntil = null;
  setValue("streakNow", 0);
  saveLockState();
  updateLockStatus();
}

// ---------------------
// zone mode
// ---------------------
function calculateZoneDerived() {
  const top = inputNum("zoneTop");
  const bottom = inputNum("zoneBottom");
  const buffer = inputNum("zoneBuffer", 2);

  const zoneSize = Math.abs(top - bottom);
  const zoneSl = zoneSize + buffer;
  const tp1 = zoneSl * 1;
  const tp2 = zoneSl * 2;

  setValue("zoneSize", zoneSize ? fmt(zoneSize, 2) : "");
  setValue("zoneSlUnits", zoneSl ? fmt(zoneSl, 2) : "");
  setValue("zoneTp1Units", tp1 ? fmt(tp1, 2) : "");
  setValue("zoneTp2Units", tp2 ? fmt(tp2, 2) : "");
}

// ---------------------
// challenge engine
// ---------------------
function getChallengeState() {
  const accountSize = inputNum("accountSize", inputNum("balance", 10000));
  const dailyLossPct = inputNum("dailyLossPct", 5);
  const maxLossPct = inputNum("maxLossPct", 10);
  const todayPnl = inputNum("todayPnl", 0);
  const totalPnL = inputNum("totalPnL", 0);

  const dailyLimit = accountSize * (dailyLossPct / 100);
  const overallLimit = accountSize * (maxLossPct / 100);

  const remainingDaily = dailyLimit + todayPnl;
  const remainingOverall = overallLimit + totalPnL;

  return {
    accountSize,
    dailyLossPct,
    maxLossPct,
    todayPnl,
    totalPnL,
    dailyLimit,
    overallLimit,
    remainingDaily,
    remainingOverall
  };
}

function renderChallenge() {
  const c = getChallengeState();
  setText("remainingDailyOut", money(c.remainingDaily));
  setText("remainingOverallOut", money(c.remainingOverall));
}

// ---------------------
// trade calc
// ---------------------
function getTradeInputs() {
  const balance = inputNum("balance", 10000);
  const riskPct = inputNum("riskPct", 0.5);
  const entry = inputNum("entry", 0);
  const rr = inputNum("rr", 2);
  const unitSize = inputNum("unitSize", 1);
  const valuePerUnit = inputNum("valuePerUnit", 1);
  const lotStep = inputNum("lotStep", 0.01);
  const tpBuffer = inputNum("tpBuffer", 0);

  let slUnits = 0;
  let tpUnits = 0;

  const zoneMode = $("zoneCalcModeBtn")?.classList.contains("active");

  if (zoneMode) {
    calculateZoneDerived();
    slUnits = inputNum("zoneSlUnits", 0);
    tpUnits = inputNum("zoneTp2Units", 0);
  } else {
    slUnits = inputNum("slUnits", 0);
    tpUnits = inputNum("tpUnits", 0);

    if (!tpUnits || tpUnits <= 0) {
      tpUnits = (slUnits * rr) + tpBuffer;
    }
  }

  return {
    balance,
    riskPct,
    entry,
    rr,
    unitSize,
    valuePerUnit,
    lotStep,
    tpBuffer,
    slUnits,
    tpUnits,
    zoneMode
  };
}

function computeTrade() {
  const x = getTradeInputs();

  const riskEur = x.balance * (x.riskPct / 100);
  const lossPerLot = x.slUnits * x.valuePerUnit;

  let totalLot = 0;
  if (lossPerLot > 0) {
    totalLot = riskEur / lossPerLot;
  }
  totalLot = floorToStep(totalLot, x.lotStep);

  let lot1 = floorToStep(totalLot * 0.5, x.lotStep);
  let lot2 = floorToStep(totalLot - lot1, x.lotStep);

  if (lot1 < 0) lot1 = 0;
  if (lot2 < 0) lot2 = 0;

  const directionLong = isLong();

  const slPrice = directionLong
    ? x.entry - (x.slUnits * x.unitSize)
    : x.entry + (x.slUnits * x.unitSize);

  const tpPrice = directionLong
    ? x.entry + (x.tpUnits * x.unitSize)
    : x.entry - (x.tpUnits * x.unitSize);

  const tp1Units = x.slUnits * 1;
  const tp2Units = x.slUnits * 2;

  const tp1Price = directionLong
    ? x.entry + (tp1Units * x.unitSize)
    : x.entry - (tp1Units * x.unitSize);

  const tp2Price = directionLong
    ? x.entry + (tp2Units * x.unitSize)
    : x.entry - (tp2Units * x.unitSize);

  const profitTp1 = lot1 * tp1Units * x.valuePerUnit;
  const profitTp2 = lot2 * tp2Units * x.valuePerUnit;
  const balanceAfterSl = x.balance - riskEur;

  return {
    ...x,
    riskEur,
    lossPerLot,
    totalLot,
    lot1,
    lot2,
    slPrice,
    tpPrice,
    tp1Price,
    tp2Price,
    profitTp1,
    profitTp2,
    balanceAfterSl
  };
}

function renderTrade(result) {
  setText("riskOut", money(result.riskEur));
  setText("lossPerLotOut", money(result.lossPerLot));
  setText("lotsOut", fmt(result.totalLot, 3));
  setText("slUnitsOut", fmt(result.slUnits, 2));
  setText("tpUnitsOut", fmt(result.tpUnits, 2));
  setText("slPriceOut", fmt(result.slPrice, 5));
  setText("tpPriceOut", fmt(result.tpPrice, 5));

  setText("totalLotOut", fmt(result.totalLot, 3));
  setText("lot1Out", fmt(result.lot1, 3));
  setText("lot2Out", fmt(result.lot2, 3));
  setText("tp1PriceOut", fmt(result.tp1Price, 5));
  setText("tp2PriceOut", fmt(result.tp2Price, 5));
  setText("beAfterTp1Out", "Yes");

  setText("balanceAfterSlOut", money(result.balanceAfterSl));
  setText("profitTp1Out", money(result.profitTp1));
  setText("profitTp2Out", money(result.profitTp2));
}

// ---------------------
// decision + reality
// ---------------------
function evaluateTrade(result) {
  const challenge = getChallengeState();

  renderChallenge();

  const dailyUsePct = challenge.remainingDaily > 0
    ? (result.riskEur / challenge.remainingDaily) * 100
    : 0;

  setText("dailyUsePctOut", `${fmt(dailyUsePct, 2)}%`);

  let challengeStatus = "OK ✅";
  let challengeClass = "ok";

  if (challenge.remainingDaily <= 0 || challenge.remainingOverall <= 0) {
    challengeStatus = "Blocked ❌";
    challengeClass = "bad";
  } else if (result.riskEur > challenge.remainingDaily) {
    challengeStatus = "Blocked ❌";
    challengeClass = "bad";
  } else if (result.riskEur > challenge.remainingOverall) {
    challengeStatus = "Blocked ❌";
    challengeClass = "bad";
  } else if (dailyUsePct >= 60) {
    challengeStatus = "Heavy risk ⚠️";
    challengeClass = "warn";
  }

  setText("tradeStatusOut", challengeStatus);
  setStatusClass("tradeStatusOut", challengeClass);

  let reality = "OK ✅";
  let realityClass = "ok";

  if (challenge.remainingDaily <= 0 || challenge.remainingOverall <= 0) {
    reality = "Challenge already breached ❌";
    realityClass = "bad";
  } else if (result.riskEur > challenge.remainingDaily) {
    reality = "Risk > remaining daily ❌";
    realityClass = "bad";
  } else if (result.riskEur > challenge.remainingOverall) {
    reality = "Risk > remaining overall ❌";
    realityClass = "bad";
  } else if (dailyUsePct >= 60) {
    reality = "Careful – this trade is heavy ⚠️";
    realityClass = "warn";
  }

  setText("realityCheckOut", reality);
  setStatusClass("realityCheckOut", realityClass);

  let decision = "OK ✅";
  let decisionClass = "ok";

  if (hasActiveLock()) {
    decision = "NO – loss lock active ❌";
    decisionClass = "bad";
  } else if (challengeClass === "bad") {
    decision = "NO ❌";
    decisionClass = "bad";
  } else if (challengeClass === "warn") {
    decision = "Careful ⚠️";
    decisionClass = "warn";
  }

  setText("decisionOut", decision);
  setStatusClass("decisionOut", decisionClass);

  setText("clickStatus", "Calculated ✅");
}

function calculateAll() {
  calculateZoneDerived();
  applySelectedSymbol();

  const result = computeTrade();
  renderTrade(result);
  evaluateTrade(result);
  updateLockStatus();
  saveAppState();
}

// ---------------------
// presets
// ---------------------
function applyChallengePreset(size) {
  setValue("accountSize", size);
  setValue("balance", size);
  setValue("dailyLossPct", 5);
  setValue("maxLossPct", 10);
  setValue("todayPnl", 0);
  setValue("totalPnL", 0);
  calculateAll();
}

// ---------------------
// events
// ---------------------
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

  $("symbolSearch")?.addEventListener("input", (e) => {
    populateSymbols(e.target.value);
  });

  $("symbol")?.addEventListener("change", () => {
    applySelectedSymbol();
    calculateAll();
  });

  [
    "direction", "rr", "balance", "riskPct", "entry", "slUnits", "tpUnits", "tpBuffer",
    "zoneTop", "zoneBottom", "zoneBuffer", "unitSize", "valuePerUnit", "lotStep",
    "accountSize", "dailyLossPct", "maxLossPct", "todayPnl", "totalPnL",
    "maxStreak", "cooldownMin", "streakNow"
  ].forEach((id) => {
    $(id)?.addEventListener("input", calculateAll);
  });

  $("calcBtn")?.addEventListener("click", calculateAll);
  $("canTakeBtn")?.addEventListener("click", calculateAll);

  $("presetChallenge10K")?.addEventListener("click", () => applyChallengePreset(10000));
  $("presetChallenge25K")?.addEventListener("click", () => applyChallengePreset(25000));
  $("presetChallenge50K")?.addEventListener("click", () => applyChallengePreset(50000));
  $("presetChallenge100K")?.addEventListener("click", () => applyChallengePreset(100000));

  $("winBtn")?.addEventListener("click", recordWin);
  $("lossBtn")?.addEventListener("click", recordLoss);
  $("resetLockBtn")?.addEventListener("click", resetLock);
}

// ---------------------
// init
// ---------------------
function init() {
  loadSymbols();
  loadAppState();
  loadAuth();
  loadLockState();

  populateSymbols();

  if ($("symbol") && $("symbol").options.length > 0 && !$("symbol").value) {
    $("symbol").selectedIndex = 0;
  }

  applySelectedSymbol();
  loadModes();
  renderAuth();

  if (lockState.currentStreak !== undefined) {
    setValue("streakNow", lockState.currentStreak);
  }

  bindEvents();
  calculateAll();

  setInterval(updateLockStatus, 30000);
}

document.addEventListener("DOMContentLoaded", init);
