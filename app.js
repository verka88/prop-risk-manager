document.addEventListener("DOMContentLoaded", function () {

  function calculate() {

    const balance = parseFloat(document.getElementById("currentBalance").value) || 0;
    const riskPct = parseFloat(document.getElementById("riskPct").value) || 0;
    const entry = parseFloat(document.getElementById("entry").value) || 0;
    const stopPips = parseFloat(document.getElementById("stopPips").value) || 0;
    const pair = document.getElementById("pair").value;

    const riskEur = balance * (riskPct / 100);

    const pipSize = pair.endsWith("JPY") ? 0.01 : 0.0001;

    let pipValuePerLot = 10;

    if (pair === "EURUSD") {
      pipValuePerLot = 10 / entry;
    }

    if (pair.endsWith("JPY")) {
      pipValuePerLot = (100000 * pipSize) / entry;
    }

    const lotsRaw = stopPips > 0 ? riskEur / (stopPips * pipValuePerLot) : 0;
    const lots = Math.floor(lotsRaw * 100) / 100;

    document.getElementById("riskEur").textContent = riskEur.toFixed(2);
    document.getElementById("lots").textContent = lots.toFixed(2);
  }

  const btn = document.getElementById("calcBtn");

  btn.addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("clickStatus").textContent =
      "Clicked ✅ " + new Date().toLocaleTimeString();
    calculate();
  });

});
