document.addEventListener("DOMContentLoaded", () => {
  // --------- PRO unlock (simple MVP) ----------
  const PRO_CODE = "PROP2024";
  let proUnlocked = localStorage.getItem("proUnlocked") === "true";

  const $ = (id) => document.getElementById(id);
  const proControls = $("proControls");
  const disciplineBtn = $("disciplineModeBtn");

  function setProUI() {
    if (proUnlocked) {
      proControls.style.opacity = "1";
      proControls.style.pointerEvents = "auto";
      disciplineBtn.textContent = "Discipline";
    } else {
      proControls.style.opacity = "0.55";
      proControls.style.pointerEvents = "none";
      disciplineBtn.textContent = "Discipline 🔒";
    }
  }
  setProUI();

  $("unlockBtn").addEventListener("click", () => {
    const code = ($("proCodeInput").value || "").trim();
    if (code === PRO_CODE) {
      proUnlocked = true;
      localStorage.setItem("proUnlocked", "true");
      $("clickStatus").textContent = "Pro unlocked ✅";
      setProUI();
      calculate();
    } else {
      alert("Invalid code");
    }
  });

  // --------- MODE switch (UI only) ----------
  $("quickModeBtn").addEventListener("click", () => {
    $("quickModeBtn").classList.add("active");
    $("disciplineModeBtn").classList.remove("active");
  });
  $("disciplineModeBtn").addEventListener("click", () => {
    $("disciplineModeBtn").classList.add("active");
    $("quickModeBtn").classList.remove("active");
  });

  // --------- SYMBOL DATABASE (editable defaults) ----------
  // valuePerUnit is in EUR per 1 unit (pip/tick/point) at 1.00 lot.
  // These are reasonable defaults; user can override per symbol.
  const symbols = {
    // FX (USD quote) -> typical EUR account pip value around 9-ish depending on EURUSD
    "EURUSD": { asset: "FX", unitName: "pips", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
    "GBPUSD": { asset: "FX", unitName: "pips", unitSize: 0.0001, valuePerUnit: 9.0, lotStep: 0.01 },
    "USDJPY": { asset: "FX", unitName: "pips", unitSize: 0.01,   valuePerUnit: 7.0, lotStep: 0.01 },

    // Gold (very broker-dependent) – keep editable
    // If XAUUSD $1 move per 1 lot ≈ $100 and EURUSD ~1.10 => ~€90.9 per $1
    "XAUUSD": { asset: "Gold", unitName: "ticks", unitSize: 0.01, valuePerUnit: 0.91, lotStep: 0.01, note: "ticks here = $0.01; value per tick depends on contract" },

    // Crypto (broker-dependent). If 1 lot = 1 BTC and tick = $1 then value per tick ~ $1 => ~€0.9
    "BTCUSD": { asset: "Crypto", unitName: "ticks", unitSize: 1, valuePerUnit: 0.90, lotStep: 0.001 },
    "ETHUSD": { asset: "Crypto", unitName: "ticks", unitSize: 0.1, valuePerUnit: 0.09, lotStep: 0.01 },

    // Indices (examples; must be set to your contract)
    "NAS100": { asset: "Index", unitName: "points", unitSize: 1, valuePerUnit: 0.90, lotStep: 0.01 },
    "US30":   { asset: "Index", unitName: "points", unitSize: 1, valuePerUnit: 0.90, lotStep: 0.01 },
    "DE40":   { asset: "Index", unitName: "points", unitSize: 1, valuePerUnit: 1.00, lotStep: 0.01 }
  };

  // Populate dropdown
  const symbolSelect = $("symbol");
  Object.keys(symbols).forEach((k) => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${k} (${symbols[k].asset})`;
    symbolSelect.appendChild(opt);
  });
  symbolSelect.value = "EURUSD";

  function n(id) {
    const v = parseFloat($(id)?.value);
    return Number.isFinite(v) ? v : 0;
  }
  function fmt2(x) { return Number.isFinite(x) ? x.toFixed(2) : "-"; }
  function fmtPrice(x) {
    if (!Number.isFinite(x)) return "-";
    const ax = Math.abs(x);
    const d = ax >= 100 ? 2 : ax >= 1 ? 4 : 6;
    return x.toFixed(d);
  }
  function roundDownStep(value, step) {
    if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return 0;
    return Math.floor(value / step) * step;
  }

  function applySymbolDefaults(sym) {
    const cfg = symbols[sym];
    if (!cfg) return;

    $("slUnitsLabel").textContent = `SL distance (${cfg.unitName})`;
    $("unitsHint").textContent = `Units = ${cfg.unitName}. You can override any field below.`;
    $("unitSize").value = cfg.unitSize;
    $("valuePerUnit").value = cfg.valuePerUnit;
    $("lotStep").value = cfg.lotStep;
  }

  $("symbol").addEventListener("change", () => {
    applySymbolDefaults($("symbol").value);
    calculate();
  });

  function calculate() {
    const sym = $("symbol").value;
    const cfg = symbols[sym];

    const balance = n("balance");
    const riskPct = n("riskPct");
    const entry = n("entry");
    const slUnits = n("slUnits");
    const rr = n("rr");
    const unitSize = n("unitSize");
    const valuePerUnit = n("valuePerUnit");
    const lotStep = n("lotStep");
    const tpBuffer = n("tpBuffer");
    const dir = $("direction").value;

    const riskMoney = balance * (riskPct / 100);
    const lossPerLot = slUnits * valuePerUnit;

    const lotsRaw = lossPerLot > 0 ? (riskMoney / lossPerLot) : 0;
    const lots = roundDownStep(lotsRaw, lotStep);

    // price distances
    const slPriceDist = slUnits * unitSize;
    const slPrice = dir === "LONG" ? entry - slPriceDist : entry + slPriceDist;
    const tpDist = slPriceDist * rr;
    const tpBase = dir === "LONG" ? entry + tpDist : entry - tpDist;
    const tpPrice = dir === "LONG" ? tpBase - tpBuffer : tpBase + tpBuffer;

    $("riskOut").textContent = fmt2(riskMoney);
    $("lossPerLotOut").textContent = fmt2(lossPerLot);
    $("lotsOut").textContent = lots > 0 ? lots.toFixed(3).replace(/0+$/,'').replace(/\.$/,'') : "-";
    $("slPriceOut").textContent = fmtPrice(slPrice);
    $("tpPriceOut").textContent = fmtPrice(tpPrice);

    // Discipline (Pro)
    if (proUnlocked) {
      const dailyLimit = n("dailyLimit");
      const todayPnl = n("todayPnl");
      const remaining = dailyLimit + todayPnl;
      $("remainingDaily").textContent = fmt2(remaining);
      const tradesLeft = riskMoney > 0 ? Math.max(0, Math.floor(remaining / riskMoney)) : 0;
      $("tradesLeft").textContent = String(tradesLeft);
    } else {
      $("remainingDaily").textContent = "-";
      $("tradesLeft").textContent = "-";
    }

    $("clickStatus").textContent = `Calculated ✅ (${sym}${cfg?.asset ? " / " + cfg.asset : ""})`;
  }

  $("calcBtn").addEventListener("click", (e) => {
    e.preventDefault();
    calculate();
  });

  // Auto-calc on input changes
  ["balance","riskPct","entry","slUnits","rr","unitSize","valuePerUnit","lotStep","tpBuffer","direction","dailyLimit","todayPnl"]
    .forEach(id => $(id).addEventListener("input", calculate));

  // Init
  applySymbolDefaults("EURUSD");
  calculate();
});
