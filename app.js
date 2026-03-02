document.addEventListener("DOMContentLoaded", function () {

let proUnlocked = localStorage.getItem("proUnlocked") === "true";

const disciplineSection = document.getElementById("disciplineSection");
const disciplineBtn = document.getElementById("disciplineModeBtn");

if(proUnlocked){
    disciplineSection.classList.remove("lock");
    disciplineBtn.textContent = "Discipline";
}

document.getElementById("calcBtn").addEventListener("click", function(){

    const balance = parseFloat(document.getElementById("balance").value) || 0;
    const riskPct = parseFloat(document.getElementById("riskPct").value) || 0;
    const entry = parseFloat(document.getElementById("entry").value) || 0;
    const stopValue = parseFloat(document.getElementById("stopValue").value) || 0;

    const risk = balance * (riskPct / 100);

    const size = stopValue > 0 ? risk / stopValue : 0;

    document.getElementById("riskOut").textContent = risk.toFixed(2);
    document.getElementById("sizeOut").textContent = size.toFixed(2);

    if(proUnlocked){
        const dailyLimit = parseFloat(document.getElementById("dailyLimit").value) || 0;
        const todayPnL = parseFloat(document.getElementById("todayPnL").value) || 0;

        const remaining = dailyLimit + todayPnL;
        const trades = risk > 0 ? Math.floor(remaining / risk) : 0;

        document.getElementById("remainingDaily").textContent = remaining.toFixed(2);
        document.getElementById("tradesLeft").textContent = trades;
    }

});

document.getElementById("unlockBtn").addEventListener("click", function(){

    const code = document.getElementById("proCodeInput").value;

    if(code === "PROP2024"){
        localStorage.setItem("proUnlocked", "true");
        alert("Pro Unlocked!");
        location.reload();
    } else {
        alert("Invalid Code");
    }

});

});
