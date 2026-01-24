// ===================================
// 🧪 DEBUG
// ===================================
const DEBUG_LOADING_DELAY = 0; // in ms (Ladebalken sichtbar machen)
const ONLINE_PING_INTERVAL = 13000; // 13 Sekunden
const CURRENT_USER_ID = "U01"; // ⬅️ deine User-ID

const CDN_BASE =
  window.CDN_BASE ||
  "https://cdn.jsdelivr.net/gh/Lxk5z/kotzapp-web@latest";

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ⭐ Favoriten-Cache
let favoriteIds = new Set();

async function fetchWithRetry(url, options = {}, retries = 5, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res;
    } catch (err) {
      console.warn(`Fetch failed (${i + 1}/${retries}):`, err);

      if (i === retries - 1) throw err;

      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

// ===================================
// Online/Offline-Status Pfeil
// ===================================

let lastStatusMap = {};

const STATUS_ARROW_SVG = `
<svg viewBox="0 0 24 24">
  <path d="M5 12h14M13 5l6 7-6 7" />
</svg>
`;

function playLoginAnimation(chatItem) {
  const layer = chatItem.querySelector(".status-animation-layer");
  if (!layer) return;

  const arrows = document.createElement("div");
  arrows.className = "status-arrows login";
  arrows.innerHTML = STATUS_ARROW_SVG.repeat(3);

  layer.appendChild(arrows);
  arrows.addEventListener("animationend", () => arrows.remove());

  const dot = chatItem.querySelector(".chat-online-dot");
  if (dot) {
    dot.classList.remove("fade-out");
    dot.classList.add("pulse");
  }
}

function playLogoutAnimation(chatItem) {
  const layer = chatItem.querySelector(".status-animation-layer");
  if (!layer) return;

  const arrows = document.createElement("div");
  arrows.className = "status-arrows logout";
  arrows.innerHTML = STATUS_ARROW_SVG.repeat(3);

  layer.appendChild(arrows);
  arrows.addEventListener("animationend", () => arrows.remove());

  const dot = chatItem.querySelector(".chat-online-dot");
  if (dot) {
    dot.classList.remove("pulse");
    dot.classList.add("fade-out");
  }
}

// ===================================
// ⏳ Loadingbar
// ===================================
function showLoadingBar() {
  document.getElementById("loading-bar").style.display = "block";
}

function hideLoadingBar() {
  document.getElementById("loading-bar").style.display = "none";
}

// ===================================
// 🎨 Default-Profilbild (stabil)
// ===================================
function getRandomDefaultAvatar(userId) {
  if (userId === "CLASS") {
    return `${CDN_BASE}/images/users/classchat.png`;
  }

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash += userId.charCodeAt(i);
  }

  const index = (hash % 10) + 1;
  return `${CDN_BASE}/images/users/user${index}.png`;
}

// ===================================
// 🟢 ONLINE SYSTEM
// ===================================
if (!CURRENT_USER_ID) {
  console.warn("⚠️ CURRENT_USER_ID fehlt – Online-System deaktiviert");
}

function isAppVisible() {
  return document.visibilityState === "visible";
}

let onlineStatusMap = {};

// 🔁 Ping an Server
async function sendOnlinePing() {
  if (!CURRENT_USER_ID) return; // ⛔ STOP

  try {
    await fetch("https://kotzapp.onrender.com/online/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        benutzer_id: CURRENT_USER_ID,
        visible: isAppVisible()
      })
    });
  } catch {
    console.warn("⚠️ Online-Ping fehlgeschlagen");
  }
}


// 🔄 Online-Status abrufen
async function fetchOnlineStatus() {
  try {
    const res = await fetch("https://kotzapp.onrender.com/online/status");
    const data = await res.json();
    onlineStatusMap = data.online || {};
  } catch {
    console.warn("⚠️ Online-Status nicht abrufbar");
  }
}

