const $ = function (id) {
  return document.getElementById(id);
};

const STORAGE = {
  AUTH: "propengine_auth_v2",
  APP: "propengine_app_v2",
  LOCK: "propengine_lock_v2",
  MODES: "propengine_modes_v2",
  CUSTOM_SYMBOLS: "propengine_custom_symbols_v2"
};

// =========================
// HELPERS
// =========================
function parseNum(value, fallback) {
  if (fallback === undefined) fallback = 0;
  if (value === null || value === undefined) return fallback;

  var cleaned = String(value)
    .replace(/\s/g, "")
    .replace(",", ".")
    .trim();

  var n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

function inputNum(id, fallback) {
  if (fallback === undefined) fallback = 0;
  var el = $(id);
  if (!el) return fallback;
  return parseNum(el.value, fallback);
}

function setText(id, value) {
  var el = $(id);
  if (el) el.textContent = value;
}

function setValue(id, value) {
  var el = $(id);
  if (el) el.value = value;
}

function show(id, visible) {
  if (visible === undefined) visible = true;
  var el = $(id);
  if (!el) return;
  el.style.display = visible ? "" : "none";
}

function addClass(id, cls) {
  var el = $(id);
  if (el) el.classList.add(cls);
}

function removeClass(id, cls) {
  var el = $(id);
  if (el) el.classList.remove(cls);
}

function fmt(n, digits) {
  if (digits === undefined) digits = 2;
  return Number(n).toFixed(digits);
}

function money(n) {
  return Number(n).toFixed(2) + " €";
}

function floorToStep(value, step) {
  if (!step || step <= 0) return value;
  return Math.floor(value / step) * step;
}

function isLong() {
  var dir = $("direction");
  return !dir || dir.value === "LONG";
}

function setStatusClass(id, type) {
  var el = $(id);
  if (!el) return;
  el.classList.remove("ok", "warn", "bad");
  if (type === "ok") el.classList.add("ok");
  if (type === "warn") el.classList.add("warn");
  if (type === "bad") el.classList.add("bad");
}

function setMirroredText(baseId, value) {
  setText(baseId, value);
  setText(baseId + "_dup", value);
}

// =========================
// SYMBOLS
// valuePerUnit = value of 1 pip/point/unit at 1 lot in EUR
// =========================
var defaultSymbols = [
  // FX majors
  { name: "EURUSD", unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01, entry: "1,10000", slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "GBPUSD", unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01, entry: "1,27000", slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "AUDUSD", unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01, entry: "0,66000", slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "NZDUSD", unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01, entry: "0,61000", slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "USDCAD", unitSize: 0.0001, valuePerUnit: 7.4, lotStep: 0.01, entry: "1,35000", slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "USDCHF", unitSize: 0.0001, valuePerUnit: 10.2, lotStep: 0.01, entry: "0,89000", slLabel: "SL (pips)", tpLabel: "TP (pips)" },

  // JPY pairs
  { name: "USDJPY", unitSize: 0.01, valuePerUnit: 6.2, lotStep: 0.01, entry: "150,00", slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "EURJPY", unitSize: 0.01, valuePerUnit: 6.2, lotStep: 0.01, entry: "182,33", slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "GBPJPY", unitSize: 0.01, valuePerUnit: 6.2, lotStep: 0.01, entry: "191,00", slLabel: "SL (pips)", tpLabel: "TP (pips)" },

  // Metals
  { name: "XAUUSD", unitSize: 0.01, valuePerUnit: 1, lotStep: 0.01, entry: "2150,00", slLabel: "SL (points)", tpLabel: "TP (points)" },
  { name: "XAGUSD", unitSize: 0.01, valuePerUnit: 5, lotStep: 0.01, entry: "24,50", slLabel: "SL (points)", tpLabel: "TP (points)" },

  // Indices
  { name: "NAS100", unitSize: 1, valuePerUnit: 1, lotStep: 0.01, entry: "18000", slLabel: "SL (points)", tpLabel: "TP (points)" },
  { name: "US30", unitSize: 1, valuePerUnit: 1, lotStep: 0.01, entry: "39000", slLabel: "SL (points)", tpLabel: "TP (points)" },
  { name: "GER40", unitSize: 1, valuePerUnit: 1, lotStep: 0.01, entry: "17500", slLabel: "SL (points)", tpLabel: "TP (points)" },
  { name: "SPX500", unitSize: 1, valuePerUnit: 1, lotStep: 0.01, entry: "5100", slLabel: "SL (points)", tpLabel: "TP (points)" },

  // Crypto
  { name: "BTCUSD", unitSize: 1, valuePerUnit: 1, lotStep: 0.01, entry: "70000", slLabel: "SL (points)", tpLabel: "TP (points)" },
  { name: "ETHUSD", unitSize: 1, valuePerUnit: 1, lotStep: 0.01, entry: "3500", slLabel: "SL (points)", tpLabel: "TP (points)" }
];

var customSymbols = [];
var symbols = [];

function loadCustomSymbols() {
  try {
    var raw = localStorage.getItem(STORAGE.CUSTOM_SYMBOLS);
    customSymbols = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(customSymbols)) customSymbols = [];
  } catch (e) {
    customSymbols = [];
  }
}

