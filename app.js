// ===== Firebase CDN =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

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

// ===== Helpers =====
const $ = (id) => document.getElementById(id);

function parseNum(v){
  const val = String(v ?? "").trim().replace(/\s+/g,"").replace(",",".");
  const num = parseFloat(val);
  return Number.isFinite(num) ? num : 0;
}

function n(id){
  const el = $(id);
  if(!el) return 0;
  return parseNum(el.value);
}

function strWithComma(x){
  if(!Number.isFinite(x)) return "";
  return String(x).replace(".", ",");
}

function fmt2(x){ return Number.isFinite(x) ? x.toFixed(2) : "-"; }

function fmtPrice(x){
  if(!Number.isFinite(x)) return "-";
  const ax = Math.abs(x);
  const d = ax >= 100 ? 2 : ax >= 1 ? 4 : 6;
  return x.toFixed(d);
}

function roundDownStep(value, step){
  if(!Number.isFinite(value) || !Number.isFinite(step) || step<=0) return 0;
  return Math.floor(value/step)*step;
}

// null-safe event binder
function on(id, event, fn){
  const el = $(id);
  if(!el) return;
  el.addEventListener(event, fn);
}

// ===== Trial settings =====
const TRIAL_DAYS = 7;
function trialKey(uid){ return `trialStart_${uid}`; }

function getTrialInfo(uid){
  const k = trialKey(uid);
  const raw = localStorage.getItem(k);
  let start = raw ? parseInt(raw,10) : 0;
  if(!start || !Number.isFinite(start)){
    start = Date.now();
    localStorage.setItem(k, String(start));
  }
  const msTotal = TRIAL_DAYS * 24 * 60 * 60 * 1000;
  const msLeft = (start + msTotal) - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (24*60*60*1000)));
  const active = msLeft > 0;
  return { start, active, daysLeft };
}

// ===== Global State =====
let isSignedIn = false;
let isPro = false;          // Pro = signed in + trial active (for now)
let currentUid = "";

