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

function toNum(v){
  const s = String(v ?? "").trim().replace(/\s+/g,"").replace(",",".");
  const num = parseFloat(s);
  return Number.isFinite(num) ? num : 0;
}

// čísla aj s čiarkou (z inputu)
function n(id){
  const el = $(id);
  return el ? toNum(el.value) : 0;
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

// ===== Global State =====
let isPro = false;

// ===== Base symbols (editable defaults) =====
// valuePerUnit = EUR value of 1 unit (pip/tick/point) at 1.00 lot.
// NOTE: Brokers differ. These are defaults; user can override in inputs.
const symbols = {
  // FX majors (non-JPY)
  "EURUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "GBPUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "AUDUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "NZDUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "USDCAD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "USDCHF": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },

  // FX crosses
  "EURGBP": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "EURCHF": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "EURAUD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "GBPAUD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },

  // FX JPY
  "USDJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },
  "EURJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },
  "GBPJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },
  "AUDJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },

  // Metals
  "XAUUSD": { asset:"Metals", unitName:"ticks", unitSize:0.01, valuePerUnit:1.0, lotStep:0.01 },
  "XAGUSD": { asset:"Metals", unitName:"ticks", unitSize:0.01, valuePerUnit:0.5, lotStep:0.01 },

  // Indices
  "NAS100": { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "US30":   { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "SPX500": { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "GER40":  { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "UK100":  { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },

  // Crypto
  "BTCUSD": { asset:"Crypto", unitName:"ticks", unitSize:1, valuePerUnit:1.0, lotStep:0.001 },
  "ETHUSD": { asset:"Crypto", unitName:"ticks", unitSize:0.1, valuePerUnit:0.1, lotStep:0.001 },
  "SOLUSD": { asset:"Crypto", unitName:"ticks", unitSize:0.01, valuePerUnit:0.01, lotStep:0.001 },
  "XRPUSD": { asset:"Crypto", unitName:"ticks", unitSize:0.0001, valuePerUnit:0.0001, lotStep:0.001 }
};

// ===== Custom symbols (LocalStorage) =====
const CUSTOM_KEY = "customSymbols_v1";

function loadCustomSymbols(){
  const raw = localStorage.getItem(CUSTOM_KEY);
  if(!raw) return;
  try{
    const parsed = JSON.parse(raw);
    if(parsed && typeof parsed === "object"){
      Object.keys(parsed).forEach((k)=>{
        // mark as custom
        symbols[k] = { ...parsed[k], custom:true, asset: parsed[k].asset || "Custom", unitName: parsed[k].unitName || "units" };
      });
    }
  }catch(e){}
}

function saveCustomSymbols(){
  const out = {};
  Object.keys(symbols).forEach((k)=>{
    if(symbols[k]?.custom){
      out[k] = {
        asset: symbols[k].asset || "Custom",
        unitName: symbols[k].unitName || "units",
        unitSize: symbols[k].unitSize,
        valuePerUnit: symbols[k].valuePerUnit,
        lotStep: symbols[k].lotStep,
        custom: true
      };
    }
  });
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(out));
}

function addCustomSymbol(){
  const name = prompt("Symbol name (example: XAUUSD.m, BTCUSDT, EURUSD-RAW)");
  if(!name) return;

  const unitName = prompt("Unit name (pips / ticks / points / units)", "units") || "units";
  const unitSize = toNum(prompt("Unit size (example: 0.0001, 0.01, 1)", "0.01"));
  const valuePerUnit = toNum(prompt("Value per unit @ 1 lot in EUR (example: 10, 1, 0.5)", "1"));
  const lotStep = toNum(prompt("Lot step (example: 0.01 or 0.001)", "0.01"));

  if(!unitSize || !valuePerUnit || !lotStep){
    alert("Invalid values. Please try again.");
    return;
  }

  symbols[name] = {
    asset: "Custom",
    unitName,
    unitSize,
    valuePerUnit,
    lotStep,
    custom: true
  };

  saveCustomSymbols();
  populateSymbols();
  if($("symbol")) $("symbol").value = name;
  applySymbolDefaults(name);
  calculate();
}

// ===== Symbol dropdown =====
function populateSymbols(){
  const sel = $("symbol");
  if(!sel) return;

  const current = sel.value || "EURUSD";
  sel.innerHTML = "";

  const keys = Object.keys(symbols).sort((a,b)=>a.localeCompare(b));
  keys.forEach((k)=>{
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${k} (${symbols[k].asset || "?"})`;
    sel.appendChild(opt);
  });

  sel.value = symbols[current] ? current : "EURUSD";
  applySymbolDefaults(sel.value);
}

function applySymbolDefaults(sym){
  const cfg = symbols[sym];
  if(!cfg) return;

  // update labels
  const slLab = $("slUnitsLabel");
  const tpLab = $("tpUnitsLabel");
  if(slLab) slLab.textContent = `SL (${cfg.unitName || "units"})`;
  if(tpLab) tpLab.textContent = `TP (${cfg.unitName || "units"})`;

  // set defaults (still editable)
  if($("unitSize")) $("unitSize").value = String(cfg.unitSize).replace(".",",");
  if($("valuePerUnit")) $("valuePerUnit").value = String(cfg.valuePerUnit).replace(".",",");
  if($("lotStep")) $("lotStep").value = String(cfg.lotStep).replace(".",",");
}

// ===== Loss Streak Lock =====
function isLocked(){
  const until = localStorage.getItem("lockUntil");
  return until && Date.now() < parseInt(until,10);
}

function applyLockUI(){
  const locked = isLocked();

  const lockStatus = $("lockStatus");
  if(lockStatus){
    lockStatus.textContent = locked ? "LOCKED ❌" : (isPro ? "Unlocked ✅" : "Pro required");
    lockStatus.className = locked ? "bad" : (isPro ? "ok" : "warn");
  }

  const calcBtn = $("calcBtn");
  const canTakeBtn = $("canTakeBtn");
  if(calcBtn) calcBtn.disabled = locked;
  if(canTakeBtn) canTakeBtn.disabled = locked || !isPro;
}

function triggerLock(){
  const cooldownMin = n("cooldownMin") || 120;
  const until = Date.now() + cooldownMin * 60000;
  localStorage.setItem("lockUntil", String(until));
  applyLockUI();
}

function resetLock(){
  localStorage.removeItem("lockUntil");
  applyLockUI();
}

// ===== Prop Engine =====
function runPropEngine(riskMoney){
  if(!isPro) return;

  const acc = n("accountSize");
  const dailyPct = n("dailyLossPct");
  const maxPct = n("maxLossPct");
  const totalPnL = n("totalPnL");
  const todayPnl = n("todayPnl");

  const dailyLimit = acc * (dailyPct / 100);
  const maxLimit = acc * (maxPct / 100);

  const remainingDaily = dailyLimit + todayPnl;
  const remainingOverall = maxLimit + totalPnL;

  if($("remainingDailyOut")) $("remainingDailyOut").textContent = fmt2(remainingDaily);
  if($("remainingOverallOut")) $("remainingOverallOut").textContent = fmt2(remainingOverall);

  let status = "OK ✅";
  if(riskMoney > remainingDaily) status = "BLOCK Daily ❌";
  else if(riskMoney > remainingOverall) status = "BLOCK Overall ❌";

  if($("tradeStatusOut")) $("tradeStatusOut").textContent = status;
  if($("decisionOut")) $("decisionOut").textContent = status;
}

// ===== Calculator =====
function calculate(){
  if(isLocked()) return;

  const sym = $("symbol") ? $("symbol").value : "EURUSD";
  const cfg = symbols[sym] || {};

  const balance = n("balance");
  const riskPct = n("riskPct");
  const entry = n("entry");
  const slUnits = n("slUnits");

  // TP units: allow empty -> RR
  const tpRaw = $("tpUnits") ? String($("tpUnits").value).trim() : "";
  const tpUnits = tpRaw === "" ? NaN : toNum(tpRaw);

  const unitSize = n("unitSize");
  const valuePerUnit = n("valuePerUnit");
  const lotStep = n("lotStep") || 0.01;
  const dir = $("direction") ? $("direction").value : "LONG";

  const rr = n("rr") || 2;
  const tpBuffer = n("tpBuffer");

  const riskMoney = balance * (riskPct / 100);
  const lossPerLot = slUnits * valuePerUnit;

  const lotsRaw = lossPerLot > 0 ? riskMoney / lossPerLot : 0;
  const lots = roundDownStep(lotsRaw, lotStep);

  const slDist = slUnits * unitSize;

  // SL price from entry + distance
  const slPrice = dir === "LONG" ? (entry - slDist) : (entry + slDist);

  // TP units from input OR RR
  const tpUnitsFinal = (Number.isFinite(tpUnits) && tpUnits > 0) ? tpUnits : (slUnits * rr);
  const tpDist = tpUnitsFinal * unitSize;

  const tpBase = dir === "LONG" ? (entry + tpDist) : (entry - tpDist);
  const tpPrice = dir === "LONG" ? (tpBase - tpBuffer) : (tpBase + tpBuffer);

  if($("riskOut")) $("riskOut").textContent = fmt2(riskMoney);
  if($("lossPerLotOut")) $("lossPerLotOut").textContent = fmt2(lossPerLot);
  if($("lotsOut")) $("lotsOut").textContent = lots > 0 ? lots.toFixed(3).replace(/0+$/,'').replace(/\.$/,'') : "-";

  if($("slUnitsOut")) $("slUnitsOut").textContent = String(slUnits);
  if($("tpUnitsOut")) $("tpUnitsOut").textContent = String(tpUnitsFinal);

  if($("slPriceOut")) $("slPriceOut").textContent = fmtPrice(slPrice);
  if($("tpPriceOut")) $("tpPriceOut").textContent = fmtPrice(tpPrice);

  if($("clickStatus")) $("clickStatus").textContent = `Calculated ✅ (${sym} / ${cfg.asset || "?"})`;

  runPropEngine(riskMoney);
}

// ===== Can I Take Trade =====
function canTakeTrade(){
  if(!isPro) return alert("Pro required.");
  if(isLocked()) return alert("Locked by loss-streak rule.");
  calculate();
  const msg = $("decisionOut") ? $("decisionOut").textContent : "Done";
  alert(msg);
}

// ===== Presets =====
function applyPreset(size){
  if(!isPro) return alert("Pro required.");
  if($("accountSize")) $("accountSize").value = String(size);
  if($("dailyLossPct")) $("dailyLossPct").value = "5";
  if($("maxLossPct")) $("maxLossPct").value = "10";
  calculate();
}

// ===== Login =====
function wireLogin(){
  const signUp = $("signUpBtn");
  const signIn = $("signInBtn");
  const signOutBtn = $("signOutBtn");

  if(signUp) signUp.onclick = async()=>{
    try{ await createUserWithEmailAndPassword(auth, $("email").value, $("password").value); }
    catch(e){ alert(e.message); }
  };
  if(signIn) signIn.onclick = async()=>{
    try{ await signInWithEmailAndPassword(auth, $("email").value, $("password").value); }
    catch(e){ alert(e.message); }
  };
  if(signOutBtn) signOutBtn.onclick = async()=>{ await signOut(auth); };

  onAuthStateChanged(auth,(user)=>{
    isPro = !!user;
    if($("userStatus")) $("userStatus").textContent = user ? `Signed in: ${user.email}` : "Not signed in";
    applyLockUI();
    calculate();
  });
}

// ===== Wire UI =====
document.addEventListener("DOMContentLoaded",()=>{
  loadCustomSymbols();     // ✅ custom first
  populateSymbols();
  wireLogin();

  on("addCustomSymbolBtn","click",addCustomSymbol);

  on("symbol","change",()=>{
    applySymbolDefaults($("symbol").value);
    calculate();
  });

  on("calcBtn","click",(e)=>{ e.preventDefault(); calculate(); });
  on("canTakeBtn","click",(e)=>{ e.preventDefault(); canTakeTrade(); });

  on("lossBtn","click",()=>{
    if(!isPro) return alert("Pro required.");
    const sEl = $("streakNow");
    const cur = parseInt(sEl?.value || "0",10);
    const next = cur + 1;
    if(sEl) sEl.value = String(next);
    if(next >= (n("maxStreak") || 3)) triggerLock();
    applyLockUI();
  });

  on("winBtn","click",()=>{
    if(!isPro) return alert("Pro required.");
    if($("streakNow")) $("streakNow").value = "0";
    applyLockUI();
  });

  on("resetLockBtn","click",resetLock);

  // Presets (Challenge + legacy IDs)
  const presetMap = [
    ["presetChallenge10K", 10000],
    ["presetChallenge25K", 25000],
    ["presetChallenge50K", 50000],
    ["presetChallenge100K",100000],

    ["presetFTMO10K", 10000],
    ["presetFTMO25K", 25000],
    ["presetFTMO50K", 50000],
    ["presetFTMO100K",100000],
  ];
  presetMap.forEach(([id, size]) => {
    const el = $(id);
    if(el) el.addEventListener("click", () => applyPreset(size));
  });

  applyLockUI();
  calculate();
});
