const $ = (id) => document.getElementById(id);

/* =========================
   SUPABASE
========================= */
const SUPABASE_URL = "SEM_DAJ_TVOJ_PROJECT_URL";
const SUPABASE_PUBLISHABLE_KEY = "SEM_DAJ_TVOJ_PUBLISHABLE_KEY";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

/* =========================
   APP STATE
========================= */
let authState = {
  signedIn: false,
  email: "",
  plan: "free",
  trialStart: null,
  trialDays: 7,
  userId: null
};

let calcMode = "manual";
let appMode = "quick";
let lastResult = null;

const SYMBOLS = {
  EURUSD: { unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01 },
  GBPUSD: { unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01 },
  AUDUSD: { unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01 },
  NZDUSD: { unitSize: 0.0001, valuePerUnit: 10, lotStep: 0.01 },
  USDJPY: { unitSize: 0.01, valuePerUnit: 9, lotStep: 0.01 },
  XAUUSD: { unitSize: 0.1, valuePerUnit: 1, lotStep: 0.01 },
  BTCUSD: { unitSize: 1, valuePerUnit: 1, lotStep: 0.01 },
  NAS100: { unitSize: 1, valuePerUnit: 1, lotStep: 0.01 }
};

/* =========================
   HELPERS
========================= */
function parseNum(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).replace(/\s/g, "").replace(",", ".");
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

function show(id, visible = true) {
  const el = $(id);
  if (!el) return;
  el.classList.toggle("hidden", !visible);
}

function fmt(n, digits = 2) {
  return Number(n).toFixed(digits);
}

function money(n) {
  return Number(n).toFixed(2) + " EUR";
}

function floorToStep(value, step) {
  if (!step || step <= 0) return value;
  return Math.floor(value / step) * step;
}

function isLong() {
  return $("direction") ? $("direction").value === "LONG" : true;
}

/* =========================
   AUTH + PROFILE
========================= */
async function ensureProfile(user) {
  if (!user) return null;

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    console.error("Profile select error:", selectError);
    return null;
  }

  if (existing) return existing;

  const insertPayload = {
    id: user.id,
    email: user.email || "",
    plan: "trial",
    trial_start: new Date().toISOString(),
    trial_days: 7
  };

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    console.error("Profile insert error:", insertError);
    return null;
  }

  return inserted;
}

async function loadProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("loadProfile error:", error);
    return null;
  }

  return data;
}

function applyProfileToState(user, profile) {
  authState.signedIn = !!user;
  authState.userId = user ? user.id : null;
  authState.email = user ? (user.email || "") : "";

  if (profile) {
    authState.plan = profile.plan || "trial";
    authState.trialDays = profile.trial_days || 7;
    authState.trialStart = profile.trial_start
      ? new Date(profile.trial_start).getTime()
      : Date.now();
  } else if (user) {
    authState.plan = "trial";
    authState.trialDays = 7;
    authState.trialStart = Date.now();
  } else {
    authState.plan = "free";
    authState.trialDays = 7;
    authState.trialStart = null;
  }
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
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function isProActive() {
  return authState.plan === "pro";
}

function hasPremium() {
  return isProActive() || isTrialActive();
}

async function signUp() {
  const email = $("email") ? $("email").value.trim() : "";
  const password = $("password") ? $("password").value : "";

  setText("authMessage", "");

  if (!email || !password) {
    setText("authMessage", "Enter email and password.");
    return;
  }

  if (password.length < 6) {
    setText("authMessage", "Password must have at least 6 characters.");
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    setText("authMessage", error.message);
    return;
  }

  const user = data && data.user ? data.user : null;
  if (user) {
    await ensureProfile(user);
  }

  setText("authMessage", "Account created. If email confirmation is on, check your inbox.");
  await refreshSession();
}

async function signIn() {
  const email = $("email") ? $("email").value.trim() : "";
  const password = $("password") ? $("password").value : "";

  setText("authMessage", "");

  if (!email || !password) {
    setText("authMessage", "Enter email and password.");
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setText("authMessage", error.message);
    return;
  }

  await refreshSession();
}

async function signOut() {
  await supabase.auth.signOut();
  authState = {
    signedIn: false,
    email: "",
    plan: "free",
    trialStart: null,
    trialDays: 7,
    userId: null
  };
  renderAll();
}

async function startTrial() {
  if (!authState.userId) {
    setText("authMessage", "Sign in first.");
    return;
  }

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({
      plan: "trial",
      trial_start: nowIso,
      trial_days: 7
    })
    .eq("id", authState.userId);

  if (error) {
    setText("authMessage", error.message);
    return;
  }

  await refreshSession();
}

async function upgradePlan() {
  if (!authState.userId) {
    setText("authMessage", "Sign in first.");
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      plan: "pro"
    })
    .eq("id", authState.userId);

  if (error) {
    setText("authMessage", error.message);
    return;
  }

  await refreshSession();
}