// ===== Symbol presets (defaults) =====
const defaultSymbols = {
  "EURUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "GBPUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "AUDUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "NZDUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "USDCAD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "USDCHF": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },

  "EURGBP": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "EURCHF": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "EURAUD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "GBPAUD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },

  "USDJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },
  "EURJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },
  "GBPJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },
  "AUDJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },

  "XAUUSD": { asset:"Metals", unitName:"ticks", unitSize:0.01, valuePerUnit:1.0, lotStep:0.01 },
  "XAGUSD": { asset:"Metals", unitName:"ticks", unitSize:0.01, valuePerUnit:0.5, lotStep:0.01 },

  "NAS100": { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "US30":   { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "SPX500": { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "GER40":  { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "UK100":  { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },

  "BTCUSD": { asset:"Crypto", unitName:"ticks", unitSize:1, valuePerUnit:1.0, lotStep:0.001 },
  "ETHUSD": { asset:"Crypto", unitName:"ticks", unitSize:0.1, valuePerUnit:0.1, lotStep:0.001 },
  "SOLUSD": { asset:"Crypto", unitName:"ticks", unitSize:0.01, valuePerUnit:0.01, lotStep:0.001 },
  "XRPUSD": { asset:"Crypto", unitName:"ticks", unitSize:0.0001, valuePerUnit:0.0001, lotStep:0.001 }
};

function loadCustomSymbols(){
  try{
    const raw = localStorage.getItem("customSymbols_v1");
    const obj = raw ? JSON.parse(raw) : {};
    return (obj && typeof obj === "object") ? obj : {};
  } catch {
    return {};
  }
}

function saveCustomSymbols(custom){
  localStorage.setItem("customSymbols_v1", JSON.stringify(custom));
}

function mergedSymbols(){
  return { ...defaultSymbols, ...loadCustomSymbols() };
}

function populateSymbols(filteredList=null){
  const sel = $("symbol");
  if(!sel) return;

  const all = mergedSymbols();
  const current = sel.value || "EURUSD";

  sel.innerHTML = "";
  const keys = filteredList ?? Object.keys(all);

  keys.forEach(k=>{
    const cfg = all[k];
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${k}${cfg?.asset ? ` (${cfg.asset})` : ""}`;
    sel.appendChild(opt);
  });

  // set selection
  if(keys.includes(current)) sel.value = current;
  else sel.value = keys[0] || "EURUSD";

  applySymbolDefaults(sel.value);
}

function applySymbolDefaults(sym){
  const all = mergedSymbols();
  const cfg = all[sym];
  if(!cfg) return;

  const slLab = $("slUnitsLabel");
  const tpLab = $("tpUnitsLabel");
  const zoneLab = $("zoneLabel");
  const slBufLab = $("slBufferLabel");
  const tpBufLab = $("tpBufferLabel");

  if(slLab) slLab.textContent = `SL distance (${cfg.unitName})`;
  if(tpLab) tpLab.textContent = `TP distance (${cfg.unitName})`;
  if(zoneLab) zoneLab.textContent = `Zone size (${cfg.unitName})`;
  if(slBufLab) slBufLab.textContent = `SL buffer (${cfg.unitName})`;
  if(tpBufLab) tpBufLab.textContent = `TP buffer (${cfg.unitName})`;

  if($("unitSize")) $("unitSize").value = strWithComma(cfg.unitSize);
  if($("valuePerUnit")) $("valuePerUnit").value = strWithComma(cfg.valuePerUnit);
  if($("lotStep")) $("lotStep").value = strWithComma(cfg.lotStep);

  // when symbol changes, recompute zone->sl
  syncSlFromZone();
}

// ===== Zone → SL sync =====
function syncSlFromZone(){
  const unitSize = n("unitSize") || 0;

  const top = n("zoneTop");
  const bottom = n("zoneBottom");
  const zoneSizeEl = $("zoneSize");

  // If user provides Top/Bottom, compute zone size in units
  if(unitSize > 0 && top > 0 && bottom > 0 && zoneSizeEl){
    const zoneUnits = Math.abs(top - bottom) / unitSize;
    zoneSizeEl.value = strWithComma(Number(zoneUnits.toFixed(2)));
  }

  // SL distance = zone + SL buffer
  const zone = n("zoneSize");
  const slBuf = n("slBufferUnits");
  const sl = Math.max(0, zone + slBuf);

  const slEl = $("slUnits");
  if(slEl) slEl.value = strWithComma(Number(sl.toFixed(2)));
}

// ===== Loss Streak Lock =====
function lockKey(){ return `lockUntil_${currentUid || "anon"}`; }

function isLocked(){
  const until = localStorage.getItem(lockKey());
  return until && Date.now() < parseInt(until,10);
}

function triggerLock(){
  const cooldownMin = n("cooldownMin") || 120;
  const until = Date.now() + cooldownMin*60000;
  localStorage.setItem(lockKey(), String(until));
  applyLockUI();
}

function resetLock(){
  localStorage.removeItem(lockKey());
  applyLockUI();
}

// ===== UI: Pro gating & Auth UI =====
function setAuthUI(){
  const signUpBtn = $("signUpBtn");
  const signInBtn = $("signInBtn");
  const signOutBtn = $("signOutBtn");

  if(signUpBtn) signUpBtn.style.display = isSignedIn ? "none" : "inline-block";
  if(signInBtn) signInBtn.style.display = isSignedIn ? "none" : "inline-block";
  if(signOutBtn) signOutBtn.style.display = isSignedIn ? "inline-block" : "none";
}

function setProUI(){
  const proControls = $("proControls");
  if(proControls){
    proControls.style.opacity = isPro ? "1" : "0.55";
    proControls.style.pointerEvents = isPro ? "auto" : "none";
  }

  const discBtn = $("disciplineModeBtn");
  if(discBtn){
    discBtn.textContent = isPro ? "Discipline" : "Discipline 🔒";
  }

  // Disable pro buttons when not pro
  ["canTakeBtn","winBtn","lossBtn","resetLockBtn",
   "presetChallenge10K","presetChallenge25K","presetChallenge50K","presetChallenge100K"
  ].forEach(id=>{
    const b = $(id);
    if(b) b.disabled = !isPro || (id === "canTakeBtn" ? isLocked() : false);
  });

  // Calculate stays available unless locked
  const calcBtn = $("calcBtn");
  if(calcBtn) calcBtn.disabled = isLocked();

  applyLockUI();
}

function applyLockUI(){
  const locked = isLocked();

  const lockStatus = $("lockStatus");
  if(lockStatus){
    lockStatus.textContent = !isPro
      ? "Pro required"
      : (locked ? "LOCKED ❌" : "Unlocked ✅");
    lockStatus.className = !isPro ? "warn" : (locked ? "bad" : "ok");
  }

  const lockHint = $("lockHint");
  if(lockHint){
    if(!isPro) lockHint.textContent = "Sign in to unlock loss-streak lock.";
    else if(locked){
      const until = parseInt(localStorage.getItem(lockKey())||"0",10);
      const mins = Math.max(0, Math.ceil((until - Date.now())/60000));
      lockHint.textContent = `Cooldown active: ~${mins} min left`;
    } else {
      lockHint.textContent = "";
    }
  }

  const calcBtn = $("calcBtn");
  if(calcBtn) calcBtn.disabled = locked;

  const canTakeBtn = $("canTakeBtn");
  if(canTakeBtn) canTakeBtn.disabled = locked || !isPro;
}

// ===== Prop Engine (Pro) =====
function runPropEngine(riskMoney){
  if(!isPro){
    if($("remainingDailyOut")) $("remainingDailyOut").textContent = "-";
    if($("remainingOverallOut")) $("remainingOverallOut").textContent = "-";
    if($("tradeStatusOut")) $("tradeStatusOut").textContent = "-";
    return "Pro required";
  }

  const acc = n("accountSize");
  const dailyPct = n("dailyLossPct");
  const maxPct = n("maxLossPct");
  const totalPnL = n("totalPnL");
  const todayPnl = n("todayPnl");

  const dailyLimit = acc * (dailyPct/100);
  const maxLimit = acc * (maxPct/100);

  const remainingDaily = dailyLimit + todayPnl;
  const remainingOverall = maxLimit + totalPnL;

  if($("remainingDailyOut")) $("remainingDailyOut").textContent = fmt2(remainingDaily);
  if($("remainingOverallOut")) $("remainingOverallOut").textContent = fmt2(remainingOverall);

  let status = "OK ✅";
  if(riskMoney > remainingDaily) status = "BLOCK Daily ❌";
  else if(riskMoney > remainingOverall) status = "BLOCK Overall ❌";

  if($("tradeStatusOut")) $("tradeStatusOut").textContent = status;
  return status;
}

// ===== Calculator =====
function calculate(){
  if(isLocked()) return;

  // keep zone->sl in sync before math
  syncSlFromZone();

  const balance = n("balance");
  const riskPct = n("riskPct");
  const entry = n("entry");

  const zone = n("zoneSize");
  const slUnits = n("slUnits"); // already includes buffer

  const unitSize = n("unitSize");
  const valuePerUnit = n("valuePerUnit");
  const lotStep = n("lotStep") || 0.01;

  const dir = $("direction") ? $("direction").value : "LONG";

  const rr = n("rr") || 2;
  const tpMode = $("tpMode") ? $("tpMode").value : "UNITS";
  const tpUnitsInput = n("tpUnits");
  const tpBufUnits = n("tpBufferUnits");

  // TP units final
  let baseTpUnits = tpMode === "RR" ? (slUnits * rr) : tpUnitsInput;
  if(!Number.isFinite(baseTpUnits) || baseTpUnits <= 0) baseTpUnits = slUnits * rr;
  const tpUnitsFinal = Math.max(0, baseTpUnits + tpBufUnits);

  // risk money
  const riskMoney = balance * (riskPct/100);

  // loss per lot
  const lossPerLot = slUnits * valuePerUnit;

  // lots
  const lotsRaw = lossPerLot > 0 ? (riskMoney / lossPerLot) : 0;
  const lots = roundDownStep(lotsRaw, lotStep);

  // prices
  const slDistPrice = slUnits * unitSize;
  const tpDistPrice = tpUnitsFinal * unitSize;

  const slPrice = dir === "LONG" ? (entry - slDistPrice) : (entry + slDistPrice);
  const tpPrice = dir === "LONG" ? (entry + tpDistPrice) : (entry - tpDistPrice);

  // outputs
  if($("riskOut")) $("riskOut").textContent = fmt2(riskMoney);
  if($("lossPerLotOut")) $("lossPerLotOut").textContent = fmt2(lossPerLot);
  if($("lotsOut")) $("lotsOut").textContent = lots > 0 ? lots.toFixed(3).replace(/0+$/,"").replace(/\.$/,"") : "-";

  if($("zoneOut")) $("zoneOut").textContent = zone ? zone.toFixed(2) : "-";
  if($("slUnitsOut")) $("slUnitsOut").textContent = slUnits ? slUnits.toFixed(2) : "-";
  if($("tpUnitsOut")) $("tpUnitsOut").textContent = tpUnitsFinal ? tpUnitsFinal.toFixed(2) : "-";

  if($("slPriceOut")) $("slPriceOut").textContent = fmtPrice(slPrice);
  if($("tpPriceOut")) $("tpPriceOut").textContent = fmtPrice(tpPrice);

  const status = runPropEngine(riskMoney);
  if($("decisionOut")) $("decisionOut").textContent = isPro ? status : "-";

  if($("clickStatus")) $("clickStatus").textContent = "Calculated ✅";

  applyLockUI();
  setProUI();
}

// ===== Can I take trade (Pro) =====
function canTakeTrade(){
  if(!isPro) return alert("Pro required (sign in + active trial).");
  if(isLocked()) return alert("Locked by loss-streak rule.");
  const balance = n("balance");
  const riskPct = n("riskPct");
  const riskMoney = balance * (riskPct/100);
  const status = runPropEngine(riskMoney);
  if($("decisionOut")) $("decisionOut").textContent = status;
  if(status.includes("BLOCK")) alert(status);
}

// ===== Presets (Pro) =====
function applyPreset(size){
  if(!isPro) return alert("Pro required (sign in + active trial).");
  if($("accountSize")) $("accountSize").value = String(size);
  if($("dailyLossPct")) $("dailyLossPct").value = "5";
  if($("maxLossPct")) $("maxLossPct").value = "10";
  calculate();
}

// ===== Custom symbol UI =====
function wireSymbolSearch(){
  on("symbolSearch","input",(e)=>{
    const all = mergedSymbols();
    const search = String(e.target.value || "").toUpperCase().trim();
    const keys = Object.keys(all).filter(sym => sym.includes(search));
    populateSymbols(keys.length ? keys : Object.keys(all));
  });

  on("showAddSymbol","click",()=>{
    const box = $("addSymbolBox");
    if(!box) return;
    box.style.display = (box.style.display === "none" || !box.style.display) ? "block" : "none";
  });

  on("addSymbolBtn","click",()=>{
    const name = String($("customSymbolName")?.value || "").trim().toUpperCase();
    if(!name) return alert("Enter symbol name (e.g. US500).");

    const unitSize = parseNum($("customUnitSize")?.value);
    const valuePerUnit = parseNum($("customValuePerUnit")?.value);
    const lotStep = parseNum($("customLotStep")?.value);

    if(unitSize <= 0 || valuePerUnit <= 0 || lotStep <= 0){
      return alert("Please fill Unit size, Value per unit, and Lot step (must be > 0).");
    }

    const custom = loadCustomSymbols();
    custom[name] = { asset:"Custom", unitName:"units", unitSize, valuePerUnit, lotStep };
    saveCustomSymbols(custom);

    populateSymbols();
    if($("symbol")) $("symbol").value = name;
    applySymbolDefaults(name);

    const box = $("addSymbolBox");
    if(box) box.style.display = "none";

    alert("Saved ✅");
    calculate();
  });
}

// ===== Login =====
function wireLogin(){
  const signUp = $("signUpBtn");
  const signIn = $("signInBtn");
  const signOutBtn = $("signOutBtn");

  if(signUp) signUp.onclick = async ()=>{
    try{
      await createUserWithEmailAndPassword(auth, ($("email")?.value || "").trim(), $("password")?.value || "");
    } catch(e){ alert(e.message); }
  };

  if(signIn) signIn.onclick = async ()=>{
    try{
      await signInWithEmailAndPassword(auth, ($("email")?.value || "").trim(), $("password")?.value || "");
    } catch(e){ alert(e.message); }
  };

  if(signOutBtn) signOutBtn.onclick = async ()=>{
    try{ await signOut(auth); } catch(e){ alert(e.message); }
  };

  onAuthStateChanged(auth,(user)=>{
    isSignedIn = !!user;
    currentUid = user?.uid || "";

    // Trial + Pro state
    if(user){
      const t = getTrialInfo(user.uid);
      isPro = t.active;

      if($("userStatus")) $("userStatus").textContent = `Signed in: ${user.email}`;
      if($("trialStatus")) $("trialStatus").textContent = t.active
        ? `Trial active: ${t.daysLeft} day(s) left`
        : `Trial ended. (Payments coming soon)`;

      if($("upgradeHint")) $("upgradeHint").textContent = t.active
        ? ""
        : "Trial ended → Pro features locked. (Next: connect payments + Upgrade button.)";
    } else {
      isPro = false;
      if($("userStatus")) $("userStatus").textContent = "Not signed in";
      if($("trialStatus")) $("trialStatus").textContent = "";
      if($("upgradeHint")) $("upgradeHint").textContent = "";
    }

    setAuthUI();
    setProUI();
    calculate();
  });
}

// ===== Wire UI =====
document.addEventListener("DOMContentLoaded", ()=>{
  // mode buttons (UI only)
  on("quickModeBtn","click", ()=>{
    $("quickModeBtn")?.classList.add("active");
    $("disciplineModeBtn")?.classList.remove("active");
  });
  on("disciplineModeBtn","click", ()=>{
    $("disciplineModeBtn")?.classList.add("active");
    $("quickModeBtn")?.classList.remove("active");
  });

  // initial symbols
  populateSymbols();
  wireSymbolSearch();
  wireLogin();

  on("symbol","change", ()=>{
    applySymbolDefaults($("symbol")?.value);
    calculate();
  });

  // auto-calc inputs
  [
    "balance","riskPct","entry","direction","rr",
    "zoneTop","zoneBottom","zoneSize","slBufferUnits","tpBufferUnits",
    "tpMode","tpUnits",
    "unitSize","valuePerUnit","lotStep",
    // pro engine inputs
    "accountSize","dailyLossPct","maxLossPct","todayPnl","totalPnL"
  ].forEach(id => on(id,"input", calculate));

  on("calcBtn","click", calculate);
  on("canTakeBtn","click", canTakeTrade);

  // Loss streak buttons (Pro)
  on("lossBtn","click", ()=>{
    if(!isPro) return alert("Pro required (sign in + active trial).");
    const sEl = $("streakNow");
    const cur = parseInt(sEl?.value || "0",10);
    const next = cur + 1;
    if(sEl) sEl.value = String(next);
    if(next >= (n("maxStreak") || 3)) triggerLock();
    applyLockUI();
  });

  on("winBtn","click", ()=>{
    if(!isPro) return alert("Pro required (sign in + active trial).");
    if($("streakNow")) $("streakNow").value = "0";
    applyLockUI();
  });

  on("resetLockBtn","click", ()=>{
    if(!isPro) return alert("Pro required (sign in + active trial).");
    resetLock();
    applyLockUI();
  });

  // Challenge preset buttons (Pro)
  on("presetChallenge10K","click", ()=> applyPreset(10000));
  on("presetChallenge25K","click", ()=> applyPreset(25000));
  on("presetChallenge50K","click", ()=> applyPreset(50000));
  on("presetChallenge100K","click", ()=> applyPreset(100000));

  // first run
  setAuthUI();
  setProUI();
  calculate();
});
