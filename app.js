const $ = (id) => document.getElementById(id);

const STORAGE = {
  APP: "propengine_pairs_app_v1",
  AUTH: "propengine_pairs_auth_v1",
  LOCK: "propengine_pairs_lock_v1",
  MODES: "propengine_pairs_modes_v1"
};

// =========================
// HELPERS
// =========================
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
  return Number(n).toFixed(2) + " €";
}


function floorToStep(value, step) {
  if (!step || step <= 0) return value;
  return Math.floor(value / step) * step;
}

function setStatusClass(id, type) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("ok", "warn", "bad");
  if (type === "ok") el.classList.add("ok");
  if (type === "warn") el.classList.add("warn");
  if (type === "bad") el.classList.add("bad");
}

function isLong() {
  return ($("direction")?.value || "LONG") === "LONG";
}

// =========================
// ACCESS / AUTH
// =========================
let authState = {
  signedIn: false,
  email: "",
  trialEndsAt: null,
  pro: false
};

function isSignedIn() {
  return !!authState.signedIn;
}

function isTrialActive() {
  return !!authState.trialEndsAt && Date.now() < authState.trialEndsAt;
}

function isProActive() {
  return !!authState.pro;
}

function hasPremiumAccess() {
  return isTrialActive() || isProActive();
}

function trialDaysLeft() {
  if (!isTrialActive()) return 0;
  return Math.ceil((authState.trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000));
}

function startTrial() {
  authState.trialEndsAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  saveAuth();
}

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

