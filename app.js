// ===== Helpers =====
const $ = (id)=>document.getElementById(id)

function num(v){
  if(!v) return 0
  return parseFloat(String(v).replace(",", ".")) || 0
}

function n(id){
  const el=$(id)
  if(!el) return 0
  return num(el.value)
}

function fmt2(x){
  return Number.isFinite(x)?x.toFixed(2):"-"
}

function fmtPrice(x){
  if(!Number.isFinite(x)) return "-"
  const a=Math.abs(x)
  const d=a>=100?2:a>=1?4:6
  return x.toFixed(d)
}

function roundStep(v,step){
  if(!step) return v
  return Math.floor(v/step)*step
}

// ===== SYMBOLS =====
let symbols={
EURUSD:{unitSize:0.0001,valuePerUnit:9,lotStep:0.01},
GBPUSD:{unitSize:0.0001,valuePerUnit:9,lotStep:0.01},
USDJPY:{unitSize:0.01,valuePerUnit:7,lotStep:0.01},
XAUUSD:{unitSize:0.01,valuePerUnit:1,lotStep:0.01},
NAS100:{unitSize:1,valuePerUnit:1,lotStep:0.01},
BTCUSD:{unitSize:1,valuePerUnit:1,lotStep:0.001}
}

// ===== Populate symbols =====
function loadSymbols(){

const sel=$("symbol")
if(!sel) return

sel.innerHTML=""

Object.keys(symbols).forEach(sym=>{
const o=document.createElement("option")
o.value=sym
o.textContent=sym
sel.appendChild(o)
})

}

// ===== SEARCH =====
function searchSymbols(){

const q=$("symbolSearch").value.toUpperCase()
const sel=$("symbol")

sel.innerHTML=""

Object.keys(symbols)
.filter(s=>s.includes(q))
.forEach(sym=>{
const o=document.createElement("option")
o.value=sym
o.textContent=sym
sel.appendChild(o)
})

}

// ===== ADD SYMBOL =====
function addSymbol(){

const name=$("customSymbolName").value.trim().toUpperCase()
if(!name) return alert("Enter symbol")

symbols[name]={
unitSize:num($("customUnitSize").value)||1,
valuePerUnit:num($("customValuePerUnit").value)||1,
lotStep:num($("customLotStep").value)||0.01
}

loadSymbols()
$("symbol").value=name

$("addSymbolBox").style.display="none"

}

// ===== CALCULATOR =====
function calculate(){

const balance=n("balance")
const riskPct=n("riskPct")
const entry=n("entry")

const slUnits=n("slUnits")
const slBuffer=n("slBuffer")

const tpUnits=n("tpUnits")

const unitSize=n("unitSize")
const valuePerUnit=n("valuePerUnit")
const lotStep=n("lotStep")||0.01

const dir=$("direction").value

// ===== REAL SL WITH BUFFER =====
const realSL = slUnits + slBuffer

const riskMoney=balance*(riskPct/100)
const lossPerLot=realSL*valuePerUnit

let lots=0
if(lossPerLot>0){
lots=roundStep(riskMoney/lossPerLot,lotStep)
}

// ===== PRICE DISTANCES =====
const slDist=realSL*unitSize
const tpDist=tpUnits*unitSize

let slPrice
let tpPrice

if(dir==="LONG"){
slPrice=entry-slDist
tpPrice=entry+tpDist
}else{
slPrice=entry+slDist
tpPrice=entry-tpDist
}

// ===== PROFIT =====
const profitPerLot = tpUnits * valuePerUnit
const profit = profitPerLot * lots

const rr = riskMoney>0 ? profit/riskMoney : 0

// ===== OUTPUT =====
$("riskOut").textContent=fmt2(riskMoney)
$("lossPerLotOut").textContent=fmt2(lossPerLot)
$("lotsOut").textContent=lots.toFixed(3)

$("slUnitsOut").textContent=realSL
$("tpUnitsOut").textContent=tpUnits

$("slPriceOut").textContent=fmtPrice(slPrice)
$("tpPriceOut").textContent=fmtPrice(tpPrice)

if($("profitOut")) $("profitOut").textContent=fmt2(profit)
if($("rrOut")) $("rrOut").textContent=rr.toFixed(2)

}

// ===== INIT =====
document.addEventListener("DOMContentLoaded",()=>{

loadSymbols()

$("calcBtn").addEventListener("click",calculate)

$("symbolSearch").addEventListener("input",searchSymbols)

$("showAddSymbol").addEventListener("click",()=>{
const b=$("addSymbolBox")
b.style.display=b.style.display==="none"?"block":"none"
})

$("addSymbolBtn").addEventListener("click",addSymbol)

})
