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

    if (!res.ok || !data || typeof data !== "object") {
      resultBox.innerHTML = "<p>⚠️ Error: Invalid response format.</p>";
      return;
    }

    if (!data.count) {
      resultBox.innerHTML = "<p>❌ No matching routes found.</p>";
      return;
    }

    const results = data.results || [];
    resultBox.innerHTML = "";

    // 1) Pick BEST choice (simple rule: lowest price; you can later plug in agent logic)
    let best = results[0];
    for (const item of results) {
      if (Number(item.price) < Number(best.price)) {
        best = item;
      }
    }

    // 2) Render BEST choice first
    const bestDiv = document.createElement("div");
    bestDiv.className = "result-card best-choice";
    bestDiv.innerHTML = `
      <div class="best-label">⭐ Best Choice</div>
      <h3>${best.name} (${best.mode.toUpperCase()})</h3>
      <p>${best.origin} → ${best.destination}</p>
      <p><b>Price:</b> ₹${best.price} &nbsp; | &nbsp; <b>Seats:</b> ${best.seats_available}</p>
      <button onclick="fakeBook('${best.name}', '${best.id}', ${best.price})">Book</button>
    `;
    resultBox.appendChild(bestDiv);

    // 3) Render remaining options below (excluding best to avoid duplicate)
    results.forEach(item => {
      if (item.id === best.id) return; // skip best, already shown

      const div = document.createElement("div");
      div.className = "result-card";
      div.innerHTML = `
        <h3>${item.name} (${item.mode.toUpperCase()})</h3>
        <p>${item.origin} → ${item.destination}</p>
        <p><b>Price:</b> ₹${item.price} &nbsp; | &nbsp; <b>Seats:</b> ${item.seats_available}</p>
        <button onclick="fakeBook('${item.name}', '${item.id}', ${item.price})">Book</button>
      `;
      resultBox.appendChild(div);
    });

  } catch (err) {
    console.error("Search Error:", err);
    resultBox.innerHTML = "<p>❗ Something went wrong while searching.</p>";
  }
}
// ---------------- WEBSITE COMPARISON ----------------