// 🟢 Online-Punkte LIVE aktualisieren (KEIN Re-Render)
function updateOnlineDots() {
  document.querySelectorAll(".chat-item").forEach(item => {
    const userId = item.dataset.userId;
    const avatarWrapper = item.querySelector(".chat-avatar-wrapper");
    if (!avatarWrapper) return;

    const existingDot = avatarWrapper.querySelector(".chat-online-dot");
    let rawStatus = onlineStatusMap[userId] || "offline";

    const newStatus =
    rawStatus === "online"
    ? "online"
    : "offline"; // 👈 background zählt als offline

    // 🧠 INITIAL-SET (kein Animationsspam beim ersten Laden)
    if (!(userId in lastStatusMap)) {
      lastStatusMap[userId] = newStatus;
    }

    const oldStatus = lastStatusMap[userId];

    // 🔁 ECHTER STATUS-WECHSEL
    if (newStatus !== oldStatus) {
      if (newStatus === "online") playLoginAnimation(item);
      if (oldStatus === "online" && newStatus === "offline") {
        playLogoutAnimation(item);
      }
    }

    const shouldBeOnline =
      userId === "CLASS" || newStatus === "online";

    if (shouldBeOnline && !existingDot) {
      const dot = document.createElement("img");
      dot.src = `${CDN_BASE}/images/users/online.png`;
      dot.className = "chat-online-dot";
      avatarWrapper.appendChild(dot);
    }

    if (!shouldBeOnline && existingDot) {
      existingDot.remove();
    }

    lastStatusMap[userId] = newStatus;
  });
}

// ===================================
// 💬 Chats laden (NUR EINMAL)
// ===================================
function setChatAvatar(imgEl, imageData, userId) {
  if (!imgEl) return;

  // 🔥 Fallback bei JEDEM Fehler
  imgEl.onerror = () => {
    imgEl.src = `${CDN_BASE}/images/users/default.png`;
  };

  // ❌ Kein Bild → Default
  if (!imageData) {
    imgEl.src = getRandomDefaultAvatar(userId);
    return;
  }

  // 🔧 String säubern
  imageData = String(imageData).trim();

  // 🧠 Base64-Erkennung (JPEG beginnt oft mit /9j/)
  const looksLikeBase64 =
    /^[A-Za-z0-9+/]+={0,2}$/.test(imageData) ||
    imageData.startsWith("/9j/");

  if (looksLikeBase64) {
    imgEl.src = `data:image/jpeg;base64,${imageData}`;
    return;
  }

  // 🧠 Bereits fertige Data-URL
  if (imageData.startsWith("data:image")) {
    imgEl.src = imageData;
    return;
  }

  // 🌐 Absolute URL
  if (imageData.startsWith("http://") || imageData.startsWith("https://")) {
    imgEl.src = imageData;
    return;
  }

  // 🌐 Relative URL → CDN davor
  if (imageData.startsWith("/")) {
    imgEl.src = `${CDN_BASE}${imageData}`;
    return;
  }

  // 🔥 Fallback: Base64 als PNG
  imgEl.src = `data:image/png;base64,${imageData}`;
}

