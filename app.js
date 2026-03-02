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

// čísla aj s čiarkou
function n(id){
  const el = $(id);
  if(!el) return 0;
  const val = String(el.value).replace(",",".");
  const num = parseFloat(val);
  return Number.isFinite(num) ? num : 0;
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

// null-safe event binder (aby sa JS nikdy nezrútil)
function on(id, event, fn){
  const el = $(id);
  if(!el) return;
  el.addEventListener(event, fn);
}

// ===== Global State =====
let isPro = false;

// ===== Symbol presets =====
const symbols = {
  "EURUSD": { unitSize:0.0001, valuePerUnit:9, lotStep:0.01 },
  "USDJPY": { unitSize:0.01, valuePerUnit:7, lotStep:0.01 },
  "XAUUSD": { unitSize:0.01, valuePerUnit:0.91, lotStep:0.01 },
  "BTCUSD": { unitSize:1, valuePerUnit:0.9, lotStep:0.001 }
};

function populateSymbols(){
  const sel = $("symbol");
  if(!sel) return;

  sel.innerHTML = "";
  Object.keys(symbols).forEach(k=>{
    const opt=document.createElement("option");
    opt.value=k;
    opt.textContent=k;
    sel.appendChild(opt);
  });
  sel.value="EURUSD";
  applySymbolDefaults("EURUSD");
}

function applySymbolDefaults(sym){
  const cfg=symbols[sym];
  if(!cfg) return;

  if($("unitSize")) $("unitSize").value=cfg.unitSize;
  if($("valuePerUnit")) $("valuePerUnit").value=cfg.valuePerUnit;
  if($("lotStep")) $("lotStep").value=cfg.lotStep;
}

// ===== Loss Streak Lock =====
function isLocked(){
  const until=localStorage.getItem("lockUntil");
  return until && Date.now() < parseInt(until,10);
}

function applyLockUI(){
  const locked=isLocked();

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
  const until = Date.now() + cooldownMin*60000;
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
  if($("decisionOut")) $("decisionOut").textContent=status;
}

// ===== Calculator =====
function calculate(){
  if(isLocked()) return;

  const balance=n("balance");
  const riskPct=n("riskPct");
  const entry=n("entry");
  const slUnits=n("slUnits");
  const tpUnits=n("tpUnits");
  const unitSize=n("unitSize");
  const valuePerUnit=n("valuePerUnit");
  const lotStep=n("lotStep")||0.01;
  const dir=$("direction") ? $("direction").value : "LONG";

  const riskMoney=balance*(riskPct/100);
  const lossPerLot=slUnits*valuePerUnit;
  const lotsRaw=lossPerLot>0?riskMoney/lossPerLot:0;
  const lots=roundDownStep(lotsRaw,lotStep);

  const slDist=slUnits*unitSize;
  const tpDist=tpUnits*unitSize;

  const slPrice=dir==="LONG"?entry-slDist:entry+slDist;
  const tpPrice=dir==="LONG"?entry+tpDist:entry-tpDist;

  if($("riskOut")) $("riskOut").textContent=fmt2(riskMoney);
  if($("lossPerLotOut")) $("lossPerLotOut").textContent=fmt2(lossPerLot);
  if($("lotsOut")) $("lotsOut").textContent=lots.toFixed(3);
  if($("slUnitsOut")) $("slUnitsOut").textContent=slUnits;
  if($("tpUnitsOut")) $("tpUnitsOut").textContent=tpUnits;
  if($("slPriceOut")) $("slPriceOut").textContent=fmtPrice(slPrice);
  if($("tpPriceOut")) $("tpPriceOut").textContent=fmtPrice(tpPrice);

  runPropEngine(riskMoney);
}

// ===== Can I Take Trade =====
function canTakeTrade(){
  if(!isPro) return alert("Pro required.");
  if(isLocked()) return alert("Locked by loss-streak rule.");
  calculate();
}

// ===== Presets =====
function applyPreset(size){
  if(!isPro) return alert("Pro required.");
  if($("accountSize")) $("accountSize").value=size;
  if($("dailyLossPct")) $("dailyLossPct").value=5;
  if($("maxLossPct")) $("maxLossPct").value=10;
  calculate();
}

// ===== Login =====
function wireLogin(){
  const signUp = $("signUpBtn");
  const signIn = $("signInBtn");
  const signOutBtn = $("signOutBtn");

  if(signUp) signUp.onclick=async()=>{
    try{ await createUserWithEmailAndPassword(auth,$("email").value,$("password").value); }
    catch(e){ alert(e.message); }
  };
  if(signIn) signIn.onclick=async()=>{
    try{ await signInWithEmailAndPassword(auth,$("email").value,$("password").value); }
    catch(e){ alert(e.message); }
  };
  if(signOutBtn) signOutBtn.onclick=async()=>{ await signOut(auth); };

  onAuthStateChanged(auth,(user)=>{
    isPro=!!user;
    if($("userStatus")) $("userStatus").textContent=user?`Signed in: ${user.email}`:"Not signed in";
    applyLockUI();
    calculate();
  });
}

// ===== Wire UI =====
document.addEventListener("DOMContentLoaded",()=>{
  populateSymbols();
  wireLogin();

  on("symbol","change",()=>{
    applySymbolDefaults($("symbol").value);
    calculate();
  });

  on("calcBtn","click",calculate);
  on("canTakeBtn","click",canTakeTrade);

  on("lossBtn","click",()=>{
    if(!isPro) return;
    const sEl = $("streakNow");
    const cur = parseInt(sEl?.value || "0",10);
    const next = cur + 1;
    if(sEl) sEl.value = String(next);
    if(next >= (n("maxStreak") || 3)) triggerLock();
    applyLockUI();
  });

  on("winBtn","click",()=>{
    if(!isPro) return;
    if($("streakNow")) $("streakNow").value=0;
    applyLockUI();
  });

  on("resetLockBtn","click",resetLock);

  // ✅ FIX: Presets work with BOTH old IDs (presetFTMO...) and new IDs (presetChallenge...)
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