async function compareWebsites(){
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

    if(!data.count){
      container.innerHTML = "<p>No routes found for this query.</p>";
      return;
    }

    let html = "";
    data.matches.forEach((item) => {
      const t = item.transport;
      const offers = item.offers || [];
      const best = item.best_offer || {};
      html += `
        <div class="compare-card">
          <div class="compare-header">
            <div class="compare-title">
              <span class="mode-badge">${formatMode(t.mode)}</span>
              <strong>${t.name || t.id}</strong>
            </div>
            <span class="route-line">${t.origin} → ${t.destination}</span>
            <span>Base Price: ₹${t.price}</span>
          </div>
          <div class="compare-body">
            <p><b>Best website offer:</b>
              ${
                best.site
                  ? `${best.site} – ₹${best.final_price} (${best.discount}% off)`
                  : "N/A"
              }
            </p>
            <details>
              <summary>View all website offers</summary>
              <table class="offers-table">
                <thead>
                  <tr>
                    <th>Website</th>
                    <th>List Price (₹)</th>
                    <th>Discount (%)</th>
                    <th>Final Price (₹)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${offers
                    .map(
                      (o) => `
                      <tr>
                        <td>${o.site}</td>
                        <td>${o.list_price}</td>
                        <td>${o.discount}</td>
                        <td>${o.final_price}</td>
                        <td>
                          <button onclick="fakeBook('${o.site}', '${t.id}', ${o.final_price})">
                            Book
                          </button>
                        </td>
                      </tr>
                    `
                    )
                    .join("")}
                </tbody>
              </table>
            </details>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err){
    console.error(err);
    container.innerHTML = "<p>Error while comparing websites.</p>";
  }
}

// ---------------- BOOKING / PAYMENT ----------------

let currentBooking = null;

function fakeBook(site, transportId, price){
  currentBooking = { site, transportId, price };

  // Open traveler details modal FIRST
  document.getElementById("travelerDetailsModal").classList.remove("hidden");
}


function closePaymentModal(){
  const modal = document.getElementById("paymentModal");
  if (modal) {
    modal.classList.add("hidden");
  }
}
function closeTravelerModal(){
  document.getElementById("travelerDetailsModal").classList.add("hidden");
}

function confirmTravelerDetails(){
  const name = document.getElementById("cust_name").value.trim();
  const email = document.getElementById("cust_email").value.trim();
  const phone = document.getElementById("cust_phone").value.trim();
  const count = Number(document.getElementById("cust_count").value);

  if(!name || !email || !phone || count < 1){
    alert("Please fill all traveler details.");
    return;
  }

  currentBooking.name = name;
  currentBooking.email = email;
  currentBooking.phone = phone;
  currentBooking.count = count;

  // Close traveler modal
  closeTravelerModal();

  // Update payment modal summary with passenger count pricing
  const modal = document.getElementById("paymentModal");
  const summary = document.getElementById("paymentSummary");

  const totalPrice = (currentBooking.price * currentBooking.count).toFixed(2);

  summary.innerHTML = 
    `Booking for <b>${currentBooking.name}</b><br>
     Travelers: <b>${currentBooking.count}</b><br>
     Contact: ${currentBooking.email}<br><br>
     Total Amount: <b>₹${totalPrice}</b>`;

  modal.classList.remove("hidden");
}


// center overlay for processing steps (instead of chatbot)
function showProcessingOverlay(price, name, method){
  const overlay = document.getElementById("processOverlay");
  const content = document.getElementById("processContent");
  if (!overlay || !content) return;

  overlay.classList.remove("hidden");
  content.innerHTML = "";

  const p = Number(price).toFixed(2);

  content.innerHTML += `<p>📱 Initializing ${method} payment of ₹${p}...</p>`;
  setTimeout(() => {
    content.innerHTML += `<p>🔐 Securely verifying transaction with your bank...</p>`;
  }, 700);
  setTimeout(() => {
    content.innerHTML += `<p>✅ Payment successful! Your booking for <b>${name}</b> is confirmed.</p>`;
  }, 1400);
}

function closeProcessingOverlay(){
  const overlay = document.getElementById("processOverlay");
  if (overlay) overlay.classList.add("hidden");
}

async function confirmPayment(){
  const modal = document.getElementById("paymentModal");
  if (modal) modal.classList.add("hidden");
  if (!currentBooking) return;

  const methodEl = document.getElementById("paymentMethod");
  const method = methodEl ? methodEl.value : "selected method";

  const totalPrice = (currentBooking.price * currentBooking.count).toFixed(2);
  showProcessingOverlay(totalPrice, currentBooking.transportId, method);

  // Log booking in backend
  try {
    await fetch("/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentBooking.transportId })
    });
  } catch (err) {
    console.error("Error logging booking:", err);
  }

  // refresh booking history dropdown if open
  loadBookingHistory();

  // optional alert
  alert(`Payment Successful! Ticket booked for ${currentBooking.transportId}`);

  currentBooking = null;
}

// ---------------- ADMIN FUNCTIONS ----------------

async function addRoute(){
  const payload = {
    id: document.getElementById("ar_id").value,
    name: document.getElementById("ar_name").value,
    origin: document.getElementById("ar_origin").value,
    destination: document.getElementById("ar_destination").value,
    departure: document.getElementById("ar_departure").value,
    arrival: document.getElementById("ar_arrival").value,
    duration_mins: parseInt(document.getElementById("ar_duration").value || "0"),
    price: parseFloat(document.getElementById("ar_price").value || "0"),
    seats_available: parseInt(document.getElementById("ar_seats").value || "0"),
    mode: document.getElementById("ar_mode").value,
    rating: 4.0
  };

  const res = await fetch("/admin/add_route", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  const box = document.getElementById("addRouteResult");
  if (box) {
    box.innerText = data.status === "ok" ? "Route added successfully." : ("Error: " + data.error);
  }
}

async function loadHistory(){
  const res = await fetch("/admin/history");
  const data = await res.json();
  const box = document.getElementById("historyResult");
  if (box) {
    box.innerText = JSON.stringify(data.history, null, 2);
  }
}

let modeChart = null;

async function loadAnalytics(){
  const res = await fetch("/analytics/transports");
  const data = await res.json();
  const labels = data.counts.map(c => c.mode);
  const values = data.counts.map(c => c.cnt);

  const ctx = document.getElementById("modeChart").getContext("2d");
  if(modeChart){
    modeChart.destroy();
  }
  modeChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Number of routes by mode",
        data: values
      }]
    }
  });
}

// ---------------- CHATBOT ----------------

let chatWindow = null;

function appendChat(sender, text) {
  if (!chatWindow) {
    chatWindow = document.getElementById("chatWindow");
  }
  if (!chatWindow) return;

  const msg = document.createElement("div");
  msg.className = `chat-msg ${sender}`;
  msg.innerHTML = text.replace(/\n/g, "<br>");
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendMessage(){
  const input = document.getElementById("chatMessage");
  const msg = input.value.trim();
  if (!msg) return;

  appendChat("user", msg);
  input.value = "";

  const typing = document.getElementById("typingIndicator");
  if (typing) typing.classList.remove("hidden");

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg })
    });

    const data = await res.json();
    if (typing) typing.classList.add("hidden");

    appendChat("bot", data.reply);

  } catch (err) {
    if (typing) typing.classList.add("hidden");
    appendChat("bot", "⚠️ Connection issue — please try again.");
  }
}

// --------------------- LOCATION DROPDOWN ENGINE ---------------------

let transportMeta = {};

// Map mode → file key
const MODE_FILE_MAP = {
  train: "trains",
  flight: "flights",
  bus: "buses",     // important: buses, not buss
  taxi: "taxis",
  bike: "bikes"
};

// Load all data JSON once (after DOM ready)
async function loadTransportData() {
  const files = ["trains", "flights", "buses", "taxis", "bikes"];

  for (const file of files) {
    try {
      const res = await fetch(`/data/${file}.json`);
      transportMeta[file] = await res.json();
    } catch (err) {
      console.warn(`⚠️ Could not load ${file}.json`, err);
    }
  }

  // Initial population
  updateLocations();
  updateCompareLocations();
}

// Search dropdown update
function updateLocations() {
  const mode = document.getElementById("mode").value;
  const originSelect = document.getElementById("origin");
  const destinationSelect = document.getElementById("destination");

  originSelect.innerHTML = "";
  destinationSelect.innerHTML = "";

  if (!mode) {
    originSelect.disabled = true;
    destinationSelect.disabled = true;
    originSelect.innerHTML = `<option>-- Select Mode First --</option>`;
    destinationSelect.innerHTML = `<option>-- Select Mode First --</option>`;
    return;
  }

  const key = MODE_FILE_MAP[mode] || (mode + "s");
  const dataset = transportMeta[key] || [];

  const origins = [...new Set(dataset.map(item => item.origin))].sort();
  const destinations = [...new Set(dataset.map(item => item.destination))].sort();

  originSelect.disabled = false;
  destinationSelect.disabled = false;

  origins.forEach(o => originSelect.innerHTML += `<option value="${o}">${o}</option>`);
  destinations.forEach(d => destinationSelect.innerHTML += `<option value="${d}">${d}</option>`);
}

// Compare dropdown update
function updateCompareLocations() {
  const modeSel = document.getElementById("cw_mode");
  if (!modeSel) return;

  const mode = modeSel.value;
  const oSel = document.getElementById("cw_origin");
  const dSel = document.getElementById("cw_destination");

  oSel.innerHTML = "";
  dSel.innerHTML = "";

  const key = MODE_FILE_MAP[mode] || (mode + "s");
  const dataset = transportMeta[key] || [];

  const origins = [...new Set(dataset.map(item => item.origin))].sort();
  const destinations = [...new Set(dataset.map(item => item.destination))].sort();

  origins.forEach(o => oSel.innerHTML += `<option value="${o}">${o}</option>`);
  destinations.forEach(d => dSel.innerHTML += `<option value="${d}">${d}</option>`);
}

// Bind events & load data after DOM is ready
window.addEventListener("load", () => {
  // load transport JSON and then populate dropdowns
  loadTransportData();

  // set mode change listener for compare dropdowns
  const cwMode = document.getElementById("cw_mode");
  if (cwMode) {
    cwMode.addEventListener("change", updateCompareLocations);
  }
});

// ---------------- BOOKING HISTORY DROPDOWN ----------------

function toggleHistoryPanel(){
  const panel = document.getElementById("historyPanel");
  if (!panel) return;
  panel.classList.toggle("hidden");

  // when opening, load history from backend
  if (!panel.classList.contains("hidden")) {
    loadBookingHistory();
  }
}

async function loadBookingHistory(){
  const box = document.getElementById("historyList");
  if (!box) return;

  box.innerHTML = "<p>⏳ Loading your bookings...</p>";

  try {
    const res = await fetch("/booking_history");
    const data = await res.json();

    if (!data.count) {
      box.innerHTML = "<p>No bookings made yet.</p>";
      return;
    }

    let html = `
      <table class="history-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Route</th>
            <th>Mode</th>
            <th>Price (₹)</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.history.forEach((h, idx) => {
      html += `
        <tr>
          <td>${idx + 1}</td>
          <td>${h.origin} → ${h.destination}</td>
          <td>${h.mode.toUpperCase()}</td>
          <td>${h.price}</td>
          <td>${h.timestamp}</td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    box.innerHTML = html;

  } catch (err) {
    console.error("History error:", err);
    box.innerHTML = "<p>Could not load booking history.</p>";
  }
}

// Close dropdown if user clicks outside
window.addEventListener("click", (event) => {
  const panel = document.getElementById("historyPanel");
  const button = document.querySelector(".history-btn");

  if (!panel.classList.contains("hidden")) {
    if (!panel.contains(event.target) && !button.contains(event.target)) {
      panel.classList.add("hidden");
    }
  }
});