async function loadChats() {
  showLoadingBar();
  await delay(DEBUG_LOADING_DELAY);

  try {
    await fetchOnlineStatus();

    const favRes = await fetchWithRetry(
  `https://kotzapp.onrender.com/favorites/get?user_id=${CURRENT_USER_ID}`,
  {},
  5,
  1000
);
const favData = await favRes.json();
favoriteIds = new Set(favData.favorites || []);
const res = await fetchWithRetry(
  "https://kotzapp.onrender.com/chats/get",
  {},
  5,
  1000
);
const data = await res.json();


    const list = document.getElementById("chatList");
    list.innerHTML = "";

    data.chats.forEach(chat => {
      const item = document.createElement("div");
      item.className = "chat-item";
      item.dataset.userId = chat.benutzer_id;

      // ⭐ Favorit aus Supabase setzen
if (favoriteIds.has(chat.benutzer_id)) {
  item.dataset.favorite = "true";
} else {
  item.dataset.favorite = "false";
}

      // 🔍 SEARCH-DATEN
      item.dataset.rawName = (chat.raw_name || "").toLowerCase();
      item.dataset.rang = (chat.rang || "").toLowerCase();

      // ===== Status-Animation-Layer =====
      const animationLayer = document.createElement("div");
      animationLayer.className = "status-animation-layer";
      item.appendChild(animationLayer);

      // ===== Avatar =====
      const avatarWrapper = document.createElement("div");
      avatarWrapper.className = "chat-avatar-wrapper";

      const avatar = document.createElement("img");
avatar.className = "chat-avatar";

setChatAvatar(avatar, chat.profile_image, chat.benutzer_id);

      avatarWrapper.appendChild(avatar);

      // ===== Content =====
      const content = document.createElement("div");
      content.className = "chat-content";

      // 👉 Name + Rang (NEUES SYSTEM)
      const name = document.createElement("div");
      name.className = "chat-name";

      const username = document.createElement("span");
username.className = "chat-username";

// 👇 Anzeige IMMER korrekt formatiert
username.textContent =
  chat.raw_name
    ? chat.raw_name.charAt(0).toUpperCase() + chat.raw_name.slice(1)
    : "";

      name.appendChild(username);

      if (chat.rang && chat.rang !== "Normaler User") {
        const rank = document.createElement("span");
        rank.className =
          "chat-rank rank-" +
          chat.rang
            .toLowerCase()
            .replace("+", "plus")
            .replace(/\s+/g, "-");

        rank.textContent = chat.rang;
        name.appendChild(rank);
      }

      const last = document.createElement("div");
      last.className = "chat-last";
      last.textContent = chat.last_message || " ";

      content.appendChild(name);
      content.appendChild(last);

      // ===== Meta =====
const meta = document.createElement("div");
meta.className = "chat-meta";

/* 🔝 obere Zeile: Stern + Zeit */
const metaTop = document.createElement("div");
metaTop.className = "chat-meta-top";

/* ⭐ Favoriten Button */
const favBtn = document.createElement("button");
favBtn.className = "chat-fav-btn";
favBtn.title = "Favorit";

/* ☆ Outline Stern */
const starOutline = document.createElement("span");
starOutline.className = "star-outline";
starOutline.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M12 5.173l2.335 4.817 5.305.732-3.861 3.71.942 5.27-4.721-2.524-4.721 2.525.942-5.27-3.861-3.71 5.305-.733 2.335-4.817zm0-4.586l-3.668 7.568-8.332 1.151 6.064 5.828-1.48 8.279 7.416-3.967 7.416 3.966-1.48-8.279 6.064-5.827-8.332-1.15-3.668-7.569z"/>
</svg>
`;

/* ★ Filled Stern */
const starFilled = document.createElement("span");
starFilled.className = "star-filled hidden";
starFilled.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/>
</svg>
`;

favBtn.appendChild(starOutline);
favBtn.appendChild(starFilled);

// ⭐ Stern-Status initial setzen
if (item.dataset.favorite === "true") {
  starOutline.classList.add("hidden");
  starFilled.classList.remove("hidden");
}

if (item.dataset.favorite === "true") {
  starOutline.classList.add("hidden");
  starFilled.classList.remove("hidden");
}

/* ⏱️ Zeit */
const time = document.createElement("div");
time.className = "chat-time";
time.textContent = chat.last_time || "";

/* zusammensetzen */
metaTop.appendChild(favBtn);
metaTop.appendChild(time);
meta.appendChild(metaTop);

/* 🔔 Badge */
if (chat.new_message) {
  const badge = document.createElement("div");
  badge.className = "chat-badge";
  meta.appendChild(badge);
}

      // ===== Hintergrund =====

// 🎓 Spezialfall: CLASS → eigener Frontend-Background
if (chat.benutzer_id === "CLASS") {
  item.classList.add("has-background");
  item.style.backgroundImage =
    `url(${CDN_BASE}/images/users/backgrounds/backgroundCLASS.png)`; 
  item.style.backgroundSize = "cover";
  item.style.backgroundPosition = "center";
}

// 🧩 Alle anderen User → Backend-Wert verwenden
else if (typeof chat.background === "number") {
  item.classList.add("has-background");
  item.style.backgroundImage =
    `url(${CDN_BASE}/images/users/backgrounds/background${chat.background}.png)`;
  item.style.backgroundSize = "cover";
  item.style.backgroundPosition = "center";
}

      item.appendChild(avatarWrapper);
      item.appendChild(content);
      item.appendChild(meta);
      list.appendChild(item);
    });

    updateOnlineDots();

  } catch (err) {
    console.error("❌ Fehler beim Laden der Chats:", err);

const list = document.getElementById("chatList");
list.innerHTML = `
  <div style="padding:20px; text-align:center;">
    <p style="color:#f55; font-size:16px; margin-bottom:10px; font-family: Arial, sans-serif; font-weight: bold;">
      Server nicht erreichbar.
    </p>
    <button id="retryLoadChats" style="
      padding:10px 16px;
      background:#444;
      border-radius:8px;
      border:none;
      color:white;
      cursor:pointer;
    ">
      Erneut versuchen
    </button>
  </div>
`;

document.getElementById("retryLoadChats")?.addEventListener("click", () => {
  loadChats();
});

  } finally {
    hideLoadingBar();
  }
}

