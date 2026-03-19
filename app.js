const $ = (id) => document.getElementById(id);

const STORAGE = {
  APP: "propengine_app_v900",
  AUTH: "propengine_auth_v900",
  LOCK: "propengine_lock_v900",
  MODES: "propengine_modes_v900",
  CUSTOM_SYMBOLS: "propengine_custom_symbols_v900"
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

function parseNum(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).replaceAll(" ", "").replace(",", ".").trim();
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
  return Number(n).toFixed(2) + " €";
}

function floorToStep(value, step) {
  if (!step || step <= 0) return value;
  return Math.floor(value / step) * step;
}

function isLong() {
  const dir = $("direction");
  return !dir || dir.value === "LONG";
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
    authState = { ...authState, ...parsed };
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
    lockState = { ...lockState, ...parsed };
  } catch (e) {
    console.error("Lock load error", e);
  }
}

function saveCustomSymbols() {
  localStorage.setItem(STORAGE.CUSTOM_SYMBOLS, JSON.stringify(customSymbols));
}

function loadCustomSymbols() {
  try {
    const raw = localStorage.getItem(STORAGE.CUSTOM_SYMBOLS);
    if (!raw) return;
    customSymbols = JSON.parse(raw) || [];
  } catch (e) {
    console.error("Custom symbols load error", e);
  }
}

function allSymbols() {
  return [...DEFAULT_SYMBOLS, ...customSymbols];
}

function getSelectedSymbol() {
  const sel = $("symbol");
  const value = sel ? sel.value : "";
  return allSymbols().find(s => s.name === value) || DEFAULT_SYMBOLS[0];
}

function isSignedIn() {
  return !!authState.signedIn;
}

function isTrialActive() {
  if (!authState.trialStart) return false;
  const start = new Date(authState.trialStart).getTime();
  const now = Date.now();
  const days = authState.trialDays || 7;
  return now < start + days * 24 * 60 * 60 * 1000;
}

function trialDaysLeft() {
  if (!authState.trialStart) return 0;
  const start = new Date(authState.trialStart).getTime();
  const end = start + (authState.trialDays || 7) * 24 * 60 * 60 * 1000;
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
  authState.trialStart = new Date().toISOString();
  saveAuth();
  renderAuth();
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
    setText("userStatus", Signed in: ${authState.email});

    if (isProActive()) {
      setText("trialBanner", "PropEngine Pro active.");
      show("startTrialBtn", false);
      show("upgradeBtn", false);
    } else if (isTrialActive()) {
      setText("trialBanner", PropEngine Trial active - ${trialDaysLeft()} day(s) left.);
      show("startTrialBtn", false);
      show("upgradeBtn", true);
    } else {
      setText("trialBanner", "Free plan active. Start Trial or upgrade to unlock premium tools.");
      show("startTrialBtn", true);
      show("upgradeBtn", true);
    }
  } else {
    show("authSignedOut", true);
    show("authSignedIn", false);
  }

  renderPlanBadge();
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
    startTrial();
  }

  saveAuth();
  renderAuth();
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

  saveAuth();
  renderAuth();
}

function signOut() {
  authState.signedIn = false;
  authState.email = "";
  saveAuth();
  renderAuth();
}

function upgradeNow() {
  alert("Stripe checkout can be connected here later.");
}

function populateSymbols(filter = "") {
  const sel = $("symbol");
  if (!sel) return;

  const q = (filter || "").trim().toLowerCase();
  const symbols = allSymbols().filter(s => {
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.group.toLowerCase().includes(q);
  });

  const prev = sel.value;
  sel.innerHTML = "";

  symbols.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.name;
    opt.textContent = ${s.name}${s.group ? ` (${s.group}) : ""}`;
    sel.appendChild(opt);
  });

  const restore = symbols.find(s => s.name === prev) ? prev : (symbols[0] ? symbols[0].name : "");
  sel.value = restore;
  applySymbolDefaults();
}

function applySymbolDefaults() {
  const s = getSelectedSymbol();
  setValue("unitSize", String(s.unitSize).replace(".", ","));
  setValue("valuePerUnit", String(s.valuePerUnit).replace(".", ","));
  setValue("lotStep", String(s.lotStep).replace(".", ","));
  setText("slUnitsLabel", s.slLabel || "SL (units)");
  setText("tpUnitsLabel", s.tpLabel || "TP (units)");
}

