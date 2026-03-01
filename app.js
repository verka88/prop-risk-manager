function num(id) {
  const v = parseFloat(document.getElementById(id).value);
  return Number.isFinite(v) ? v : 0;
}

function fmt(x) {
  const ax = Math.abs(x);
  const d = ax >= 1000 ? 0 : ax >= 100 ? 2 : ax >= 1 ? 4 : 6;
  return x.toFixed(d);
}

function parsePair(pair) {
  return { base: pair.slice(0, 3), quote: pair.slice(3, 6) };
}

function getPipSize(pair) {
  return pair.endsWith("JPY") ? 0.01 : 0.0001;
}

function pipValueEurPerLot({ base, quote }, price, lotUnits, pipSize, quoteToEur) {
  const pipValueQuote = lotUnits * pipSize;

  if (quote === "EUR") {
    return pipValueQuote;
  }

  if (base === "EUR") {
    return pipValueQuote / price;
  }

  return pipValueQuote * quoteToEur;
}

function calc() {
  const startBalance = num("startBalance");
  const dailyPct = num("dailyPct");
  const maxPct = num("maxPct");
  const currentBalance = num("currentBalance");
  const todayPnl = num("todayPnl");

  const dailyLimit = startBalance * (dailyPct / 100);
  const maxLimit = startBalance * (maxPct / 100);

  const usedDaily = Math.max(0, -todayPnl);
  const remDaily = Math.max(0, dailyLimit - usedDaily);

  const drawdown = Math.max(0, startBalance - currentBalance);
  const remMax = Math.max(0, maxLimit - drawdown);

  const allowedRiskNow = Math.max(0, Math.min(remDaily, remMax));

  const pair = document.getElementById("pair").value;
  const { base, quote } = parsePair(pair);

  const dir = document.getElementById("dir").value;
  const entry = num("entry");
  const atr = num("atr");
  const atrMult = num("atrMult");
  const buffer = num("buffer");
  const r = num("r");
  const tpBuffer = num("tpBuffer");

  const riskPct = num("riskPct");
  const riskEur = currentBalance * (riskPct / 100);

  const lotUnits = Math.max(1, Math.round(num("lotUnits")));
  const quoteToEur = num("quoteToEur");

  const pipSize = getPipSize(pair);

  const stopDist = atr * atrMult + buffer;
  const stopPips = pipSize > 0 ? (stopDist / pipSize) : 0;

  const sl = dir === "LONG" ? entry - stopDist : entry + stopDist;
  const tp = dir === "LONG" ? entry + stopDist * r : entry - stopDist * r;
  const tpAdj = dir === "LONG" ? tp - tpBuffer : tp + tpBuffer;

  const pipValEur = pipValueEurPerLot({ base, quote }, entry, lotUnits, pipSize, quoteToEur);

  const denom = stopPips * pipValEur;
  const lotsRaw = denom > 0 ? (riskEur / denom) : 0;
  const lots = lotsRaw > 0 ? Math.floor(lotsRaw * 100) / 100 : 0;

  const tradesLeft = riskEur > 0 ? Math.floor(allowedRiskNow / riskEur) : 0;

  let status = "OK";
  let cls = "";

  if (allowedRiskNow <= 0) {
    status = "STOP: limit reached";
    cls = "bad";
  } else if (riskEur > allowedRiskNow) {
    status = "Risk je vyšší než povolený (zníž risk %)";
    cls = "warn";
  } else if (tradesLeft <= 0) {
    status = "Dnes už radšej neotvárať ďalší trade";
    cls = "warn";
  }

  document.getElementById("dailyLimit").textContent = fmt(dailyLimit);
  document.getElementById("maxLimit").textContent = fmt(maxLimit);
  document.getElementById("remDaily").textContent = fmt(remDaily);
  document.getElementById("remMax").textContent =