async function refreshSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("getSession error:", error);
    return;
  }

  const session = data ? data.session : null;
  const user = session ? session.user : null;

  if (!user) {
    applyProfileToState(null, null);
    renderAll();
    return;
  }

  let profile = await loadProfile(user.id);
  if (!profile) {
    profile = await ensureProfile(user);
  }

  applyProfileToState(user, profile);
  renderAll();
}

/* =========================
   UI RENDER
========================= */
function renderPlanBadge() {
  const badge = $("planBadge");
  if (!badge) return;

  badge.className = "pill";

  if (isProActive()) {
    badge.classList.add("pro");
    badge.textContent = "Pro Plan";
    return;
  }

  if (isTrialActive()) {
    badge.classList.add("trial");
    badge.textContent = "Trial " + trialDaysLeft() + "d";
    return;
  }

  badge.classList.add("free");
  badge.textContent = "Free Plan";
}

function renderAuth() {
  show("authSignedOut", !authState.signedIn);
  show("authSignedIn", authState.signedIn);

  if (authState.signedIn) {
    setText("userStatus", "Signed in: " + authState.email);

    if (isProActive()) {
      setText("trialBanner", "PropEngine Pro active.");
      if ($("startTrialBtn")) $("startTrialBtn").disabled = true;
    } else if (isTrialActive()) {
      setText("trialBanner", "Trial active - " + trialDaysLeft() + " days left.");
      if ($("startTrialBtn")) $("startTrialBtn").disabled = true;
    } else {
      setText("trialBanner", "Free plan active. Start your trial.");
      if ($("startTrialBtn")) $("startTrialBtn").disabled = false;
    }
  }
}

function renderModeUI() {
  if ($("manualCalcModeBtn")) $("manualCalcModeBtn").classList.toggle("active", calcMode === "manual");
  if ($("zoneCalcModeBtn")) $("zoneCalcModeBtn").classList.toggle("active", calcMode === "zone");

  if ($("quickModeBtn")) $("quickModeBtn").classList.toggle("active", appMode === "quick");
  if ($("disciplineModeBtn")) $("disciplineModeBtn").classList.toggle("active", appMode === "discipline");

  show("manualModeFields", calcMode === "manual");
  show("zoneModeFields", calcMode === "zone");
}

function applySymbolDefaults() {
  const symbolName = $("symbol") ? $("symbol").value : "EURUSD";
  const symbol = SYMBOLS[symbolName] || SYMBOLS.EURUSD;

  if ($("unitSize")) $("unitSize").value = String(symbol.unitSize).replace(".", ",");
  if ($("valuePerUnit")) $("valuePerUnit").value = String(symbol.valuePerUnit).replace(".", ",");
  if ($("lotStep")) $("lotStep").value = String(symbol.lotStep).replace(".", ",");
}

function challengeData() {
  const accountSize = inputNum("accountSize", 10000);
  const dailyLossPct = inputNum("dailyLossPct", 5);
  const maxLossPct = inputNum("maxLossPct", 10);
  const todayPnl = inputNum("todayPnl", 0);
  const totalPnL = inputNum("totalPnL", 0);

  const dailyLimit = accountSize * (dailyLossPct / 100);
  const maxLimit = accountSize * (maxLossPct / 100);

  return {
    accountSize,
    dailyLimit,
    maxLimit,
    remainingDaily: dailyLimit + todayPnl,
    remainingOverall: maxLimit + totalPnL
  };
}

function renderChallenge() {
  const ch = challengeData();

  setText("remainingDailyOut", money(ch.remainingDaily));
  setText("remainingDailyOutDup", money(ch.remainingDaily));
  setText("remainingOverallOut", money(ch.remainingOverall));

  const tradeStatus = $("tradeStatusOut");
  if (!tradeStatus) return;

  if (ch.remainingDaily <= 0 || ch.remainingOverall <= 0) {
    tradeStatus.textContent = "Blocked";
    tradeStatus.className = "bad";
  } else if (ch.remainingDaily < ch.dailyLimit * 0.25) {
    tradeStatus.textContent = "Careful";
    tradeStatus.className = "warn";
  } else {
    tradeStatus.textContent = "OK";
    tradeStatus.className = "ok";
  }
}