function renderAuth() {
  if (isSignedIn()) {
    show("authSignedOut", false);
    show("authSignedIn", true);
     return Number(n).toFixed(2) + " €";
}

    if (isProActive()) {
      setText("trialBanner", "PropEngine Pro active.");
      show("upgradeBtn", false);
    } else if (isTrialActive()) {
      setText("trialBanner", "PropEngine Trial active — " + trialDaysLeft() + " day(s) left.");
      show("upgradeBtn", true);
    } else {
      setText("trialBanner", "Free plan active. Upgrade to unlock premium features.");
      show("upgradeBtn", true);
    }
  } else {
    show("authSignedOut", true);
    show("authSignedIn", false);
  }

  updateAccessUi();
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

  if (!isTrialActive() && !isProActive()) {
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

  if (!isTrialActive() && !isProActive()) {
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
  alert("Pro unlocked locally for now.");
}

function showHelp() {
  alert(
    "Free = Manual calculator.\n" +
    "Trial / Pro = Zone mode, Split TP, Reality check, Challenge engine, Loss-streak lock, Custom symbols."
  );
}

function updateAccessUi() {
  const premium = hasPremiumAccess();

  if ($("planBadge")) {
    $("planBadge").textContent =
      isProActive() ? "Pro Active" :
      isTrialActive() ? "Trial Active" :
      "Free Plan";
  }

  if ($("zoneCalcModeBtn")) $("zoneCalcModeBtn").disabled = !premium;
  if ($("canTakeBtn")) $("canTakeBtn").disabled = !premium;
  if ($("showAddSymbol")) $("showAddSymbol").disabled = !premium;

  if (!premium && $("zoneCalcModeBtn")?.classList.contains("active")) {
    setCalcMode("manual");
  }

  if ($("premiumUpsell")) show("premiumUpsell", !premium);
  if ($("realityCard")) show("realityCard", premium);
  if ($("challengeCard")) show("challengeCard", premium);
  if ($("lockCard")) show("lockCard", premium);

  if (!premium) {
    ["totalLotOut", "lot1Out", "lot2Out", "tp1PriceOut", "tp2PriceOut", "beAfterTp1Out", "decisionOut"].forEach((id) => {
      if ($(id)) setText(id, "Pro");
    });
  }
}

// =========================
// SYMBOLS - PAIR MODEL
// valuePerUnit = EUR value of 1 pip/point/unit at 1 lot
// =========================
const defaultSymbols = [
  // FX majors
  { name: "EURUSD", type: "fx", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01, entry: "1,10000", slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "GBPUSD", type: "fx", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01, entry: "1,27000", slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "AUDUSD", type: "fx", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01, entry: "0,66000", slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "NZDUSD", type: "fx", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01, entry: "0,61000", slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "USDCAD", type: "fx", unitSize: 0.0001, valuePerUnit: 7.0, lotStep: 0.01, entry: "1,35000", slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "USDCHF", type: "fx", unitSize: 0.0001, valuePerUnit: 10.0, lotStep: 0.01, entry: "0,89000", slLabel: "SL (pips)", tpLabel: "TP (pips)" },

  // JPY pairs
  { name: "USDJPY", type: "jpy", unitSize: 0.01, valuePerUnit: 6.2, lotStep: 0.01, entry: "150,00", slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "EURJPY", type: "jpy", unitSize: 0.01, valuePerUnit: 6.2, lotStep: 0.01, entry: "182,33", slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "GBPJPY", type: "jpy", unitSize: 0.01, valuePerUnit: 6.2, lotStep: 0.01, entry: "191,00", slLabel: "SL (pips)", tpLabel: "TP (pips)" },

  // Metals
  { name: "XAUUSD", type: "metal", unitSize: 0.01, valuePerUnit: 1.0, lotStep: 0.01, entry: "2150,00", slLabel: "SL (points)", tpLabel: "TP (points)" },
  { name: "XAGUSD", type: "metal", unitSize: 0.01, valuePerUnit: 5.0, lotStep: 0.01, entry: "24,50", slLabel: "SL (points)", tpLabel: "TP (points)" },

  // Indices
  { name: "NAS100", type: "index", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.01, entry: "18000", slLabel: "SL (points)", tpLabel: "TP (points)" },
  { name: "US30", type: "index", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.01, entry: "39000", slLabel: "SL (points)", tpLabel: "TP (points)" },
  { name: "GER40", type: "index", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.01, entry: "17500", slLabel: "SL (points)", tpLabel: "TP (points)" },
  { name: "SPX500", type: "index", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.01, entry: "5100", slLabel: "SL (points)", tpLabel: "TP (points)" },

  // Crypto
  { name: "BTCUSD", type: "crypto", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.01, entry: "70000", slLabel: "SL (points)", tpLabel: "TP (points)" },
  { name: "ETHUSD", type: "crypto", unitSize: 1, valuePerUnit: 1.0, lotStep: 0.01, entry: "3500", slLabel: "SL (points)", tpLabel: "TP (points)" }
];

let symbols = [...defaultSymbols];

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

function applySelectedSymbol(forceEntry = false) {
  const sym = getSelectedSymbol();
  if (!sym) return;

  setValue("unitSize", String(sym.unitSize).replace(".", ","));
  setValue("valuePerUnit", String(sym.valuePerUnit).replace(".", ","));
  setValue("lotStep", String(sym.lotStep).replace(".", ","));

  if ($("slUnitsLabel")) $("slUnitsLabel").textContent = sym.slLabel;
  if ($("tpUnitsLabel")) $("tpUnitsLabel").textContent = sym.tpLabel;

  if (forceEntry || !$("entry")?.value?.trim()) {
    setValue("entry", sym.entry || "");
  }
}

function addCustomSymbol() {
  if (!hasPremiumAccess()) {
    alert("Custom symbols are available in Trial / Pro.");
    return;
  }

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
    type: "custom",
    unitSize,
    valuePerUnit,
    lotStep,
    entry: "",
    slLabel: "SL (units)",
    tpLabel: "TP (units)"
  });

  symbols.sort((a, b) => a.name.localeCompare(b.name));
  populateSymbols($("symbolSearch")?.value || "");
  $("symbol").value = name;
  applySelectedSymbol(false);
  calculateAll();

  setValue("customSymbolName", "");
  setValue("customUnitSize", "");
  setValue("customValuePerUnit", "");
  setValue("customLotStep", "");
  show("addSymbolBox", false);
}

