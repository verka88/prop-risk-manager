// ===== Firebase CDN =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
const db = getFirestore(app);

// ===== Helpers =====
const $ = (id) => document.getElementById(id);

function show(id, on){
  const el = $(id);
  if(!el) return;
  el.style.display = on ? "" : "none";
}

// čísla aj s čiarkou
function n(id){
  const el = $(id);
  if(!el) return 0;
  const val = String(el.value).replace(",",".").trim();
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

function on(id, event, fn){
  const el = $(id);
  if(!el) return;
  el.addEventListener(event, fn);
}

// ===== Global State =====
let isPro = false;

// ===== Trial settings =====
const TRIAL_DAYS = 7;
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

// ===== Symbols =====
const symbols = {
  "EURUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "GBPUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "USDJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },

  "XAUUSD": { asset:"Metals", unitName:"ticks", unitSize:0.01, valuePerUnit:1.0, lotStep:0.01 },

  "NAS100": { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "US30":   { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "SPX500": { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },

  "BTCUSD": { asset:"Crypto", unitName:"ticks", unitSize:1, valuePerUnit:1.0, lotStep:0.001 },
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

  if($("slUnitsLabel")) $("slUnitsLabel").textContent = `SL (${cfg.unitName})`;
  if($("tpUnitsLabel")) $("tpUnitsLabel").textContent = `TP (${cfg.unitName})`;

  if($("unitSize")) $("unitSize").value = String(cfg.unitSize).replace(".",",");
  if($("valuePerUnit")) $("valuePerUnit").value = String(cfg.valuePerUnit).replace(".",",");
  if($("lotStep")) $("lotStep").value = String(cfg.lotStep).replace(".",",");
}

// ===== Loss Streak Lock (local only) =====
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

// ===== PRO UI LOCK =====
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

  ["presetChallenge10K","presetChallenge25K","presetChallenge50K","presetChallenge100K"].forEach(id=>{
    const b = $(id);
    if(b) b.disabled = !isPro;
  });

  ["winBtn","lossBtn","resetLockBtn"].forEach(id=>{
    const b = $(id);
    if(b) b.disabled = !isPro;
  });

  const canTakeBtn = $("canTakeBtn");
  if(canTakeBtn) canTakeBtn.disabled = !isPro || isLocked();

  const calcBtn = $("calcBtn");
  if(calcBtn) calcBtn.disabled = isLocked();

  applyLockUI();
}

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
    if(!isPro) lockHint.textContent = "Trial/Pro required.";
    else if(locked){
      const until = parseInt(localStorage.getItem("lockUntil")||"0",10);
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

// ===== Prop Engine =====
function runPropEngine(riskMoney){
  if(!isPro){
    if($("remainingDailyOut")) $("remainingDailyOut").textContent = "-";
    if($("remainingOverallOut")) $("remainingOverallOut").textContent = "-";
    if($("tradeStatusOut")) $("tradeStatusOut").textContent = "-";
    if($("decisionOut")) $("decisionOut").textContent = "-";
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
  let tpUnits=n("tpUnits");
  const tpBufferUnits=n("tpBuffer");     // buffer in pips/ticks (units)
  const rr=n("rr") || 2;

  const unitSize=n("unitSize");
  const valuePerUnit=n("valuePerUnit");
  const lotStep=n("lotStep")||0.01;
  const dir=$("direction") ? $("direction").value : "LONG";

  // Risk money
  const riskMoney=balance*(riskPct/100);

  // If TP empty -> use RR
  if(!($("tpUnits")?.value || "").trim()){
    tpUnits = slUnits * rr;
  }

  // add TP buffer in units (pips/ticks)
  const tpUnitsWithBuffer = tpUnits + tpBufferUnits;

  // Lots
  const lossPerLot = slUnits * valuePerUnit;
  const lotsRaw = lossPerLot>0 ? riskMoney/lossPerLot : 0;
  const lots = roundDownStep(lotsRaw, lotStep);

  // Distances in price
  const slDist = slUnits * unitSize;
  const tpDist = tpUnitsWithBuffer * unitSize;

  const slPrice = dir==="LONG" ? entry - slDist : entry + slDist;
  const tpPrice = dir==="LONG" ? entry + tpDist : entry - tpDist;

  if($("riskOut")) $("riskOut").textContent=fmt2(riskMoney);
  if($("lossPerLotOut")) $("lossPerLotOut").textContent=fmt2(lossPerLot);
  if($("lotsOut")) $("lotsOut").textContent=lots.toFixed(3);

  if($("slUnitsOut")) $("slUnitsOut").textContent=slUnits;
  if($("tpUnitsOut")) $("tpUnitsOut").textContent=tpUnitsWithBuffer;

  if($("slPriceOut")) $("slPriceOut").textContent=fmtPrice(slPrice);
  if($("tpPriceOut")) $("tpPriceOut").textContent=fmtPrice(tpPrice);

  runPropEngine(riskMoney);
}

// ===== Can I Take Trade =====
function canTakeTrade(){
  if(!isPro) return alert("Trial/Pro required. Please sign in.");
  if(isLocked()) return alert("Locked by loss-streak rule.");
  calculate();
}

// ===== Presets =====
function applyPreset(size){
  if(!isPro) return alert("Trial/Pro required. Please sign in.");
  if($("accountSize")) $("accountSize").value=size;
  if($("dailyLossPct")) $("dailyLossPct").value=5;
  if($("maxLossPct")) $("maxLossPct").value=10;
  calculate();
}

// ===== Create user doc (trial) =====
async function ensureUserDoc(user){
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if(!snap.exists()){
    const now = Date.now();
    await setDoc(ref, {
      email: user.email || "",
      createdAt: serverTimestamp(),
      trialStartedAtMs: now,
      trialEndsAtMs: now + TRIAL_MS,
      plan: "trial"
    });
  }
}

// ===== Login / UI =====
function wireLogin(){
  $("signUpBtn")?.addEventListener("click", async ()=>{
    const email = ($("email")?.value || "").trim();
    const pass = $("password")?.value || "";
    try{
      await createUserWithEmailAndPassword(auth, email, pass);
    }catch(e){ alert(e.message); }
  });

  $("signInBtn")?.addEventListener("click", async ()=>{
    const email = ($("email")?.value || "").trim();
    const pass = $("password")?.value || "";
    try{
      await signInWithEmailAndPassword(auth, email, pass);
    }catch(e){ alert(e.message); }
  });

  $("signOutBtn")?.addEventListener("click", async ()=>{
    await signOut(auth);
  });

  $("helpBtn")?.addEventListener("click", ()=>{
    alert("Tip: Create account → then Sign in.\nIf you already created account, just Sign in.");
  });

  $("upgradeBtn")?.addEventListener("click", ()=>{
    // Najlepšie bez Stripe: mailto alebo Google Form
    // TU si zmeň email alebo link
    window.location.href = "mailto:youremail@domain.com?subject=Upgrade%20Pro%20Risk%20Tool&body=Hi,%20I%20want%20to%20upgrade.%20My%20email%20is:%20";
  });

  onAuthStateChanged(auth, async (user)=>{
    isPro = false;

    if(user){
      await ensureUserDoc(user);

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};

      const now = Date.now();
      const trialEndsAtMs = data.trialEndsAtMs || 0;
      const trialActive = now < trialEndsAtMs;

      isPro = trialActive || data.plan === "pro";

      if($("userStatus")) $("userStatus").textContent = `Signed in: ${user.email}`;

      const banner = $("trialBanner");
      if(banner){
        if(trialActive){
          const daysLeft = Math.ceil((trialEndsAtMs - now) / (24*60*60*1000));
          banner.textContent = `Trial active: ${daysLeft} day(s) left`;
        } else {
          banner.textContent = `Trial ended. Please upgrade to unlock Pro features.`;
        }
      }

      show("upgradeBtn", !trialActive);
      show("authSignedOut", false);
      show("authSignedIn", true);

    } else {
      if($("userStatus")) $("userStatus").textContent = "Not signed in";
      if($("trialBanner")) $("trialBanner").textContent = "";
      show("upgradeBtn", false);

      show("authSignedOut", true);
      show("authSignedIn", false);
    }

    setProUI();
    calculate();
  });
}

// ===== Wire UI =====
document.addEventListener("DOMContentLoaded", ()=>{
  populateSymbols();
  wireLogin();

  on("symbol","change", ()=>{
    applySymbolDefaults($("symbol").value);
    calculate();
  });

  // search symbols
  on("symbolSearch","input",(e)=>{
    const search = (e.target.value || "").toUpperCase();
    const sel = $("symbol");
    if(!sel) return;

    sel.innerHTML = "";
    Object.keys(symbols)
      .filter(sym => sym.includes(search))
      .forEach(sym=>{
        const opt=document.createElement("option");
        opt.value=sym;
        opt.textContent=`${sym} (${symbols[sym].asset})`;
        sel.appendChild(opt);
      });

    if(sel.options.length){
      sel.value = sel.options[0].value;
      applySymbolDefaults(sel.value);
      calculate();
    }
  });

  // toggle custom symbol box
  on("showAddSymbol","click",()=>{
    const box = $("addSymbolBox");
    if(!box) return;
    box.style.display = box.style.display === "none" ? "block" : "none";
  });

  // save custom symbol (local only)
  on("addSymbolBtn","click",()=>{
    const name = ($("customSymbolName")?.value || "").trim().toUpperCase();
    if(!name) return alert("Enter symbol name.");

    symbols[name] = {
      asset:"Custom",
      unitName:"units",
      unitSize: parseFloat(($("customUnitSize")?.value || "1").replace(",",".")) || 1,
      valuePerUnit: parseFloat(($("customValuePerUnit")?.value || "1").replace(",",".")) || 1,
      lotStep: parseFloat(($("customLotStep")?.value || "0.01").replace(",",".")) || 0.01
    };

    populateSymbols();
    $("symbol").value = name;
    applySymbolDefaults(name);

    if($("addSymbolBox")) $("addSymbolBox").style.display="none";
    calculate();
  });

  on("calcBtn","click", calculate);
  on("canTakeBtn","click", canTakeTrade);

  // presets
  [
    ["presetChallenge10K", 10000],
    ["presetChallenge25K", 25000],
    ["presetChallenge50K", 50000],
    ["presetChallenge100K", 100000],
  ].forEach(([id, size])=>{
    $(id)?.addEventListener("click", ()=>applyPreset(size));
  });

  // loss streak buttons
  on("lossBtn","click", ()=>{
    if(!isPro) return alert("Trial/Pro required.");
    const sEl = $("streakNow");
    const cur = parseInt(sEl?.value || "0",10);
    const next = cur + 1;
    if(sEl) sEl.value = String(next);
    if(next >= (n("maxStreak") || 3)) triggerLock();
    applyLockUI();
    setProUI();
  });

  on("winBtn","click", ()=>{
    if(!isPro) return alert("Trial/Pro required.");
    if($("streakNow")) $("streakNow").value="0";
    applyLockUI();
    setProUI();
  });

  on("resetLockBtn","click", ()=>{
    if(!isPro) return alert("Trial/Pro required.");
    resetLock();
    setProUI();
  });

  setProUI();
  calculate();
});
