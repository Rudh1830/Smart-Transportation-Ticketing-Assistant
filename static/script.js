// ---------------- UI HELPERS ----------------

function createCard(html) {
  const div = document.createElement("div");
  div.className = "result-card";
  div.innerHTML = html;
  return div;
}

function formatMode(mode) {
  if (!mode) return "";
  mode = mode.toLowerCase();
  if (mode === "bike") return "Bike Taxi";
  if (mode === "taxi") return "Cab / Taxi";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

// ---------------- SEARCH ----------------

async function doSearch() {
  const origin = document.getElementById("origin").value;
  const destination = document.getElementById("destination").value;
  const mode = document.getElementById("mode").value;

  const resultBox = document.getElementById("searchResult");
  resultBox.innerHTML = "<p>🔍 Searching...</p>";

  try {
    const res = await fetch("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination, mode })
    });

    const data = await res.json();

    if (!res.ok || !data) {
      resultBox.innerHTML = "<p>⚠️ Error: Invalid response.</p>";
      return;
    }

    if (!data.count) {
      resultBox.innerHTML = "<p>❌ No matching routes found.</p>";
      return;
    }

    const results = data.results;
    resultBox.innerHTML = "";

    // Best (lowest price)
    let best = results[0];
    for (const item of results) {
      if (Number(item.price) < Number(best.price)) {
        best = item;
      }
    }

    const bestDiv = document.createElement("div");
    bestDiv.className = "result-card best-choice";
    bestDiv.innerHTML = `
      <div class="best-label">⭐ Best Choice</div>
      <h3>${best.name} (${best.mode.toUpperCase()})</h3>
      <p>${best.origin} → ${best.destination}</p>
      <p><b>Price:</b> ₹${best.price} | <b>Seats:</b> ${best.seats_available}</p>
      <button onclick="fakeBook('${best.name}', '${best.id}', ${best.price})">Book</button>
    `;
    resultBox.appendChild(bestDiv);

    // Other options
    results.forEach(item => {
      if (item.id === best.id) return;
      const div = document.createElement("div");
      div.className = "result-card";
      div.innerHTML = `
        <h3>${item.name} (${item.mode.toUpperCase()})</h3>
        <p>${item.origin} → ${item.destination}</p>
        <p><b>Price:</b> ₹${item.price} | <b>Seats:</b> ${item.seats_available}</p>
        <button onclick="fakeBook('${item.name}', '${item.id}', ${item.price})">Book</button>
      `;
      resultBox.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    resultBox.innerHTML = "<p>❗ Search Error.</p>";
  }
}

// ---------------- WEBSITE COMPARISON ----------------

async function compareWebsites() {
  const origin = document.getElementById("cw_origin").value;
  const destination = document.getElementById("cw_destination").value;
  const mode = document.getElementById("cw_mode").value;

  const container = document.getElementById("compareResult");
  container.innerHTML = "<p>Comparing websites...</p>";

  try {
    const res = await fetch("/compare_websites", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ origin, destination, mode })
    });

    const data = await res.json();

    if (!data.count) {
      container.innerHTML = "<p>No results.</p>";
      return;
    }

    let html = "";
    data.matches.forEach(item => {
      const t = item.transport;
      const offers = item.offers;
      const best = item.best_offer;

      html += `
        <div class="compare-card">
          <h3>${t.name} (${t.mode})</h3>
          <p>${t.origin} → ${t.destination}</p>
          <p>Base Price: ₹${t.price}</p>

          <p><b>Best Website:</b> ${
            best?.site ? `${best.site} - ₹${best.final_price}` : "None"
          }</p>

          <details>
            <summary>View Offers</summary>
            <table class="offers-table">
              <tbody>
                ${offers.map(o => `
                  <tr>
                    <td>${o.site}</td>
                    <td>${o.final_price}</td>
                    <td>
                      <button onclick="fakeBook('${o.site}', '${t.id}', ${o.final_price})">Book</button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </details>
        </div>
      `;
    });

    container.innerHTML = html;

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Error comparing websites.</p>";
  }
}

// ---------------- BOOKING: OPEN TRAVELER MODAL ----------------

let currentBooking = null;

function fakeBook(site, transportId, price) {
  currentBooking = { site, transportId, price };

  document.getElementById("travelerDetailsModal").classList.remove("hidden");
}

// ---------------- TRAVELER DETAILS MODAL ----------------

function closeTravelerModal() {
  document.getElementById("travelerDetailsModal").classList.add("hidden");
}

function confirmTravelerDetails() {
  const name = document.getElementById("cust_name").value.trim();
  const email = document.getElementById("cust_email").value.trim();
  const phone = document.getElementById("cust_phone").value.trim();
  const count = Number(document.getElementById("cust_count").value);

  if (!name || !email || !phone || count < 1) {
    alert("Please fill all details.");
    return;
  }

  currentBooking.name = name;
  currentBooking.email = email;
  currentBooking.phone = phone;
  currentBooking.count = count;

  closeTravelerModal();

  const totalPrice = (currentBooking.price * count).toFixed(2);
  const summary = document.getElementById("paymentSummary");

  summary.innerHTML = `
    <b>${name}</b><br>
    Travellers: ${count}<br>
    Contact: ${email}<br>
    Total: ₹${totalPrice}
  `;

  document.getElementById("paymentModal").classList.remove("hidden");
}

// ---------------- PAYMENT MODAL ----------------

function closePaymentModal() {
  document.getElementById("paymentModal").classList.add("hidden");
}

// ---------------- UPI / PAYMENT OVERLAY ----------------

function showProcessingOverlay(price, name, method) {
  const overlay = document.getElementById("processOverlay");
  const content = document.getElementById("processContent");

  overlay.classList.remove("hidden");
  content.innerHTML = "";

  const amount = Number(price).toFixed(2);

  if (method === "UPI") {
    content.innerHTML = `
      <p style="text-align:center;">Scan UPI QR to Pay</p>
      <img src="/static/scanner.jpg"
        style="width:260px; height:260px; display:block; margin:auto; border-radius:12px;">
      <p style="text-align:center; color:green;">Waiting for confirmation…</p>
    `;
    return;
  }

  content.innerHTML += `<p>📱 Initializing ${method} payment of ₹${amount}...</p>`;
  setTimeout(() => {
    content.innerHTML += `<p>🔐 Verifying with bank...</p>`;
  }, 700);
  setTimeout(() => {
    content.innerHTML += `<p>✅ Payment successful for <b>${name}</b>.</p>`;
  }, 1400);
}

function closeProcessingOverlay() {
  const overlay = document.getElementById("processOverlay");
  overlay.classList.add("hidden");

  if (currentBooking) {
    document.getElementById("successModal").classList.remove("hidden");
    currentBooking = null;
  }
}

// ---------------- CONFIRM PAYMENT ----------------

async function confirmPayment() {
  const modal = document.getElementById("paymentModal");
  modal.classList.add("hidden");

  const method = document.getElementById("paymentMethod").value;

  const totalPrice = (currentBooking.price * currentBooking.count).toFixed(2);
  showProcessingOverlay(totalPrice, currentBooking.transportId, method);

  try {
    await fetch("/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentBooking.transportId })
    });
  } catch (err) {
    console.error(err);
  }

  loadBookingHistory();
}

// ---------------- ADMIN PANEL ----------------

async function addRoute() {
  const payload = {
    id: document.getElementById("ar_id").value,
    name: document.getElementById("ar_name").value,
    origin: document.getElementById("ar_origin").value,
    destination: document.getElementById("ar_destination").value,
    departure: document.getElementById("ar_departure").value,
    arrival: document.getElementById("ar_arrival").value,
    duration_mins: parseInt(document.getElementById("ar_duration").value),
    price: parseFloat(document.getElementById("ar_price").value),
    seats_available: parseInt(document.getElementById("ar_seats").value),
    mode: document.getElementById("ar_mode").value,
    rating: 4.0
  };

  const res = await fetch("/admin/add_route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  document.getElementById("addRouteResult").innerText =
    data.status === "ok" ? "Route added!" : "Error";
}

async function loadHistory() {
  const res = await fetch("/admin/history");
  const data = await res.json();
  document.getElementById("historyResult").innerText =
    JSON.stringify(data.history, null, 2);
}

let modeChart = null;

async function loadAnalytics() {
  const res = await fetch("/analytics/transports");
  const data = await res.json();

  const labels = data.counts.map(c => c.mode);
  const values = data.counts.map(c => c.cnt);

  const ctx = document.getElementById("modeChart").getContext("2d");

  if (modeChart) modeChart.destroy();

  modeChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Routes by Mode",
        data: values
      }]
    }
  });
}

// ---------------- CHATBOT ----------------

let chatWindow = null;

function appendChat(sender, text) {
  if (!chatWindow) chatWindow = document.getElementById("chatWindow");
  const msg = document.createElement("div");
  msg.className = `chat-msg ${sender}`;
  msg.innerHTML = text.replace(/\n/g, "<br>");
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("chatMessage");
  const msg = input.value.trim();
  if (!msg) return;

  appendChat("user", msg);
  input.value = "";

  const typing = document.getElementById("typingIndicator");
  typing.classList.remove("hidden");

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg })
    });

    const data = await res.json();
    typing.classList.add("hidden");
    appendChat("bot", data.reply);

  } catch {
    typing.classList.add("hidden");
    appendChat("bot", "⚠️ Error contacting server.");
  }
}

// ---------------- DROPDOWN ENGINE ----------------

let transportMeta = {};

const MODE_FILE_MAP = {
  train: "trains",
  flight: "flights",
  bus: "buses",
  taxi: "taxis",
  bike: "bikes"
};

async function loadTransportData() {
  const files = ["trains", "flights", "buses", "taxis", "bikes"];

  for (const file of files) {
    try {
      const res = await fetch(`/data/${file}.json`);
      transportMeta[file] = await res.json();
    } catch {
      console.warn(`Could not load ${file}.json`);
    }
  }

  updateLocations();
  updateCompareLocations();
}

function updateLocations() {
  const mode = document.getElementById("mode").value;
  const originSelect = document.getElementById("origin");
  const destinationSelect = document.getElementById("destination");

  originSelect.innerHTML = "";
  destinationSelect.innerHTML = "";

  if (!mode) {
    originSelect.innerHTML = `<option>-- Select Mode --</option>`;
    destinationSelect.innerHTML = `<option>-- Select Mode --</option>`;
    originSelect.disabled = true;
    destinationSelect.disabled = true;
    return;
  }

  const key = MODE_FILE_MAP[mode];
  const dataset = transportMeta[key] || [];

  const origins = [...new Set(dataset.map(x => x.origin))].sort();
  const destinations = [...new Set(dataset.map(x => x.destination))].sort();

  originSelect.disabled = false;
  destinationSelect.disabled = false;

  origins.forEach(o => originSelect.innerHTML += `<option>${o}</option>`);
  destinations.forEach(d => destinationSelect.innerHTML += `<option>${d}</option>`);
}

function updateCompareLocations() {
  const mode = document.getElementById("cw_mode").value;
  const oSel = document.getElementById("cw_origin");
  const dSel = document.getElementById("cw_destination");

  const key = MODE_FILE_MAP[mode];
  const dataset = transportMeta[key] || [];

  const origins = [...new Set(dataset.map(x => x.origin))].sort();
  const destinations = [...new Set(dataset.map(x => x.destination))].sort();

  oSel.innerHTML = origins.map(o => `<option>${o}</option>`).join("");
  dSel.innerHTML = destinations.map(d => `<option>${d}</option>`).join("");
}

window.addEventListener("load", () => {
  loadTransportData();
  document.getElementById("cw_mode")
    .addEventListener("change", updateCompareLocations);
});

// ---------------- BOOKING HISTORY DROPDOWN ----------------

function toggleHistoryPanel() {
  const panel = document.getElementById("historyPanel");
  panel.classList.toggle("hidden");

  if (!panel.classList.contains("hidden")) {
    loadBookingHistory();
  }
}

async function loadBookingHistory() {
  const box = document.getElementById("historyList");
  box.innerHTML = "<p>Loading...</p>";

  try {
    const res = await fetch("/booking_history");
    const data = await res.json();

    if (!data.count) {
      box.innerHTML = "<p>No bookings yet.</p>";
      return;
    }

    let html = `
      <table class="history-table">
      <tr><th>#</th><th>Route</th><th>Mode</th><th>Time</th></tr>
    `;

    data.history.forEach((h, i) => {
      html += `
        <tr>
          <td>${i+1}</td>
          <td>${h.origin} → ${h.destination}</td>
          <td>${h.mode}</td>
          <td>${h.timestamp}</td>
        </tr>`;
    });

    html += "</table>";
    box.innerHTML = html;

  } catch (err) {
    console.error(err);
    box.innerHTML = "<p>Error loading history.</p>";
  }
}

window.addEventListener("click", (event) => {
  const panel = document.getElementById("historyPanel");
  const button = document.querySelector(".history-btn");

  if (!panel.classList.contains("hidden")) {
    if (!panel.contains(event.target) && !button.contains(event.target)) {
      panel.classList.add("hidden");
    }
  }
});
function closeSuccessModal() {
  document.getElementById("successModal").classList.add("hidden");
}
