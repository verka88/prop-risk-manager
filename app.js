const $ = function (id) {
  return document.getElementById(id);
};

const STORAGE = {
  APP: "propengine_app_v901",
  AUTH: "propengine_auth_v901",
  LOCK: "propengine_lock_v901",
  MODES: "propengine_modes_v901",
  CUSTOM_SYMBOLS: "propengine_custom_symbols_v901"
};

const DEFAULT_SYMBOLS = [
  { name: "EURUSD", group: "FX", unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01, slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "GBPUSD", group: "FX", unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01, slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "AUDUSD", group: "FX", unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01, slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "NZDUSD", group: "FX", unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01, slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "USDJPY", group: "FX", unitSize: 0.01, valuePerUnit: 9, lotStep: 0.01, slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "EURJPY", group: "FX", unitSize: 0.01, valuePerUnit: 6.2, lotStep: 0.01, slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "GBPJPY", group: "FX", unitSize: 0.01, valuePerUnit: 6.4, lotStep: 0.01, slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "XAUUSD", group: "Metals", unitSize: 0.01, valuePerUnit: 1, lotStep: 0.01, slLabel: "SL (points)", tpLabel: "TP (points)" },
  { name: "BTCUSD", group: "Crypto", unitSize: 1, valuePerUnit: 1, lotStep: 0.01, slLabel: "SL (USD)", tpLabel: "TP (USD)" },
  { name: "ETHUSD", group: "Crypto", unitSize: 0.1, valuePerUnit: 1, lotStep: 0.01, slLabel: "SL (USD)", tpLabel: "TP (USD)" },
  { name: "NAS100", group: "Index", unitSize: 1, valuePerUnit: 1, lotStep: 0.01, slLabel: "SL (points)", tpLabel: "TP (points)" },
  { name: "US30", group: "Index", unitSize: 1, valuePerUnit: 1, lotStep: 0.01, slLabel: "SL (points)", tpLabel: "TP (points)" },
  { name: "GER40", group: "Index", unitSize: 1, valuePerUnit: 1, lotStep: 0.01, slLabel: "SL (points)", tpLabel: "TP (points)" }
];

let authState = {
  signedIn: false,
  email: "",
  plan: "free",
  trialStart: null,
  trialDays: 7
};

let lockState = {
  streak: 0,
  lockedUntil: null
};

let calcMode = "manual";
let appMode = "quick";
let customSymbols = [];
let lastResult = null;

function parseNum(value, fallback) {
  if (fallback === undefined) fallback = 0;
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).replaceAll(" ", "").replace(",", ".").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

function inputNum(id, fallback) {
  if (fallback === undefined) fallback = 0;
  const el = $(id);
  if (!el) return fallback;
  return parseNum(el.value, fallback);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function setHTML(id, value) {
  const el = $(id);
  if (el) el.innerHTML = value;
}

function setValue(id, value) {
  const el = $(id);
  if (el) el.value = value;
}

function show(id, visible) {
  if (visible === undefined) visible = true;
  const el = $(id);
  if (!el) return;
  el.classList.toggle("hidden", !visible);
  if (!el.classList.contains("hidden")) {
    el.style.display = "";
  } else {
    el.style.display = "none";
  }
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

function ceilToStep(value, step) {
  if (!step || step <= 0) return value;
  return Math.ceil(value / step) * step;
}

function setStatusClass(id, type) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("ok", "warn", "bad");
  if (type === "ok") el.classList.add("ok");
  if (type === "warn") el.classList.add("warn");
  if (type === "bad") el.classList.add("bad");
}

function saveAuth() {
  localStorage.setItem(STORAGE.AUTH, JSON.stringify(authState));
}

function loadAuth() {
  try {
    const raw = localStorage.getItem(STORAGE.AUTH);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    authState = Object.assign({}, authState, parsed);
  } catch (e) {
    console.error("Auth load error", e);
  }
}

function saveLock() {
  localStorage.setItem(STORAGE.LOCK, JSON.stringify(lockState));
}

function loadLock() {
  try {
    const raw = localStorage.getItem(STORAGE.LOCK);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    lockState = Object.assign({}, lockState, parsed);
  } catch (e) {
    console.error("Lock load error", e);
  }
}

function saveModes() {
  localStorage.setItem(STORAGE.MODES, JSON.stringify({
    calcMode: calcMode,
    appMode: appMode
  }));
}

function loadModes() {
  try {
    const raw = localStorage.getItem(STORAGE.MODES);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.calcMode) calcMode = parsed.calcMode;
    if (parsed.appMode) appMode = parsed.appMode;
  } catch (e) {
    console.error("Modes load error", e);
  }
}

