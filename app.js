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
  const val = String(el.value ?? "").replace(",",".").trim();
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

// ===== Symbol presets (editable defaults) =====
const symbols = {
  "EURUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "GBPUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "EURGBP": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },

  "USDJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },
  "EURJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },

  "XAUUSD": { asset:"Metals", unitName:"ticks", unitSize:0.01, valuePerUnit:1.0, lotStep:0.01 },
  "XAGUSD": { asset:"Metals", unitName:"ticks", unitSize:0.01, valuePerUnit:0.5, lotStep:0.01 },

  "NAS100": { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "US30":   { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "SPX500": { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },

  "BTCUSD": { asset:"Crypto", unitName:"ticks", unitSize:1, valuePerUnit:1.0, lotStep:0.001 },
  "ETHUSD": { asset:"Crypto", unitName:"ticks", unitSize:0.1, valuePerUnit:0.1, lotStep:0.001 }
};

function populateSymbols(){
  const sel = $("symbol");
  if(!sel) return;

  const current = sel.value || "EURUSD";
  sel.innerHTML = "";

  Object.keys(symbols).forEach(k=>{
    const opt=document.createElement("option");
    opt.value=k;
    opt.textContent=`${k} (${symbols[k].asset})`;
    sel.appendChild(opt);
  });

  sel.value = symbols[current] ? current : "EURUSD";
  applySymbolDefaults(sel.value);
}

function applySymbolDefaults(sym){
  const cfg=symbols[sym];
  if(!cfg) return;

  const slLab = $("slUnitsLabel");
  const tpLab = $("tpUnitsLabel");
  if(slLab) slLab.textContent = `SL (${cfg.unitName})`;
  if(tpLab) tpLab.textContent = `TP (${cfg.unitName})`;

  if($("unitSize")) $("unitSize").value = String(cfg.unitSize).replace(".",",");
  if($("valuePerUnit")) $("valuePerUnit").value = String(cfg.valuePerUnit).replace(".",",");
  if($("lotStep")) $("lotStep").value = String(cfg.lotStep).replace(".",",");
}

// ===== PRO UI Lock/Unlock =====
function setProUI(){
  // These whole cards are PRO-only:
  const proCards = [
    $("lossLockCard"),
    $("challengeEngineCard")
  ].filter(Boolean);

  proCards.forEach(card=>{
    if(isPro){
      card.classList.remove("pro-locked");
      card.classList.remove("showOverlay");
      card.style.pointerEvents = "auto";
      card.style.opacity = "1";
    }else{
      card.classList.add("pro-locked");
      card.classList.add("showOverlay");
      card.style.pointerEvents = "auto"; // overlay still clickable (but blocks underlying)
      card.style.opacity = "1";
    }
  });

  // Pro button in FREE area:
  const canTakeBtn = $("canTakeBtn");
  if(canTakeBtn) canTakeBtn.disabled = !isPro || isLocked();

  // “Discipline 🔒” label
  const discBtn = $("disciplineModeBtn");
  if(discBtn) discBtn.textContent = isPro ? "Discipline" : "Discipline 🔒";

  // If not Pro, clear pro outputs so it doesn't confuse
  if(!isPro){
    if($("decisionOut")) $("decisionOut").textContent = "-";
    if($("remainingDailyOut")) $("remainingDailyOut").textContent = "-";
    if($("remainingOverallOut")) $("remainingOverallOut").textContent = "-";
    if($("tradeStatusOut")) $("tradeStatusOut").textContent = "-";
    const lockStatus = $("lockStatus");
    if(lockStatus){
      lockStatus.textContent = "Pro required";
      lockStatus.className = "warn";
    }
  }

  applyLockUI();
}

// ===== Loss Streak Lock (PRO) =====
function isLocked(){
  const until = localStorage.getItem("lockUntil");
  return until && Date.now() < parseInt(until,10);
}

function applyLockUI(){
  const locked = isLocked();

  const lockStatus = $("lockStatus");
  if(lockStatus){
    if(!isPro){
      lockStatus.textContent = "Pro required";
      lockStatus.className = "warn";
    }else{
      lockStatus.textContent = locked ? "LOCKED ❌" : "Unlocked ✅";
      lockStatus.className = locked ? "bad" : "ok";
    }
  }

  // FREE calc should still work even when locked (lock is PRO concept)
  // BUT you asked earlier to block engine decisions when locked, so:
  const canTakeBtn = $("canTakeBtn");
  if(canTakeBtn) canTakeBtn.disabled = !isPro || locked;

  // Pro-only streak buttons
  const winBtn = $("winBtn");
  const lossBtn = $("lossBtn");
  const resetLockBtn = $("resetLockBtn");
  [winBtn, lossBtn, resetLockBtn].forEach(b=>{
    if(b) b.disabled = !isPro;
  });

  // Presets (Pro)
  ["presetChallenge10K","presetChallenge25K","presetChallenge50K","presetChallenge100K"]
    .forEach(id=>{
      const b = $(id);
      if(b) b.disabled = !isPro;
    });
}

function triggerLock(){
  if(!isPro) return;
  const cooldownMin = n("cooldownMin") || 120;
  const until = Date.now() + cooldownMin*60000;
  localStorage.setItem("lockUntil", String(until));
  applyLockUI();
}

function resetLock(){
  if(!isPro) return;
  localStorage.removeItem("lockUntil");
  applyLockUI();
}

// ===== Challenge Engine (PRO) =====
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

// ===== Calculator (FREE) =====
function calculate(){
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

  if($("clickStatus")){
    const sym = $("symbol")?.value || "";
    const a = symbols[sym]?.asset || "";
    $("clickStatus").textContent = sym ? `Calculated ✅ (${sym}${a?` / ${a}`:""})` : "Calculated ✅";
  }

  // Only pro engine updates decision
  if(isPro) runPropEngine(riskMoney);
}

// ===== Can I Take Trade (PRO) =====
function canTakeTrade(){
  if(!isPro) return alert("Pro required.");
  if(isLocked()) return alert("Locked by loss-streak rule.");
  calculate();
}

// ===== Presets (PRO) =====
function applyPreset(size){
  if(!isPro) return alert("Pro required.");
  if($("accountSize")) $("accountSize").value=String(size);
  if($("dailyLossPct")) $("dailyLossPct").value="5";
  if($("maxLossPct")) $("maxLossPct").value="10";
  calculate();
}

// ===== Login =====
function wireLogin(){
  const signUp = $("signUpBtn");
  const signIn = $("signInBtn");
  const signOutBtn = $("signOutBtn");

  if(signUp) signUp.onclick=async()=>{
    try{
      await createUserWithEmailAndPassword(auth, ($("email")?.value||"").trim(), $("password")?.value||"");
    }catch(e){ alert(e.message); }
  };

  if(signIn) signIn.onclick=async()=>{
    try{
      await signInWithEmailAndPassword(auth, ($("email")?.value||"").trim(), $("password")?.value||"");
    }catch(e){ alert(e.message); }
  };

  if(signOutBtn) signOutBtn.onclick=async()=>{
    try{ await signOut(auth); }catch(e){ alert(e.message); }
  };

  onAuthStateChanged(auth,(user)=>{
    isPro=!!user;
    if($("userStatus")) $("userStatus").textContent = user ? `Signed in: ${user.email}` : "Not signed in";
    setProUI();
    calculate();
  });
}

// ===== Wire UI =====
document.addEventListener("DOMContentLoaded",()=>{
  // mode UI
  on("quickModeBtn","click",()=>{
    $("quickModeBtn")?.classList.add("active");
    $("disciplineModeBtn")?.classList.remove("active");
  });
  on("disciplineModeBtn","click",()=>{
    $("disciplineModeBtn")?.classList.add("active");
    $("quickModeBtn")?.classList.remove("active");
  });

  populateSymbols();
  wireLogin();

  on("symbol","change",()=>{
    applySymbolDefaults($("symbol").value);
    calculate();
  });

  on("calcBtn","click",calculate);
  on("canTakeBtn","click",canTakeTrade);

  // Loss streak buttons (PRO)
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
    if($("streakNow")) $("streakNow").value="0";
    resetLock();
  });

  on("resetLockBtn","click",()=>{
    if(!isPro) return alert("Pro required.");
    resetLock();
  });

  // Preset buttons (PRO)
  [
    ["presetChallenge10K", 10000],
    ["presetChallenge25K", 25000],
    ["presetChallenge50K", 50000],
    ["presetChallenge100K",100000],
  ].forEach(([id, size])=>{
    const b = $(id);
    if(b) b.addEventListener("click",()=>applyPreset(size));
  });

  // Initial UI state
  setProUI();
  calculate();
});