function saveCustomSymbols() {
  localStorage.setItem(STORAGE.CUSTOM_SYMBOLS, JSON.stringify(customSymbols));
}

function rebuildSymbols() {
  symbols = defaultSymbols.concat(customSymbols);
}

function populateSymbols(filterText) {
  if (filterText === undefined) filterText = "";
  var select = $("symbol");
  if (!select) return;

  var q = String(filterText).toLowerCase().trim();
  var filtered = symbols.filter(function (s) {
    return s.name.toLowerCase().indexOf(q) !== -1;
  });

  select.innerHTML = "";

  filtered.forEach(function (sym) {
    var option = document.createElement("option");
    option.value = sym.name;
    option.textContent = sym.name;
    select.appendChild(option);
  });

  if (!filtered.length) {
    var empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "No symbol found";
    select.appendChild(empty);
  }
}

function getSelectedSymbol() {
  var name = $("symbol") ? $("symbol").value : "";
  for (var i = 0; i < symbols.length; i++) {
    if (symbols[i].name === name) return symbols[i];
  }
  return null;
}

function applySelectedSymbol(forceEntry) {
  if (forceEntry === undefined) forceEntry = false;

  var sym = getSelectedSymbol();
  if (!sym) return;

  setValue("unitSize", String(sym.unitSize).replace(".", ","));
  setValue("valuePerUnit", String(sym.valuePerUnit).replace(".", ","));
  setValue("lotStep", String(sym.lotStep).replace(".", ","));

  if ($("slUnitsLabel")) $("slUnitsLabel").textContent = sym.slLabel;
  if ($("tpUnitsLabel")) $("tpUnitsLabel").textContent = sym.tpLabel;

  if (forceEntry || !($("entry") && $("entry").value && $("entry").value.trim())) {
    setValue("entry", sym.entry);
  }
}

function addCustomSymbol() { if (!hasPremiumAccess()) {
    alert("Custom symbols are available in Trial / Pro.");
    return;
  }

  var name = $("customSymbolName") ? $("customSymbolName").value.trim() : "";
  var unitSize = parseNum($("customUnitSize") ? $("customUnitSize").value : "", NaN);
  var valuePerUnit = parseNum($("customValuePerUnit") ? $("customValuePerUnit").value : "", NaN);
  var lotStep = parseNum($("customLotStep") ? $("customLotStep").value : "", NaN);

  if (!name || !Number.isFinite(unitSize) || !Number.isFinite(valuePerUnit) || !Number.isFinite(lotStep)) {
    alert("Fill all custom symbol fields correctly.");
    return;
  }

  customSymbols.push({
    name: name,
    unitSize: unitSize,
    valuePerUnit: valuePerUnit,
    lotStep: lotStep,
    entry: "",
    slLabel: "SL (units)",
    tpLabel: "TP (units)"
  });

  customSymbols.sort(function (a, b) {
    return a.name.localeCompare(b.name);
  });

  saveCustomSymbols();
  rebuildSymbols();
  populateSymbols($("symbolSearch") ? $("symbolSearch").value : "");
  if ($("symbol")) $("symbol").value = name;
  applySelectedSymbol(false);

  setValue("customSymbolName", "");
  setValue("customUnitSize", "");
  setValue("customValuePerUnit", "");
  setValue("customLotStep", "");
  show("addSymbolBox", false);

  calculateAll();
}