function saveCustomSymbols() {
  localStorage.setItem(STORAGE.CUSTOM_SYMBOLS, JSON.stringify(customSymbols));
}

function loadCustomSymbols() {
  try {
    const raw = localStorage.getItem(STORAGE.CUSTOM_SYMBOLS);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) customSymbols = parsed;
  } catch (e) {
    console.error("Custom symbols load error", e);
  }
}

function allSymbols() {
  return DEFAULT_SYMBOLS.concat(customSymbols);
}

function getSelectedSymbolName() {
  const el = $("symbol");
  if (el && el.value) return el.value;
  return "EURUSD";
}

function findSymbol(name) {
  const list = allSymbols();
  for (let i = 0; i < list.length; i += 1) {
    if (list[i].name === name) return list[i];
  }
  return DEFAULT_SYMBOLS[0];
}

function isSignedIn() {
  return !!authState.signedIn;
}

function isTrialActive() {
  if (authState.plan === "pro") return false;
  if (!authState.trialStart) return false;
  const now = Date.now();
  const end = authState.trialStart + authState.trialDays * 24 * 60 * 60 * 1000;
  return now < end;
}

function trialDaysLeft() {
  if (!authState.trialStart) return 0;
  const end = authState.trialStart + authState.trialDays * 24 * 60 * 60 * 1000;
  const diff = end - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function isProActive() {
  return authState.plan === "pro";
}

function hasPremium() {
  return isProActive() || isTrialActive();
}

function startTrial() {
  if (!authState.trialStart) {
    authState.trialStart = Date.now();
  }
  saveAuth();
  renderAll();
}

function signUp() {
  const email = $("email") ? $("email").value.trim() : "";
  const password = $("password") ? $("password").value : "";

  if (!email || !password) {
    alert("Enter email and password.");
    return;
  }

  authState.signedIn = true;
  authState.email = email;

  if (!isTrialActive() && !isProActive()) {
    authState.plan = "trial";
    authState.trialStart = Date.now();
  }

  saveAuth();
  renderAll();
}

function signIn() {
  const email = $("email") ? $("email").value.trim() : "";
  const password = $("password") ? $("password").value : "";

  if (!email || !password) {
    alert("Enter email and password.");
    return;
  }

  authState.signedIn = true;
  authState.email = email;

  if (authState.plan !== "pro" && authState.plan !== "trial") {
    authState.plan = "trial";
  }
  if (!authState.trialStart && authState.plan === "trial") {
    authState.trialStart = Date.now();
  }

  saveAuth();
  renderAll();
}

function signOut() {
  authState.signedIn = false;
  authState.email = "";
  saveAuth();
  renderAll();
}

function upgradePlan() {
  authState.plan = "pro";
  saveAuth();
  renderAll();
}

function renderPlanBadge() {
  const el = $("planBadge");
  if (!el) return;

  el.className = "pill";

  if (isProActive()) {
    el.classList.add("pro");
    el.textContent = "Pro Plan";
    return;
  }

  if (isTrialActive()) {
    el.classList.add("trial");
    el.textContent = "Trial " + trialDaysLeft() + "d";
    return;
  }

  el.classList.add("free");
  el.textContent = "Free Plan";
}

function renderAuth() {
  if (isSignedIn()) {
    show("authSignedOut", false);
    show("authSignedIn", true);
    setText("userStatus", "Signed in: " + authState.email);

    if (isProActive()) {
      setText("trialBanner", "PropEngine Pro active.");
      show("startTrialBtn", false);
      show("upgradeBtn", false);
    } else if (isTrialActive()) {
      setText("trialBanner", "PropEngine Trial active - " + trialDaysLeft() + "d");
      show("startTrialBtn", false);
      show("upgradeBtn", true);
    } else {
      setText("trialBanner", "Free plan active. Upgrade to unlock premium features.");
      show("startTrialBtn", true);
      show("upgradeBtn", true);
    }
  } else {
    show("authSignedOut", true);
    show("authSignedIn", false);
    setText("userStatus", "Not signed in");
    setText("trialBanner", "Create account to activate Trial and unlock premium tools.");
    show("startTrialBtn", true);
    show("upgradeBtn", true);
  }
}

function renderModeUI() {
  const manualBtn = $("manualModeBtn");
  const zoneBtn = $("zoneModeBtn");

  if (manualBtn) manualBtn.classList.toggle("active", calcMode === "manual");
  if (zoneBtn) zoneBtn.classList.toggle("active", calcMode === "zone");

  show("manualFields", calcMode === "manual");
  show("zoneFields", calcMode === "zone");
  show("manualMode", calcMode === "manual");
  show("zoneMode", calcMode === "zone");

  const quickTab = $("quickTab");
  const disciplineTab = $("disciplineTab");

  if (quickTab) quickTab.classList.toggle("active", appMode === "quick");
  if (disciplineTab) disciplineTab.classList.toggle("active", appMode === "discipline");

  show("quickSection", appMode === "quick");
  show("disciplineSection", appMode === "discipline");
}

function populateSymbols() {
  const select = $("symbol");
  if (!select) return;

  const current = select.value || "EURUSD";
  const list = allSymbols();

  select.innerHTML = "";

  for (let i = 0; i < list.length; i += 1) {
    const opt = document.createElement("option");
    opt.value = list[i].name;
    opt.textContent = list[i].name;
    select.appendChild(opt);
  }

  select.value = findSymbol(current).name;
}

function applySymbolToInputs() {
  const symbol = findSymbol(getSelectedSymbolName());

  setValue("unitSize", String(symbol.unitSize).replace(".", ","));
  setValue("valuePerUnit", String(symbol.valuePerUnit).replace(".", ","));
  setValue("lotStep", String(symbol.lotStep).replace(".", ","));

  setText("slLabel", symbol.slLabel);
  setText("tpLabel", symbol.tpLabel);
  setText("symbolMeta", symbol.group + " • " + symbol.name);

  const slHint = $("slHint");
  const tpHint = $("tpHint");
  if (slHint) slHint.textContent = "Example: " + symbol.slLabel.replace("SL ", "");
  if (tpHint) tpHint.textContent = "Leave empty -> uses RR";
}

function filterSymbols() {
  const q = $("symbolSearch") ? $("symbolSearch").value.trim().toUpperCase() : "";
  const select = $("symbol");
  if (!select) return;

  const current = getSelectedSymbolName();
  const list = allSymbols();
  select.innerHTML = "";

  for (let i = 0; i < list.length; i += 1) {
    if (!q || list[i].name.indexOf(q) >= 0 || list[i].group.toUpperCase().indexOf(q) >= 0) {
      const opt = document.createElement("option");
      opt.value = list[i].name;
      opt.textContent = list[i].name;
      select.appendChild(opt);
    }
  }

  if (select.options.length === 0) {
    const opt = document.createElement("option");
    opt.value = current;
    opt.textContent = current;
    select.appendChild(opt);
  }

  select.value = current;
}

function addCustomSymbol() {
  const name = prompt("Symbol name, e.g. SILVER or BTCUSD");
  if (!name) return;

  const unitSize = parseNum(prompt("Unit size (pip/tick), e.g. 0.01"), 0.01);
  const valuePerUnit = parseNum(prompt("Value per unit at 1 lot (EUR), e.g. 1"), 1);
  const lotStep = parseNum(prompt("Lot step, e.g. 0.01"), 0.01);

  customSymbols.push({
    name: String(name).trim().toUpperCase(),
    group: "Custom",
    unitSize: unitSize,
    valuePerUnit: valuePerUnit,
    lotStep: lotStep,
    slLabel: "SL (units)",
    tpLabel: "TP (units)"
  });

  saveCustomSymbols();
  populateSymbols();
  setValue("symbol", String(name).trim().toUpperCase());
  applySymbolToInputs();
}

function renderChallenge() {
  const account = inputNum("challengeAccount", inputNum("accountSize", 10000));
  const dailyLossPct = inputNum("dailyLossPct", 5);
  const maxLossPct = inputNum("maxLossPct", 10);
  const todayPnl = inputNum("todayPnl", 0);
  const totalPnl = inputNum("totalPnl", 0);

  const dailyLimit = account * (dailyLossPct / 100);
  const maxLimit = account * (maxLossPct / 100);

  const remainingDaily = Math.max(0, dailyLimit + todayPnl);
  const remainingOverall = Math.max(0, maxLimit + totalPnl);

  setText("remainingDaily", money(remainingDaily));
  setText("remainingOverall", money(remainingOverall));

  if (lastResult) {
    const ok = lastResult.riskEur <= remainingDaily && lastResult.riskEur <= remainingOverall;
    const text = ok ? "OK" : "Blocked";
    setText("tradeStatus", text);
    setStatusClass("tradeStatus", ok ? "ok" : "bad");
    setText("dailyRoomCard", money(remainingDaily));
    setText("decisionCard", text);
    setStatusClass("decisionCard", ok ? "ok" : "bad");
  } else {
    setText("tradeStatus", "-");
    setText("dailyRoomCard", money(remainingDaily));
  }
}

function renderLock() {
  const maxStreak = inputNum("maxLossStreak", 5);
  const cooldownMins = inputNum("cooldownMinutes", 120);

  setValue("currentStreak", lockState.streak);

  let unlocked = true;
  if (lockState.lockedUntil && Date.now() < lockState.lockedUntil) {
    unlocked = false;
  }

  if (lockState.streak >= maxStreak && cooldownMins > 0 && !lockState.lockedUntil) {
    lockState.lockedUntil = Date.now() + cooldownMins * 60 * 1000;
    saveLock();
    unlocked = false;
  }

  if (lockState.lockedUntil && Date.now() >= lockState.lockedUntil) {
    lockState.lockedUntil = null;
    lockState.streak = 0;
    saveLock();
    unlocked = true;
  }

  const statusText = unlocked ? "Unlocked" : "Locked";
  setText("lockStatus", statusText);
  setStatusClass("lockStatus", unlocked ? "ok" : "bad");

  const premium = hasPremium();
  setText("lockPremiumStatus", premium ? "Unlocked" : "Pro required");
}

function registerWin() {
  lockState.streak = 0;
  lockState.lockedUntil = null;
  saveLock();
  renderLock();
}

function registerLoss() {
  const maxStreak = inputNum("maxLossStreak", 5);
  const cooldownMins = inputNum("cooldownMinutes", 120);

  lockState.streak += 1;

  if (lockState.streak >= maxStreak && cooldownMins > 0) {
    lockState.lockedUntil = Date.now() + cooldownMins * 60 * 1000;
  }

  saveLock();
  renderLock();
}

function resetLock() {
  lockState.streak = 0;
  lockState.lockedUntil = null;
  saveLock();
  renderLock();
}

function getDirection() {
  const dir = $("direction");
  return !dir || dir.value === "LONG" ? "LONG" : "SHORT";
}

function getRiskEur(balance, riskPct) {
  return balance * (riskPct / 100);
}

function calcManual() {
  const balance = inputNum("balance", 10000);
  const riskPct = inputNum("riskPct", 0.5);
  const entryPrice = inputNum("entryPrice", 1.10000);
  const slPips = inputNum("slPips", 15);
  const tpPips = inputNum("tpPips", 0);
  const rr = inputNum("rr", 2);
  const tpBuffer = inputNum("tpBuffer", 0);
  const unitSize = inputNum("unitSize", 0.0001);
  const valuePerUnit = inputNum("valuePerUnit", 10);
  const lotStep = inputNum("lotStep", 0.01);
  const direction = getDirection();

  const riskEur = getRiskEur(balance, riskPct);
  const lossPerLot = slPips * valuePerUnit;

  let positionLots = 0;
  if (lossPerLot > 0) {
    positionLots = floorToStep(riskEur / lossPerLot, lotStep);
  }

  const usedTpPips = tpPips > 0 ? tpPips + tpBuffer : slPips * rr + tpBuffer;

  let slPrice = entryPrice;
  let tpPrice = entryPrice;
  let tp1Price = entryPrice;
  let tp2Price = entryPrice;

  if (direction === "LONG") {
    slPrice = entryPrice - slPips * unitSize;
    tpPrice = entryPrice + usedTpPips * unitSize;
    tp1Price = entryPrice + slPips * unitSize;
    tp2Price = entryPrice + slPips * rr * unitSize;
  } else {
    slPrice = entryPrice + slPips * unitSize;
    tpPrice = entryPrice - usedTpPips * unitSize;
    tp1Price = entryPrice - slPips * unitSize;
    tp2Price = entryPrice - slPips * rr * unitSize;
  }

  const lot1 = floorToStep(positionLots / 2, lotStep);
  const lot2 = floorToStep(positionLots - lot1, lotStep);

  return {
    mode: "manual",
    balance: balance,
    riskPct: riskPct,
    riskEur: riskEur,
    lossPerLot: lossPerLot,
    positionLots: positionLots,
    slDistanceUnits: slPips,
    tpDistanceUnits: usedTpPips,
    slPrice: slPrice,
    tpPrice: tpPrice,
    totalLot: positionLots,
    lot1: lot1,
    lot2: lot2,
    tp1Price: tp1Price,
    tp2Price: tp2Price,
    breakEvenAfterTP1: "Yes",
    direction: direction,
    entryPrice: entryPrice,
    tp1Profit: lot1 * slPips * valuePerUnit,
    tp2Profit: lot2 * slPips * rr * valuePerUnit
  };
}

function calcZone() {
  const balance = inputNum("balance", 10000);
  const riskPct = inputNum("riskPct", 0.5);
  const entryPrice = inputNum("entryPrice", 1.10000);
  const zoneTop = inputNum("zoneTop", entryPrice);
  const zoneBottom = inputNum("zoneBottom", entryPrice);
  const bufferUnits = inputNum("bufferUnits", inputNum("buffer", 2));
  const rr = inputNum("rr", 2);
  const unitSize = inputNum("unitSize", 0.0001);
  const valuePerUnit = inputNum("valuePerUnit", 10);
  const lotStep = inputNum("lotStep", 0.01);
  const direction = getDirection();

  const zoneSizePrice = Math.abs(zoneTop - zoneBottom);
  const zoneSizeUnits = unitSize > 0 ? zoneSizePrice / unitSize : 0;
  const slUnits = zoneSizeUnits + bufferUnits;
  const riskEur = getRiskEur(balance, riskPct);
  const lossPerLot = slUnits * valuePerUnit;

  let positionLots = 0;
  if (lossPerLot > 0) {
    positionLots = floorToStep(riskEur / lossPerLot, lotStep);
  }

  let slPrice = entryPrice;
  let tpPrice = entryPrice;
  let tp1Price = entryPrice;
  let tp2Price = entryPrice;

  if (direction === "LONG") {
    slPrice = entryPrice - slUnits * unitSize;
    tp1Price = entryPrice + slUnits * unitSize;
    tp2Price = entryPrice + slUnits * rr * unitSize;
    tpPrice = tp2Price;
  } else {
    slPrice = entryPrice + slUnits * unitSize;
    tp1Price = entryPrice - slUnits * unitSize;
    tp2Price = entryPrice - slUnits * rr * unitSize;
    tpPrice = tp2Price;
  }

  const lot1 = floorToStep(positionLots / 2, lotStep);
  const lot2 = floorToStep(positionLots - lot1, lotStep);

  setValue("computedSlUnits", fmt(slUnits, 2));
  setValue("tp1R", fmt(slUnits, 2));
  setValue("tp2R", fmt(slUnits * rr, 2));
  setValue("zoneSizeUnits", fmt(zoneSizeUnits, 2));

  return {
    mode: "zone",
    balance: balance,
    riskPct: riskPct,
    riskEur: riskEur,
    lossPerLot: lossPerLot,
    positionLots: positionLots,
    slDistanceUnits: slUnits,
    tpDistanceUnits: slUnits * rr,
    slPrice: slPrice,
    tpPrice: tpPrice,
    totalLot: positionLots,
    lot1: lot1,
    lot2: lot2,
    tp1Price: tp1Price,
    tp2Price: tp2Price,
    breakEvenAfterTP1: "Yes",
    direction: direction,
    entryPrice: entryPrice,
    tp1Profit: lot1 * slUnits * valuePerUnit,
    tp2Profit: lot2 * slUnits * rr * valuePerUnit
  };
}

function renderResults(result) {
  setText("riskValue", money(result.riskEur));
  setText("positionSizeValue", fmt(result.positionLots, 3));

  setText("riskEurResult", money(result.riskEur));
  setText("lossPerLotResult", money(result.lossPerLot));
  setText("positionSizeResult", fmt(result.positionLots, 3));
  setText("slDistanceResult", fmt(result.slDistanceUnits, 2));
  setText("tpDistanceResult", fmt(result.tpDistanceUnits, 2));
  setText("slPriceResult", fmt(result.slPrice, 5));
  setText("tpPriceResult", fmt(result.tpPrice, 5));
  setText("totalLotResult", fmt(result.totalLot, 2));
  setText("lot1Result", fmt(result.lot1, 2));
  setText("lot2Result", fmt(result.lot2, 2));
  setText("tp1PriceResult", fmt(result.tp1Price, 5));
  setText("tp2PriceResult", fmt(result.tp2Price, 5));
  setText("breakEvenResult", result.breakEvenAfterTP1);

  setText("resultsRisk", money(result.riskEur));
  setText("resultsLossPerLot", money(result.lossPerLot));
  setText("resultsPositionSize", fmt(result.positionLots, 3));
  setText("resultsSlDistance", fmt(result.slDistanceUnits, 2));
  setText("resultsTpDistance", fmt(result.tpDistanceUnits, 2));
  setText("resultsSlPrice", fmt(result.slPrice, 5));
  setText("resultsTpPrice", fmt(result.tpPrice, 5));
  setText("resultsTotalLot", fmt(result.totalLot, 2));
  setText("resultsLot1", fmt(result.lot1, 2));
  setText("resultsLot2", fmt(result.lot2, 2));
  setText("resultsTp1Price", fmt(result.tp1Price, 5));
  setText("resultsTp2Price", fmt(result.tp2Price, 5));
  setText("resultsBreakEven", result.breakEvenAfterTP1);

  renderRealityCheck(result);
  renderChallenge();
}

function renderRealityCheck(result) {
  const account = inputNum("challengeAccount", inputNum("accountSize", result.balance));
  const dailyLossPct = inputNum("dailyLossPct", 5);
  const todayPnl = inputNum("todayPnl", 0);

  const remainingDaily = Math.max(0, account * (dailyLossPct / 100) + todayPnl);
  const newBalance = result.balance - result.riskEur;
  const pctOfDaily = remainingDaily > 0 ? (result.riskEur / remainingDaily) * 100 : 0;

  setText("realityNewBalance", money(newBalance));
  setText("realityTp1Profit", money(result.tp1Profit));
  setText("realityTp2Profit", money(result.tp1Profit + result.tp2Profit));
  setText("realityDailyUse", fmt(pctOfDaily, 2) + "%");

  const ok = pctOfDaily <= 100;
  setText("realityCheckStatus", ok ? "OK" : "Too big");
  setStatusClass("realityCheckStatus", ok ? "ok" : "bad");
}

function renderDecision(result) {
  const account = inputNum("challengeAccount", inputNum("accountSize", 10000));
  const dailyLossPct = inputNum("dailyLossPct", 5);
  const maxLossPct = inputNum("maxLossPct", 10);
  const todayPnl = inputNum("todayPnl", 0);
  const totalPnl = inputNum("totalPnl", 0);

  const remainingDaily = Math.max(0, account * (dailyLossPct / 100) + todayPnl);
  const remainingOverall = Math.max(0, account * (maxLossPct / 100) + totalPnl);

  const lockBlocked = lockState.lockedUntil && Date.now() < lockState.lockedUntil;
  const ok = result.riskEur <= remainingDaily && result.riskEur <= remainingOverall && !lockBlocked;

  setText("decisionResult", ok ? "OK" : "Blocked");
  setStatusClass("decisionResult", ok ? "ok" : "bad");
  setText("decisionCard", ok ? "OK" : "Blocked");
  setStatusClass("decisionCard", ok ? "ok" : "bad");
}

function calculateTrade() {
  let result = null;

  if (calcMode === "zone") {
    if (!hasPremium()) {
      alert("Zone mode is available in Trial / Pro.");
      return;
    }
    result = calcZone();
  } else {
    result = calcManual();
  }

  lastResult = result;
  renderResults(result);
  renderDecision(result);
}

function canTakeTrade() {
  if (!lastResult) {
    calculateTrade();
    return;
  }
  renderDecision(lastResult);
}

function bindEvents() {
  const manualBtn = $("manualModeBtn");
  const zoneBtn = $("zoneModeBtn");
  const quickTab = $("quickTab");
  const disciplineTab = $("disciplineTab");
  const calcBtn = $("calcBtn") || $("calculateBtn");
  const canTradeBtn = $("canTakeTradeBtn");
  const signUpBtn = $("signUpBtn") || $("createAccountBtn");
  const signInBtn = $("signInBtn");
  const signOutBtn = $("signOutBtn");
  const startTrialBtn = $("startTrialBtn");
  const upgradeBtn = $("upgradeBtn");
  const addCustomSymbolBtn = $("addCustomSymbolBtn");
  const symbolSelect = $("symbol");
  const symbolSearch = $("symbolSearch");
  const winBtn = $("winBtn");
  const lossBtn = $("lossBtn");
  const resetLockBtn = $("resetLockBtn");

  if (manualBtn) {
    manualBtn.addEventListener("click", function () {
      calcMode = "manual";
      saveModes();
      renderModeUI();
    });
  }

  if (zoneBtn) {
    zoneBtn.addEventListener("click", function () {
      if (!hasPremium()) {
        alert("Zone mode is available in Trial / Pro.");
        return;
      }
      calcMode = "zone";
      saveModes();
      renderModeUI();
    });
  }

  if (quickTab) {
    quickTab.addEventListener("click", function () {
      appMode = "quick";
      saveModes();
      renderModeUI();
    });
  }

  if (disciplineTab) {
    disciplineTab.addEventListener("click", function () {
      if (!hasPremium()) {
        alert("Discipline tools are available in Trial / Pro.");
        return;
      }
      appMode = "discipline";
      saveModes();
      renderModeUI();
    });
  }

  if (calcBtn) calcBtn.addEventListener("click", calculateTrade);
  if (canTradeBtn) canTradeBtn.addEventListener("click", canTakeTrade);
  if (signUpBtn) signUpBtn.addEventListener("click", signUp);
  if (signInBtn) signInBtn.addEventListener("click", signIn);
  if (signOutBtn) signOutBtn.addEventListener("click", signOut);
  if (startTrialBtn) startTrialBtn.addEventListener("click", startTrial);
  if (upgradeBtn) upgradeBtn.addEventListener("click", upgradePlan);
  if (addCustomSymbolBtn) addCustomSymbolBtn.addEventListener("click", addCustomSymbol);
  if (symbolSelect) {
    symbolSelect.addEventListener("change", function () {
      applySymbolToInputs();
    });
  }
  if (symbolSearch) {
    symbolSearch.addEventListener("input", filterSymbols);
  }
  if (winBtn) winBtn.addEventListener("click", registerWin);
  if (lossBtn) lossBtn.addEventListener("click", registerLoss);
  if (resetLockBtn) resetLockBtn.addEventListener("click", resetLock);

  const watchIds = [
    "balance", "riskPct", "entryPrice", "slPips", "tpPips", "tpBuffer",
    "unitSize", "valuePerUnit", "lotStep", "rr",
    "zoneTop", "zoneBottom", "bufferUnits", "buffer",
    "challengeAccount", "accountSize", "dailyLossPct", "maxLossPct", "todayPnl", "totalPnl",
    "maxLossStreak", "cooldownMinutes", "direction"
  ];

  for (let i = 0; i < watchIds.length; i += 1) {
    const el = $(watchIds[i]);
    if (el) {
      el.addEventListener("input", function () {
        if (lastResult) {
          calculateTrade();
        }
        renderChallenge();
        renderLock();
      });
      el.addEventListener("change", function () {
        if (lastResult) {
          calculateTrade();
        }
        renderChallenge();
        renderLock();
      });
    }
  }
}

function renderAll() {
  renderPlanBadge();
  renderAuth();
  renderModeUI();
  renderChallenge();
  renderLock();

  const planTop = $("topPlanStatus");
  if (planTop) {
    if (isProActive()) planTop.textContent = "Pro Active";
    else if (isTrialActive()) planTop.textContent = "Trial Active";
    else planTop.textContent = "Free Plan";
  }

  const upgradeTop = $("topUpgradeBtn");
  if (upgradeTop) {
    upgradeTop.addEventListener("click", upgradePlan);
  }

  if (lastResult) {
    renderResults(lastResult);
    renderDecision(lastResult);
  }
}

function seedDefaults() {
  if ($("balance") && !$("balance").value) setValue("balance", "10000");
  if ($("riskPct") && !$("riskPct").value) setValue("riskPct", "0,5");
  if ($("entryPrice") && !$("entryPrice").value) setValue("entryPrice", "1,10000");
  if ($("slPips") && !$("slPips").value) setValue("slPips", "15");
  if ($("rr") && !$("rr").value) setValue("rr", "2");
  if ($("tpBuffer") && !$("tpBuffer").value) setValue("tpBuffer", "0");
  if ($("unitSize") && !$("unitSize").value) setValue("unitSize", "0,0001");
  if ($("valuePerUnit") && !$("valuePerUnit").value) setValue("valuePerUnit", "10");
  if ($("lotStep") && !$("lotStep").value) setValue("lotStep", "0,01");

  if ($("challengeAccount") && !$("challengeAccount").value) setValue("challengeAccount", "10000");
  if ($("dailyLossPct") && !$("dailyLossPct").value) setValue("dailyLossPct", "5");
  if ($("maxLossPct") && !$("maxLossPct").value) setValue("maxLossPct", "10");
  if ($("todayPnl") && !$("todayPnl").value) setValue("todayPnl", "0");
  if ($("totalPnl") && !$("totalPnl").value) setValue("totalPnl", "0");

  if ($("maxLossStreak") && !$("maxLossStreak").value) setValue("maxLossStreak", "5");
  if ($("cooldownMinutes") && !$("cooldownMinutes").value) setValue("cooldownMinutes", "120");
  if ($("currentStreak") && !$("currentStreak").value) setValue("currentStreak", "0");

  if ($("direction") && !$("direction").value) $("direction").value = "LONG";
}

function init() {
  loadAuth();
  loadLock();
  loadModes();
  loadCustomSymbols();

  seedDefaults();
  populateSymbols();
  filterSymbols();
  applySymbolToInputs();
  bindEvents();
  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