function addCustomSymbol() {
  const name = $("customSymbolName") ? $("customSymbolName").value.trim().toUpperCase() : "";
  const unitSize = parseNum($("customUnitSize")?.value, 0);
  const valuePerUnit = parseNum($("customValuePerUnit")?.value, 0);
  const lotStep = parseNum($("customLotStep")?.value, 0.01);

  if (!name || !unitSize || !valuePerUnit) {
    alert("Fill symbol name, unit size and value per unit.");
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
  populateSymbols(name);

  setValue("customSymbolName", "");
  setValue("customUnitSize", "");
  setValue("customValuePerUnit", "");
  setValue("customLotStep", "");
  show("addSymbolBox", false);
}

function setAppMode(mode) {
  appMode = mode;
  $("quickModeBtn")?.classList.toggle("active", mode === "quick");
  $("disciplineModeBtn")?.classList.toggle("active", mode === "discipline");
}

function setCalcMode(mode) {
  if (mode === "zone" && !hasPremium()) {
    alert("Zone mode requires Trial or Pro.");
    return;
  }

  calcMode = mode;
  $("manualCalcModeBtn")?.classList.toggle("active", mode === "manual");
  $("zoneCalcModeBtn")?.classList.toggle("active", mode === "zone");

  show("manualModeFields", mode === "manual");
  show("zoneModeFields", mode === "zone");
}

function computeZoneFields() {
  const top = inputNum("zoneTop", 0);
  const bottom = inputNum("zoneBottom", 0);
  const unitSize = inputNum("unitSize", 0.0001);
  const buffer = inputNum("zoneBuffer", 0);

  if (!top || !bottom || !unitSize) {
    setValue("zoneSize", "");
    setValue("zoneSlUnits", "");
    setValue("zoneTp1Units", "");
    setValue("zoneTp2Units", "");
    return;
  }

  const zoneSize = Math.abs(top - bottom) / unitSize;
  const slUnits = zoneSize + buffer;
  const tp1 = slUnits;
  const tp2 = slUnits * 2;

  setValue("zoneSize", fmt(zoneSize, 2));
  setValue("zoneSlUnits", fmt(slUnits, 2));
  setValue("zoneTp1Units", fmt(tp1, 2));
  setValue("zoneTp2Units", fmt(tp2, 2));
}

function getChallengeState(riskEur = 0) {
  const accountSize = inputNum("accountSize", 10000);
  const dailyLossPct = inputNum("dailyLossPct", 5);
  const maxLossPct = inputNum("maxLossPct", 10);
  const todayPnL = inputNum("todayPnl", 0);
  const totalPnL = inputNum("totalPnL", 0);

  const dailyLossLimit = accountSize * (dailyLossPct / 100);
  const overallLossLimit = accountSize * (maxLossPct / 100);

  const remainingDaily = dailyLossLimit + todayPnL;
  const remainingOverall = overallLossLimit + totalPnL;

  let status = "OK ✅";
  let cls = "ok";

  if (riskEur > remainingDaily || riskEur > remainingOverall) {
    status = "BLOCKED ❌";
    cls = "bad";
  }

  return {
    accountSize,
    remainingDaily,
    remainingOverall,
    status,
    cls
  };
}

function isLockedNow() {
  if (!lockState.lockedUntil) return false;
  return Date.now() < lockState.lockedUntil;
}

function refreshLockStatus() {
  if (!hasPremium()) {
    setText("lockStatus", "Pro required");
    setStatusClass("lockStatus", "warn");
    setText("lockHint", "Unlock with Trial or Pro.");
    return;
  }

  if (isLockedNow()) {
    const minsLeft = Math.ceil((lockState.lockedUntil - Date.now()) / 60000);
    setText("lockStatus", Locked (${minsLeft} min left));
    setStatusClass("lockStatus", "bad");
    setText("lockHint", "Loss streak lock is active.");
  } else {
    setText("lockStatus", "Unlocked ✅");
    setStatusClass("lockStatus", "ok");
    setText("lockHint", "");
  }
}

function handleWin() {
  if (!hasPremium()) return;
  lockState.streak = 0;
  setValue("streakNow", "0");
  lockState.lockedUntil = null;
  saveLock();
  refreshLockStatus();
}

function handleLoss() {
  if (!hasPremium()) return;

  const maxStreak = inputNum("maxStreak", 3);
  const cooldownMin = inputNum("cooldownMin", 120);

  lockState.streak = inputNum("streakNow", 0) + 1;
  setValue("streakNow", String(lockState.streak));

  if (lockState.streak >= maxStreak) {
    lockState.lockedUntil = Date.now() + cooldownMin * 60000;
  }

  saveLock();
  refreshLockStatus();
}

function resetLock() {
  if (!hasPremium()) return;
  lockState.streak = 0;
  lockState.lockedUntil = null;
  setValue("streakNow", "0");
  saveLock();
  refreshLockStatus();
}

function updateTopDashboard(challenge, result, decisionText) {
  setText("riskOutTop", result ? money(result.riskEur) : "-");
  setText("lotsOutTop", result ? fmt(result.totalLot, 3) : "-");
  setText("remainingDailyOutTop", challenge ? money(challenge.remainingDaily) : "-");
  setText("decisionOutTop", decisionText || "-");
}

function calculate() {
  computeZoneFields();

  const balance = inputNum("balance", 10000);
  const riskPct = inputNum("riskPct", 0.5);
  const entry = inputNum("entry", 0);
  const rr = inputNum("rr", 2);
  const unitSize = inputNum("unitSize", 0.0001);
  const valuePerUnit = inputNum("valuePerUnit", 10);
  const lotStep = inputNum("lotStep", 0.01);

  let slUnits = 0;
  let tpUnits = 0;

  if (calcMode === "zone") {
    slUnits = inputNum("zoneSlUnits", 0);
    const tp1Units = inputNum("zoneTp1Units", 0);
    tpUnits = tp1Units > 0 ? tp1Units * 2 : slUnits * 2;
  } else {
    slUnits = inputNum("slUnits", 0);
    const tpInput = inputNum("tpUnits", 0);
    const tpBuffer = inputNum("tpBuffer", 0);
    tpUnits = tpInput > 0 ? tpInput + tpBuffer : slUnits * rr + tpBuffer;
  }

  if (!balance || !riskPct || !entry || !slUnits || !unitSize || !valuePerUnit) {
    setText("clickStatus", "Fill all required fields.");
    return;
  }

  const riskEur = balance * (riskPct / 100);
  const lossPerLot = slUnits * valuePerUnit;
  const totalLotRaw = riskEur / lossPerLot;
  const totalLot = floorToStep(totalLotRaw, lotStep);

  const priceDistanceSL = slUnits * unitSize;
  const priceDistanceTP = tpUnits * unitSize;

  const slPrice = isLong() ? entry - priceDistanceSL : entry + priceDistanceSL;
  const tpPrice = isLong() ? entry + priceDistanceTP : entry - priceDistanceTP;

  setText("riskOut", money(riskEur));
  setText("lossPerLotOut", money(lossPerLot));
  setText("lotsOut", fmt(totalLot, 3));
  setText("slUnitsOut", fmt(slUnits, 2));
  setText("tpUnitsOut", fmt(tpUnits, 2));
  setText("slPriceOut", fmt(slPrice, 5));
  setText("tpPriceOut", fmt(tpPrice, 5));

  let decisionText = "Free";
  let decisionClass = "warn";

  if (hasPremium()) {
    const lot1 = floorToStep(totalLot / 2, lotStep);
    const lot2 = floorToStep(totalLot - lot1, lotStep);

    const tp1Units = slUnits;
    const tp2Units = slUnits * 2;

    const tp1Price = isLong() ? entry + tp1Units * unitSize : entry - tp1Units * unitSize;
    const tp2Price = isLong() ? entry + tp2Units * unitSize : entry - tp2Units * unitSize;

    const challenge = getChallengeState(riskEur);

    const balanceAfterSl = balance - riskEur;
    const profitTp1 = lot1 * tp1Units * valuePerUnit;
    const profitTp2 = lot2 * tp2Units * valuePerUnit;
    const dailyUsePct = challenge.remainingDaily > 0 ? (riskEur / challenge.remainingDaily) * 100 : 0;

    setText("totalLotOut", fmt(totalLot, 3));
    setText("lot1Out", fmt(lot1, 3));
    setText("lot2Out", fmt(lot2, 3));
    setText("tp1PriceOut", fmt(tp1Price, 5));
    setText("tp2PriceOut", fmt(tp2Price, 5));
    setText("beAfterTp1Out", "Yes");

    setText("balanceAfterSlOut", money(balanceAfterSl));
    setText("profitTp1Out", money(profitTp1));
    setText("profitTp2Out", money(profitTp1 + profitTp2));
    setText("dailyUsePctOut", ${fmt(dailyUsePct, 2)}%);

    if (challenge.status.startsWith("BLOCKED")) {
      decisionText = "NO ❌";
      decisionClass = "bad";
      setText("realityCheckOut", "Blocked by challenge limits");
      setStatusClass("realityCheckOut", "bad");
    } else if (isLockedNow()) {
      decisionText = "LOCKED ❌";
      decisionClass = "bad";
      setText("realityCheckOut", "Locked by loss-streak rule");
      setStatusClass("realityCheckOut", "bad");
    } else {
      decisionText = "OK ✅";
      decisionClass = "ok";
      setText("realityCheckOut", "OK ✅");
      setStatusClass("realityCheckOut", "ok");
    }

    setText("remainingDailyOut", money(challenge.remainingDaily));
    setText("remainingOverallOut", money(challenge.remainingOverall));
    setText("tradeStatusOut", challenge.status);
    setStatusClass("tradeStatusOut", challenge.cls);
  } else {
    setText("totalLotOut", "Pro");
    setText("lot1Out", "Pro");
    setText("lot2Out", "Pro");
    setText("tp1PriceOut", "Pro");
    setText("tp2PriceOut", "Pro");
    setText("beAfterTp1Out", "Pro");
    setText("balanceAfterSlOut", "-");
    setText("profitTp1Out", "-");
    setText("profitTp2Out", "-");
    setText("dailyUsePctOut", "-");
    setText("realityCheckOut", "-");
    setText("remainingDailyOut", "-");
    setText("remainingOverallOut", "-");
    setText("tradeStatusOut", "-");

    decisionText = "Pro";
    decisionClass = "warn";
  }

  setText("decisionOut", decisionText);
  setStatusClass("decisionOut", decisionClass);
  setStatusClass("decisionOutTop", decisionClass);
  updateTopDashboard(hasPremium() ? getChallengeState(riskEur) : null, { riskEur, totalLot }, decisionText);

  setText("clickStatus", "Calculated ✅");
}

function canTakeTrade() {
  if (!hasPremium()) {
    alert("This feature requires Trial or Pro.");
    return;
  }
  calculate();
}

function setChallengePreset(size) {
  setValue("accountSize", String(size));
  setValue("balance", String(size));
  setValue("dailyLossPct", "5");
  setValue("maxLossPct", "10");
  calculate();
}

function bindEvents() {
  $("signUpBtn")?.addEventListener("click", signUp);
  $("signInBtn")?.addEventListener("click", signIn);
  $("signOutBtn")?.addEventListener("click", signOut);
  $("helpBtn")?.addEventListener("click", () => alert("Use Manual mode for free. Create account to activate trial."));
  $("upgradeBtn")?.addEventListener("click", upgradeNow);
  $("upgradeBtnSecondary")?.addEventListener("click", upgradeNow);
  $("upgradeBtnSecondary2")?.addEventListener("click", upgradeNow);
  $("startTrialBtn")?.addEventListener("click", startTrial);

  $("quickModeBtn")?.addEventListener("click", () => setAppMode("quick"));
  $("disciplineModeBtn")?.addEventListener("click", () => {
    if (!hasPremium()) {
      alert("Discipline mode requires Trial or Pro.");
      return;
    }
    setAppMode("discipline");
  });

  $("manualCalcModeBtn")?.addEventListener("click", () => setCalcMode("manual"));
  $("zoneCalcModeBtn")?.addEventListener("click", () => setCalcMode("zone"));

  $("symbol")?.addEventListener("change", applySymbolDefaults);
  $("symbolSearch")?.addEventListener("input", (e) => populateSymbols(e.target.value));

  $("showAddSymbol")?.addEventListener("click", () => {
    show("addSymbolBox", $("addSymbolBox")?.classList.contains("hidden"));
  });
  $("addSymbolBtn")?.addEventListener("click", addCustomSymbol);

  $("calcBtn")?.addEventListener("click", calculate);
  $("canTakeBtn")?.addEventListener("click", canTakeTrade);

  $("zoneTop")?.addEventListener("input", computeZoneFields);
  $("zoneBottom")?.addEventListener("input", computeZoneFields);
  $("zoneBuffer")?.addEventListener("input", computeZoneFields);
  $("unitSize")?.addEventListener("input", computeZoneFields);

  $("winBtn")?.addEventListener("click", handleWin);
  $("lossBtn")?.addEventListener("click", handleLoss);
  $("resetLockBtn")?.addEventListener("click", resetLock);

  $("presetChallenge10K")?.addEventListener("click", () => setChallengePreset(10000));
  $("presetChallenge25K")?.addEventListener("click", () => setChallengePreset(25000));
  $("presetChallenge50K")?.addEventListener("click", () => setChallengePreset(50000));
  $("presetChallenge100K")?.addEventListener("click", () => setChallengePreset(100000));
}

function init() {
  loadAuth();
  loadLock();
  loadCustomSymbols();

  populateSymbols();
  renderAuth();
  refreshLockStatus();
  bindEvents();
  setAppMode("quick");
  setCalcMode("manual");
  applySymbolDefaults();
  computeZoneFields();
  calculate();
}

document.addEventListener("DOMContentLoaded", init);
