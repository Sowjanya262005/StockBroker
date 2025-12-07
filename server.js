// server.js

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const SUPPORTED_TICKERS = ["GOOG", "TSLA", "AMZN", "META", "NVDA"];
const UPDATE_INTERVAL_MS = 1000; // 1 second

// Store latest prices per ticker
const stockData = new Map(); // { ticker -> { ticker, price, trend, timestamp } }

// Store which tickers each user has subscribed to
const userSubscriptions = new Map(); // { socket.id -> [ "GOOG", "TSLA" ] }

// ---------- PRICE HELPERS ----------

function createInitialPrice(ticker) {
  const baseRanges = {
    GOOG: [2500, 2800],
    TSLA: [600, 900],
    AMZN: [3000, 3500],
    META: [250, 350],
    NVDA: [400, 700],
  };

  const [min, max] = baseRanges[ticker] || [100, 500];
  const price = min + Math.random() * (max - min);

  return {
    ticker,
    price,
    trend: 0,
    timestamp: new Date().toLocaleTimeString(),
  };
}

function getStock(ticker) {
  let data = stockData.get(ticker);
  if (!data) {
    data = createInitialPrice(ticker);
    stockData.set(ticker, data);
  }
  return data;
}

function generateNewPrice(ticker) {
  const prev = getStock(ticker);

  // Random walk: -1% to +1%
  const deltaPct = Math.random() * 2 - 1;
  const newPrice = Math.max(1, prev.price * (1 + deltaPct / 100));

  const updated = {
    ticker,
    price: newPrice,
    trend: deltaPct,
    timestamp: new Date().toLocaleTimeString(),
  };

  stockData.set(ticker, updated);
  return updated;
}

// ---------- EXPRESS STATIC ----------

app.use(express.static(path.join(__dirname, "public")));

// ---------- SOCKET.IO LOGIC ----------

io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  // When user logs in from the frontend
  socket.on("login", (email) => {
    console.log(`👤 User logged in on ${socket.id}: ${email}`);

    // By default subscribe user to all tickers
    userSubscriptions.set(socket.id, [...SUPPORTED_TICKERS]);

    // Tell frontend login is successful
    socket.emit("loginSuccess", {
      email,
      supportedTickers: SUPPORTED_TICKERS,
    });

    // Send initial prices for all supported tickers
    const initialPrices = SUPPORTED_TICKERS.map((ticker) => getStock(ticker));
    socket.emit("initialPrices", initialPrices);
  });

  // Frontend calls this whenever user checks/unchecks tickers
  socket.on("subscribeUpdate", (tickers) => {
    const cleanList = Array.isArray(tickers)
      ? tickers.filter((t) => SUPPORTED_TICKERS.includes(t))
      : [];

    userSubscriptions.set(socket.id, cleanList);
    console.log(`📡 Subscriptions for ${socket.id}:`, cleanList);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
    userSubscriptions.delete(socket.id);
  });
});

// ---------- GLOBAL PRICE BROADCAST LOOP ----------

setInterval(() => {
  // Generate new prices for all supported stocks
  const updatedPrices = SUPPORTED_TICKERS.map((ticker) =>
    generateNewPrice(ticker)
  );

  // Send only relevant tickers to each connected socket
  for (const [socketId, subscribedTickers] of userSubscriptions.entries()) {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) continue;

    const userUpdates =
      subscribedTickers && subscribedTickers.length
        ? updatedPrices.filter((p) => subscribedTickers.includes(p.ticker))
        : [];

    if (userUpdates.length) {
      socket.emit("priceUpdate", userUpdates);
    }
  }
}, UPDATE_INTERVAL_MS);

// ---------- START SERVER ----------

server.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser.`);
  console.log(`Open multiple tabs to test multi-user behaviour.`);
});
