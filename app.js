function num(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const v = parseFloat(el.value);
  return Number.isFinite(v) ? v : 0;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function fmtMoney(x) {
  if (!Number.isFinite(x)) return "-";
  return x.toFixed(2);
}

function fmtLots(x) {
  if (!Number.isFinite(x) || x <= 0) return "-";
  return x.toFixed(2);
}

function parsePair(pair) {
  const p = (pair || "").trim().toUpperCase();
  return { base: p.slice(0, 3), quote: p.slice(3, 6) };
}

function getPipSize(pair) {
  const p = (pair || "").toUpperCase();
  return p.endsWith("JPY") ? 0.01 : 0.0001;
}

/**
 * Pip value in EUR per 1.00 lot.
 * lotUnits: standard 100000
 * pipSize: 0.0001 (or 0.01 for JPY)
 *
 * pipValueQuote = lotUnits * pipSize (in quote currency)
 *
 * Account currency EUR:
 * - if quote == EUR => already EUR
 * - if base == EUR  => pipValueEUR = pipValueQuote / price   (e.g. EURUSD: $10 / 1.10 = €9.09)
 * - else            => need quote->EUR conversion (user input), pipValueEUR = pipValueQuote * quoteToEur
 */
function pipValueEurPerLot(pair, price, lotUnits, quoteToEur) {
  const { base, quote } = parsePair(pair);
  const pipSize = getPipSize(pair);
  const pipValueQuote = lotUnits * pipSize;

  if (quote === "EUR") return pipValueQuote;

  if (base === "EUR") {
    if (price <= 0) return 0;
    return pipValueQuote / price;
  }

  // EUR not in pair -> need user-provided conversion from quote currency to EUR
  return pipValueQuote * quoteToEur;
}

/**
 * Price move for N pips.
 */
function pipsToPrice(pair, pips) {
  return getPipSize(pair) * pips;
}

function calc() {
  // --- PROP MODE (optional outputs) ---
  const startBalance = num("startBalance") || 10000;
  const dailyPct = num("dailyPct") || 5;
  const maxPct = num("maxPct") || 10;
  const currentBalance = num("currentBalance") || startBalance;
  const todayPnl = num("todayPnl") || 0;

  const dailyLimit = startBalance * (dailyPct / 100);
  const maxLimit = startBalance * (maxPct / 100);

  const usedDaily = Math.max(0, -todayPnl);
  const remDaily = Math.max(0, dailyLimit - usedDaily);

  const drawdown = Math.max(0, startBalance - currentBalance);
  const remMax = Math.max(0, maxLimit - drawdown);

  const allowedRiskNow = Math.max(0, Math.min(remDaily, remMax));

  // --- TRADE INPUTS ---
  const pairEl = document.getElementById("pair");
  const pair = pairEl ? pairEl.value : "EURUSD";

  const dirEl = document.getElementById("dir");
  const dir = dirEl ? dirEl.value : "LONG";

  const riskPct = num("riskPct") || 0.5; // percent
  const entry = num("entry");
  const stopPips = num("stopPips");

  // Optional advanced inputs (if you later add them to HTML, this will start using them automatically)
  const r = num("r") || 2; // if you later add R field
  const tpBuffer = num("tpBuffer") || 0; // price buffer
  const quoteToEur = num("quoteToEur") || 0; // only needed when EUR not in pair
  const lotUnits = Math.max(1, Math.round(num("lotUnits") || 100000));

  // Risk per trade in EUR
  const riskEur = currentBalance * (riskPct / 100);

  // Pip value in EUR per 1.00 lot
  const pipValEur = pipValueEurPerLot(pair, entry, lotUnits, quoteToEur);

  // Lots = riskEUR / (stopPips * pipValueEUR_perLot)
  const denom = stopPips * pipValEur;
  const lotsRaw = denom > 0 ? (riskEur / denom) : 0;

  // round down to 0.01 lots
  const lots = lotsRaw > 0 ? Math.floor(lotsRaw * 100) / 100 : 0;

  // SL/TP prices (TP uses R if present; if r input missing, defaults 2R)
  const stopDistPrice = pipsToPrice(pair, stopPips);
  const sl = dir === "LONG" ? entry - stopDistPrice : entry + stopDistPrice;
  const tp = dir === "LONG"
    ? entry + stopDistPrice * r
    : entry - stopDistPrice * r;

  // TP buffer (if field exists)
  const tpAdj = dir === "LONG" ? tp - tpBuffer : tp + tpBuffer;

  // Trades left today estimate
  const tradesLeft = riskEur > 0 ? Math.floor(allowedRiskNow / riskEur) : 0;

  // --- OUTPUTS (only those that exist in your current HTML will show) ---
  setText("riskEur", fmtMoney(riskEur));
  setText("lots", fmtLots(lots));

  // If you later add these output fields to index.html, they will show automatically:
  setText("dailyLimit", fmtMoney(dailyLimit));
  setText("maxLimit", fmtMoney(maxLimit));
  setText("remDaily", fmtMoney(remDaily));
  setText("remMax", fmtMoney(remMax));
  setText("allowedRisk", fmtMoney(allowedRiskNow));
  setText("pipValueEur", fmtMoney(pipValEur));
  setText("sl", Number.isFinite(sl) ? sl.toString() : "-");
  setText("tp", Number.isFinite(tpAdj) ? tpAdj.toString() : "-");
  setText("tradesLeft", Number.isFinite(tradesLeft) ? String(tradesLeft) : "-");
}

document.addEventListener("DOMContentLoaded", () => {
  // button support
  const btn = document.getElementById("calcBtn");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      calc();
    });
  }

  // auto recalc when changing fields (if they exist)
  [
    "startBalance","dailyPct","maxPct","currentBalance","todayPnl",
    "pair","dir","riskPct","entry","stopPips",
    "r","tpBuffer","quoteToEur","lotUnits"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", calc);
      el.addEventListener("change", calc);
    }
  });

  // initial calc
  calc();
});
