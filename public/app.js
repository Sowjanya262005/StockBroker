// app.js
// Frontend for NeoBroker Live Desk
// Uses existing Socket.IO events: 'login', 'loginSuccess', 'subscribeUpdate', 'initialPrices', 'priceUpdate'

document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  // ---------- DOM REFS ----------
  const loginSection = document.getElementById("login-section");
  const loginForm = document.getElementById("login-form");
  const emailInput = document.getElementById("email-input");
  const loginWrapper = document.getElementById("login-wrapper");
  const appShell = document.getElementById("app-shell");


  const sidebarDashboard = document.getElementById("sidebar-dashboard");
  const dashboard = document.getElementById("dashboard");

  const userEmailSpan = document.getElementById("user-email");
  const userAvatar = document.getElementById("user-avatar");

  const tickerFilters = document.getElementById("ticker-filters");
  const tickerCardsContainer = document.getElementById("ticker-cards");

  const equityValue = document.getElementById("equity-value");
  const equityChange = document.getElementById("equity-change");
  const cashValue = document.getElementById("cash-value");

  const activityLog = document.getElementById("activity-log");
  const themeToggleBtn = document.getElementById("theme-toggle");
  const logoutBtn = document.getElementById("logout-btn");

  // Order / portfolio
  const orderForm = document.getElementById("order-form");
  const orderTickerSelect = document.getElementById("order-ticker");
  const orderQtyInput = document.getElementById("order-qty");
  const buyBtn = document.getElementById("buy-btn");
  const sellBtn = document.getElementById("sell-btn");
  const holdingsBody = document.getElementById("holdings-body");

  // ---------- STATE ----------
  const initialCash = 100000;
  const portfolio = {
    cash: initialCash,
    holdings: {}, // { TICKER: { qty, avgPrice } }
  };

  const lastPrices = {}; // latest price by ticker
  const tickerCharts = {}; // { TICKER: { history: number[], canvas } }
  let supportedTickers = [];

  // ---------- HELPERS ----------

  function formatCurrency(num) {
    if (isNaN(num)) return "₹0";
    return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  function formatPercent(num) {
    if (isNaN(num)) return "0.00%";
    return (num >= 0 ? "+" : "") + num.toFixed(2) + "%";
  }

  function addActivity(message) {
    const li = document.createElement("li");
    const time = new Date().toLocaleTimeString();
    li.textContent = `[${time}] ${message}`;
    activityLog.prepend(li);
    // Keep only last 20
    while (activityLog.children.length > 20) {
      activityLog.removeChild(activityLog.lastChild);
    }
  }

  function updateAvatar(email) {
    if (!email) return;
    const namePart = email.split("@")[0];
    const initials = namePart
      .split(/[._-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");
    userAvatar.textContent = initials || "NB";
  }

  // Theme toggle
  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("light");
  });

  // Logout: go back to login screen, reset state
  logoutBtn.addEventListener("click", () => {
    addActivity("Logging out...");
    // Optional: disconnect socket and reload page for clean reset
    socket.disconnect();
    window.location.reload();
  });

  // ---------- SOCKET HANDLERS ----------

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) {
      addActivity("Please enter a valid email to login.");
      return;
    }
    socket.emit("login", email);
    addActivity("Attempting login...");
  });

  socket.on("loginSuccess", (payload) => {
    const { email, supportedTickers: tickers } = payload;
    supportedTickers = tickers || [];
        // Hide full-screen login and show main app layout
    if (loginWrapper) loginWrapper.style.display = "none";
    if (appShell) appShell.classList.remove("hidden");


    // Swap UI from login to dashboard
    loginSection.classList.add("hidden");
    sidebarDashboard.classList.remove("hidden");
    dashboard.classList.remove("hidden");

    userEmailSpan.textContent = email;
    updateAvatar(email);

    addActivity(`Logged in as ${email}`);
    renderTickerFilters();
    renderOrderTickerOptions();

    // By default subscribe to all tickers
    sendSubscriptions();
  });

  socket.on("initialPrices", (prices) => {
    prices.forEach((p) => {
      lastPrices[p.ticker] = p.price;
      upsertTickerCard(p);
    });
    recalcPortfolio();
  });

  socket.on("priceUpdate", (updates) => {
    updates.forEach((u) => {
      lastPrices[u.ticker] = u.price;
      upsertTickerCard(u);
    });
    recalcPortfolio();
  });

  // ---------- WATCHLIST (SUBSCRIPTIONS) ----------

  function renderTickerFilters() {
    tickerFilters.innerHTML = "";
    supportedTickers.forEach((ticker) => {
      const label = document.createElement("label");
      label.className = "ticker-pill active";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.value = ticker;

      const span = document.createElement("span");
      span.textContent = ticker;

      checkbox.addEventListener("change", () => {
        label.classList.toggle("active", checkbox.checked);
        sendSubscriptions();
      });

      label.appendChild(checkbox);
      label.appendChild(span);
      tickerFilters.appendChild(label);
    });
  }

  function sendSubscriptions() {
    const chosen = Array.from(
      tickerFilters.querySelectorAll("input[type=checkbox]")
    )
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    socket.emit("subscribeUpdate", chosen);
    addActivity(
      chosen.length
        ? `Subscribed to: ${chosen.join(", ")}`
        : "No tickers selected."
    );
  }

  // ---------- TICKER CARDS & SPARKLINES ----------

  function upsertTickerCard(data) {
    const { ticker, price, trend, timestamp } = data;
    let card = tickerCardsContainer.querySelector(
      `[data-ticker="${ticker}"]`
    );

    if (!card) {
      card = document.createElement("article");
      card.className = "ticker-card";
      card.dataset.ticker = ticker;
      card.innerHTML = `
        <div class="ticker-header">
          <div class="ticker-symbol">${ticker}</div>
          <div class="ticker-time" data-time></div>
        </div>
        <div class="ticker-price-row">
          <div class="ticker-price" data-price>0.00</div>
          <div class="ticker-change" data-change>0.00% • 0.00</div>
        </div>
        <canvas class="sparkline" height="40"></canvas>
      `;
      tickerCardsContainer.appendChild(card);

      // Initialise chart state
      const canvas = card.querySelector("canvas");
      tickerCharts[ticker] = { history: [], canvas };
      // Set width explicitly to avoid blur
      canvas.width = canvas.clientWidth;
    }

    const priceEl = card.querySelector("[data-price]");
    const timeEl = card.querySelector("[data-time]");
    const changeEl = card.querySelector("[data-change]");

    const prevPrice = tickerCharts[ticker].history.at(-1) ?? price;
    const absChange = price - prevPrice;
    const pctChange = prevPrice ? (absChange / prevPrice) * 100 : 0;

    priceEl.textContent = price.toFixed(2);
    timeEl.textContent = timestamp || new Date().toLocaleTimeString();

    const changeText = `${formatPercent(pctChange)} • ${absChange.toFixed(2)}`;
    changeEl.textContent = changeText;
    changeEl.classList.remove("up", "down");
    if (pctChange > 0.01) changeEl.classList.add("up");
    else if (pctChange < -0.01) changeEl.classList.add("down");

    // Update history + chart
    const chartState = tickerCharts[ticker];
    chartState.history.push(price);
    if (chartState.history.length > 40) {
      chartState.history.shift();
    }
    drawSparkline(chartState.canvas, chartState.history);
  }

  function drawSparkline(canvas, history) {
    if (!canvas || history.length < 2) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min || 1;

    ctx.clearRect(0, 0, width, height);

    ctx.beginPath();
    history.forEach((val, idx) => {
      const x = (idx / (history.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "#4ade80";
    ctx.stroke();

    // Small gradient fill
    const grd = ctx.createLinearGradient(0, 0, 0, height);
    grd.addColorStop(0, "rgba(74, 222, 128, 0.32)");
    grd.addColorStop(1, "rgba(15, 23, 42, 0.0)");
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = grd;
    ctx.fill();
  }

  // ---------- PORTFOLIO / ORDERS ----------

  function renderOrderTickerOptions() {
    orderTickerSelect.innerHTML = "";
    supportedTickers.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      orderTickerSelect.appendChild(opt);
    });
  }

  function recalcPortfolio() {
    let holdingsValue = 0;
    Object.keys(portfolio.holdings).forEach((ticker) => {
      const pos = portfolio.holdings[ticker];
      const ltp = lastPrices[ticker] || pos.avgPrice || 0;
      holdingsValue += pos.qty * ltp;
    });

    const equity = portfolio.cash + holdingsValue;
    const pnl = equity - initialCash;
    const pnlPct = (pnl / initialCash) * 100;

    equityValue.textContent = formatCurrency(equity);
    equityChange.textContent = `${formatPercent(pnlPct)} Today`;
    equityChange.classList.remove("pl-positive", "pl-negative");
    if (pnl > 0.01) equityChange.classList.add("pl-positive");
    else if (pnl < -0.01) equityChange.classList.add("pl-negative");

    cashValue.textContent = formatCurrency(portfolio.cash);

    renderHoldingsTable();
  }

  function renderHoldingsTable() {
    holdingsBody.innerHTML = "";
    Object.entries(portfolio.holdings).forEach(([ticker, pos]) => {
      if (!pos.qty) return;
      const ltp = lastPrices[ticker] || pos.avgPrice || 0;
      const pnl = (ltp - pos.avgPrice) * pos.qty;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${ticker}</td>
        <td>${pos.qty}</td>
        <td>${pos.avgPrice.toFixed(2)}</td>
        <td>${ltp.toFixed(2)}</td>
        <td class="${pnl >= 0 ? "pl-positive" : "pl-negative"}">
          ${pnl.toFixed(2)}
        </td>
      `;
      holdingsBody.appendChild(tr);
    });
  }

  function handleOrder(side) {
    const ticker = orderTickerSelect.value;
    const qty = parseInt(orderQtyInput.value, 10);
    const price = lastPrices[ticker];

    if (!ticker || !qty || qty <= 0) {
      addActivity("Order rejected: invalid ticker or quantity.");
      return;
    }

    if (!price) {
      addActivity("Order rejected: waiting for live price.");
      return;
    }

    const cost = qty * price;

    if (side === "buy") {
      if (cost > portfolio.cash) {
        addActivity("Order rejected: not enough virtual cash.");
        return;
      }
      const existing = portfolio.holdings[ticker] || { qty: 0, avgPrice: 0 };
      const newQty = existing.qty + qty;
      const newAvg =
        newQty === 0
          ? 0
          : (existing.avgPrice * existing.qty + cost) / newQty;
      portfolio.holdings[ticker] = { qty: newQty, avgPrice: newAvg };
      portfolio.cash -= cost;
      addActivity(`BUY ${qty} ${ticker} @ ${price.toFixed(2)}`);
    } else if (side === "sell") {
      const existing = portfolio.holdings[ticker] || { qty: 0, avgPrice: 0 };
      if (qty > existing.qty) {
        addActivity("Order rejected: not enough shares to sell.");
        return;
      }
      const proceed = qty * price;
      const newQty = existing.qty - qty;
      portfolio.cash += proceed;
      portfolio.holdings[ticker] = { qty: newQty, avgPrice: existing.avgPrice };
      addActivity(`SELL ${qty} ${ticker} @ ${price.toFixed(2)}`);
    }

    recalcPortfolio();
  }

  buyBtn.addEventListener("click", () => handleOrder("buy"));
  sellBtn.addEventListener("click", () => handleOrder("sell"));

  // Prevent default submit refresh
  orderForm.addEventListener("submit", (e) => e.preventDefault());
});
