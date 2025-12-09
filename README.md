```text
📂 Project Folder Structure


StockBroker/
│
├── public/
│   ├── index.html      # Login + Dashboard UI
│   ├── styles.css      # UI design (Glassmorphism)
│   ├── app.js          # Frontend Socket.IO + Trading logic
│
├── server.js           # Backend + WebSocket engine
├── package.json
├── package-lock.json
└── README.md
📈 StockBroker — Real-Time Market Simulation Dashboard


* Log in with email & password
* Subscribe/unsubscribe to stocks
* Monitor live price updates per second
* Buy/Sell shares using virtual cash
* Track portfolio equity & profit/loss
* View live sparkline mini-charts
* Read useful market tips
* Toggle Dark/Light theme
* See auto-generated activity logs

Built using Node.js, **Express, **Socket.IO, and a modern **Glass UI.

---

🧠 Overview

This project simulates a live stock market in real-time.
Prices update every second, and the frontend updates instantly through WebSockets.

It’s perfect for:

* Placement demos
* Portfolio projects
* Real-time systems learning
* Socket.IO practice
* UI/UX demonstration

---

 🏗 Tech Stack

| Area                 | Tools Used             |
| -------------------- | ---------------------- |
| Frontend         | HTML, CSS, JavaScript  |
| Backend          | Node.js, Express       |
| Realtime Updates | Socket.IO              |
| Charts           | Canvas-based sparkline |
| Auth             | Email (frontend only)  |
| Deployment       | Render                 |

---

📂 Project Folder Structure


StockBroker/
│
├── public/
│   ├── index.html      # Login + Dashboard UI
│   ├── styles.css      # UI design (Glassmorphism)
│   ├── app.js          # Frontend Socket.IO + Trading logic
│
├── server.js           # Backend + WebSocket engine
├── package.json
├── package-lock.json
└── README.md


---

## ⚙ Requirements

| Software | Version      |
| -------- | ------------ |
| Node.js  | v16 or above |
| npm      | Latest       |

---

🚀 Setup & Run the Application

1️⃣ Install dependencies

bash
npm install


2️⃣ Start the server

bash
npm start


or

bash
node server.js


3️⃣ Open the application in your browser


http://localhost:3000


---

 🧑‍💻 How to Use the Application
 🔐 Step 1 — Login

* Enter any email and password (no database)
* Login screen is centered with a premium UI
* Avatar initials are generated from your email

---

📡 Step 2 — Subscribe to Stocks

After login:

* Select stocks from the Watchlist
* Subscribed stocks start streaming live data
* Live data updates every second via Socket.IO

---

💹 Step 3 — Live Trading

Inside the dashboard, you can:

| Action                | Description                       |
| --------------------- | --------------------------------- |
| Buy               | Purchase shares at the live price |
| Sell              | Sell shares if owned              |
| Auto P/L          | Profit or loss updates instantly  |
| Portfolio Summary | Equity, cash, & percentage change |

---

 📝 Step 4 — Activity Log

Every action is logged:

* Login
* Buy/Sell
* Subscription changes
* Price updates

Activity list maintains the latest 20 events.

---

 💡 Step 5 — Market Tips

Useful trading and investing tips appear in the “Market Tips” section:

* Diversification
* Volume tracking
* Stop-loss usage
* Trend observation