/* =========================
   CALCULATOR
========================= */
function calculate() {
  const balance = inputNum("balance", 10000);
  const riskPct = inputNum("riskPct", 0.5);
  const entry = inputNum("entry", 1.1);
  const rr = inputNum("rr", 2);
  const unitSize = inputNum("unitSize", 0.0001);
  const valuePerUnit = inputNum("valuePerUnit", 10);
  const lotStep = inputNum("lotStep", 0.01);
  const tpBuffer = inputNum("tpBuffer", 0);

  const riskEur = balance * (riskPct / 100);

  let slUnits = 0;
  let tpUnits = 0;

  if (calcMode === "manual") {
    slUnits = inputNum("slUnits", 15);
    tpUnits = inputNum("tpUnits", 0);
    if (!tpUnits || tpUnits <= 0) tpUnits = slUnits * rr;
  } else {
    if (!hasPremium()) {
      setText("clickStatus", "Zone mode is premium.");
      return;
    }

    const zoneTop = inputNum("zoneTop", 0);
    const zoneBottom = inputNum("zoneBottom", 0);
    const zoneBuffer = inputNum("zoneBuffer", 2);

    const zoneSize = Math.abs(zoneTop - zoneBottom);
    slUnits = zoneSize + zoneBuffer;
    tpUnits = slUnits * rr;

    if ($("zoneSize")) $("zoneSize").value = fmt(zoneSize, 5);
  }

  const lossPerLot = slUnits * valuePerUnit;
  let lots = lossPerLot > 0 ? riskEur / lossPerLot : 0;
  lots = floorToStep(lots, lotStep);

  const dirLong = isLong();
  const slPrice = dirLong ? entry - (slUnits * unitSize) : entry + (slUnits * unitSize);
  const tpPrice = dirLong ? entry + ((tpUnits + tpBuffer) * unitSize) : entry - ((tpUnits + tpBuffer) * unitSize);

  const totalLot = lots;
  const lot1 = floorToStep(totalLot * 0.5, lotStep);
  const lot2 = floorToStep(totalLot - lot1, lotStep);

  const tp1Units = slUnits;
  const tp2Units = tpUnits;

  const tp1Price = dirLong ? entry + (tp1Units * unitSize) : entry - (tp1Units * unitSize);
  const tp2Price = dirLong ? entry + (tp2Units * unitSize) : entry - (tp2Units * unitSize);

  const profitTp1 = lot1 * tp1Units * valuePerUnit;
  const profitTp2 = lot2 * tp2Units * valuePerUnit;

  const ch = challengeData();
  const balanceAfterSl = balance - riskEur;
  const dailyUsePct = ch.remainingDaily > 0 ? (riskEur / ch.remainingDaily) * 100 : 999;

  let decisionText = "OK";
  let decisionClass = "ok";

  if (dailyUsePct > 100 || ch.remainingOverall <= 0) {
    decisionText = "NO";
    decisionClass = "bad";
  } else if (dailyUsePct > 50) {
    decisionText = "CAREFUL";
    decisionClass = "warn";
  }

  let realityText = "OK";
  let realityClass = "ok";

  if (dailyUsePct > 100) {
    realityText = "Too big";
    realityClass = "bad";
  } else if (dailyUsePct > 50) {
    realityText = "Heavy risk";
    realityClass = "warn";
  }

  lastResult = {
    riskEur,
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
    dailyUsePct,
    decisionText,
    decisionClass,
    realityText,
    realityClass
  };

  renderResults();
}

