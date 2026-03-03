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
  const s = String(v ?? "").trim().replace(",", ".");
  const num = parseFloat(s);
  return Number.isFinite(num) ? num : 0;
}

function n(id){
  const el = $(id);
  if(!el) return 0;
  return toNum(el.value);
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

function on(id, event, fn){
  const el = $(id);
  if(!el) return;
  el.addEventListener(event, fn);
}

// ===== Global State =====
let isPro = false;

// ===== Default symbols =====
const defaultSymbols = {
  // FX
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

// ===== Custom symbols storage =====
const CUSTOM_KEY = "customSymbols_v1";

function loadCustomSymbols(){
  try{
    const raw = localStorage.getItem(CUSTOM_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return (obj && typeof obj === "object") ? obj : {};
  }catch{
    return {};
  }
}

function saveCustomSymbols(obj){
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(obj));
}

function allSymbols(){
  return { ...defaultSymbols, ...loadCustomSymbols() };
}

// ===== Populate / defaults =====
function populateSymbols(filterText=""){
  const sel = $("symbol");
  if(!sel) return;

  const symbols = allSymbols();
  const keys = Object.keys(symbols);
  const ft = String(filterText || "").trim().toUpperCase();

  const list = ft ? keys.filter(k => k.includes(ft)) : keys;

  const current = sel.value || "EURUSD";
  sel.innerHTML = "";

  list.forEach(k=>{
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${k} (${symbols[k].asset || "Asset"})`;
    sel.appendChild(opt);
  });

  if(list.includes(current)) sel.value = current;
  else sel.value = list[0] || "";

  if(sel.value) applySymbolDefaults(sel.value);
}

function applySymbolDefaults(sym){
  const cfg = allSymbols()[sym];
  if(!cfg) return;

  const slLab = $("slUnitsLabel");
  const tpLab = $("tpUnitsLabel");
  if(slLab) slLab.textContent = `SL (${cfg.unitName})`;
  if(tpLab) tpLab.textContent = `TP (${cfg.unitName})`;

  if($("unitSize")) $("unitSize").value = String(cfg.unitSize).replace(".", ",");
  if($("valuePerUnit")) $("valuePerUnit").value = String(cfg.valuePerUnit).replace(".", ",");
  if($("lotStep")) $("lotStep").value = String(cfg.lotStep).replace(".", ",");
}

// ===== Lock logic (PRO feature) =====
function isLocked(){
  const until = localStorage.getItem("lockUntil");
  return until && Date.now() < parseInt(until, 10);
}

function applyLockUI(){
  const locked = isLocked();

  const lockStatus = $("lockStatus");
  if(lockStatus){
    lockStatus.textContent = !isPro ? "Pro required" : (locked ? "LOCKED ❌" : "Unlocked ✅");
    lockStatus.className = !isPro ? "warn" : (locked ? "bad" : "ok");
  }

  const calcBtn = $("calcBtn");
  if(calcBtn) calcBtn.disabled = locked;

  const canTakeBtn = $("canTakeBtn");
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

// ===== PRO UI gating =====
function setProUI(){
  const proControls = $("proControls");
  if(proControls){
    proControls.style.opacity = isPro ? "1" : "0.55";
    proControls.style.pointerEvents = isPro ? "auto" : "none";
  }

  const discBtn = $("disciplineModeBtn");
  if(discBtn) discBtn.textContent = isPro ? "Discipline" : "Discipline 🔒";

  // disable pro buttons when not pro
  [
    "canTakeBtn",
    "winBtn","lossBtn","resetLockBtn",
    "presetChallenge10K","presetChallenge25K","presetChallenge50K","presetChallenge100K"
  ].forEach(id=>{
    const b = $(id);
    if(b) b.disabled = !isPro;
  });

  applyLockUI();
}

// ===== Challenge engine (PRO) =====
function runPropEngine(riskMoney){
  if(!isPro){
    if($("remainingDailyOut")) $("remainingDailyOut").textContent = "-";
    if($("remainingOverallOut")) $("remainingOverallOut").textContent = "-";
    if($("tradeStatusOut")) $("tradeStatusOut").textContent = "-";
    return "-";
  }

  const acc=n("accountSize");
  const dailyPct=n("dailyLossPct");
  const maxPct=n("maxLossPct");
  const totalPnL=n("totalPnL");
  const todayPnl=n("todayPnl");

  const dailyLimit=acc*(dailyPct/100);
  const maxLimit=acc*(maxPct/100);

  const remainingDaily=dailyLimit+todayPnl;
  const remainingOverall=maxLimit+totalPnL;

  if($("remainingDailyOut")) $("remainingDailyOut").textContent=fmt2(remainingDaily);
  if($("remainingOverallOut")) $("remainingOverallOut").textContent=fmt2(remainingOverall);

  let status="OK ✅";
  if(riskMoney>remainingDaily) status="BLOCK Daily ❌";
  else if(riskMoney>remainingOverall) status="BLOCK Overall ❌";

  if($("tradeStatusOut")) $("tradeStatusOut").textContent=status;
  return status;
}

// ===== Calculator (SL buffer affects ONLY SL) =====
// Supports optional inputs: slPriceIn, tpPriceIn, slBuffer
function calculate(){
  if(isLocked()) return;

  const sym = $("symbol")?.value || "EURUSD";
  const cfg = allSymbols()[sym];

  const balance=n("balance");
  const riskPct=n("riskPct");
  const entry=n("entry");
  const rr=n("rr") || 2;
  const dir=$("direction") ? $("direction").value : "LONG";

  const unitSize=n("unitSize");
  const valuePerUnit=n("valuePerUnit");
  const lotStep=n("lotStep") || (cfg?.lotStep || 0.01);

  // units inputs
  let slUnits=n("slUnits");
  let tpUnits=n("tpUnits");

  // NEW optional price inputs (if fields exist)
  const slPriceIn = n("slPriceIn"); // 0 if field missing
  const tpPriceIn = n("tpPriceIn"); // 0 if field missing

  // NEW SL buffer in units (pips/ticks/points)
  const slBuffer = n("slBuffer"); // 0 if field missing

  // If SL price provided => derive units from price distance
  if(slPriceIn > 0 && entry > 0 && unitSize > 0){
    slUnits = Math.abs(entry - slPriceIn) / unitSize;
  }

  // FINAL SL units includes buffer (buffer affects only SL)
  const finalSlUnits = Math.max(0, slUnits + Math.max(0, slBuffer));

  // TP: if TP price provided => derive units
  if(tpPriceIn > 0 && entry > 0 && unitSize > 0){
    tpUnits = Math.abs(tpPriceIn - entry) / unitSize;
  } else if(!tpUnits || tpUnits <= 0){
    tpUnits = finalSlUnits * rr; // if empty -> RR from FINAL SL
  }

  // Risk calc
  const riskMoney = balance*(riskPct/100);
  const lossPerLot = finalSlUnits*valuePerUnit;
  const lotsRaw = lossPerLot>0 ? riskMoney/lossPerLot : 0;
  const lots = roundDownStep(lotsRaw, lotStep);

  // Prices
  let slPrice;
  if(slPriceIn > 0){
    // push SL further by buffer (in price)
    const bufPrice = Math.max(0, slBuffer) * unitSize;
    slPrice = (dir==="LONG") ? (slPriceIn - bufPrice) : (slPriceIn + bufPrice);
  } else {
    const slDist = finalSlUnits*unitSize;
    slPrice = (dir==="LONG") ? entry - slDist : entry + slDist;
  }

  let tpPrice;
  if(tpPriceIn > 0){
    tpPrice = tpPriceIn; // TP unchanged by buffer
  } else {
    const tpDist = tpUnits*unitSize;
    tpPrice = (dir==="LONG") ? entry + tpDist : entry - tpDist;
  }

  // Outputs
  if($("riskOut")) $("riskOut").textContent=fmt2(riskMoney);
  if($("lossPerLotOut")) $("lossPerLotOut").textContent=fmt2(lossPerLot);
  if($("lotsOut")) $("lotsOut").textContent=lots.toFixed(3);

  if($("slUnitsOut")) $("slUnitsOut").textContent=finalSlUnits.toFixed(2).replace(/\.00$/,"");
  if($("tpUnitsOut")) $("tpUnitsOut").textContent=tpUnits.toFixed(2).replace(/\.00$/,"");

  if($("slPriceOut")) $("slPriceOut").textContent=fmtPrice(slPrice);
  if($("tpPriceOut")) $("tpPriceOut").textContent=fmtPrice(tpPrice);

  const status = runPropEngine(riskMoney);
  if($("decisionOut")) $("decisionOut").textContent = isPro ? status : "Pro required";

  if($("clickStatus")) $("clickStatus").textContent = `Calculated ✅ (${sym})`;
}

// ===== Pro actions =====
function canTakeTrade(){
  if(!isPro) return alert("Pro required. Please sign in.");
  if(isLocked()) return alert("Locked by loss-streak rule.");
  calculate();
}

function applyPreset(size){
  if(!isPro) return alert("Pro required. Please sign in.");
  if($("accountSize")) $("accountSize").value = String(size);
  if($("dailyLossPct")) $("dailyLossPct").value = "5";
  if($("maxLossPct")) $("maxLossPct").value = "10";
  calculate();
}

// ===== Login =====
function wireLogin(){
  on("signUpBtn","click", async ()=>{
    try{
      await createUserWithEmailAndPassword(auth, ($("email")?.value||"").trim(), $("password")?.value||"");
    }catch(e){ alert(e.message); }
  });

  on("signInBtn","click", async ()=>{
    try{
      await signInWithEmailAndPassword(auth, ($("email")?.value||"").trim(), $("password")?.value||"");
    }catch(e){ alert(e.message); }
  });

  on("signOutBtn","click", async ()=>{
    try{ await signOut(auth); }catch(e){ alert(e.message); }
  });

  onAuthStateChanged(auth, (user)=>{
    isPro = !!user;
    if($("userStatus")) $("userStatus").textContent = user ? `Signed in: ${user.email}` : "Not signed in";
    setProUI();
    calculate();
  });
}

// ===== Symbol tools (search + add) =====
function wireSymbolTools(){
  on("symbolSearch","input",(e)=>{
    populateSymbols(e.target.value || "");
  });

  on("showAddSymbol","click",()=>{
    const box = $("addSymbolBox");
    if(!box) return;
    const cur = box.style.display;
    box.style.display = (!cur || cur === "none") ? "block" : "none";
  });

  on("addSymbolBtn","click",()=>{
    const name = ($("customSymbolName")?.value || "").trim().toUpperCase();
    const unitSize = toNum($("customUnitSize")?.value);
    const vpu = toNum($("customValuePerUnit")?.value);
    const step = toNum($("customLotStep")?.value);

    if(!name) return alert("Enter symbol name.");
    if(!(unitSize>0)) return alert("Enter Unit size.");
    if(!(vpu>0)) return alert("Enter Value per unit.");
    if(!(step>0)) return alert("Enter Lot step.");

    const custom = loadCustomSymbols();
    custom[name] = { asset:"Custom", unitName:"units", unitSize, valuePerUnit:vpu, lotStep:step };
    saveCustomSymbols(custom);

    populateSymbols($("symbolSearch")?.value || "");
    const sel = $("symbol");
    if(sel){
      sel.value = name;
      applySymbolDefaults(name);
    }

    const box = $("addSymbolBox");
    if(box) box.style.display = "none";

    alert(`Saved: ${name}`);
  });

  on("symbol","change",()=>{
    applySymbolDefaults($("symbol")?.value);
    calculate();
  });
}

// ===== Loss streak buttons =====
function wireLossStreak(){
  on("lossBtn","click",()=>{
    if(!isPro) return alert("Pro required. Please sign in.");
    const sEl = $("streakNow");
    const cur = parseInt(sEl?.value || "0", 10);
    const next = cur + 1;
    if(sEl) sEl.value = String(next);
    if(next >= (n("maxStreak") || 3)) triggerLock();
    applyLockUI();
  });

  on("winBtn","click",()=>{
    if(!isPro) return alert("Pro required. Please sign in.");
    if($("streakNow")) $("streakNow").value = "0";
    applyLockUI();
  });

  on("resetLockBtn","click",()=>{
    if(!isPro) return alert("Pro required. Please sign in.");
    resetLock();
  });
}

// ===== Presets =====
function wirePresets(){
  [
    ["presetChallenge10K", 10000],
    ["presetChallenge25K", 25000],
    ["presetChallenge50K", 50000],
    ["presetChallenge100K", 100000],
  ].forEach(([id, size])=>{
    on(id, "click", ()=> applyPreset(size));
  });
}

// ===== Wire UI =====
document.addEventListener("DOMContentLoaded", ()=>{
  populateSymbols("");
  wireLogin();
  wireSymbolTools();
  wireLossStreak();
  wirePresets();

  on("calcBtn","click", calculate);
  on("canTakeBtn","click", canTakeTrade);

  setProUI();
  calculate();
});