// =========================
// MODES
// =========================
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
    if (!hasPremiumAccess()) {
      alert("Discipline mode is available in Trial / Pro.");
      return;
    }
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
    if (!hasPremiumAccess()) {
      alert("Zone mode is available in Trial / Pro.");
      return;
    }
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

// =========================
// LOCK
// =========================
let lockState = {
  currentStreak: 0,
  lockedUntil: null
};

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
  if (!$("lockStatus") || !$("lockHint")) return;

  if (!hasPremiumAccess()) {
    setText("lockStatus", "Pro required");
    setStatusClass("lockStatus", "warn");
    setText("lockHint", "Unlock with Trial or Pro.");
    return;
  }

  if (hasActiveLock()) {
    const mins = Math.ceil((lockState.lockedUntil - Date.now()) / (1000 * 60));
    setText("lockStatus", "Locked ❌");
    setStatusClass("lockStatus", "bad");
    setText("lockHint", Cooldown active: ${mins} min left.);
    return;
  }

  setText("lockStatus", "Unlocked ✅");
  setStatusClass("lockStatus", "ok");
  setText("lockHint", "");
}

function recordWin() {
  if (!hasPremiumAccess()) {
    alert("Loss-streak lock is available in Trial / Pro.");
    return;
  }

  lockState.currentStreak = 0;
  lockState.lockedUntil = null;
  setValue("streakNow", 0);
  saveLockState();
  updateLockStatus();
}