// =========================
// AUTH / ACCESS
// =========================
var authState = {
  signedIn: false,
  email: "",
  trialEndsAt: null,
  pro: false
};

function loadAuth() {
  try {
    var raw = localStorage.getItem(STORAGE.AUTH);
    if (!raw) return;
    var parsed = JSON.parse(raw);
    authState = {
      signedIn: !!parsed.signedIn,
      email: parsed.email || "",
      trialEndsAt: parsed.trialEndsAt || null,
      pro: !!parsed.pro
    };
  } catch (e) {
    console.error("Auth load error", e);
  }
}

function saveAuth() {
  localStorage.setItem(STORAGE.AUTH, JSON.stringify(authState));
}

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

function renderAuth() {
  if (isSignedIn()) {
    show("authSignedOut", false);
    show("authSignedIn", true);
    setText("userStatus", "Signed in: " + authState.email);

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
  var email = $("email") ? $("email").value.trim() : "";
  var password = $("password") ? $("password").value : "";

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
  var email = $("email") ? $("email").value.trim() : "";
  var password = $("password") ? $("password").value : "";

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
  if ($("email") && $("email").value.trim()) {
    authState.email = $("email").value.trim();
  }
  authState.pro = true;
  saveAuth();
  renderAuth();
  alert("Pro unlocked locally for now.");
}

function showHelp() {
  alert("Free = Manual calculator. Trial / Pro = Zone mode, Split TP, Reality check, Challenge engine, Loss-streak lock, Custom symbols.");
}

function updateAccessUi() {
  var premium = hasPremiumAccess();

  if ($("planBadge")) {
    if (isProActive()) $("planBadge").textContent = "Pro Active";
    else if (isTrialActive()) $("planBadge").textContent = "Trial Active";
    else $("planBadge").textContent = "Free Plan";
  }

  if ($("zoneCalcModeBtn")) $("zoneCalcModeBtn").disabled = !premium;
  if ($("canTakeBtn")) $("canTakeBtn").disabled = !premium;
  if ($("showAddSymbol")) $("showAddSymbol").disabled = !premium;

  if (!premium && $("zoneCalcModeBtn") && $("zoneCalcModeBtn").classList.contains("active")) {
    setCalcMode("manual");
  }

  if ($("premiumUpsell")) show("premiumUpsell", !premium);
  if ($("realityCard")) show("realityCard", premium);
  if ($("challengeCard")) show("challengeCard", premium);
  if ($("lockCard")) show("lockCard", premium);

  if (!premium) {
    setText("totalLotOut", "Pro");
    setText("lot1Out", "Pro");
    setText("lot2Out", "Pro");
    setText("tp1PriceOut", "Pro");
    setText("tp2PriceOut", "Pro");
    setText("beAfterTp1Out", "Pro");
    setText("decisionOut", "Pro");
    setText("decisionOut_dup", "Pro");
  }
}

// =========================
// LOCK STATE
// =========================
var lockState = {
  currentStreak: 0,
  lockedUntil: null
};

function loadLockState() {
  try {
    var raw = localStorage.getItem(STORAGE.LOCK);
    if (!raw) return;
    var parsed = JSON.parse(raw);
    lockState.currentStreak = parsed.currentStreak || 0;
    lockState.lockedUntil = parsed.lockedUntil || null;
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
    var mins = Math.ceil((lockState.lockedUntil - Date.now()) / (1000 * 60));
    setText("lockStatus", "Locked ❌");
    setStatusClass("lockStatus", "bad");
    setText("lockHint", "Cooldown active: " + mins + " min left.");
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

  var maxStreak = inputNum("maxStreak", 3);
  var cooldownMin = inputNum("cooldownMin", 120);
  var next = inputNum("streakNow", 0) + 1;

  lockState.currentStreak = next;
  setValue("streakNow", next);

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
// MODES
// =========================
function saveModes() {
  var payload = {
    main: $("disciplineModeBtn") && $("disciplineModeBtn").classList.contains("active") ? "discipline" : "quick",
    calc: $("zoneCalcModeBtn") && $("zoneCalcModeBtn").classList.contains("active") ? "zone" : "manual"
  };
  localStorage.setItem(STORAGE.MODES, JSON.stringify(payload));
}

function loadModes() {
  try {
    var raw = localStorage.getItem(STORAGE.MODES);
    if (!raw) {
      setMainMode("quick");
      setCalcMode("manual");
      return;
    }

    var parsed = JSON.parse(raw);
    setMainMode(parsed.main || "quick");
    setCalcMode(parsed.calc || "manual");
  } catch (e) {
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
// APP STATE
// =========================
function loadAppState() {
  try {
    var raw = localStorage.getItem(STORAGE.APP);
    if (!raw) return;

    var data = JSON.parse(raw);
    Object.keys(data).forEach(function (id) {
      if ($(id)) {
        $(id).value = data[id];
      }
    });
  } catch (e) {
    console.error("App state load error", e);
  }
}

function saveAppState() {
  var ids = [
    "email",
    "password",
    "symbolSearch",
    "direction",
    "rr",
    "balance",
    "riskPct",
    "entry",
    "slUnits",
    "tpUnits",
    "tpBuffer",
    "zoneTop",
    "zoneBottom",
    "zoneSize",
    "zoneBuffer",
    "zoneSlUnits",
    "zoneTp1Units",
    "zoneTp2Units",
    "unitSize",
    "valuePerUnit",
    "lotStep",
    "maxStreak",
    "cooldownMin",
    "streakNow",
    "accountSize",
    "dailyLossPct",
    "maxLossPct",
    "todayPnl",
    "totalPnL"
  ];

  var data = {};
  ids.forEach(function (id) {
    if ($(id)) data[id] = $(id).value;
  });

  localStorage.setItem(STORAGE.APP, JSON.stringify(data));
}

// =========================
// CALCULATIONS
// =========================
function calculateZoneDerived() {
  var top = inputNum("zoneTop", NaN);
  var bottom = inputNum("zoneBottom", NaN);
  var buffer = inputNum("zoneBuffer", 2);
  var unitSize = inputNum("unitSize", 0.0001);

  if (!Number.isFinite(top) || !Number.isFinite(bottom) || !unitSize) {
    setValue("zoneSize", "");
    setValue("zoneSlUnits", "");
    setValue("zoneTp1Units", "");
    setValue("zoneTp2Units", "");
    return;
  }

  var rawDiff = Math.abs(top - bottom);
  var zoneSizeUnits = rawDiff / unitSize;
  var slUnits = zoneSizeUnits + buffer;
  var tp1Units = slUnits;
  var tp2Units = slUnits * 2;

  setValue("zoneSize", fmt(zoneSizeUnits, 2));
  setValue("zoneSlUnits", fmt(slUnits, 2));
  setValue("zoneTp1Units", fmt(tp1Units, 2));
  setValue("zoneTp2Units", fmt(tp2Units, 2));
}

function getTradeInputs() {
  var balance = inputNum("balance", 10000);
  var riskPct = inputNum("riskPct", 0.5);
  var entry = inputNum("entry", 0);
  var rr = inputNum("rr", 2);
  var unitSize = inputNum("unitSize", 0.0001);
  var valuePerUnit = inputNum("valuePerUnit", 10);
  var lotStep = inputNum("lotStep", 0.01);
  var tpBuffer = inputNum("tpBuffer", 0);

  var slUnits = 0;
  var tpUnits = 0;

  var zoneMode = $("zoneCalcModeBtn") && $("zoneCalcModeBtn").classList.contains("active") && hasPremiumAccess();

  if (zoneMode) {
    calculateZoneDerived();
    slUnits = inputNum("zoneSlUnits", 0);
    tpUnits = inputNum("zoneTp2Units", 0);
  } else {
    slUnits = inputNum("slUnits", 0);
    tpUnits = inputNum("tpUnits", 0);

    if (!tpUnits || tpUnits <= 0) {
      tpUnits = slUnits * rr + tpBuffer;
    }
  }

  return {
    balance: balance,
    riskPct: riskPct,
    entry: entry,
    unitSize: unitSize,
    valuePerUnit: valuePerUnit,
    lotStep: lotStep,
    slUnits: slUnits,
    tpUnits: tpUnits
  };
}

function computeTrade() {
  var x = getTradeInputs();

  var riskEur = x.balance * (x.riskPct / 100);
  var lossPerLot = x.slUnits * x.valuePerUnit;

  var totalLot = 0;
  if (lossPerLot > 0) {
    totalLot = riskEur / lossPerLot;
  }

  totalLot = floorToStep(totalLot, x.lotStep);

  var lot1 = floorToStep(totalLot * 0.5, x.lotStep);
  var lot2 = floorToStep(totalLot - lot1, x.lotStep);

  if (lot1 < 0) lot1 = 0;
  if (lot2 < 0) lot2 = 0;

  var longTrade = isLong();

  var slPrice = longTrade
    ? x.entry - x.slUnits * x.unitSize
    : x.entry + x.slUnits * x.unitSize;

  var tpPrice = longTrade
    ? x.entry + x.tpUnits * x.unitSize
    : x.entry - x.tpUnits * x.unitSize;

  var tp1Units = x.slUnits;
  var tp2Units = x.slUnits * 2;

  var tp1Price = longTrade
    ? x.entry + tp1Units * x.unitSize
    : x.entry - tp1Units * x.unitSize;

  var tp2Price = longTrade
    ? x.entry + tp2Units * x.unitSize
    : x.entry - tp2Units * x.unitSize;

  var profitTp1 = lot1 * tp1Units * x.valuePerUnit;
  var profitTp2 = lot2 * tp2Units * x.valuePerUnit;
  var balanceAfterSl = x.balance - riskEur;

  return {
    riskEur: riskEur,
    lossPerLot: lossPerLot,
    totalLot: totalLot,
    lot1: lot1,
    lot2: lot2,
    slUnits: x.slUnits,
    tpUnits: x.tpUnits,
    slPrice: slPrice,
    tpPrice: tpPrice,
    tp1Price: tp1Price,
    tp2Price: tp2Price,
    profitTp1: profitTp1,
    profitTp2: profitTp2,
    balanceAfterSl: balanceAfterSl
  };
}

function renderTrade(r) {
  setMirroredText("riskOut", money(r.riskEur));
  setText("lossPerLotOut", money(r.lossPerLot));
  setMirroredText("lotsOut", fmt(r.totalLot, 3));
  setText("slUnitsOut", fmt(r.slUnits, 2));
  setText("tpUnitsOut", fmt(r.tpUnits, 2));
  setText("slPriceOut", fmt(r.slPrice, 5));
  setText("tpPriceOut", fmt(r.tpPrice, 5));

  if (hasPremiumAccess()) {
    setText("totalLotOut", fmt(r.totalLot, 3));
    setText("lot1Out", fmt(r.lot1, 3));
    setText("lot2Out", fmt(r.lot2, 3));
    setText("tp1PriceOut", fmt(r.tp1Price, 5));
    setText("tp2PriceOut", fmt(r.tp2Price, 5));
    setText("beAfterTp1Out", "Yes");

    setText("balanceAfterSlOut", money(r.balanceAfterSl));
    setText("profitTp1Out", money(r.profitTp1));
    setText("profitTp2Out", money(r.profitTp2));
  }
}

function getChallengeState() {
  var accountSize = inputNum("accountSize", inputNum("balance", 10000));
  var dailyLossPct = inputNum("dailyLossPct", 5);
  var maxLossPct = inputNum("maxLossPct", 10);
  var todayPnl = inputNum("todayPnl", 0);
  var totalPnL = inputNum("totalPnL", 0);

  var dailyLimit = accountSize * (dailyLossPct / 100);
  var overallLimit = accountSize * (maxLossPct / 100);

  var remainingDaily = dailyLimit + todayPnl;
  var remainingOverall = overallLimit + totalPnL;

  return {
    remainingDaily: remainingDaily,
    remainingOverall: remainingOverall
  };
}

function renderChallenge() {
  var c = getChallengeState();
  setMirroredText("remainingDailyOut", money(c.remainingDaily));
  setText("remainingOverallOut", money(c.remainingOverall));
}

function evaluateTrade(r) {
  if (!hasPremiumAccess()) {
    setText("clickStatus", "Calculated ✅");
    return;
  }

  var c = getChallengeState();
  renderChallenge();

  var dailyUsePct = c.remainingDaily > 0 ? (r.riskEur / c.remainingDaily) * 100 : 0;
  setText("dailyUsePctOut", fmt(dailyUsePct, 2) + "%");

  var tradeStatus = "OK ✅";
  var tradeClass = "ok";

  if (c.remainingDaily <= 0 || c.remainingOverall <= 0) {
    tradeStatus = "Blocked ❌";
    tradeClass = "bad";
  } else if (r.riskEur > c.remainingDaily || r.riskEur > c.remainingOverall) {
    tradeStatus = "Blocked ❌";
    tradeClass = "bad";
  } else if (dailyUsePct >= 60) {
    tradeStatus = "Heavy risk ⚠️";
    tradeClass = "warn";
  }

  setText("tradeStatusOut", tradeStatus);
  setStatusClass("tradeStatusOut", tradeClass);

  var reality = "OK ✅";
  var realityClass = "ok";

  if (tradeClass === "bad") {
    reality = "Risk too high ❌";
    realityClass = "bad";
  } else if (tradeClass === "warn") {
    reality = "Careful – heavy trade ⚠️";
    realityClass = "warn";
  }

  setText("realityCheckOut", reality);
  setStatusClass("realityCheckOut", realityClass);

  var decision = "OK ✅";
  var decisionClass = "ok";

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
  setText("decisionOut_dup", decision);
  setStatusClass("decisionOut", decisionClass);
  setStatusClass("decisionOut_dup", decisionClass);

  setText("clickStatus", "Calculated ✅");
}

function calculateAll() {
  calculateZoneDerived();
  var result = computeTrade();
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

  setValue("accountSize", String(size));
  setValue("balance", String(size));
  setValue("dailyLossPct", "5");
  setValue("maxLossPct", "10");
  setValue("todayPnl", "0");
  setValue("totalPnL", "0");

  calculateAll();
}

// =========================
// EVENTS
// =========================
function bindEvents() {
  if ($("signUpBtn")) $("signUpBtn").addEventListener("click", signUp);
  if ($("signInBtn")) $("signInBtn").addEventListener("click", signIn);
  if ($("signOutBtn")) $("signOutBtn").addEventListener("click", signOut);
  if ($("upgradeBtn")) $("upgradeBtn").addEventListener("click", upgradeToPro);
  if ($("upgradeBtnSecondary")) $("upgradeBtnSecondary").addEventListener("click", upgradeToPro);
  if ($("upgradeBtnSecondary2")) $("upgradeBtnSecondary2").addEventListener("click", upgradeToPro);
  if ($("helpBtn")) $("helpBtn").addEventListener("click", showHelp);

  if ($("startTrialBtn")) {
    $("startTrialBtn").addEventListener("click", function () {
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
  }

  if ($("quickModeBtn")) $("quickModeBtn").addEventListener("click", function () { setMainMode("quick"); });
  if ($("disciplineModeBtn")) $("disciplineModeBtn").addEventListener("click", function () { setMainMode("discipline"); });

  if ($("manualCalcModeBtn")) $("manualCalcModeBtn").addEventListener("click", function () { setCalcMode("manual"); });
  if ($("zoneCalcModeBtn")) $("zoneCalcModeBtn").addEventListener("click", function () { setCalcMode("zone"); });

  if ($("showAddSymbol")) {
    $("showAddSymbol").addEventListener("click", function () {
      if (!hasPremiumAccess()) {
        alert("Custom symbols are available in Trial / Pro.");
        return;
      }

      var box = $("addSymbolBox");
      if (!box) return;
      box.style.display = box.style.display === "block" ? "none" : "block";
    });
  }

  if ($("addSymbolBtn")) $("addSymbolBtn").addEventListener("click", addCustomSymbol);

  if ($("symbolSearch")) {
    $("symbolSearch").addEventListener("input", function (e) {
      populateSymbols(e.target.value);

      if ($("symbol") && $("symbol").options.length > 0) {
        $("symbol").selectedIndex = 0;
        applySelectedSymbol(false);
      }
    });
  }

  if ($("symbol")) {
    $("symbol").addEventListener("change", function () {
      applySelectedSymbol(true);
      calculateAll();
    });
  }

  var watchedInputs = [
    "direction",
    "rr",
    "balance",
    "riskPct",
    "entry",
    "slUnits",
    "tpUnits",
    "tpBuffer",
    "zoneTop",
    "zoneBottom",
    "zoneBuffer",
    "unitSize",
    "valuePerUnit",
    "lotStep",
    "accountSize",
    "dailyLossPct",
    "maxLossPct",
    "todayPnl",
    "totalPnL",
    "maxStreak",
    "cooldownMin",
    "streakNow"
  ];

  watchedInputs.forEach(function (id) {
    if ($(id)) {
      $(id).addEventListener("input", calculateAll);
    }
  });

  if ($("calcBtn")) $("calcBtn").addEventListener("click", calculateAll);

  if ($("canTakeBtn")) {
    $("canTakeBtn").addEventListener("click", function () {
      if (!hasPremiumAccess()) {
        alert("Decision engine is available in Trial / Pro.");
        return;
      }
      calculateAll();
    });
  }

  if ($("presetChallenge10K")) $("presetChallenge10K").addEventListener("click", function () { applyChallengePreset(10000); });
  if ($("presetChallenge25K")) $("presetChallenge25K").addEventListener("click", function () { applyChallengePreset(25000); });
  if ($("presetChallenge50K")) $("presetChallenge50K").addEventListener("click", function () { applyChallengePreset(50000); });
  if ($("presetChallenge100K")) $("presetChallenge100K").addEventListener("click", function () { applyChallengePreset(100000); });

  if ($("winBtn")) $("winBtn").addEventListener("click", recordWin);
  if ($("lossBtn")) $("lossBtn").addEventListener("click", recordLoss);
  if ($("resetLockBtn")) $("resetLockBtn").addEventListener("click", resetLock);
}

// =========================
// INIT
// =========================
function init() {
  loadAuth();
  loadAppState();
  loadLockState();
  loadCustomSymbols();
  rebuildSymbols();

  populateSymbols();

  if ($("symbol") && $("symbol").options.length > 0 && !$("symbol").value) {
    $("symbol").selectedIndex = 0;
  }

  applySelectedSymbol(false);
  loadModes();
  bindEvents();
  renderAuth();

  if ($("streakNow")) {
    setValue("streakNow", String(lockState.currentStreak || 0));
  }

  calculateAll();
  setInterval(updateLockStatus, 30000);
}

document.addEventListener("DOMContentLoaded", init);
