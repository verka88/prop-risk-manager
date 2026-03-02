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
  $("unitSize").value=cfg.unitSize;
  $("valuePerUnit").value=cfg.valuePerUnit;
  $("lotStep").value=cfg.lotStep;
}

// ===== Loss Streak Lock =====
function isLocked(){
  const until=localStorage.getItem("lockUntil");
  return until && Date.now() < parseInt(until);
}

function applyLockUI(){
  const locked=isLocked();
  $("lockStatus").textContent = locked ? "LOCKED ❌" : "Unlocked ✅";
  $("lockStatus").className = locked ? "bad" : "ok";

  $("calcBtn").disabled = locked;
  $("canTakeBtn").disabled = locked || !isPro;
}

function triggerLock(){
  const cooldownMin = n("cooldownMin");
  const until = Date.now() + cooldownMin*60000;
  localStorage.setItem("lockUntil", until);
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

  $("remainingDailyOut").textContent=fmt2(remainingDaily);
  $("remainingOverallOut").textContent=fmt2(remainingOverall);

  let status="OK ✅";
  if(riskMoney>remainingDaily) status="BLOCK Daily ❌";
  else if(riskMoney>remainingOverall) status="BLOCK Overall ❌";

  $("tradeStatusOut").textContent=status;
  $("decisionOut").textContent=status;
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
  const dir=$("direction").value;

  const riskMoney=balance*(riskPct/100);
  const lossPerLot=slUnits*valuePerUnit;
  const lotsRaw=lossPerLot>0?riskMoney/lossPerLot:0;
  const lots=roundDownStep(lotsRaw,lotStep);

  const slDist=slUnits*unitSize;
  const tpDist=tpUnits*unitSize;

  const slPrice=dir==="LONG"?entry-slDist:entry+slDist;
  const tpPrice=dir==="LONG"?entry+tpDist:entry-tpDist;

  $("riskOut").textContent=fmt2(riskMoney);
  $("lossPerLotOut").textContent=fmt2(lossPerLot);
  $("lotsOut").textContent=lots.toFixed(3);
  $("slUnitsOut").textContent=slUnits;
  $("tpUnitsOut").textContent=tpUnits;
  $("slPriceOut").textContent=fmtPrice(slPrice);
  $("tpPriceOut").textContent=fmtPrice(tpPrice);

  runPropEngine(riskMoney);
}

// ===== Can I Take Trade =====
function canTakeTrade(){
  if(!isPro) return alert("Pro required.");
  calculate();
}

// ===== Presets =====
function applyPreset(size){
  if(!isPro) return alert("Pro required.");
  $("accountSize").value=size;
  $("dailyLossPct").value=5;
  $("maxLossPct").value=10;
  calculate();
}

// ===== Login =====
function wireLogin(){
  $("signUpBtn").onclick=async()=>{
    try{ await createUserWithEmailAndPassword(auth,$("email").value,$("password").value); }
    catch(e){ alert(e.message); }
  };
  $("signInBtn").onclick=async()=>{
    try{ await signInWithEmailAndPassword(auth,$("email").value,$("password").value); }
    catch(e){ alert(e.message); }
  };
  $("signOutBtn").onclick=async()=>{ await signOut(auth); };

  onAuthStateChanged(auth,(user)=>{
    isPro=!!user;
    $("userStatus").textContent=user?`Signed in: ${user.email}`:"Not signed in";
    applyLockUI();
    calculate();
  });
}

// ===== Wire UI =====
document.addEventListener("DOMContentLoaded",()=>{
  populateSymbols();
  wireLogin();

  $("symbol").addEventListener("change",()=>{
    applySymbolDefaults($("symbol").value);
    calculate();
  });

  $("calcBtn").addEventListener("click",calculate);
  $("canTakeBtn").addEventListener("click",canTakeTrade);

  $("lossBtn").addEventListener("click",()=>{
    if(!isPro) return;
    $("streakNow").value=parseInt($("streakNow").value||0)+1;
    if(parseInt($("streakNow").value)>=n("maxStreak")) triggerLock();
    applyLockUI();
  });

  $("winBtn").addEventListener("click",()=>{
    if(!isPro) return;
    $("streakNow").value=0;
    applyLockUI();
  });

  $("resetLockBtn").addEventListener("click",resetLock);

  $("presetFTMO10K").onclick=()=>applyPreset(10000);
  $("presetFTMO25K").onclick=()=>applyPreset(25000);
  $("presetFTMO50K").onclick=()=>applyPreset(50000);
  $("presetFTMO100K").onclick=()=>applyPreset(100000);

  applyLockUI();
  calculate();
});