function renderResults() {
  if (!lastResult) return;

  setText("riskOut", money(lastResult.riskEur));
  setText("riskOutDup", money(lastResult.riskEur));
  setText("lotsOut", fmt(lastResult.lots, 2));
  setText("lotsOutDup", fmt(lastResult.lots, 2));
  setText("lossPerLotOut", money(lastResult.lossPerLot));
  setText("slUnitsOut", fmt(lastResult.slUnits, 2));
  setText("tpUnitsOut", fmt(lastResult.tpUnits, 2));
  setText("slPriceOut", fmt(lastResult.slPrice, 5));
  setText("tpPriceOut", fmt(lastResult.tpPrice, 5));
  setText("totalLotOut", fmt(lastResult.totalLot, 2));
  setText("lot1Out", fmt(lastResult.lot1, 2));
  setText("lot2Out", fmt(lastResult.lot2, 2));
  setText("tp1PriceOut", fmt(lastResult.tp1Price, 5));
  setText("tp2PriceOut", fmt(lastResult.tp2Price, 5));
  setText("beAfterTp1Out", "Yes");

  setText("balanceAfterSlOut", money(lastResult.balanceAfterSl));
  setText("profitTp1Out", money(lastResult.profitTp1));
  setText("profitTp2Out", money(lastResult.profitTp2));
  setText("dailyUsePctOut", fmt(lastResult.dailyUsePct, 2) + "%");

  const decisionTop = $("decisionOut");
  if (decisionTop) {
    decisionTop.textContent = lastResult.decisionText;
    decisionTop.className = "statValue " + lastResult.decisionClass;
  }

  const reality = $("realityCheckOut");
  if (reality) {
    reality.textContent = lastResult.realityText;
    reality.className = lastResult.realityClass;
  }
}

function canTakeTrade() {
  if (!lastResult) calculate();
  if (!lastResult) return;
  setText("clickStatus", "Trade check: " + lastResult.decisionText);
}

/* =========================
   PRESETS
========================= */
function setPreset(size) {
  if ($("accountSize")) $("accountSize").value = String(size);
  if ($("balance")) $("balance").value = String(size);
  renderChallenge();
}

/* =========================
   EVENTS
========================= */
function bindEvents() {
  if ($("signUpBtn")) $("signUpBtn").addEventListener("click", signUp);
  if ($("signInBtn")) $("signInBtn").addEventListener("click", signIn);
  if ($("signOutBtn")) $("signOutBtn").addEventListener("click", signOut);

  if ($("startTrialBtn")) $("startTrialBtn").addEventListener("click", startTrial);
  if ($("upgradeBtn")) $("upgradeBtn").addEventListener("click", upgradePlan);
  if ($("upgradeBtnTop")) $("upgradeBtnTop").addEventListener("click", upgradePlan);
  if ($("upgradeBtnBox")) $("upgradeBtnBox").addEventListener("click", upgradePlan);

  if ($("quickModeBtn")) $("quickModeBtn").addEventListener("click", () => {
    appMode = "quick";
    renderModeUI();
  });

  if ($("disciplineModeBtn")) $("disciplineModeBtn").addEventListener("click", () => {
    appMode = "discipline";
    renderModeUI();
  });

  if ($("manualCalcModeBtn")) $("manualCalcModeBtn").addEventListener("click", () => {
    calcMode = "manual";
    renderModeUI();
  });

  if ($("zoneCalcModeBtn")) $("zoneCalcModeBtn").addEventListener("click", () => {
    calcMode = "zone";
    renderModeUI();
  });

  if ($("symbol")) $("symbol").addEventListener("change", applySymbolDefaults);

  if ($("calcBtn")) $("calcBtn").addEventListener("click", calculate);
  if ($("canTakeBtn")) $("canTakeBtn").addEventListener("click", canTakeTrade);

  if ($("preset10k")) $("preset10k").addEventListener("click", () => setPreset(10000));
  if ($("preset25k")) $("preset25k").addEventListener("click", () => setPreset(25000));
  if ($("preset50k")) $("preset50k").addEventListener("click", () => setPreset(50000));
  if ($("preset100k")) $("preset100k").addEventListener("click", () => setPreset(100000));

  ["accountSize", "dailyLossPct", "maxLossPct", "todayPnl", "totalPnL"].forEach((id) => {
    if ($(id)) $(id).addEventListener("input", renderChallenge);
  });
}

/* =========================
   RENDER ALL
========================= */
function renderAll() {
  renderPlanBadge();
  renderAuth();
  renderModeUI();
  renderChallenge();

  if (!lastResult) {
    setText("riskOut", "-");
    setText("riskOutDup", "-");
    setText("lotsOut", "-");
    setText("lotsOutDup", "-");
    setText("decisionOut", "-");
  } else {
    renderResults();
  }
}

/* =========================
   INIT
========================= */
async function init() {
  applySymbolDefaults();
  bindEvents();
  await refreshSession();

  supabase.auth.onAuthStateChange(async () => {
    await refreshSession();
  });
}

document.addEventListener("DOMContentLoaded", init);
