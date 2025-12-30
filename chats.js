// ===================================
// 🧪 DEBUG
// ===================================
const DEBUG_LOADING_DELAY = 0; // in ms (Ladebalken sichtbar machen)
const ONLINE_PING_INTERVAL = 13000; // 13 Sekunden
const CURRENT_USER_ID = "U01"; // ⬅️ deine User-ID

const CDN_BASE =
  window.CDN_BASE ??
  "https://cdn.jsdelivr.net/gh/Lxk5z/kotzapp-web@main";

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ⭐ Favoriten-Cache
let favoriteIds = new Set();

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
    return `${CDN_BASE}/images/users/class.png`;
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
async function loadChats() {
  showLoadingBar();
  await delay(DEBUG_LOADING_DELAY);

  try {
    await fetchOnlineStatus();

    const favRes = await fetch(
  `https://kotzapp.onrender.com/favorites/get?user_id=${CURRENT_USER_ID}`
);
const favData = await favRes.json();
favoriteIds = new Set(favData.favorites || []);

    const res = await fetch("https://kotzapp.onrender.com/chats/get");
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
      avatar.src = chat.profile_image
      ? chat.profile_image
      : getRandomDefaultAvatar(chat.benutzer_id);

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
      if (typeof chat.background === "number") {
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
  } finally {
    hideLoadingBar();
  }
}

// ===================================
// 🔍 SEARCH (Normaler User wird ignoriert)
// ===================================
const searchInput = document.querySelector(".search-container input");

searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase().trim();

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
});

// ===================================
// 📱 Mobile UX: Tastatur schließen
// ===================================

// Klick irgendwo außerhalb des Suchfelds → Tastatur weg
document.addEventListener("touchstart", (e) => {
  const searchContainer = document.querySelector(".search-container");
  const input = searchContainer.querySelector("input");

  if (!searchContainer.contains(e.target)) {
    input.blur(); // ⌨️ Tastatur schließen
  }
});

// Optional: Scroll / Wisch → Tastatur weg
document.addEventListener("scroll", () => {
  const input = document.querySelector(".search-container input");
  if (document.activeElement === input) {
    input.blur();
  }
}, { passive: true });

const clearBtn = document.querySelector(".search-clear");

// 🔄 Sichtbarkeit des X steuern
searchInput.addEventListener("input", () => {
  clearBtn.classList.toggle("hidden", searchInput.value.length === 0);
});

// ❌ Klick auf X → Feld leeren
clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  searchInput.dispatchEvent(new Event("input")); // 🔁 Search neu ausführen
  searchInput.focus(); // optional nice UX
});

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

// ===================================
// ☰ DROPDOWN: Alle Chats / Favoriten
// ===================================

let currentChatView = "all"; // "all" | "favorites"

const leftButton = document.querySelector(".left-button");

// Dropdown erstellen
const dropdown = document.createElement("div");
dropdown.className = "chat-dropdown";
dropdown.innerHTML = `
  <div class="chat-dropdown-item active" data-view="all">
    >  Alle Chats
  </div>
  <div class="chat-dropdown-item" data-view="favorites">
    >  Favoriten
  </div>
`;

document.body.appendChild(dropdown);

// Toggle Dropdown
leftButton.addEventListener("click", (e) => {
  e.stopPropagation();

  const rect = leftButton.getBoundingClientRect();
  dropdown.style.left = rect.left + "px";

  dropdown.classList.toggle("open");
});

// Klick außerhalb → schließen
document.addEventListener("click", () => {
  dropdown.classList.remove("open");
});

// Auswahl im Dropdown
dropdown.addEventListener("click", (e) => {
  const item = e.target.closest(".chat-dropdown-item");
  if (!item) return;

  const view = item.dataset.view;
  currentChatView = view;

  // Active UI
  dropdown.querySelectorAll(".chat-dropdown-item").forEach(i =>
    i.classList.remove("active")
  );
  item.classList.add("active");

  applyChatFilter();
  dropdown.classList.remove("open");
});

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
// 🚀 START
// ===================================
loadChats();

// 🔁 NUR Online-System aktualisieren
setInterval(async () => {
  await sendOnlinePing();
  await fetchOnlineStatus();
  updateOnlineDots();
}, ONLINE_PING_INTERVAL);