function recordLoss() {
  if (!hasPremiumAccess()) {
    alert("Loss-streak lock is available in Trial / Pro.");
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

// =========================
// APP STATE
// =========================
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

// =========================
// CALC LOGIC
// =========================
function calculateZoneDerived() {
  const top = inputNum("zoneTop");
  const bottom = inputNum("zoneBottom");
  const buffer = inputNum("zoneBuffer", 2);
  const unitSize = inputNum("unitSize", 0.0001);

  if (!top || !bottom || !unitSize) {
    setValue("zoneSize", "");
    setValue("zoneSlUnits", "");
    setValue("zoneTp1Units", "");
    setValue("zoneTp2Units", "");
    return;
  }

  const rawDiff = Math.abs(top - bottom);
  const zoneSizeUnits = rawDiff / unitSize;
  const slUnits = zoneSizeUnits + buffer;
  const tp1Units = slUnits;
  const tp2Units = slUnits * 2;

  setValue("zoneSize", fmt(zoneSizeUnits, 2));
  setValue("zoneSlUnits", fmt(slUnits, 2));
  setValue("zoneTp1Units", fmt(tp1Units, 2));
  setValue("zoneTp2Units", fmt(tp2Units, 2));
}

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

  return { remainingDaily, remainingOverall };
}

function renderChallenge() {
  const c = getChallengeState();
  if ($("remainingDailyOut")) setText("remainingDailyOut", money(c.remainingDaily));
  if ($("remainingOverallOut")) setText("remainingOverallOut", money(c.remainingOverall));
}

function getTradeInputs() {
  const balance = inputNum("balance", 10000);
  const riskPct = inputNum("riskPct", 0.5);
  const entry = inputNum("entry", 0);
  const rr = inputNum("rr", 2);
  const unitSize = inputNum("unitSize", 0.0001);
  const valuePerUnit = inputNum("valuePerUnit", 9);
  const lotStep = inputNum("lotStep", 0.01);
  const tpBuffer = inputNum("tpBuffer", 0);

  let slUnits = 0;
  let tpUnits = 0;

  const zoneMode = $("zoneCalcModeBtn")?.classList.contains("active") && hasPremiumAccess();

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
    unitSize,
    valuePerUnit,
    lotStep,
    slUnits,
    tpUnits
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

  const longTrade = isLong();

  const slPrice = longTrade
    ? x.entry - (x.slUnits * x.unitSize)
    : x.entry + (x.slUnits * x.unitSize);

  const tpPrice = longTrade
    ? x.entry + (x.tpUnits * x.unitSize)
    : x.entry - (x.tpUnits * x.unitSize);

  const tp1Units = x.slUnits;
  const tp2Units = x.slUnits * 2;

  const tp1Price = longTrade
    ? x.entry + (tp1Units * x.unitSize)
    : x.entry - (tp1Units * x.unitSize);

  const tp2Price = longTrade
    ? x.entry + (tp2Units * x.unitSize)
    : x.entry - (tp2Units * x.unitSize);

  const profitTp1 = lot1 * tp1Units * x.valuePerUnit;
  const profitTp2 = lot2 * tp2Units * x.valuePerUnit;
  const balanceAfterSl = x.balance - riskEur;

  return {
    riskEur,
    lossPerLot,
    totalLot,
    lot1,
    lot2,
    slUnits: x.slUnits,
    tpUnits: x.tpUnits,
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

  if (hasPremiumAccess()) {
    setText("totalLotOut", fmt(result.totalLot, 3));
    setText("lot1Out", fmt(result.lot1, 3));
    setText("lot2Out", fmt(result.lot2, 3));
    setText("tp1PriceOut", fmt(result.tp1Price, 5));
    setText("tp2PriceOut", fmt(result.tp2Price, 5));
    setText("beAfterTp1Out", "Yes");

    if ($("balanceAfterSlOut")) setText("balanceAfterSlOut", money(result.balanceAfterSl));
    if ($("profitTp1Out")) setText("profitTp1Out", money(result.profitTp1));
    if ($("profitTp2Out")) setText("profitTp2Out", money(result.profitTp2));
  }
}

function evaluateTrade(result) {
  if (!hasPremiumAccess()) {
    setText("clickStatus", "Calculated ✅");
    return;
  }

  const c = getChallengeState();
  renderChallenge();

  const dailyUsePct = c.remainingDaily > 0 ? (result.riskEur / c.remainingDaily) * 100 : 0;
  if ($("dailyUsePctOut")) setText("dailyUsePctOut", ${fmt(dailyUsePct, 2)}%);

  let tradeStatus = "OK ✅";
  let tradeClass = "ok";

  if (c.remainingDaily <= 0 || c.remainingOverall <= 0) {
    tradeStatus = "Blocked ❌";
    tradeClass = "bad";
  } else if (result.riskEur > c.remainingDaily || result.riskEur > c.remainingOverall) {
    tradeStatus = "Blocked ❌";
    tradeClass = "bad";
  } else if (dailyUsePct >= 60) {
    tradeStatus = "Heavy risk ⚠️";
    tradeClass = "warn";
  }

  if ($("tradeStatusOut")) {
    setText("tradeStatusOut", tradeStatus);
    setStatusClass("tradeStatusOut", tradeClass);
  }

  let reality = "OK ✅";
  let realityClass = "ok";

  if (tradeClass === "bad") {
    reality = "Risk too high ❌";
    realityClass = "bad";
  } else if (tradeClass === "warn") {
    reality = "Careful – heavy trade ⚠️";
    realityClass = "warn";
  }

  if ($("realityCheckOut")) {
    setText("realityCheckOut", reality);
    setStatusClass("realityCheckOut", realityClass);
  }

  let decision = "OK ✅";
  let decisionClass = "ok";

  if (hasActiveLock()) {
    decision = "NO – loss lock active ❌";
    decisionClass = "bad";
  } else if (tradeClass === "bad") {
    decision = "NO ❌";
    decisionClass = "bad";
  } else if (tradeClass === "warn") {
    decision = "Careful ⚠️";
    decisionClass = "warn";
  }

  setText("decisionOut", decision);
  setStatusClass("decisionOut", decisionClass);

  setText("clickStatus", "Calculated ✅");
}

function calculateAll() {
  calculateZoneDerived();
  const result = computeTrade();
  renderTrade(result);
  evaluateTrade(result);
  updateLockStatus();
  saveAppState();
}

// =========================
// PRESETS
// =========================
function applyChallengePreset(size) {
  if (!hasPremiumAccess()) {
    alert("Challenge engine is available in Trial / Pro.");
    return;
  }

  setValue("accountSize", size);
  setValue("balance", size);
  setValue("dailyLossPct", 5);
  setValue("maxLossPct", 10);
  setValue("todayPnl", 0);
  setValue("totalPnL", 0);
  calculateAll();
}

// =========================
// EVENTS
// =========================
function bindEvents() {
  $("signUpBtn")?.addEventListener("click", signUp);
  $("signInBtn")?.addEventListener("click", signIn);
  $("signOutBtn")?.addEventListener("click", signOut);
  $("upgradeBtn")?.addEventListener("click", upgradeToPro);
  $("upgradeBtnSecondary")?.addEventListener("click", upgradeToPro);
  $("helpBtn")?.addEventListener("click", showHelp);

  $("startTrialBtn")?.addEventListener("click", () => {
    if (!isSignedIn()) {
      alert("Create account or sign in first.");
      return;
    }
    if (!isTrialActive() && !isProActive()) {
      startTrial();
      renderAuth();
      alert("7-day trial started.");
    }
  });

  $("quickModeBtn")?.addEventListener("click", () => setMainMode("quick"));
  $("disciplineModeBtn")?.addEventListener("click", () => setMainMode("discipline"));

  $("manualCalcModeBtn")?.addEventListener("click", () => setCalcMode("manual"));
  $("zoneCalcModeBtn")?.addEventListener("click", () => setCalcMode("zone"));

  $("showAddSymbol")?.addEventListener("click", () => {
    if (!hasPremiumAccess()) {
      alert("Custom symbols are available in Trial / Pro.");
      return;
    }
    const box = $("addSymbolBox");
    if (!box) return;
    box.style.display = box.style.display === "none" || !box.style.display ? "block" : "none";
  });

  $("addSymbolBtn")?.addEventListener("click", addCustomSymbol);

  $("symbolSearch")?.addEventListener("input", (e) => {
    populateSymbols(e.target.value);
  });

  $("symbol")?.addEventListener("change", () => {
    applySelectedSymbol(true);
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
  $("canTakeBtn")?.addEventListener("click", () => {
    if (!hasPremiumAccess()) {
      alert("Decision engine is available in Trial / Pro.");
      return;
    }
    calculateAll();
  });

  $("presetChallenge10K")?.addEventListener("click", () => applyChallengePreset(10000));
  $("presetChallenge25K")?.addEventListener("click", () => applyChallengePreset(25000));
  $("presetChallenge50K")?.addEventListener("click", () => applyChallengePreset(50000));
  $("presetChallenge100K")?.addEventListener("click", () => applyChallengePreset(100000));

  $("winBtn")?.addEventListener("click", recordWin);
  $("lossBtn")?.addEventListener("click", recordLoss);
  $("resetLockBtn")?.addEventListener("click", resetLock);
}

// =========================
// INIT
// =========================
function init() {
  loadAuth();
  loadAppState();
  loadLockState();

  populateSymbols();

  if ($("symbol") && $("symbol").options.length > 0 && !$("symbol").value) {
    $("symbol").selectedIndex = 0;
  }

  applySelectedSymbol(false);
  loadModes();
  bindEvents();
  renderAuth();

  if (lockState.currentStreak !== undefined) {
    setValue("streakNow", lockState.currentStreak);
  }

  calculateAll();
  setInterval(updateLockStatus, 30000);
}

document.addEventListener("DOMContentLoaded", init);
