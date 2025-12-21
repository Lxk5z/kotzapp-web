// ===================================
// 🧪 DEBUG
// ===================================
const DEBUG_LOADING_DELAY = 0; // in ms (Ladebalken sichtbar machen)
const ONLINE_PING_INTERVAL = 13000; // 13 Sekunden
const CURRENT_USER_ID = "U01"; // ⬅️ deine User-ID

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    return "/images/users/class.png";
  }

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash += userId.charCodeAt(i);
  }

  const index = (hash % 10) + 1;
  return `/images/users/user${index}.png`;
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
      dot.src = "/images/users/online.png";
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
function createChatItem(chat) {
  const item = document.createElement("div");
  item.className = "chat-item";

  // 🔍 Search-Daten
  item.dataset.rawName = (chat.raw_name || "").toLowerCase();
  item.dataset.rang = (chat.rang || "").toLowerCase();
  item.dataset.userId = chat.benutzer_id;

  item.innerHTML = `
    <div class="chat-avatar-wrapper">
      <img class="chat-avatar" src="${chat.profile_image || "/images/users/default.png"}">
      <img class="chat-online-dot hidden" src="/images/online-dot.svg">
    </div>

    <div class="chat-content">
      <div class="chat-name">${chat.formatierter_name}</div>
      <div class="chat-last">${chat.last_message || ""}</div>
    </div>

    <div class="chat-meta">
      <div class="chat-time">${chat.last_time || ""}</div>
    </div>
  `;

  return item;
}

// ===================================
// 💬 Chats laden (NUR EINMAL)
// ===================================
async function loadChats() {
  showLoadingBar();
  await delay(DEBUG_LOADING_DELAY);

  try {
    await fetchOnlineStatus();

    const res = await fetch("https://kotzapp.onrender.com/chats/get");
    const data = await res.json();

    const list = document.getElementById("chatList");
    list.innerHTML = "";

    data.chats.forEach(chat => {
      const item = document.createElement("div");
      item.className = "chat-item";
      item.dataset.userId = chat.benutzer_id;

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

      const time = document.createElement("div");
      time.className = "chat-time";
      time.textContent = chat.last_time || "";

      meta.appendChild(time);

      if (chat.new_message) {
        const badge = document.createElement("div");
        badge.className = "chat-badge";
        meta.appendChild(badge);
      }

      // ===== Hintergrund =====
      if (typeof chat.background === "number") {
        item.classList.add("has-background");
        item.style.backgroundImage =
          `url(/images/users/backgrounds/background${chat.background}.png)`;
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
