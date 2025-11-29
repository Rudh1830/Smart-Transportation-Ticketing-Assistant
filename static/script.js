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

    // Pick BEST (lowest price)
    let best = results[0];
    for (const item of results) {
      if (Number(item.price) < Number(best.price)) {
        best = item;
      }
    }

    // BEST choice card
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

    // Remaining options
    results.forEach(item => {
      if (item.id === best.id) return;

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

async function compareWebsites() {
  const origin = document.getElementById("cw_origin").value;
  const destination = document.getElementById("cw_destination").value;
  const mode = document.getElementById("cw_mode").value;

  const container = document.getElementById("compareResult");
  container.innerHTML = "<p>Comparing websites...</p>";

  try {
    const res = await fetch("/compare_websites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination, mode })
    });

    const data = await res.json();

    if (!data.count) {
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
                  ${offers.map(
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
                  ).join("")}
                </tbody>
              </table>
            </details>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Error while comparing websites.</p>";
  }
}

// ---------------- BOOKING / TRAVELER DETAILS ----------------

let currentBooking = null;

function fakeBook(site, transportId, price) {
  function fakeBook(site, transportId, price){
  currentBooking = { site, transportId, price };

  // Get selected route name → needed for receipt
  currentBooking.route = document.getElementById("origin").value
                      + " → "
                      + document.getElementById("destination").value;

  document.getElementById("travelerDetailsModal").classList.remove("hidden");
}

  // site = transport name or website name (from compare)
  currentBooking = {
    site,
    transportId,
    price,
    count: 1
  };
  const travelerModal = document.getElementById("travelerDetailsModal");
  if (travelerModal) travelerModal.classList.remove("hidden");
}

function closeTravelerModal() {
  const travelerModal = document.getElementById("travelerDetailsModal");
  if (travelerModal) travelerModal.classList.add("hidden");
}

function confirmTravelerDetails() {
  const name = document.getElementById("cust_name").value.trim();
  const email = document.getElementById("cust_email").value.trim();
  const phone = document.getElementById("cust_phone").value.trim();
  const count = Number(document.getElementById("cust_count").value || "1");

  if (!currentBooking) {
    alert("No booking selected.");
    return;
  }

  if (!name || !email || !phone || count < 1) {
    alert("Please fill all traveler details.");
    return;
  }

  currentBooking.name = name;
  currentBooking.email = email;
  currentBooking.phone = phone;
  currentBooking.count = count;

  closeTravelerModal();

  const totalPrice = (currentBooking.price * currentBooking.count).toFixed(2);
  const summary = document.getElementById("paymentSummary");

  if (summary) {
    summary.innerHTML = `
      <b>${name}</b><br>
      Travelers: <b>${count}</b><br>
      Contact: ${email}<br><br>
      Total Amount: <b>₹${totalPrice}</b>
    `;
  }

  const paymentModal = document.getElementById("paymentModal");
  if (paymentModal) paymentModal.classList.remove("hidden");
}

// ---------------- PAYMENT MODAL ----------------

function closePaymentModal() {
  const modal = document.getElementById("paymentModal");
  if (modal) modal.classList.add("hidden");
}

// center overlay for processing steps / UPI scanner
function showProcessingOverlay(price, name, method) {
  const overlay = document.getElementById("processOverlay");
  const content = document.getElementById("processContent");
  if (!overlay || !content) return;

  overlay.classList.remove("hidden");
  content.innerHTML = "";

  const amt = Number(price).toFixed(2);

  // UPI: show scanner.jpg
  if (method === "UPI") {
    content.innerHTML = `
      <p style="font-size:16px; text-align:center;">Scan the UPI QR to complete payment</p>
      <img src="/static/scanner.jpg"
           style="width:260px; height:260px; display:block; margin:12px auto; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.2);"/>
      <p style="text-align:center; margin-top:6px; color:#008000;">Waiting for payment confirmation…</p>
    `;
    return; // user will close manually
  }

  // Other methods: simple simulated steps
  content.innerHTML += `<p>📱 Initializing ${method} payment of ₹${amt}...</p>`;
  setTimeout(() => {
    content.innerHTML += `<p>🔐 Securely verifying transaction with your bank...</p>`;
  }, 700);
  setTimeout(() => {
    content.innerHTML += `<p>✅ Payment processed for <b>${name}</b>.</p>`;
  }, 1400);
}

function closeProcessingOverlay() {
  const overlay = document.getElementById("processOverlay");
  if (overlay) overlay.classList.add("hidden");

  // After scanner / processing closes → show success modal
  if (currentBooking) {
    const successModal = document.getElementById("successModal");
    if (successModal) successModal.classList.remove("hidden");
  }
}

// Success modal -> then show receipt
function closeSuccessModal() {
  const successModal = document.getElementById("successModal");
  if (successModal) successModal.classList.add("hidden");

  if (!currentBooking) return;

  // Fill ticket receipt
  const rPassenger = document.getElementById("r_passenger");
  const rEmail = document.getElementById("r_email");
  const rPhone = document.getElementById("r_phone");
  const rTid = document.getElementById("r_tid");
  const rMode = document.getElementById("r_mode");
  const rTrav = document.getElementById("r_travelers");
  const rTotal = document.getElementById("r_total");
  const rRoute = document.getElementById("r_route");
  const rTime = document.getElementById("r_time");

  if (rPassenger) rPassenger.innerText = currentBooking.name || "";
  if (rEmail) rEmail.innerText = currentBooking.email || "";
  if (rPhone) rPhone.innerText = currentBooking.phone || "";
  if (rTid) rTid.innerText = currentBooking.transportId || "";
  if (rMode) rMode.innerText = currentBooking.site || "";

  if (rTrav) rTrav.innerText = currentBooking.count || 1;
  const totalPrice = (currentBooking.price * currentBooking.count).toFixed(2);
  if (rTotal) rTotal.innerText = totalPrice;

  // Route from dropdowns
  const oSel = document.getElementById("origin");
  const dSel = document.getElementById("destination");
  if (rRoute && oSel && dSel) {
    rRoute.innerText = `${oSel.value} → ${dSel.value}`;
  }

  if (rTime) rTime.innerText = new Date().toLocaleString();

  const receipt = document.getElementById("ticketReceipt");
  if (receipt) {
    receipt.classList.remove("hidden");
    receipt.classList.add("show");
  }
}

function closeTicketReceipt() {
  const receipt = document.getElementById("ticketReceipt");
  if (receipt) {
    receipt.classList.remove("show");
    // keep it in DOM; optional: add hidden
    // receipt.classList.add("hidden");
  }
  // clear currentBooking after full flow
  currentBooking = null;
}

async function confirmPayment() {
  const modal = document.getElementById("paymentModal");
  if (modal) modal.classList.add("hidden");
  if (!currentBooking) return;

  const methodEl = document.getElementById("paymentMethod");
  const method = methodEl ? methodEl.value : "UPI";

  const totalPrice = (currentBooking.price * currentBooking.count).toFixed(2);

  // Show processing / scanner
  showProcessingOverlay(totalPrice, currentBooking.transportId, method);

  // Log booking in backend (unchanged)
  try {
    await fetch("/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentBooking.transportId })
    });
  } catch (err) {
    console.error("Error logging booking:", err);
  }

  // Refresh booking history dropdown if open
  loadBookingHistory();
}

// ---------------- ADMIN FUNCTIONS ----------------

async function addRoute() {
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  const box = document.getElementById("addRouteResult");
  if (box) {
    box.innerText =
      data.status === "ok"
        ? "Route added successfully."
        : ("Error: " + data.error);
  }
}

async function loadHistory() {
  const res = await fetch("/admin/history");
  const data = await res.json();
  const box = document.getElementById("historyResult");
  if (box) {
    box.innerText = JSON.stringify(data.history, null, 2);
  }
}

let modeChart = null;

async function loadAnalytics() {
  const res = await fetch("/analytics/transports");
  const data = await res.json();
  const labels = data.counts.map(c => c.mode);
  const values = data.counts.map(c => c.cnt);

  const ctx = document.getElementById("modeChart").getContext("2d");
  if (modeChart) {
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

async function sendMessage() {
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
  bus: "buses",
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

// ---------------- BOOKING HISTORY DROPDOWN ----------------

function toggleHistoryPanel() {
  const panel = document.getElementById("historyPanel");
  if (!panel) return;
  panel.classList.toggle("hidden");

  // when opening, load history from backend
  if (!panel.classList.contains("hidden")) {
    loadBookingHistory();
  }
}

async function loadBookingHistory() {
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

  if (panel && !panel.classList.contains("hidden")) {
    if (!panel.contains(event.target) && button && !button.contains(event.target)) {
      panel.classList.add("hidden");
    }
  }
});

// ---------------- COUNTRY CODE SELECTOR ----------------

function initCountryCodeSelector() {
  const btn = document.getElementById("countryCodeBtn");
  const dropdown = document.getElementById("countryCodeDropdown");
  const label = document.getElementById("countryCodeLabel");
  const phoneInput = document.getElementById("cust_phone");
  const flagSpan = btn ? btn.querySelector(".flag") : null;

  if (!btn || !dropdown || !label || !phoneInput || !flagSpan) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
  });

  dropdown.querySelectorAll(".country-item").forEach((item) => {
    item.addEventListener("click", () => {
      const code = item.getAttribute("data-code") || "";
      const flag = item.getAttribute("data-flag") || "";

      label.textContent = code;
      flagSpan.textContent = flag;
      dropdown.classList.add("hidden");

      // Optionally prefill phone with code
      if (!phoneInput.value.startsWith(code)) {
        phoneInput.value = code + " ";
        phoneInput.focus();
        const len = phoneInput.value.length;
        phoneInput.setSelectionRange(len, len);
      }
    });
  });

  document.addEventListener("click", () => {
    if (!dropdown.classList.contains("hidden")) {
      dropdown.classList.add("hidden");
    }
  });
}

// ---------------- INIT ON LOAD ----------------

window.addEventListener("load", () => {
  loadTransportData();

  const cwMode = document.getElementById("cw_mode");
  if (cwMode) {
    cwMode.addEventListener("change", updateCompareLocations);
  }

  initCountryCodeSelector();
});
function downloadTicketPDF() {
  const element = document.getElementById("ticketReceipt");

  if (!element) {
    alert("Ticket not available to download!");
    return;
  }

  const userName = currentBooking ? currentBooking.name : "ticket";

  const options = {
    margin: 10,
    filename: `${userName}_SmartTransport_Ticket.pdf`,
    image: { type: 'jpeg', quality: 1.0 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf()
    .set(options)
    .from(element)
    .save();
}
