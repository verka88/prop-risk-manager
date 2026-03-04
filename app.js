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

// ===== Your Firebase config =====
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

// numbers with comma support
function n(id){
  const el = $(id);
  if(!el) return 0;
  const val = String(el.value ?? "").trim().replace(",", ".");
  const num = parseFloat(val);
  return Number.isFinite(num) ? num : 0;
}

function strWithComma(x){
  const s = String(x);
  return s.includes(".") ? s.replace(".", ",") : s;
}

function fmt2(x){ return Number.isFinite(x) ? x.toFixed(2) : "-"; }

function fmtLots(x){
  if(!Number.isFinite(x)) return "-";
  // remove trailing zeros
  let s = x.toFixed(3);
  s = s.replace(/0+$/,"").replace(/\.$/,"");
  return s;
}

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
let proReason = "free"; // pro | trial | expired | free
let currentUser = null;

// ===== Symbol defaults =====
const baseSymbols = {
  // FX
  "EURUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "GBPUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "AUDUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "NZDUSD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "USDCAD": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },
  "USDCHF": { asset:"FX", unitName:"pips", unitSize:0.0001, valuePerUnit:9.0, lotStep:0.01 },

  "EURJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },
  "USDJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },
  "GBPJPY": { asset:"FX", unitName:"pips", unitSize:0.01, valuePerUnit:7.0, lotStep:0.01 },

  // Metals
  "XAUUSD": { asset:"Metals", unitName:"ticks", unitSize:0.01, valuePerUnit:1.0, lotStep:0.01 },
  "XAGUSD": { asset:"Metals", unitName:"ticks", unitSize:0.01, valuePerUnit:0.5, lotStep:0.01 },

  // Indices
  "NAS100": { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "US30":   { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "SPX500": { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },
  "GER40":  { asset:"Index", unitName:"points", unitSize:1, valuePerUnit:1.0, lotStep:0.01 },

  // Crypto
  "BTCUSD": { asset:"Crypto", unitName:"ticks", unitSize:1, valuePerUnit:1.0, lotStep:0.001 },
  "ETHUSD": { asset:"Crypto", unitName:"ticks", unitSize:0.1, valuePerUnit:0.1, lotStep:0.001 },
  "SOLUSD": { asset:"Crypto", unitName:"ticks", unitSize:0.01, valuePerUnit:0.01, lotStep:0.001 },
  "XRPUSD": { asset:"Crypto", unitName:"ticks", unitSize:0.0001, valuePerUnit:0.0001, lotStep:0.001 }
};

function loadCustomSymbols(){
  try{
    const raw = localStorage.getItem("customSymbolsV1");
    if(!raw) return {};
    const obj = JSON.parse(raw);
    if(!obj || typeof obj !== "object") return {};
    return obj;
  } catch {
    return {};
  }
}

function saveCustomSymbols(customObj){
  localStorage.setItem("customSymbolsV1", JSON.stringify(customObj));
}

function getAllSymbols(){
  return { ...baseSymbols, ...loadCustomSymbols() };
}

function populateSymbols(filteredList){
  const sel = $("symbol");
  if(!sel) return;

  const all = getAllSymbols();
  const current = sel.value || "EURUSD";

  const keys = filteredList && filteredList.length
    ? filteredList
    : Object.keys(all);

  sel.innerHTML = "";
  keys.forEach(k=>{
    const cfg = all[k];
    if(!cfg) return;
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${k} (${cfg.asset})`;
    sel.appendChild(opt);
  });

  sel.value = all[current] ? current : (keys[0] || "EURUSD");
  applySymbolDefaults(sel.value);
}

function applySymbolDefaults(sym){
  const all = getAllSymbols();
  const cfg = all[sym];
  if(!cfg) return;

  if($("slUnitsLabel")) $("slUnitsLabel").textContent = `SL distance (${cfg.unitName})`;
  if($("tpUnitsLabel")) $("tpUnitsLabel").textContent = `TP distance (${cfg.unitName})`;
  if($("zoneLabel")) $("zoneLabel").textContent = `Zone size (${cfg.unitName})`;
  if($("slBufferLabel")) $("slBufferLabel").textContent = `SL buffer (${cfg.unitName})`;
  if($("tpBufferLabel")) $("tpBufferLabel").textContent = `TP buffer (${cfg.unitName})`;

  if($("unitSize")) $("unitSize").value = strWithComma(cfg.unitSize);
  if($("valuePerUnit")) $("valuePerUnit").value = strWithComma(cfg.valuePerUnit);
  if($("lotStep")) $("lotStep").value = strWithComma(cfg.lotStep);

  // keep UI consistent:
  syncSlFromZone();
  calculate();
}

// ===== Trial / Pro plan from Firestore =====
async function loadPlanForUser(user){
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if(!snap.exists()){
    const trialDays = 7;
    const trialEndsAt = Date.now() + trialDays * 24 * 60 * 60 * 1000;

    await setDoc(ref, {
      email: user.email || "",
      plan: "trial",      // trial | pro | free
      trialEndsAt,
      createdAt: serverTimestamp()
    });

    return { plan: "trial", trialEndsAt };
  }

  return snap.data();
}

// ===== Loss Streak Lock (Pro feature) =====
function isLocked(){
  const until = localStorage.getItem("lockUntil");
  return until && Date.now() < parseInt(until, 10);
}

function triggerLock(){
  const cooldownMin = n("cooldownMin") || 120;
  const until = Date.now() + cooldownMin * 60000;
  localStorage.setItem("lockUntil", String(until));
  applyLockUI();
  setProUI();
}

function resetLock(){
  localStorage.removeItem("lockUntil");
  applyLockUI();
  setProUI();
}

function applyLockUI(){
  const locked = isLocked();

  const lockStatus = $("lockStatus");
  if(lockStatus){
    lockStatus.textContent = !isPro ? "Pro required" : (locked ? "LOCKED ❌" : "Unlocked ✅");
    lockStatus.className = !isPro ? "warn" : (locked ? "bad" : "ok");
  }

  const lockHint = $("lockHint");
  if(lockHint){
    if(!isPro){
      lockHint.textContent = "Sign in (trial/pro) to unlock loss-streak lock.";
    } else if(locked){
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

// ===== Pro gating UI =====
function setProUI(){
  // challenge engine
  const proControls = $("proControls");
  if(proControls){
    proControls.style.opacity = isPro ? "1" : "0.55";
    proControls.style.pointerEvents = isPro ? "auto" : "none";
  }

  // discipline mode label
  const discBtn = $("disciplineModeBtn");
  if(discBtn){
    discBtn.textContent = isPro ? "Discipline" : "Discipline 🔒";
  }

  // preset buttons
  ["presetChallenge10K","presetChallenge25K","presetChallenge50K","presetChallenge100K"].forEach(id=>{
    const b = $(id);
    if(b) b.disabled = !isPro;
  });

  // lock buttons
  ["winBtn","lossBtn","resetLockBtn"].forEach(id=>{
    const b = $(id);
    if(b) b.disabled = !isPro;
  });

  // upgrade box
  const upgradeBox = $("upgradeBox");
  if(upgradeBox){
    const show = !!currentUser && !isPro && proReason === "expired";
    upgradeBox.style.display = show ? "block" : "none";
  }

  applyLockUI();
}

// ===== Zone → SL =====
function syncSlFromZone(){
  const zone = n("zoneSize");
  const slBuf = n("slBufferUnits");
  const sl = Math.max(0, zone + slBuf);

  const slEl = $("slUnits");
  if(slEl){
    // always keep it updated so user can just type zone
    slEl.value = strWithComma(sl);
  }
}

// ===== Prop Engine (Pro) =====
function runPropEngine(riskMoney){
  if(!isPro){
    if($("remainingDailyOut")) $("remainingDailyOut").textContent = "-";
    if($("remainingOverallOut")) $("remainingOverallOut").textContent = "-";
    if($("tradeStatusOut")) $("tradeStatusOut").textContent = "-";
    return;
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
  if($("decisionOut")) $("decisionOut").textContent = status;
}

// ===== Calculator =====
function calculate(){
  if(isLocked()) return;

  // keep SL synced from zone every time
  syncSlFromZone();

  const balance = n("balance");
  const riskPct = n("riskPct");
  const entry = n("entry");

  const slUnits = n("slUnits");
  const tpUnitsInput = (String($("tpUnits")?.value || "").trim() === "") ? NaN : n("tpUnits");

  const unitSize = n("unitSize");
  const valuePerUnit = n("valuePerUnit");
  const lotStep = n("lotStep") || 0.01;

  const rr = n("rr") || 2;
  const tpMode = $("tpMode")?.value || "UNITS";
  const tpBufUnits = n("tpBufferUnits");

  const dir = $("direction") ? $("direction").value : "LONG";

  const riskMoney = balance * (riskPct/100);
  const lossPerLot = slUnits * valuePerUnit;

  const lotsRaw = lossPerLot > 0 ? (riskMoney / lossPerLot) : 0;
  const lots = roundDownStep(lotsRaw, lotStep);

  // TP units (either user units or RR)
  let tpUnits = 0;
  if(tpMode === "RR" || !Number.isFinite(tpUnitsInput)){
    tpUnits = slUnits * rr;
  } else {
    tpUnits = tpUnitsInput;
  }
  tpUnits = Math.max(0, tpUnits + tpBufUnits);

  // convert to price
  const slDistPrice = slUnits * unitSize;
  const tpDistPrice = tpUnits * unitSize;

  const slPrice = dir === "LONG" ? entry - slDistPrice : entry + slDistPrice;
  const tpPrice = dir === "LONG" ? entry + tpDistPrice : entry - tpDistPrice;

  if($("riskOut")) $("riskOut").textContent = fmt2(riskMoney);
  if($("lossPerLotOut")) $("lossPerLotOut").textContent = fmt2(lossPerLot);
  if($("lotsOut")) $("lotsOut").textContent = fmtLots(lots);

  if($("slUnitsOut")) $("slUnitsOut").textContent = String(slUnits);
  if($("tpUnitsOut")) $("tpUnitsOut").textContent = String(tpUnits);

  if($("slPriceOut")) $("slPriceOut").textContent = fmtPrice(slPrice);
  if($("tpPriceOut")) $("tpPriceOut").textContent = fmtPrice(tpPrice);

  if($("clickStatus")) $("clickStatus").textContent = "Calculated ✅";

  runPropEngine(riskMoney);
}

// ===== Pro Decision button =====
function canTakeTrade(){
  if(!currentUser) return alert("Please sign in first.");
  if(!isPro){
    if(proReason === "expired") return alert("Trial expired. Please upgrade to Pro.");
    return alert("Pro required.");
  }
  if(isLocked()) return alert("Locked by loss-streak rule.");
  calculate();
}

// ===== Presets =====
function applyPreset(size){
  if(!currentUser) return alert("Please sign in first.");
  if(!isPro){
    if(proReason === "expired") return alert("Trial expired. Please upgrade to Pro.");
    return alert("Pro required.");
  }
  if($("accountSize")) $("accountSize").value = strWithComma(size);
  if($("dailyLossPct")) $("dailyLossPct").value = "5";
  if($("maxLossPct")) $("maxLossPct").value = "10";
  calculate();
}

// ===== Upgrade button (no Stripe yet) =====
function openUpgrade(){
  // Placeholder for now – you can change this later to Stripe/Gumroad
  // Option A: mailto
  const email = "your@email.com"; // <-- change to YOUR email
  const userMail = currentUser?.email || "";
  const subject = encodeURIComponent("Upgrade to Pro — Prop Risk Engine");
  const body = encodeURIComponent(
    `Hi,\n\nI want to upgrade to Pro.\n\nMy login email: ${userMail}\n\nThanks!`
  );
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

// ===== Custom symbol save =====
function addCustomSymbol(){
  const name = String($("customSymbolName")?.value || "").trim().toUpperCase();
  if(!name) return alert("Enter symbol name (e.g. US500).");

  const unitName = String($("customUnitName")?.value || "").trim() || "units";
  const unitSize = n("customUnitSize") || 1;
  const valuePerUnit = n("customValuePerUnit") || 1;
  const lotStep = n("customLotStep") || 0.01;

  const custom = loadCustomSymbols();
  custom[name] = {
    asset: "Custom",
    unitName,
    unitSize,
    valuePerUnit,
    lotStep
  };
  saveCustomSymbols(custom);

  // refresh list and select it
  populateSymbols();
  if($("symbol")) $("symbol").value = name;
  applySymbolDefaults(name);

  // close box
  const box = $("addSymbolBox");
  if(box) box.style.display = "none";
}

// ===== Login wiring =====
function wireLogin(){
  const signUp = $("signUpBtn");
  const signIn = $("signInBtn");
  const signOutBtn = $("signOutBtn");

  if(signUp) signUp.onclick = async () => {
    try{
      const email = ($("email")?.value || "").trim();
      const pass = $("password")?.value || "";
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch(e){
      alert(e.message);
    }
  };

  if(signIn) signIn.onclick = async () => {
    try{
      const email = ($("email")?.value || "").trim();
      const pass = $("password")?.value || "";
      await signInWithEmailAndPassword(auth, email, pass);
    } catch(e){
      alert(e.message);
    }
  };

  if(signOutBtn) signOutBtn.onclick = async () => {
    try{
      await signOut(auth);
    } catch(e){
      alert(e.message);
    }
  };

  onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;

    if(!user){
      isPro = false;
      proReason = "free";
      if($("userStatus")) $("userStatus").textContent = "Not signed in";
      setProUI();
      calculate();
      return;
    }

    try{
      const data = await loadPlanForUser(user);
      const plan = data?.plan || "free";
      const trialEndsAt = Number(data?.trialEndsAt || 0);

      const trialActive = plan === "trial" && Date.now() < trialEndsAt;
      const proActive = plan === "pro";

      isPro = proActive || trialActive;

      if(proActive){
        proReason = "pro";
        if($("userStatus")) $("userStatus").textContent = `Signed in: ${user.email} — PRO ✅`;
      } else if(trialActive){
        proReason = "trial";
        const daysLeft = Math.max(0, Math.ceil((trialEndsAt - Date.now()) / (24*60*60*1000)));
        if($("userStatus")) $("userStatus").textContent = `Signed in: ${user.email} — Trial (${daysLeft} days left)`;
      } else {
        proReason = "expired";
        if($("userStatus")) $("userStatus").textContent = `Signed in: ${user.email} — Trial expired`;
      }
    } catch(e){
      console.error(e);
      isPro = false;
      proReason = "free";
      if($("userStatus")) $("userStatus").textContent = `Signed in: ${user.email} — plan load error`;
    }

    setProUI();
    calculate();
  });
}

// ===== Wire UI =====
document.addEventListener("DOMContentLoaded", () => {
  // symbols
  populateSymbols();
  applySymbolDefaults($("symbol")?.value || "EURUSD");

  // login
  wireLogin();

  // mode buttons (UI only)
  on("quickModeBtn","click",()=>{
    $("quickModeBtn")?.classList.add("active");
    $("disciplineModeBtn")?.classList.remove("active");
  });
  on("disciplineModeBtn","click",()=>{
    $("disciplineModeBtn")?.classList.add("active");
    $("quickModeBtn")?.classList.remove("active");
  });

  // symbol change
  on("symbol","change",()=>{
    applySymbolDefaults($("symbol")?.value || "EURUSD");
  });

  // search symbol
  on("symbolSearch","input",(e)=>{
    const q = String(e.target.value || "").trim().toUpperCase();
    const all = getAllSymbols();
    const filtered = Object.keys(all).filter(k => k.includes(q));
    populateSymbols(q ? filtered : null);
  });

  // add custom symbol toggle
  on("showAddSymbol","click",()=>{
    const box = $("addSymbolBox");
    if(!box) return;
    box.style.display = (box.style.display === "none" || box.style.display === "") ? "block" : "none";
  });

  // save custom symbol
  on("addSymbolBtn","click", addCustomSymbol);

  // calc button
  on("calcBtn","click", calculate);

  // pro decision
  on("canTakeBtn","click", canTakeTrade);

  // upgrade
  on("upgradeBtn","click", openUpgrade);

  // zone/SL buffers auto update
  ["zoneSize","slBufferUnits","tpBufferUnits","slUnits"].forEach(id=>{
    on(id,"input", calculate);
  });

  // general auto calc
  [
    "balance","riskPct","entry","rr","direction",
    "tpUnits","tpMode",
    "unitSize","valuePerUnit","lotStep",
    // engine
    "accountSize","dailyLossPct","maxLossPct","todayPnl","totalPnL"
  ].forEach(id=>{
    on(id,"input", calculate);
  });

  // loss streak buttons (Pro)
  on("lossBtn","click",()=>{
    if(!currentUser) return alert("Please sign in first.");
    if(!isPro) return alert(proReason === "expired" ? "Trial expired. Upgrade to Pro." : "Pro required.");

    const sEl = $("streakNow");
    const cur = parseInt(sEl?.value || "0", 10);
    const next = cur + 1;
    if(sEl) sEl.value = String(next);

    if(next >= (n("maxStreak") || 3)) triggerLock();
    applyLockUI();
    calculate();
  });

  on("winBtn","click",()=>{
    if(!currentUser) return alert("Please sign in first.");
    if(!isPro) return alert(proReason === "expired" ? "Trial expired. Upgrade to Pro." : "Pro required.");
    if($("streakNow")) $("streakNow").value = "0";
    applyLockUI();
    calculate();
  });

  on("resetLockBtn","click",()=>{
    if(!currentUser) return alert("Please sign in first.");
    if(!isPro) return alert(proReason === "expired" ? "Trial expired. Upgrade to Pro." : "Pro required.");
    resetLock();
    calculate();
  });

  // presets (Pro)
  [
    ["presetChallenge10K", 10000],
    ["presetChallenge25K", 25000],
    ["presetChallenge50K", 50000],
    ["presetChallenge100K", 100000],
  ].forEach(([id, size])=>{
    on(id,"click", ()=> applyPreset(size));
  });

  // initial
  setProUI();
  calculate();
});
