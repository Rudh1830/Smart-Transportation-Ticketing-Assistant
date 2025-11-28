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

// ---------------- USER SEARCH ----------------

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

    resultBox.innerHTML = "";
    data.results.forEach(item => {
      const div = document.createElement("div");
      div.className = "result-card";
      div.innerHTML = `
        <h3>${item.name} (${item.mode.toUpperCase()})</h3>
        <p>${item.origin} → ${item.destination}</p>
        <p><b>Price:</b> ₹${item.price} &nbsp; | &nbsp; <b>Seats:</b> ${item.seats_available}</p>
        <button onclick="fakeBook('${item.id}', '${item.name}', ${item.price})">Book</button>
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

function fakeBook(site, transportId, price){
  alert(`(Demo only)\nBooking ${transportId} via ${site} for ₹${price}`);
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
  box.innerText = data.status === "ok" ? "Route added successfully." : ("Error: " + data.error);
}

async function loadHistory(){
  const res = await fetch("/admin/history");
  const data = await res.json();
  const box = document.getElementById("historyResult");
  box.innerText = JSON.stringify(data.history, null, 2);
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

  } catch (err) {
    typing.classList.add("hidden");
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
