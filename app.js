const symbolEl = document.getElementById("symbol");
const connectBtn = document.getElementById("connect");
const disconnectBtn = document.getElementById("disconnect");
const statusEl = document.getElementById("status");
const priceEl = document.getElementById("price");
const lastDigitEl = document.getElementById("lastDigit");
const countEl = document.getElementById("count");
const topDigitEl = document.getElementById("topDigit");
const topPercentEl = document.getElementById("topPercent");
const digitsEl = document.getElementById("digits");
const recentEl = document.getElementById("recent");

let socket = null;
let counts = Array(10).fill(0);
let recent = [];
let total = 0;

function setStatus(text, good = false) {
  statusEl.textContent = text;
  statusEl.className = "status" + (good ? " good" : "");
}

function resetStats() {
  counts = Array(10).fill(0);
  recent = [];
  total = 0;
  priceEl.textContent = "—";
  lastDigitEl.textContent = "—";
  countEl.textContent = "0";
  topDigitEl.textContent = "—";
  topPercentEl.textContent = "—";
  renderDigits();
  renderRecent();
}

function extractLastDigit(quote) {
  const s = String(quote);
  const digits = s.replace(/[^0-9]/g, "");
  return digits.length ? Number(digits[digits.length - 1]) : null;
}

function renderDigits() {
  digitsEl.innerHTML = "";
  counts.forEach((n, d) => {
    const pct = total ? (n / total * 100) : 0;
    const row = document.createElement("div");
    row.className = "digit-row";
    row.innerHTML = `
      <div class="digit-label">${d}</div>
      <div class="bar"><span style="width:${pct.toFixed(1)}%"></span></div>
      <div class="pct">${n} · ${pct.toFixed(1)}%</div>
    `;
    digitsEl.appendChild(row);
  });

  if (total) {
    const max = Math.max(...counts);
    const d = counts.indexOf(max);
    topDigitEl.textContent = d;
    topPercentEl.textContent = `${(max / total * 100).toFixed(1)}% of the sample`;
  }
}

function renderRecent() {
  recentEl.innerHTML = recent.length
    ? recent.map(d => `<span class="pill">${d}</span>`).join("")
    : "<span class='muted'>No ticks yet</span>";
}

function handleTick(msg) {
  if (!msg.tick || msg.tick.quote === undefined) return;

  const quote = msg.tick.quote;
  const digit = extractLastDigit(quote);
  if (digit === null) return;

  priceEl.textContent = quote;
  lastDigitEl.textContent = digit;

  counts[digit]++;
  total++;
  recent.unshift(digit);
  recent = recent.slice(0, 30);

  countEl.textContent = total;
  renderDigits();
  renderRecent();
}

function connect() {
  if (socket) socket.close();

  resetStats();
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}/deriv`);

  socket.onopen = () => {
    socket.send(JSON.stringify({
      action: "subscribe",
      symbol: symbolEl.value
    }));
    setStatus("Connecting…");
    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
  };

  socket.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    if (msg.status === "connected") setStatus(`Live: ${msg.symbol}`, true);
    if (msg.status === "upstream_closed") setStatus("Market connection closed");
    if (msg.error) setStatus(msg.error);
    handleTick(msg);
  };

  socket.onerror = () => setStatus("Connection error");

  socket.onclose = () => {
    setStatus("Disconnected");
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    socket = null;
  };
}

function disconnect() {
  if (socket) socket.close();
  socket = null;
  setStatus("Disconnected");
  connectBtn.disabled = false;
  disconnectBtn.disabled = true;
}

connectBtn.addEventListener("click", connect);
disconnectBtn.addEventListener("click", disconnect);

renderDigits();
renderRecent();