// ===================================
// 🔍 Lupe = Enter
// ===================================
const searchIcon = document.querySelector(".search-icon");

searchIcon.addEventListener("click", () => {
  const input = document.querySelector(".search-container input");

  // 🔁 Search auslösen
  input.dispatchEvent(new Event("input"));

  // ⌨️ Tastatur schließen
  input.blur();
});

document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".chat-fav-btn");
  if (!btn) return;

  const chatItem = btn.closest(".chat-item");
  if (!chatItem) return;

  const outline = btn.querySelector(".star-outline");
  const filled  = btn.querySelector(".star-filled");

  const isFav = chatItem.dataset.favorite === "true";

  // UI sofort umschalten
  chatItem.dataset.favorite = isFav ? "false" : "true";
  outline.classList.toggle("hidden", !isFav);
  filled.classList.toggle("hidden", isFav);

  // ✨ Animation NUR beim Favorisieren
  if (!isFav) {
    btn.classList.add("no-hover");
    playFavoriteBurst(btn);
    setTimeout(() => btn.classList.remove("no-hover"), 350);
  }

  // 💾 Supabase Toggle
  await fetch("https://kotzapp.onrender.com/favorites/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: CURRENT_USER_ID,
      chat_user_id: chatItem.dataset.userId
    })
  });

  applyChatFilter();
});

function playFavoriteBurst(button) {
  const burst = document.createElement("div");
  burst.className = "fav-burst";

  for (let i = 0; i < 16; i++) {
    burst.appendChild(document.createElement("span"));
  }

  button.appendChild(burst);

  setTimeout(() => burst.remove(), 450);
}

// =======================================
// 🔍 SEARCH – Filter, UX, Clear-Button, Icon-Color
// =======================================

document.querySelectorAll(".search-container").forEach(container => {
  const input = container.querySelector("input");
  const clearBtn = container.querySelector(".search-clear");

  // 🔄 UI aktualisieren (Icon + Clear-Button)
  function updateUI() {
    const hasText = input.value.trim().length > 0;
    container.classList.toggle("has-text", hasText);
    clearBtn.classList.toggle("hidden", !hasText);
  }

  // 🔍 Chats filtern
  function applySearch() {
    const query = input.value.toLowerCase().trim();

    document.querySelectorAll(".chat-item").forEach(item => {
      const name = item.dataset.rawName || "";
      const rang = item.dataset.rang || "";
      const id   = item.dataset.userId || "";

      const nameMatch = name.includes(query);
      const idMatch   = id.toLowerCase().includes(query);

      // ❌ "Normaler User" zählt NICHT
      const rangMatch =
        rang !== "normaler user" &&
        rang.includes(query);

      const match = nameMatch || idMatch || rangMatch;
      item.style.display = match ? "flex" : "none";
    });
  }

  // 🧠 Kombinierter Input-Handler
  input.addEventListener("input", () => {
    updateUI();
    applySearch();
  });

  // ❌ Clear-Button
  clearBtn.addEventListener("click", () => {
    input.value = "";
    updateUI();
    applySearch();
    input.focus();
  });

  // 📱 Tastatur schließen bei Touch außerhalb
  document.addEventListener("touchstart", (e) => {
    if (!container.contains(e.target)) {
      input.blur();
    }
  });

  // 📱 Tastatur schließen beim Scrollen
  document.addEventListener("scroll", () => {
    if (document.activeElement === input) {
      input.blur();
    }
  }, { passive: true });

  // Initialzustand
  updateUI();
});


// ===================================
// ☰ DROPDOWN: Alle Chats / Favoriten (FINAL)
// ===================================

function closeDropdown() {
  dropdown.classList.remove("open");
}

document.addEventListener("scroll", closeDropdown, {
  passive: true,
  capture: true
});

document.addEventListener("touchmove", closeDropdown, { passive: true });

const chatList = document.getElementById("chatList");

if (chatList) {
  chatList.addEventListener("scroll", closeDropdown, { passive: true });
}


let currentChatView = "all";

