// ===== Firebase CDN =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const firebaseConfig = {
  <script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyAIpOlvSL_hVYEORkDUqOK5Zz3MIbGpc-o",
    authDomain: "propengine-app.firebaseapp.com",
    projectId: "propengine-app",
    storageBucket: "propengine-app.firebasestorage.app",
    messagingSenderId: "469340262601",
    appId: "1:469340262601:web:0e3069ef3691f2ec883d18"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
</script>

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

// ===== Symbol presets (editable defaults) =====
const symbols = {
  // ===== FX (major, non-JPY) =====
  "EURUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "GBPUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "AUDUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "NZDUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "USDCAD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "USDCHF": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },

  // ===== FX (crosses) =====
  "EURGBP": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "EURCHF": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "EURAUD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "GBPAUD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },

  // ===== FX (JPY pairs) =====
  "USDJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },
  "EURJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },
  "GBPJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },
  "AUDJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },

  // ===== Metals =====
  "XAUUSD": { asset:"Metals", unitName:"ticks", unitSize:0.01, valuePerUnit:1.0, lotStep:0.01 },
  "XAGUSD": { asset:"Metals", unitName:"ticks", unitSize:0.01, valuePerUnit:0.5, lotStep:0.01 },

  // ===== Indices (CFD defaults) =====
  "NAS100": { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "US30":   { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "SPX500": { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "GER40":  { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "UK100":  { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },

  // ===== Crypto =====
  "BTCUSD": { asset:"Crypto", unitName:"ticks", unitSize:1, valuePerUnit:1.0, lotStep:0.001 },
  "ETHUSD": { asset:"Crypto", unitName:"ticks", unitSize:0.1, valuePerUnit:0.1, lotStep:0.001 },
  "SOLUSD": { asset:"Crypto", unitName:"ticks", unitSize:0.01, valuePerUnit:0.01, lotStep:0.001 },
  "XRPUSD": { asset:"Crypto", unitName:"ticks", unitSize:0.0001, valuePerUnit:0.0001, lotStep:0.001 }
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

// ===== Loss Streak Lock =====
function isLocked(){
  const until=localStorage.getItem("lockUntil");
  return until && Date.now() < parseInt(until,10);
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

// ===== PRO UI LOCK (this was missing) =====
function setProUI(){
  // lock the whole challenge engine block
  const proControls = $("proControls");
  if(proControls){
    proControls.style.opacity = isPro ? "1" : "0.55";
    proControls.style.pointerEvents = isPro ? "auto" : "none";
  }

  // mode button label
  const discBtn = $("disciplineModeBtn");
  if(discBtn){
    discBtn.textContent = isPro ? "Discipline" : "Discipline 🔒";
  }

  // presets buttons disabled when not PRO
  [
    "presetChallenge10K","presetChallenge25K","presetChallenge50K","presetChallenge100K",
    // legacy ids (if exist)
    "presetFTMO10K","presetFTMO25K","presetFTMO50K","presetFTMO100K"
  ].forEach(id=>{
    const b = $(id);
    if(b) b.disabled = !isPro;
  });

  // loss-streak buttons disabled when not PRO
  ["winBtn","lossBtn","resetLockBtn"].forEach(id=>{
    const b = $(id);
    if(b) b.disabled = !isPro;
  });

  // canTake disabled when not PRO (also respects lock)
  const canTakeBtn = $("canTakeBtn");
  if(canTakeBtn) canTakeBtn.disabled = !isPro || isLocked();

  // calc is always FREE unless locked
  const calcBtn = $("calcBtn");
  if(calcBtn) calcBtn.disabled = isLocked();

  applyLockUI();
}

// keep lock status text consistent with PRO
function applyLockUI(){
  const locked=isLocked();

  const lockStatus = $("lockStatus");
  if(lockStatus){
    lockStatus.textContent = !isPro
      ? "Pro required"
      : (locked ? "LOCKED ❌" : "Unlocked ✅");
    lockStatus.className = !isPro ? "warn" : (locked ? "bad" : "ok");
  }

  const lockHint = $("lockHint");
  if(lockHint){
    if(!isPro) lockHint.textContent = "Login to unlock loss-streak lock.";
    else if(locked){
      const until = parseInt(localStorage.getItem("lockUntil")||"0",10);
      const mins = Math.max(0, Math.ceil((until - Date.now())/60000));
      lockHint.textContent = `Cooldown active: ~${mins} min left`;
    } else {
      lockHint.textContent = "";
    }
  }

  // buttons
  const calcBtn = $("calcBtn");
  if(calcBtn) calcBtn.disabled = locked;

  const canTakeBtn = $("canTakeBtn");
  if(canTakeBtn) canTakeBtn.disabled = locked || !isPro;
}

// ===== Prop Engine =====
function runPropEngine(riskMoney){
  if(!isPro){
    // keep outputs clean in FREE
    if($("remainingDailyOut")) $("remainingDailyOut").textContent = "-";
    if($("remainingOverallOut")) $("remainingOverallOut").textContent = "-";
    if($("tradeStatusOut")) $("tradeStatusOut").textContent = "-";
    return;
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
  if(!isPro) return alert("Pro required. Please sign in.");
  if(isLocked()) return alert("Locked by loss-streak rule.");
  calculate();
}

// ===== Presets =====
function applyPreset(size){
  if(!isPro) return alert("Pro required. Please sign in.");
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
    try{
      await createUserWithEmailAndPassword(auth, ($("email")?.value || "").trim(), $("password")?.value || "");
    } catch(e){ alert(e.message); }
  };
  if(signIn) signIn.onclick=async()=>{
    try{
      await signInWithEmailAndPassword(auth, ($("email")?.value || "").trim(), $("password")?.value || "");
    } catch(e){ alert(e.message); }
  };
  if(signOutBtn) signOutBtn.onclick=async()=>{ await signOut(auth); };

  onAuthStateChanged(auth,(user)=>{
    isPro=!!user;
    if($("userStatus")) $("userStatus").textContent=user?`Signed in: ${user.email}`:"Not signed in";
    setProUI();
    calculate();
  });
}

// ===== Wire UI =====
document.addEventListener("DOMContentLoaded",()=>{
  populateSymbols();
  wireLogin();
// ==========================
// ===== SYMBOL SEARCH ======
// ==========================
on("symbolSearch","input",(e)=>{
  const search = e.target.value.toUpperCase();
  const sel = $("symbol");
  if(!sel) return;

  sel.innerHTML = "";

  Object.keys(symbols)
    .filter(sym => sym.includes(search))
    .forEach(sym=>{
      const opt = document.createElement("option");
      opt.value = sym;
      opt.textContent = sym;
      sel.appendChild(opt);
    });
});

// ==========================
// ===== TOGGLE ADD BOX =====
// ==========================
on("showAddSymbol","click",()=>{
  const box = $("addSymbolBox");
  if(!box) return;
  box.style.display = box.style.display === "none" ? "block" : "none";
});

// ==========================
// ===== SAVE CUSTOM SYMBOL =
// ==========================
on("addSymbolBtn","click",()=>{
  const name = $("customSymbolName").value.trim().toUpperCase();
  if(!name) return alert("Enter symbol name.");

  symbols[name] = {
    unitSize: parseFloat($("customUnitSize").value) || 1,
    valuePerUnit: parseFloat($("customValuePerUnit").value) || 1,
    lotStep: parseFloat($("customLotStep").value) || 0.01
  };

  populateSymbols();
  $("symbol").value = name;

  $("addSymbolBox").style.display="none";

  // uloženie do localStorage (aby sa nestratilo)
  localStorage.setItem("customSymbols", JSON.stringify(symbols));
});
  on("symbol","change",()=>{
    applySymbolDefaults($("symbol").value);
    calculate();
  });

  on("calcBtn","click",calculate);
  on("canTakeBtn","click",canTakeTrade);

  // PRO lock button behavior: if someone clicks disabled via keyboard, show message
  ["presetChallenge10K","presetChallenge25K","presetChallenge50K","presetChallenge100K"].forEach(id=>{
    const b = $(id);
    if(!b) return;
    b.addEventListener("click", ()=> {
      if(!isPro) return alert("Pro required. Please sign in.");
    }, { capture:true });
  });

  on("lossBtn","click",()=>{
    if(!isPro) return alert("Pro required. Please sign in.");
    const sEl = $("streakNow");
    const cur = parseInt(sEl?.value || "0",10);
    const next = cur + 1;
    if(sEl) sEl.value = String(next);
    if(next >= (n("maxStreak") || 3)) triggerLock();
    applyLockUI();
    setProUI();
  });

  on("winBtn","click",()=>{
    if(!isPro) return alert("Pro required. Please sign in.");
    if($("streakNow")) $("streakNow").value=0;
    applyLockUI();
    setProUI();
  });

  on("resetLockBtn","click",()=>{
    if(!isPro) return alert("Pro required. Please sign in.");
    resetLock();
    setProUI();
  });

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

  // initial UI lock state
  setProUI();
  calculate();
});
