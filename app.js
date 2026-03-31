const $ = (id) => document.getElementById(id);
const supabaseUrl = "https://lbavhqpkvngwhtmnkmef.supabase.co";
const supabaseKey = "sb_publishable_Yj6jxmzZowuGmFXKdyFj4w_86Hgh6q2";

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
const STORAGE = {
  AUTH: "propengine_auth_v1001",
  LOCK: "propengine_lock_v1001",
  MODES: "propengine_modes_v1001",
  CUSTOM_SYMBOLS: "propengine_custom_symbols_v1001"
};

const DEFAULT_SYMBOLS = [
  { name: "EURUSD", group: "FX", unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01, slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "GBPUSD", group: "FX", unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01, slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "AUDUSD", group: "FX", unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01, slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "NZDUSD", group: "FX", unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01, slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "USDCHF", group: "FX", unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01, slLabel: "SL (pips)", tpLabel: "TP (pips)" },
  { name: "EURCHF", group: "FX", unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01, slLabel: "SL (pips)", tpLabel: "TP (pips)" },
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

function parseNum(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).replace(/\s+/g, "").replace(",", ".").trim();
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
  el.classList.toggle("hidden", !visible);
}

function fmt(n, digits = 2) {
  return Number(n).toFixed(digits);
}

