<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PropEngine - Prop Firm Risk Tool</title>

  <style>
    :root {
      --bg: #0a0d14;
      --panel: #111622;
      --panel-2: #161c2b;
      --line: #25304a;
      --soft-line: #1b2335;
      --text: #f3f6ff;
      --muted: #9aa6c7;
      --green: #22c55e;
      --red: #ef4444;
      --orange: #f59e0b;
      --blue: #4f7cff;
      --blue-2: #7aa2ff;
      --shadow: 0 16px 40px rgba(0,0,0,.32);
      --radius: 20px;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: var(--text);
      font-family: Inter, Arial, system-ui, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(79,124,255,.18), transparent 32%),
        radial-gradient(circle at top right, rgba(34,197,94,.08), transparent 22%),
        linear-gradient(180deg, #090c13 0%, #0b1018 100%);
    }

    .wrap {
      max-width: 1180px;
      margin: 0 auto;
      padding: 22px 16px 50px;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      margin-bottom: 18px;
      flex-wrap: wrap;
    }

    .brandTitle {
      margin: 0;
      font-size: 34px;
      line-height: 1;
      letter-spacing: -0.03em;
      font-weight: 800;
    }

    .brandSub {
      margin-top: 8px;
      color: var(--muted);
      font-size: 13px;
    }

    .topbarRight {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 999px;
      font-size: 12px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,.03);
      color: #dbe4ff;
      white-space: nowrap;
    }

    .pill.pro {
      border-color: rgba(79,124,255,.55);
      background: rgba(79,124,255,.13);
      color: #cddcff;
    }

    .pill.trial {
      border-color: rgba(245,158,11,.45);
      background: rgba(245,158,11,.12);
      color: #ffe1a3;
    }

    .pill.free {
      border-color: rgba(255,255,255,.1);
      background: rgba(255,255,255,.04);
      color: #cfd7ea;
    }

    .modeSwitch {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }

    .modeBtn {
      width: 100%;
      padding: 13px 14px;
      border-radius: 16px;
      border: 1px solid var(--line);
      background: linear-gradient(180deg, #171e2e 0%, #121826 100%);
      color: var(--text);
      font-weight: 700;
      cursor: pointer;
      transition: .18s ease;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.03);
    }

    .modeBtn:hover {
      transform: translateY(-1px);
      border-color: #3b4b73;
    }

    .modeBtn.active {
      background: linear-gradient(180deg, rgba(79,124,255,.28) 0%, rgba(79,124,255,.14) 100%);
      border-color: rgba(79,124,255,.55);
    }

    .dashboard {
      display: grid;
      grid-template-columns: 1.1fr 1.1fr .8fr .8fr;
      gap: 12px;
      margin-bottom: 14px;
    }

    .statCard {
      background: linear-gradient(180deg, rgba(20,27,40,.98) 0%, rgba(16,22,34,.98) 100%);
      border: 1px solid var(--soft-line);
      border-radius: 18px;
      padding: 16px;
      box-shadow: var(--shadow);
    }

    .statLabel {
      color: var(--muted);
      font-size: 12px;
      margin-bottom: 8px;
    }

    .statValue {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .statHint {
      margin-top: 8px;
      color: var(--muted);
      font-size: 12px;
    }

    .layout {
      display: grid;
      grid-template-columns: 1.18fr .82fr;
      gap: 14px;
      align-items: start;
    }

    .stack {
      display: grid;
      gap: 14px;
    }

    .card {
      background: linear-gradient(180deg, rgba(17,22,34,.98) 0%, rgba(13,18,28,.98) 100%);
      border: 1px solid var(--soft-line);
      border-radius: var(--radius);
      padding: 18px;
      box-shadow: var(--shadow);
      overflow: visible;
      position: relative;
      z-index: 1;
    }

    .sectionTitle {
      margin: 0 0 6px;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .sectionSub {
      color: var(--muted);
      font-size: 12px;
      margin-bottom: 14px;
      line-height: 1.45;
    }

    .grid2, .grid3, .grid4 {
      display: grid;
      gap: 12px;
    }

    .grid2 { grid-template-columns: 1fr 1fr; }
    .grid3 { grid-template-columns: 1fr 1fr 1fr; }
    .grid4 { grid-template-columns: 1fr 1fr 1fr 1fr; }

    label {
      display: block;
      margin: 0 0 7px;
      font-size: 12px;
      color: #dbe4ff;
      font-weight: 600;
    }

    input, select, button {
      font: inherit;
    }

    input,
    select {
      width: 100%;
      padding: 13px 14px;
      border-radius: 16px;
      border: 1px solid #2c3958;
      background: linear-gradient(180deg, #121928 0%, #0f1521 100%);
      color: var(--text);
      outline: none;
      transition: .16s ease;
      pointer-events: auto;
      position: relative;
      z-index: 2;
    }

    input:focus,
    select:focus {
      border-color: rgba(79,124,255,.75);
      box-shadow: 0 0 0 3px rgba(79,124,255,.12);
    }

    button {
      width: 100%;
      padding: 13px 14px;
      border-radius: 16px;
      border: 1px solid #35508a;
      background: linear-gradient(180deg, #50d7ff 0%, #71b7ff 100%);
      color: #09111d;
      font-weight: 800;
      cursor: pointer;
      transition: .18s ease;
      pointer-events: auto;
      position: relative;
      z-index: 2;
    }

    button:hover {
      transform: translateY(-1px);
      filter: brightness(1.03);
    }

    button.secondary {
      background: linear-gradient(180deg, #1b2332 0%, #121926 100%);
      color: var(--text);
      border-color: #2f3b59;
    }

    button:disabled {
      opacity: .55;
      cursor: not-allowed;
      transform: none;
    }

    .tiny {
      margin-top: 6px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.45;
    }

    .divider {
      height: 1px;
      background: var(--soft-line);
      margin: 16px 0;
    }

    .row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 11px 0;
      border-bottom: 1px solid var(--soft-line);
      align-items: center;
    }

    .row:last-child {
      border-bottom: 0;
    }

    .muted {
      color: var(--muted);
    }

    .ok {
      color: var(--green);
      font-weight: 800;
    }

    .warn {
      color: var(--orange);
      font-weight: 800;
    }

    .bad {
      color: var(--red);
      font-weight: 800;
    }

    .hidden {
      display: none !important;
    }

    .btnRow {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .rightSticky {
      position: sticky;
      top: 16px;
    }

    .premiumBox {
      border: 1px dashed rgba(79,124,255,.45);
      border-radius: 16px;
      padding: 14px;
      background: rgba(79,124,255,.08);
    }

    .premiumBox h4 {
      margin: 0 0 8px;
      font-size: 14px;
    }

    .premiumBox p {
      margin: 0 0 12px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }

    /* dropdown visibility fix */
    select option {
      color: #111827;
      background: #ffffff;
    }

    @media (max-width: 1020px) {
      .dashboard {
        grid-template-columns: 1fr 1fr;
      }

      .layout {
        grid-template-columns: 1fr;
      }

      .rightSticky {
        position: static;
      }
    }

    @media (max-width: 760px) {
      .grid2,
      .grid3,
      .grid4,
      .btnRow,
      .modeSwitch,
      .dashboard {
        grid-template-columns: 1fr;
      }

      .brandTitle {
        font-size: 28px;
      }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="topbar">
      <div>
        <h1 class="brandTitle">PropEngine</h1>
        <div class="brandSub">Prop Firm Risk, Discipline &amp; Decision Dashboard</div>
      </div>
      <div class="topbarRight">
        <span id="planBadge" class="pill free">Free Plan</span>
        <button id="upgradeBtnSecondary" style="width:auto; min-width:140px;">Upgrade</button>
      </div>
    </div>

    <div class="dashboard">
      <div class="statCard">
        <div class="statLabel">Risk</div>
        <div id="riskOut" class="statValue">-</div>
        <div class="statHint">Current trade risk in EUR</div>
      </div>

      <div class="statCard">
        <div class="statLabel">Position Size</div>
        <div id="lotsOut" class="statValue">-</div>
        <div class="statHint">Calculated lot size</div>
      </div>

      <div class="statCard">
        <div class="statLabel">Daily Room</div>
        <div id="remainingDailyOut" class="statValue">-</div>
        <div class="statHint">Premium challenge metric</div>
      </div>

      <div class="statCard">
        <div class="statLabel">Decision</div>
        <div id="decisionOut" class="statValue">-</div>
        <div class="statHint">Premium trade approval</div>
      </div>
    </div>

    <div class="modeSwitch">
      <button id="quickModeBtn" type="button" class="modeBtn active">Quick</button>
      <button id="disciplineModeBtn" type="button" class="modeBtn">Discipline 🔒</button>
    </div>

    <div class="layout">
      <div class="stack">
        <div class="card">
          <h3 class="sectionTitle">Account</h3>
          <div class="sectionSub">Create account to activate Trial and unlock premium tools</div>

          <div id="authSignedOut">
            <div class="grid2">
              <div>
                <label>Email</label>
                <input id="email" type="email" placeholder="you@email.com">
              </div>
              <div>
                <label>Password</label>
                <input id="password" type="password" placeholder="min. 6 chars">
              </div>
            </div>

            <div class="grid2" style="margin-top:12px;">
              <button id="signUpBtn" type="button">Create account</button>
              <button id="signInBtn" type="button" class="secondary">Sign in</button>
            </div>

            <div style="margin-top:12px;">
              <button id="helpBtn" type="button" class="secondary">Help</button>
            </div>
          </div>

          <div id="authSignedIn" class="hidden">
            <div class="row">
              <div id="userStatus">Signed in</div>
              <button id="signOutBtn" type="button" class="secondary" style="max-width:180px;">Sign out</button>
            </div>

            <div id="trialBanner" class="tiny" style="margin-top:10px;"></div>

            <div class="grid2" style="margin-top:12px;">
              <button id="startTrialBtn" type="button" class="secondary">Start Trial</button>
              <button id="upgradeBtn" type="button">Upgrade</button>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="sectionTitle">Quick Calculator</h3>
          <div class="sectionSub">Manual mode is free. Zone mode is premium.</div>

          <div class="modeSwitch">
            <button id="manualCalcModeBtn" type="button" class="modeBtn active">Manual mode</button>
            <button id="zoneCalcModeBtn" type="button" class="modeBtn">Zone mode</button>
          </div>

          <div class="grid3">
            <div>
              <label>Symbol</label>
              <input id="symbolSearch" type="text" placeholder="Search symbol..." style="margin-bottom:10px;">
              <select id="symbol"></select>

              <div style="margin-top:10px;">
                <button id="showAddSymbol" type="button" class="secondary">+ Add Custom Symbol</button>
              </div>

              <div id="addSymbolBox" class="hidden" style="margin-top:10px;">
                <input id="customSymbolName" placeholder="Symbol name" style="margin-bottom:8px;">
                <input id="customUnitSize" placeholder="Unit size" style="margin-bottom:8px;">
                <input id="customValuePerUnit" placeholder="Value per unit @1 lot" style="margin-bottom:8px;">
                <input id="customLotStep" placeholder="Lot step" style="margin-bottom:8px;">
                <button id="addSymbolBtn" type="button">Save Symbol</button>
              </div>
            </div>

            <div>
              <label>Direction</label>
              <select id="direction">
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </div>

            <div>
              <label>RR (if TP empty)</label>
              <input id="rr" type="text" inputmode="decimal" value="2">
              <div class="tiny">Comma decimals supported</div>
            </div>
          </div>

          <div class="grid3" style="margin-top:12px;">
            <div>
              <label>Balance (EUR)</label>
              <input id="balance" type="text" inputmode="decimal" value="10000">
            </div>
            <div>
              <label>Risk %</label>
              <input id="riskPct" type="text" inputmode="decimal" value="0,5">
            </div>
            <div>
              <label>Entry price</label>
              <input id="entry" type="text" inputmode="decimal" value="1,10000">
            </div>
          </div>

          <div id="manualModeFields" style="margin-top:12px;">
            <div class="grid3">
              <div>
                <label id="slUnitsLabel">SL (pips)</label>
                <input id="slUnits" type="text" inputmode="decimal" value="15">
                <div class="tiny">Example: 15 units</div>
              </div>
              <div>
                <label id="tpUnitsLabel">TP (pips)</label>
                <input id="tpUnits" type="text" inputmode="decimal" value="">
                <div class="tiny">Leave empty → uses RR</div>
              </div>
              <div>
                <label>TP buffer (pips/ticks)</label>
                <input id="tpBuffer" type="text" inputmode="decimal" value="0">
                <div class="tiny">Optional</div>
              </div>
            </div>
          </div>

          <div id="zoneModeFields" class="hidden" style="margin-top:12px;">
            <div class="grid4">
              <div>
                <label>Zone top</label>
                <input id="zoneTop" type="text" inputmode="decimal">
              </div>
              <div>
                <label>Zone bottom</label>
                <input id="zoneBottom" type="text" inputmode="decimal">
              </div>
              <div>
                <label>Zone size (units)</label>
                <input id="zoneSize" type="text" readonly>
              </div>
              <div>
                <label>Buffer (units)</label>
                <input id="zoneBuffer" type="text" inputmode="decimal" value="2">
              </div>
            </div>

            <div class="grid3" style="margin-top:12px;">
              <div>
                <label>Computed SL (units)</label>
                <input id="zoneSlUnits" type="text" readonly>
              </div>
              <div>
                <label>TP1 (1R)</label>
                <input id="zoneTp1Units" type="text" readonly>
              </div>
              <div>
                <label>TP2 (2R)</label>
                <input id="zoneTp2Units" type="text" readonly>
              </div>
            </div>
          </div>

          <div class="grid3" style="margin-top:12px;">
            <div>
              <label>Unit size (pip/tick)</label>
              <input id="unitSize" type="text" inputmode="decimal" value="0,0001">
              <div class="tiny">Editable override</div>
            </div>
            <div>
              <label>Value per unit @ 1 lot (EUR)</label>
              <input id="valuePerUnit" type="text" inputmode="decimal" value="10">
              <div class="tiny">Most important for accuracy</div>
            </div>
            <div>
              <label>Lot step</label>
              <input id="lotStep" type="text" inputmode="decimal" value="0,01">
            </div>
          </div>

          <div class="grid2" style="margin-top:14px;">
            <button id="calcBtn" type="button">Calculate</button>
            <button id="canTakeBtn" type="button" class="secondary">Can I take this trade? (Pro)</button>
          </div>

          <div id="clickStatus" class="tiny" style="margin-top:10px;"></div>
        </div>

        <div id="lockCard" class="card">
          <h3 class="sectionTitle">Loss-streak lock</h3>
          <div class="sectionSub">Cooldown after consecutive losses</div>

          <div class="grid3">
            <div>
              <label>Max loss streak</label>
              <input id="maxStreak" type="text" inputmode="numeric" value="3">
            </div>
            <div>
              <label>Cooldown (minutes)</label>
              <input id="cooldownMin" type="text" inputmode="numeric" value="120">
            </div>
            <div>
              <label>Current streak</label>
              <input id="streakNow" type="text" inputmode="numeric" value="0">
            </div>
          </div>

          <div class="grid3" style="margin-top:12px;">
            <button id="winBtn" type="button">Win ✅ (reset)</button>
            <button id="lossBtn" type="button" class="secondary">Loss ❌ (+1)</button>
            <button id="resetLockBtn" type="button" class="secondary">Reset lock</button>
          </div>

          <div style="margin-top:12px;">
            Status: <span id="lockStatus" class="warn">Pro required</span>
            <div id="lockHint" class="tiny"></div>
          </div>
        </div>

        <div class="card">
          <h3 class="sectionTitle">Results</h3>

          <div class="row"><div>Risk (EUR)</div><div id="riskOut_dup">-</div></div>
          <div class="row"><div>Loss per 1 lot (EUR)</div><div id="lossPerLotOut">-</div></div>
          <div class="row"><div>Position size (lots)</div><div id="lotsOut_dup">-</div></div>
          <div class="row"><div>SL distance (units)</div><div id="slUnitsOut">-</div></div>
          <div class="row"><div>TP distance (units)</div><div id="tpUnitsOut">-</div></div>
          <div class="row"><div>SL price</div><div id="slPriceOut">-</div></div>
          <div class="row"><div>TP price</div><div id="tpPriceOut">-</div></div>

          <div class="divider"></div>

          <div class="row"><div>Total lot</div><div id="totalLotOut">-</div></div>
          <div class="row"><div>Lot 1 (TP1)</div><div id="lot1Out">-</div></div>
          <div class="row"><div>Lot 2 (TP2)</div><div id="lot2Out">-</div></div>
          <div class="row"><div>TP1 price</div><div id="tp1PriceOut">-</div></div>
          <div class="row"><div>TP2 price</div><div id="tp2PriceOut">-</div></div>
          <div class="row"><div>Break-even after TP1</div><div id="beAfterTp1Out">-</div></div>

          <div class="divider"></div>

          <div class="row"><div>Decision</div><div id="decisionOut_dup">-</div></div>
        </div>
      </div>

      <div class="stack rightSticky">
        <div id="premiumUpsell" class="card">
          <div class="premiumBox">
            <h4>Unlock Trial / Pro</h4>
            <p>Zone mode, split TP, challenge engine, reality check, discipline tools and custom symbols are premium features.</p>
            <button id="upgradeBtnSecondary2" type="button">Upgrade now</button>
          </div>
        </div>

        <div id="realityCard" class="card">
          <h3 class="sectionTitle">Pre-trade reality check</h3>
          <div class="sectionSub">See the real impact of the trade before you enter</div>

          <div class="row"><div>If SL hits → new balance</div><div id="balanceAfterSlOut">-</div></div>
          <div class="row"><div>If TP1 hits → profit</div><div id="profitTp1Out">-</div></div>
          <div class="row"><div>If TP2 hits → profit</div><div id="profitTp2Out">-</div></div>
          <div class="row"><div>This trade uses % of remaining daily limit</div><div id="dailyUsePctOut">-</div></div>
          <div class="row"><div>Reality check</div><div id="realityCheckOut">-</div></div>
        </div>

        <div id="challengeCard" class="card">
          <h3 class="sectionTitle">Prop Challenge Engine</h3>
          <div class="sectionSub">Challenge limits and remaining room</div>

          <div class="btnRow" style="margin-bottom:12px;">
            <button id="presetChallenge10K" type="button" class="secondary">Challenge 10K</button>
            <button id="presetChallenge25K" type="button" class="secondary">Challenge 25K</button>
            <button id="presetChallenge50K" type="button" class="secondary">Challenge 50K</button>
            <button id="presetChallenge100K" type="button" class="secondary">Challenge 100K</button>
          </div>

          <div class="grid3">
            <div>
              <label>Account size (EUR)</label>
              <input id="accountSize" type="text" inputmode="decimal" value="10000">
            </div>
            <div>
              <label>Daily loss %</label>
              <input id="dailyLossPct" type="text" inputmode="decimal" value="5">
            </div>
            <div>
              <label>Max loss %</label>
              <input id="maxLossPct" type="text" inputmode="decimal" value="10">
            </div>
          </div>

          <div class="grid2" style="margin-top:12px;">
            <div>
              <label>Today PnL (EUR)</label>
              <input id="todayPnl" type="text" inputmode="decimal" value="0">
            </div>
            <div>
              <label>Total PnL (EUR)</label>
              <input id="totalPnL" type="text" inputmode="decimal" value="0">
            </div>
          </div>

          <div class="divider"></div>

          <div class="row"><div>Remaining Daily (EUR)</div><div id="remainingDailyOut_dup">-</div></div>
          <div class="row"><div>Remaining Overall (EUR)</div><div id="remainingOverallOut">-</div></div>
          <div class="row"><div>Trade Status</div><div id="tradeStatusOut">-</div></div>
        </div>
      </div>
    </div>
  </div>

  <script src="app.js?v=728"></script>
</body>
</html>
