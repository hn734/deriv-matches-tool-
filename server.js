const express = require("express");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "deriv-matches-tool" });
});

// Simple Deriv market-data proxy.
// This endpoint is read-only: it does not place or manage trades.
app.get("/api/ticks/:symbol", (req, res) => {
  const symbol = String(req.params.symbol || "").trim();
  if (!/^[A-Za-z0-9_]+$/.test(symbol)) {
    return res.status(400).json({ error: "Invalid symbol" });
  }
  res.json({ symbol });
});

const wss = new WebSocket.Server({ server, path: "/deriv" });

wss.on("connection", (client) => {
  let upstream;
  let closed = false;

  function send(obj) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(obj));
    }
  }

  client.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send({ error: "Invalid JSON" });
      return;
    }

    if (msg.action === "subscribe" && msg.symbol) {
      const symbol = String(msg.symbol);
      if (!/^[A-Za-z0-9_]+$/.test(symbol)) {
        send({ error: "Invalid symbol" });
        return;
      }

      if (upstream && upstream.readyState === WebSocket.OPEN) {
        upstream.close();
      }

      upstream = new WebSocket("wss://ws.derivws.com/websockets/v3");

      upstream.on("open", () => {
        upstream.send(JSON.stringify({
          ticks: symbol,
          subscribe: 1
        }));
        send({ status: "connected", symbol });
      });

      upstream.on("message", (data) => {
        if (!closed) client.send(data.toString());
      });

      upstream.on("error", () => {
        send({ error: "Deriv market-data connection error" });
      });

      upstream.on("close", () => {
        if (!closed) send({ status: "upstream_closed" });
      });
    }

    if (msg.action === "unsubscribe") {
      if (upstream) upstream.close();
      send({ status: "disconnected" });
    }
  });

  client.on("close", () => {
    closed = true;
    if (upstream) upstream.close();
  });
});

server.listen(PORT, () => {
  console.log(`Deriv Matches Tool running on port ${PORT}`);
});