function money(n) {
  return `${Number(n).toFixed(2)} €`;
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

function saveAuth() {
  localStorage.setItem(STORAGE.AUTH, JSON.stringify(authState));
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

function saveLock() {
  localStorage.setItem(STORAGE.LOCK, JSON.stringify(lockState));
}

function loadLock() {
  try {
    const raw = localStorage.getItem(STORAGE.LOCK);
    if (!raw) return;
    lockState = { ...lockState, ...JSON.parse(raw) };
  } catch (e) {
    console.error("Lock load error", e);
  }
}

function saveModes() {
  localStorage.setItem(STORAGE.MODES, JSON.stringify({ calcMode, appMode }));
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

function findSymbol(name) {
  return allSymbols().find((s) => s.name === name) || DEFAULT_SYMBOLS[0];
}

function getSelectedSymbolName() {
  return $("symbol")?.value || "EURUSD";
}

function isTrialActive() {
  if (!authState.trialStart) return false;
  if (authState.plan === "pro") return false;
  const end = authState.trialStart + authState.trialDays * 24 * 60 * 60 * 1000;
  return Date.now() < end;
}

function trialDaysLeft() {
  if (!authState.trialStart) return 0;
  const end = authState.trialStart + authState.trialDays * 24 * 60 * 60 * 1000;
  const diff = end - Date.now();
  return diff > 0 ? Math.ceil(diff / (24 * 60 * 60 * 1000)) : 0;
}

function isProActive() {
  return authState.plan === "pro";
}

function hasPremium() {
  return isProActive() || isTrialActive();
}

function signUp() {
  const email = $("email")?.value.trim() || "";
  const password = $("password")?.value || "";
  if (!email || !password) {
    alert("Enter email and password.");
    return;
  }
  authState.signedIn = true;
authState.email = email;
authState.plan = "trial";
authState.trialStart = Date.now();
authState.trialDays = 7;

saveAuth();
renderAll();

}

function signIn() {
  const email = $("email")?.value.trim() || "";
  const password = $("password")?.value || "";
  if (!email || !password) {
    alert("Enter email and password.");
    return;
  }
  authState.signedIn = true;
  authState.email = email;
  if (!authState.trialStart && authState.plan !== "pro") {
    authState.plan = "trial";
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

function startTrial() {
  if (!authState.trialStart) {
    authState.plan = "trial";
    authState.trialStart = Date.now();
    saveAuth();
  }
  renderAll();
}

function upgradePlan() {
  authState.plan = "pro";
  saveAuth();
  renderAll();
}

function renderPlanBadge() {
  const badge = $("planBadge");
  if (!badge) return;

  badge.className = "pill";

  if (isProActive()) {
    badge.classList.add("pro");
    badge.textContent = "Pro Plan";
  } else if (isTrialActive()) {
    badge.classList.add("trial");
    badge.textContent = `Trial ${trialDaysLeft()}d`;
  } else {
    badge.classList.add("free");
    badge.textContent = "Free Plan";
  }
}

function renderAuth() {
  show("authSignedOut", !authState.signedIn);
  show("authSignedIn", authState.signedIn);

  if (authState.signedIn) {
    setText("userStatus", `Signed in: ${authState.email}`);
    if (isProActive()) {
      setText("trialBanner", "PropEngine Pro active.");
      show("startTrialBtn", false);
      show("upgradeBtn", false);
    } else if (isTrialActive()) {
      setText("trialBanner", `PropEngine Trial active - ${trialDaysLeft()}d`);
      show("startTrialBtn", false);
      show("upgradeBtn", true);
    } else {
      setText("trialBanner", "Free plan active.");
      show("startTrialBtn", true);
      show("upgradeBtn", true);
    }
  }
}

function renderModeUI() {
  $("manualCalcModeBtn")?.classList.toggle("active", calcMode === "manual");
  $("zoneCalcModeBtn")?.classList.toggle("active", calcMode === "zone");

  $("quickModeBtn")?.classList.toggle("active", appMode === "quick");
  $("disciplineModeBtn")?.classList.toggle("active", appMode === "discipline");

  show("manualModeFields", calcMode === "manual");
  show("zoneModeFields", calcMode === "zone");

  // Discipline cards are visible only in discipline mode or premium
  if ($("lockCard")) show("lockCard", appMode === "discipline");
  if ($("realityCard")) show("realityCard", true);
  if ($("challengeCard")) show("challengeCard", true);

  // Upsell box only when no premium
  show("premiumUpsell", !hasPremium());
}

function populateSymbols() {
  const select = $("symbol");
  if (!select) return;

  const current = select.value || "EURUSD";
  select.innerHTML = "";

  allSymbols().forEach((sym) => {
    const opt = document.createElement("option");
    opt.value = sym.name;
    opt.textContent = `${sym.name}`;
    select.appendChild(opt);
  });

  select.value = findSymbol(current).name;
}

function filterSymbols() {
  const q = $("symbolSearch")?.value.trim().toUpperCase() || "";
  const select = $("symbol");
  if (!select) return;

  const current = getSelectedSymbolName();
  select.innerHTML = "";

  const filtered = allSymbols().filter((s) => {
    return !q || s.name.includes(q) || s.group.toUpperCase().includes(q);
  });

  (filtered.length ? filtered : allSymbols()).forEach((sym) => {
    const opt = document.createElement("option");
    opt.value = sym.name;
    opt.textContent = sym.name;
    select.appendChild(opt);
  });

  select.value = findSymbol(current).name;
}

function applySymbolToInputs() {
  const sym = findSymbol(getSelectedSymbolName());

  setValue("unitSize", String(sym.unitSize).replace(".", ","));
  setValue("valuePerUnit", String(sym.valuePerUnit).replace(".", ","));
  setValue("lotStep", String(sym.lotStep).replace(".", ","));

  const slLabel = $("slUnitsLabel");
  const tpLabel = $("tpUnitsLabel");
  if (slLabel) slLabel.textContent = sym.slLabel;
  if (tpLabel) tpLabel.textContent = sym.tpLabel;
}

function addCustomSymbol() {
  const name = $("customSymbolName")?.value.trim().toUpperCase();
  const unitSize = parseNum($("customUnitSize")?.value, 0.01);
  const valuePerUnit = parseNum($("customValuePerUnit")?.value, 1);
  const lotStep = parseNum($("customLotStep")?.value, 0.01);

  if (!name) {
    alert("Enter symbol name.");
    return;
  }

  customSymbols.push({
    name,
    group: "Custom",
    unitSize,
    valuePerUnit,
    lotStep,
    slLabel: "SL (units)",
    tpLabel: "TP (units)"
  });

  saveCustomSymbols();
  populateSymbols();
  setValue("symbol", name);
  applySymbolToInputs();

  setValue("customSymbolName", "");
  setValue("customUnitSize", "");
  setValue("customValuePerUnit", "");
  setValue("customLotStep", "");

  show("addSymbolBox", false);
}

function getDirection() {
  return $("direction")?.value === "SHORT" ? "SHORT" : "LONG";
}

function getRiskMoney(balance, riskPct) {
  return balance * (riskPct / 100);
}

function calcManual() {
  const balance = inputNum("balance", 10000);
  const riskPct = inputNum("riskPct", 0.5);
  const entry = inputNum("entry", 1.1);
  const slUnits = inputNum("slUnits", 15);
  const tpUnitsInput = inputNum("tpUnits", 0);
  const rr = inputNum("rr", 2);
  const tpBuffer = inputNum("tpBuffer", 0);
  const unitSize = inputNum("unitSize", 0.0001);
  const valuePerUnit = inputNum("valuePerUnit", 10);
  const lotStep = inputNum("lotStep", 0.01);
  const direction = getDirection();

  const riskEur = getRiskMoney(balance, riskPct);
  const lossPerLot = slUnits * valuePerUnit;
  const totalLot = lossPerLot > 0 ? floorToStep(riskEur / lossPerLot, lotStep) : 0;

  const usedTpUnits = tpUnitsInput > 0 ? tpUnitsInput + tpBuffer : (slUnits * rr) + tpBuffer;

  let slPrice, tpPrice, tp1Price, tp2Price;
  if (direction === "LONG") {
    slPrice = entry - slUnits * unitSize;
    tpPrice = entry + usedTpUnits * unitSize;
    tp1Price = entry + slUnits * unitSize;
    tp2Price = entry + (slUnits * rr) * unitSize;
  } else {
    slPrice = entry + slUnits * unitSize;
    tpPrice = entry - usedTpUnits * unitSize;
    tp1Price = entry - slUnits * unitSize;
    tp2Price = entry - (slUnits * rr) * unitSize;
  }

  const lot1 = floorToStep(totalLot / 2, lotStep);
  const lot2 = floorToStep(totalLot - lot1, lotStep);

  return {
    mode: "manual",
    balance,
    riskPct,
    direction,
    entry,
    riskEur,
    lossPerLot,
    positionLots: totalLot,
    totalLot,
    lot1,
    lot2,
    slDistanceUnits: slUnits,
    tpDistanceUnits: usedTpUnits,
    slPrice,
    tpPrice,
    tp1Price,
    tp2Price,
    breakEvenAfterTP1: "Yes",
    tp1Profit: lot1 * slUnits * valuePerUnit,
    tp2Profit: lot2 * slUnits * rr * valuePerUnit
  };
}

function calcZone() {
  const balance = inputNum("balance", 10000);
  const riskPct = inputNum("riskPct", 0.5);
  const entry = inputNum("entry", 1.1);
  const zoneTop = inputNum("zoneTop", entry);
  const zoneBottom = inputNum("zoneBottom", entry);
  const rr = inputNum("rr", 2);
  const unitSize = inputNum("unitSize", 0.0001);
  const valuePerUnit = inputNum("valuePerUnit", 10);
  const lotStep = inputNum("lotStep", 0.01);
  const zoneBuffer = inputNum("zoneBuffer", 2);
  const direction = getDirection();

  const zoneSizePrice = Math.abs(zoneTop - zoneBottom);
  const zoneSize = unitSize > 0 ? zoneSizePrice / unitSize : 0;
  const slUnits = zoneSize + zoneBuffer;

  const riskEur = getRiskMoney(balance, riskPct);
  const lossPerLot = slUnits * valuePerUnit;
  const totalLot = lossPerLot > 0 ? floorToStep(riskEur / lossPerLot, lotStep) : 0;

  let slPrice, tpPrice, tp1Price, tp2Price;
  if (direction === "LONG") {
    slPrice = entry - slUnits * unitSize;
    tp1Price = entry + slUnits * unitSize;
    tp2Price = entry + (slUnits * rr) * unitSize;
    tpPrice = tp2Price;
  } else {
    slPrice = entry + slUnits * unitSize;
    tp1Price = entry - slUnits * unitSize;
    tp2Price = entry - (slUnits * rr) * unitSize;
    tpPrice = tp2Price;
  }

  const lot1 = floorToStep(totalLot / 2, lotStep);
  const lot2 = floorToStep(totalLot - lot1, lotStep);

  setValue("zoneSize", fmt(zoneSize, 2));
  setValue("zoneSlUnits", fmt(slUnits, 2));
  setValue("zoneTp1Units", fmt(slUnits, 2));
  setValue("zoneTp2Units", fmt(slUnits * rr, 2));

  return {
    mode: "zone",
    balance,
    riskPct,
    direction,
    entry,
    riskEur,
    lossPerLot,
    positionLots: totalLot,
    totalLot,
    lot1,
    lot2,
    slDistanceUnits: slUnits,
    tpDistanceUnits: slUnits * rr,
    slPrice,
    tpPrice,
    tp1Price,
    tp2Price,
    breakEvenAfterTP1: "Yes",
    tp1Profit: lot1 * slUnits * valuePerUnit,
    tp2Profit: lot2 * slUnits * rr * valuePerUnit
  };
}

function renderResults(result) {
  setText("riskOut", money(result.riskEur));
  setText("riskOut_dup", money(result.riskEur));
  setText("lotsOut", fmt(result.positionLots, 2));
  setText("lotsOut_dup", fmt(result.positionLots, 2));

  setText("lossPerLotOut", money(result.lossPerLot));
  setText("slUnitsOut", fmt(result.slDistanceUnits, 2));
  setText("tpUnitsOut", fmt(result.tpDistanceUnits, 2));
  setText("slPriceOut", fmt(result.slPrice, 5));
  setText("tpPriceOut", fmt(result.tpPrice, 5));

  setText("totalLotOut", fmt(result.totalLot, 2));
  setText("lot1Out", fmt(result.lot1, 2));
  setText("lot2Out", fmt(result.lot2, 2));
  setText("tp1PriceOut", fmt(result.tp1Price, 5));
  setText("tp2PriceOut", fmt(result.tp2Price, 5));
  setText("beAfterTp1Out", result.breakEvenAfterTP1);

  renderRealityCheck(result);
  renderChallenge();
}

function renderRealityCheck(result) {
  const account = inputNum("accountSize", result.balance);
  const dailyLossPct = inputNum("dailyLossPct", 5);
  const todayPnl = inputNum("todayPnl", 0);

  const remainingDaily = Math.max(0, account * (dailyLossPct / 100) + todayPnl);
  const balanceAfterSl = result.balance - result.riskEur;
  const dailyUsePct = remainingDaily > 0 ? (result.riskEur / remainingDaily) * 100 : 0;

  setText("balanceAfterSlOut", money(balanceAfterSl));
  setText("profitTp1Out", money(result.tp1Profit));
  setText("profitTp2Out", money(result.tp1Profit + result.tp2Profit));
  setText("dailyUsePctOut", fmt(dailyUsePct, 2) + "%");

  const ok = dailyUsePct <= 100;
  setText("realityCheckOut", ok ? "OK" : "Too big");
  setStatusClass("realityCheckOut", ok ? "ok" : "bad");
}

function renderChallenge() {
  const account = inputNum("accountSize", 10000);
  const dailyLossPct = inputNum("dailyLossPct", 5);
  const maxLossPct = inputNum("maxLossPct", 10);
  const todayPnl = inputNum("todayPnl", 0);
  const totalPnl = inputNum("totalPnL", 0);

  const dailyLimit = account * (dailyLossPct / 100);
  const maxLimit = account * (maxLossPct / 100);

  const remainingDaily = Math.max(0, dailyLimit + todayPnl);
  const remainingOverall = Math.max(0, maxLimit + totalPnl);

  setText("remainingDailyOut", money(remainingDaily));
  setText("remainingDailyOut_dup", money(remainingDaily));
  setText("remainingOverallOut", money(remainingOverall));

  if (lastResult) {
    const ok = lastResult.riskEur <= remainingDaily && lastResult.riskEur <= remainingOverall;
    setText("tradeStatusOut", ok ? "OK" : "Blocked");
    setStatusClass("tradeStatusOut", ok ? "ok" : "bad");
  } else {
    setText("tradeStatusOut", "-");
    setStatusClass("tradeStatusOut", "");
  }
}

function renderDecision(result) {
  const account = inputNum("accountSize", 10000);
  const dailyLossPct = inputNum("dailyLossPct", 5);
  const maxLossPct = inputNum("maxLossPct", 10);
  const todayPnl = inputNum("todayPnl", 0);
  const totalPnl = inputNum("totalPnL", 0);

  const remainingDaily = Math.max(0, account * (dailyLossPct / 100) + todayPnl);
  const remainingOverall = Math.max(0, account * (maxLossPct / 100) + totalPnl);

  const lockBlocked = !!(lockState.lockedUntil && Date.now() < lockState.lockedUntil);
  const ok = result.riskEur <= remainingDaily && result.riskEur <= remainingOverall && !lockBlocked;

  setText("decisionOut", ok ? "OK" : "Blocked");
  setText("decisionOut_dup", ok ? "OK" : "Blocked");
  setStatusClass("decisionOut", ok ? "ok" : "bad");
  setStatusClass("decisionOut_dup", ok ? "ok" : "bad");
}

function renderLock() {
  const maxStreak = inputNum("maxStreak", 3);
  const cooldownMin = inputNum("cooldownMin", 120);

  setValue("streakNow", lockState.streak);

  let unlocked = true;
  if (lockState.lockedUntil && Date.now() < lockState.lockedUntil) {
    unlocked = false;
  }

  if (lockState.streak >= maxStreak && cooldownMin > 0 && !lockState.lockedUntil) {
    lockState.lockedUntil = Date.now() + cooldownMin * 60 * 1000;
    saveLock();
    unlocked = false;
  }

  if (lockState.lockedUntil && Date.now() >= lockState.lockedUntil) {
    lockState.lockedUntil = null;
    lockState.streak = 0;
    saveLock();
    unlocked = true;
  }

  setText("lockStatus", hasPremium() ? (unlocked ? "Unlocked" : "Locked") : "Pro required");
  setStatusClass("lockStatus", hasPremium() ? (unlocked ? "ok" : "bad") : "warn");

  if (!hasPremium()) {
    setText("lockHint", "Start Trial / Pro to activate loss-streak lock.");
    return;
  }

  if (unlocked) {
    setText("lockHint", `Current streak: ${lockState.streak}`);
  } else {
    const minsLeft = Math.max(1, Math.ceil((lockState.lockedUntil - Date.now()) / 60000));
    setText("lockHint", `Cooldown active: ${minsLeft} min left`);
  }
}

function registerWin() {
  if (!hasPremium()) {
    alert("Loss-streak lock is available in Trial / Pro.");
    return;
  }
  lockState.streak = 0;
  lockState.lockedUntil = null;
  saveLock();
  renderLock();
}

function registerLoss() {
  if (!hasPremium()) {
    alert("Loss-streak lock is available in Trial / Pro.");
    return;
  }

  const maxStreak = inputNum("maxStreak", 3);
  const cooldownMin = inputNum("cooldownMin", 120);

  lockState.streak += 1;
  if (lockState.streak >= maxStreak && cooldownMin > 0) {
    lockState.lockedUntil = Date.now() + cooldownMin * 60 * 1000;
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

function calculateTrade() {
  let result;
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
  if (!hasPremium()) {
    alert("Decision engine is available in Trial / Pro.");
    return;
  }
  if (!lastResult) {
    calculateTrade();
    return;
  }
  renderDecision(lastResult);
}

function setChallengePreset(amount) {
  setValue("accountSize", amount);
  setValue("balance", amount);
  setValue("dailyLossPct", "5");
  setValue("maxLossPct", "10");
  renderChallenge();
  if (lastResult) renderDecision(lastResult);
}

function bindEvents() {
  $("manualCalcModeBtn")?.addEventListener("click", () => {
    calcMode = "manual";
    saveModes();
    renderModeUI();
  });

  $("zoneCalcModeBtn")?.addEventListener("click", () => {
    if (!hasPremium()) {
      alert("Zone mode is available in Trial / Pro.");
      return;
    }
    calcMode = "zone";
    saveModes();
    renderModeUI();
  });

  $("quickModeBtn")?.addEventListener("click", () => {
    appMode = "quick";
    saveModes();
    renderModeUI();
  });

  $("disciplineModeBtn")?.addEventListener("click", () => {
    if (!hasPremium()) {
      alert("Discipline tools are available in Trial / Pro.");
      return;
    }
    appMode = "discipline";
    saveModes();
    renderModeUI();
  });

  $("calcBtn")?.addEventListener("click", calculateTrade);
  $("canTakeBtn")?.addEventListener("click", canTakeTrade);

  $("signUpBtn")?.addEventListener("click", signUp);
  $("signInBtn")?.addEventListener("click", signIn);
  $("signOutBtn")?.addEventListener("click", signOut);
  $("startTrialBtn")?.addEventListener("click", startTrial);

  $("upgradeBtn")?.addEventListener("click", upgradePlan);
  $("upgradeBtnSecondary")?.addEventListener("click", upgradePlan);
  $("upgradeBtnSecondary2")?.addEventListener("click", upgradePlan);

  $("showAddSymbol")?.addEventListener("click", () => {
    const box = $("addSymbolBox");
    if (box) box.classList.toggle("hidden");
  });

  $("addSymbolBtn")?.addEventListener("click", addCustomSymbol);

  $("symbol")?.addEventListener("change", () => {
    applySymbolToInputs();
    if (lastResult) calculateTrade();
  });

  $("symbolSearch")?.addEventListener("input", filterSymbols);

  $("winBtn")?.addEventListener("click", registerWin);
  $("lossBtn")?.addEventListener("click", registerLoss);
  $("resetLockBtn")?.addEventListener("click", resetLock);

  $("presetChallenge10K")?.addEventListener("click", () => setChallengePreset(10000));
  $("presetChallenge25K")?.addEventListener("click", () => setChallengePreset(25000));
  $("presetChallenge50K")?.addEventListener("click", () => setChallengePreset(50000));
  $("presetChallenge100K")?.addEventListener("click", () => setChallengePreset(100000));

  const watchIds = [
    "balance", "riskPct", "entry", "slUnits", "tpUnits", "tpBuffer",
    "unitSize", "valuePerUnit", "lotStep", "rr", "direction",
    "zoneTop", "zoneBottom", "zoneBuffer",
    "accountSize", "dailyLossPct", "maxLossPct", "todayPnl", "totalPnL",
    "maxStreak", "cooldownMin"
  ];

  watchIds.forEach((id) => {
    const el = $(id);
    if (!el) return;

    const handler = () => {
      if (lastResult) calculateTrade();
      renderChallenge();
      renderLock();
    };

    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
  });

  $("helpBtn")?.addEventListener("click", () => {
    alert("Quick mode is free. Zone mode, discipline tools and challenge decision are Trial / Pro.");
  });
}

function seedDefaults() {
  if ($("balance") && !$("balance").value) setValue("balance", "10000");
  if ($("riskPct") && !$("riskPct").value) setValue("riskPct", "0,5");
  if ($("entry") && !$("entry").value) setValue("entry", "1,10000");
  if ($("slUnits") && !$("slUnits").value) setValue("slUnits", "15");
  if ($("rr") && !$("rr").value) setValue("rr", "2");
  if ($("tpBuffer") && !$("tpBuffer").value) setValue("tpBuffer", "0");
  if ($("unitSize") && !$("unitSize").value) setValue("unitSize", "0,0001");
  if ($("valuePerUnit") && !$("valuePerUnit").value) setValue("valuePerUnit", "10");
  if ($("lotStep") && !$("lotStep").value) setValue("lotStep", "0,01");

  if ($("accountSize") && !$("accountSize").value) setValue("accountSize", "10000");
  if ($("dailyLossPct") && !$("dailyLossPct").value) setValue("dailyLossPct", "5");
  if ($("maxLossPct") && !$("maxLossPct").value) setValue("maxLossPct", "10");
  if ($("todayPnl") && !$("todayPnl").value) setValue("todayPnl", "0");
  if ($("totalPnL") && !$("totalPnL").value) setValue("totalPnL", "0");

  if ($("maxStreak") && !$("maxStreak").value) setValue("maxStreak", "3");
  if ($("cooldownMin") && !$("cooldownMin").value) setValue("cooldownMin", "120");
  if ($("streakNow") && !$("streakNow").value) setValue("streakNow", "0");
}

function renderAll() {
  renderPlanBadge();
  renderAuth();
  renderModeUI();
  renderChallenge();
  renderLock();

  if (lastResult) {
    renderResults(lastResult);
    renderDecision(lastResult);
  } else {
    setText("remainingDailyOut", money(inputNum("accountSize", 10000) * (inputNum("dailyLossPct", 5) / 100)));
    setText("remainingDailyOut_dup", money(inputNum("accountSize", 10000) * (inputNum("dailyLossPct", 5) / 100)));
    setText("decisionOut", "-");
    setText("decisionOut_dup", "-");
  }
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