const leftButton = document.querySelector(".left-button");

// Dropdown erstellen
const dropdown = document.createElement("div");
dropdown.className = "chat-dropdown";
dropdown.innerHTML = `
  <div class="chat-dropdown-item active" data-view="all">
    > Alle Chats
  </div>
  <div class="chat-dropdown-item" data-view="favorites">
    > Favoriten
  </div>
`;

document.body.appendChild(dropdown);

// 🔧 Position immer NEU berechnen
function positionDropdown() {
  const rect = leftButton.getBoundingClientRect();

  dropdown.style.left = rect.left + "px";
  dropdown.style.top  = rect.bottom + 8 + "px"; // kleiner Abstand
}

// Toggle Dropdown
leftButton.addEventListener("click", (e) => {
  e.stopPropagation();

  const rect = leftButton.getBoundingClientRect();

  dropdown.style.position = "fixed";
  dropdown.style.top = rect.bottom + 8 + "px";
  dropdown.style.left = rect.left + "px";

  dropdown.classList.toggle("open");
});

// Scroll → Dropdown schließen (wichtig!)
window.addEventListener("scroll", () => {
  dropdown.classList.remove("open");
}, { passive: true });

// Klick außerhalb → schließen
document.addEventListener("click", () => {
  dropdown.classList.remove("open");
});

// Auswahl
dropdown.addEventListener("click", (e) => {
  const item = e.target.closest(".chat-dropdown-item");
  if (!item) return;

  currentChatView = item.dataset.view;

  dropdown.querySelectorAll(".chat-dropdown-item").forEach(i =>
    i.classList.remove("active")
  );
  item.classList.add("active");

  applyChatFilter();
  dropdown.classList.remove("open");
});

// 🔄 Falls gescrollt wird → neu positionieren (nice UX)
window.addEventListener("scroll", () => {
  if (dropdown.classList.contains("open")) {
    positionDropdown();
  }
}, { passive: true });

// ===================================
// ⭐ Filter anwenden
// ===================================
function applyChatFilter() {
  document.querySelectorAll(".chat-item").forEach(item => {
    if (currentChatView === "all") {
      item.style.display = "flex";
      return;
    }

    if (currentChatView === "favorites") {
      const isFav = item.dataset.favorite === "true";
      item.style.display = isFav ? "flex" : "none";
    }
  });
}

// ===================================
// Navigation durch Navbar
// ===================================

function clearNavbarKeyboardHover() {
  const navItems = Array.from(document.querySelectorAll("nav li"));
  navItems.forEach(li => li.classList.remove("keyboard-hover"));
  navSelectedIndex = -1;
}

let navSelectedIndex = -1; // merkt sich, welches Navbar-Item per Tastatur ausgewählt wurde

document.addEventListener("keydown", (e) => {
  // Wenn User in einem Textfeld tippt → abbrechen
  const active = document.activeElement;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
    return;
  }

  const navItems = Array.from(document.querySelectorAll("nav li"));

  // ENTER → weiterleiten, falls etwas ausgewählt ist
  if (e.key === "Enter" && navSelectedIndex !== -1) {
    const link = navItems[navSelectedIndex].querySelector("a");
    if (link) window.location.href = link.href;
    return;
  }

  // Wenn eine andere Taste gedrückt wird → Auswahl löschen
  if (!["1", "2", "3", "4"].includes(e.key)) {
    clearNavbarKeyboardHover();
    return;
  }

  // Taste 1–4 → Auswahl setzen
  navSelectedIndex = Number(e.key) - 1;

  // Sicherheit
  if (!navItems[navSelectedIndex]) return;

  // Hover-Effekt setzen
  navItems.forEach(li => li.classList.remove("keyboard-hover"));
  navItems[navSelectedIndex].classList.add("keyboard-hover");
});

// Mausbewegung → Auswahl löschen
document.addEventListener("mousemove", () => {
  clearNavbarKeyboardHover();
});

// Klick irgendwo → Auswahl löschen
document.addEventListener("click", () => {
  clearNavbarKeyboardHover();
});

// ===================================
// 🚀 START
// ===================================
loadChats();

// 🔁 NUR Online-System aktualisieren
setInterval(async () => {
  await sendOnlinePing();
  await fetchOnlineStatus();
  updateOnlineDots();
}, ONLINE_PING_INTERVAL);
