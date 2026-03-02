function toNum(v){
return parseFloat(String(v).replace(",","."))
}

function calculate(){

const balance = toNum(balanceInput.value)
const riskPct = toNum(riskPctInput.value)
const entry = toNum(entryInput.value)
const slUnits = toNum(slUnitsInput.value)
const tpUnits = toNum(tpUnitsInput.value)
const valuePerUnit = toNum(valuePerUnitInput.value)

const riskMoney = balance * (riskPct/100)
const lossPerLot = slUnits * valuePerUnit
const lots = riskMoney / lossPerLot

const slPrice = entry - (slUnits*0.0001)
const tpPrice = entry + (tpUnits*0.0001)

riskOut.textContent = riskMoney.toFixed(2)
lotsOut.textContent = lots.toFixed(2)
slUnitsOut.textContent = slUnits
tpUnitsOut.textContent = tpUnits
slPriceOut.textContent = slPrice.toFixed(4)
tpPriceOut.textContent = tpPrice.toFixed(4)

/* PROP ENGINE */

const accountSize = toNum(accountSizeInput.value)
const dailyPct = toNum(dailyLossPctInput.value)
const maxPct = toNum(maxLossPctInput.value)
const todayPnl = toNum(todayPnlInput.value)
const totalPnL = toNum(totalPnLInput.value)

const equity = accountSize + totalPnL
const dailyLimit = equity * (dailyPct/100)
const overallLimit = accountSize * (maxPct/100)

const remainingDaily = dailyLimit + todayPnl
const remainingOverall = overallLimit + totalPnL

remainingDailyOut.textContent = remainingDaily.toFixed(2)
remainingOverallOut.textContent = remainingOverall.toFixed(2)

if(riskMoney>remainingDaily){
tradeStatusOut.textContent="BLOCKED ❌"
}else{
tradeStatusOut.textContent="OK ✅"
}

/* TRADE CHECK */

const afterTradeRemaining = remainingDaily - riskMoney
const usagePercent = (riskMoney/dailyLimit)*100
const maxRLeft = remainingDaily / riskMoney

dailyUsageOut.textContent = usagePercent.toFixed(1)+"%"
afterTradeDailyOut.textContent = afterTradeRemaining.toFixed(2)
maxRLeftOut.textContent = maxRLeft.toFixed(2)+" R"

if(riskMoney>remainingDaily){
canTakeDecisionOut.textContent="BLOCKED ❌"
}else{
canTakeDecisionOut.textContent="OK ✅"
}

}

/* AUTOBIND */
const balanceInput = document.getElementById("balance")
const riskPctInput = document.getElementById("riskPct")
const entryInput = document.getElementById("entry")
const slUnitsInput = document.getElementById("slUnits")
const tpUnitsInput = document.getElementById("tpUnits")
const valuePerUnitInput = document.getElementById("valuePerUnit")

const accountSizeInput = document.getElementById("accountSize")
const dailyLossPctInput = document.getElementById("dailyLossPct")
const maxLossPctInput = document.getElementById("maxLossPct")
const todayPnlInput = document.getElementById("todayPnl")
const totalPnLInput = document.getElementById("totalPnL")

const riskOut = document.getElementById("riskOut")
const lotsOut = document.getElementById("lotsOut")
const slUnitsOut = document.getElementById("slUnitsOut")
const tpUnitsOut = document.getElementById("tpUnitsOut")
const slPriceOut = document.getElementById("slPriceOut")
const tpPriceOut = document.getElementById("tpPriceOut")

const remainingDailyOut = document.getElementById("remainingDailyOut")
const remainingOverallOut = document.getElementById("remainingOverallOut")
const tradeStatusOut = document.getElementById("tradeStatusOut")

const dailyUsageOut = document.getElementById("dailyUsageOut")
const afterTradeDailyOut = document.getElementById("afterTradeDailyOut")
const maxRLeftOut = document.getElementById("maxRLeftOut")
const canTakeDecisionOut = document.getElementById("canTakeDecisionOut")

calculate()
