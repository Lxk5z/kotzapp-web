  window.CDN_BASE = "https://cdn.jsdelivr.net/gh/Lxk5z/kotzapp-web";
  window.API_BASE = "https://kotzapp.onrender.com";

  // VERSION
  const frontend_version = "v0.9.8";

// ----------------------
// VERSION CHECK
// ----------------------
(async function checkVersion() {
  const lastCheck = localStorage.getItem("kotzapp_version_check");
  const now = Date.now();
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;

  // Prüfen, ob der Key existiert und ob die 12 Stunden bereits vergangen sind
  const shouldCheck = !lastCheck || (now - new Date(lastCheck).getTime() > TWELVE_HOURS);

  if (shouldCheck) {
    try {
      const response = await fetch(`${API_BASE}/version/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frontend_version: localStorage.getItem("frontend_version") || frontend_version })
      });
      const data = await response.json();

      // Speichere das aktuelle Datum mit Uhrzeit im Local Storage
      localStorage.setItem("kotzapp_version_check", new Date().toISOString());

      if (data.latest === "false") {
        window.location.href = "404.html?new_update";
      }
    } catch (err) {
      console.error("❌ Fehler beim Versions-Check:", err);
    }
  }
})();

// ------------------------
// DEVICE_ID - generator
// ------------------------
    function generateUUID() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

  (function ensureDeviceId() {
    let id = localStorage.getItem("device_id");
    if (!id) {
      id = generateUUID();
      localStorage.setItem("device_id", id);
      console.log("🔑 Neue device_id erzeugt:", id);
    } else {
      console.log("📱 device_id vorhanden:", id);
    }
  })();


// ----------------------
// CHACHE BUSTER
// ----------------------

// Zentrale Cache-Control Funktion
window.getFreshUrl = function(url) {
    if (!url || typeof url !== 'string' || url.startsWith('data:')) return url;

    // Diese Dinge dürfen im Cache bleiben (Logo, Favicon)
    const whitelist = ["logo-clean.png", "favicon", "manifest.json", "apple-touch-icon"];
    const isWhiteListed = whitelist.some(item => url.includes(item));

    if (isWhiteListed) return url;

    // Für alles andere: Zeitstempel anhängen
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${Date.now()}`;
};

// ----------------------
// AUTH SYSTEM (GLOBAL)
// ----------------------

(function initAuth() {
  function resolveCurrentUserId() {
    const currentPath = window.location.pathname.toLowerCase();
    
    // Prüfen, ob wir bereits auf der Login-Seite sind (verhindert Endlosschleife)
    // .includes("/login") deckt /login, /login.html und Parameter ab
    const isLoginPage = currentPath.includes("/login");

    if (isLoginPage) {
      console.log("🔑 Login-Seite erkannt – Auth-Check pausiert.");
      // Falls doch eine ID da ist, setzen wir sie, aber wir redirecten nicht
      const raw = localStorage.getItem("currently_account");
      return raw ? String(raw).trim() : null;
    }

    const raw = localStorage.getItem("currently_account");

    if (!raw) {
      console.warn("🚪 Kein Account → redirect login");
      window.location.replace("/login.html");
      return null;
    }

    const id = String(raw).trim();

    if (!/^U\d{2,}$/.test(id)) {
      console.warn("🚪 Ungültige User-ID → redirect login:", id);
      window.location.replace("/login.html");
      return null;
    }

    return id;
  }

  window.CURRENT_USER_ID = resolveCurrentUserId();

  if (window.CURRENT_USER_ID) {
    console.log("👤 CURRENT_USER_ID:", window.CURRENT_USER_ID);
  }
})();


// ----------------------
// INTERNET ?
// ----------------------

// --- CSS dynamisch einfügen ---
const style = document.createElement("style");
style.textContent = `
#offline-warning {
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%);
    padding: 14px 22px;
    background: rgb(255, 0, 0);
    border: 3px solid rgb(200, 0, 0);
    backdrop-filter: blur(8px);
    box-shadow: 0px 0px 15px rgba(255, 0, 0, 0.92);
    border-radius: 14px;
    display: none;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.25s ease;
    pointer-events: none;
    animation: offlineGlowPulse 2s infinite ease-in-out;
}

#offline-warning.show {
    display: block;
    opacity: 1;
}

.offline-content {
    display: flex;
    align-items: center;
    gap: 12px;
    pointer-events: none;
}

.offline-content svg {
    width: 26px;
    height: 26px;
}

.offline-text {
    font-size: 17px;
    font-weight: 600;
    color: #e3e3e3;
    font-family: arial, sans-serif;
}

@keyframes offlineGlowPulse {
  0% {
    box-shadow: 0 0 5px rgba(255, 0, 0, 0.92),
                0 0 15px rgba(216, 0, 0, 0.92);
  }
  50% {
    box-shadow: 0 0 15px rgba(255, 0, 0, 0.92),
                0 0 25px rgba(216, 0, 0, 0.92);
  }
  100% {
    box-shadow: 0 0 5px rgba(255, 0, 0, 0.92),
                0 0 15px rgba(216, 0, 0, 0.92);
  }
}
`;
document.head.appendChild(style);

// --- HTML Element dynamisch erzeugen ---
const offlineWarning = document.createElement("div");
offlineWarning.id = "offline-warning";

offlineWarning.innerHTML = `
    <div class="offline-content">
        <span class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
                <path d="M73-536 2-607q19-18 39.5-34.5T83-673l-53-38 57-81 786 550-57 82-313-219q-6-1-11.5-1H480q-51 0-97.5 18T298-309l-70-71q32-31 70.5-52.5T379-466l-60-42q-37 15-70.5 36.5T186-422l-70-71q25-24 52-44t57-37l-54-38q-26 17-50.5 35.5T73-536Zm350.5 352.5Q400-207 400-240t23.5-56.5Q447-320 480-320t56.5 23.5Q560-273 560-240t-23.5 56.5Q513-160 480-160t-56.5-23.5ZM401-695l-112-78q47-14 94.5-20.5T480-800q134 0 257.5 49.5T958-607l-71 71q-82-79-187-121.5T480-700q-20 0-39.5 1t-39.5 4Zm380 266L479-640q103 0 197.5 37.5T845-494l-64 65Z"/>
            </svg>
        </span>
        <span class="offline-text">Keine Verbindung!</span>
    </div>
`;
document.body.appendChild(offlineWarning);

// --- Online/Offline Logik ---
function updateConnectionStatus() {
    if (!navigator.onLine) {
        offlineWarning.classList.add("show");
    } else {
        offlineWarning.classList.remove("show");
    }
}

updateConnectionStatus();
window.addEventListener("offline", updateConnectionStatus);
window.addEventListener("online", updateConnectionStatus);


// ----------------------
// SERVICE WORKER - register
// ----------------------
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("✅ SW registriert:", reg.scope);
      })
      .catch((err) => {
        console.error("❌ SW Fehler:", err);
      });
  }
// ---------------------------------------------------------
// 🎭 SEITEN-TRANSITIONS & NAVIGATION
// ---------------------------------------------------------
(function() {
    // 1. Die globale Navigations-Funktion (unser "Black Belt"-Move)
    window.navigateTo = function(url) {
        const isEnabled = localStorage.getItem("setting_fade_transition") === "true";
        const overlay = document.getElementById("page-transition-overlay");

        if (isEnabled && overlay) {
            // Vorhang zu!
            overlay.classList.add("is-active");
            setTimeout(() => overlay.classList.add("is-visible"), 10);

            // Nach der Animation (400ms) weiterleiten
            setTimeout(() => {
                window.location.href = url;
            }, 400);
        } else {
            // Wenn Transition aus: Sofortiger Schlag! (direkter Wechsel)
            window.location.href = url;
        }
    };

    // 2. Automatisches Fade-In beim Laden der Seite
    document.addEventListener("DOMContentLoaded", () => {
        const isEnabled = localStorage.getItem("setting_fade_transition") === "true";
        const overlay = document.getElementById("page-transition-overlay");
        
        if (!overlay) return;

        if (isEnabled) {
            overlay.classList.add("is-active");
            overlay.style.transition = "none";
            overlay.classList.add("is-visible");
            
            setTimeout(() => {
                overlay.style.transition = "opacity 0.2s ease-in-out";
                overlay.classList.remove("is-visible");
                setTimeout(() => {
                    if (!overlay.classList.contains("is-visible")) {
                        overlay.classList.remove("is-active");
                    }
                }, 200);
            }, 50);
        }
    });

    // 3. Automatischer Interceptor für ALLE <a> Links
    document.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (link && link.href && !link.target && !link.href.includes("#") && !link.getAttribute('download')) {
            const url = new URL(link.href);
            // Nur wenn es auf der gleichen Domain bleibt
            if (url.origin === window.location.origin) {
                e.preventDefault();
                window.navigateTo(link.href);
            }
        }
    });
})();

// ---------------------------------------------------------
// 🔍 ZOOM-SCHUTZ (Deaktiviert Zoom auf Mobilgeräten & PC)
// ---------------------------------------------------------
(function preventGlobalZoom() {
    // 1. Mobilgeräte: Viewport Meta-Tag erzwingen/aktualisieren
    const viewport = document.querySelector('meta[name="viewport"]');
    const zoomSettings = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    
    if (viewport) {
        viewport.content = zoomSettings;
    } else {
        const meta = document.createElement("meta");
        meta.name = "viewport";
        meta.content = zoomSettings;
        document.head.appendChild(meta);
    }

    // 2. PC: Tastenkombinationen für Zoom (Strg + / Strg - / Strg 0) blockieren
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && (e.key === '=' || e.key === '-' || e.key === '+' || e.key === '0' || e.key === '_')) {
            e.preventDefault();
        }
    }, { passive: false });

    // 3. PC: Mausrad-Zoom mit gedrückter Strg-Taste blockieren
    window.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });

    // 4. Touch: Double-Tap Zoom auf iOS/Android unterbinden
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) e.preventDefault();
        lastTouchEnd = now;
    }, false);
})();

// ----------------------------------
  // ======= User Color System ========
  // ----------------------------------


  const DEFAULT_AVATAR_COLORS = [
  "#ff0d00", // rot
  "#00ff40", // grün
  "#ffd900", // gelb
  "#ffae00", // orange
  "#00f8a6", // türkis
  "#00fbff", // hellblau
  "#09a1ff", // dunkelblau
  "#aa00ff", // lila
  "#dc00ca", // magenta dunkel
  "#ff77eb"  // pink
];


// 🎨 Avatar Farb-Management (LocalStorage)

// Holt die gespeicherten Farben oder ein leeres Objekt
function getUserColors() {
  try {
    const stored = localStorage.getItem("user_colors");
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.warn("⚠️ Fehler beim Lesen der user_colors aus dem LocalStorage", e);
    return {};
  }
}

// Speichert das aktualisierte Farb-Objekt
function saveUserColors(colorsObj) {
  localStorage.setItem("user_colors", JSON.stringify(colorsObj));
}

// Berechnet die Farbe deterministisch (U01 -> Index 0, U12 -> Index 1)
function determineColorForUser(userId) {
  // Versuche, die Nummer aus "U01", "U12" etc. zu extrahieren
  const match = userId.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    // Wir ziehen 1 ab, damit U01 den Index 0 (erste Farbe) bekommt
    const index = (num - 1) % DEFAULT_AVATAR_COLORS.length;
    // Fallback, falls mal was schiefgeht, nehmen wir absolut (Math.abs)
    return DEFAULT_AVATAR_COLORS[Math.abs(index)];
  } else {
    // Fallback für komische IDs ohne Nummern (wie dein alter Hash)
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash += userId.charCodeAt(i);
    }
    return DEFAULT_AVATAR_COLORS[hash % 10];
  }
}

// Initialisiert alle fehlenden User in der Liste
function initializeUserColors(chats) {
  const colors = getUserColors();
  let updated = false;

  chats.forEach(chat => {
    const uid = chat.benutzer_id;
    // CLASS wird ignoriert! Und nur wenn der User noch keine Farbe hat, wird eine generiert.
    if (uid !== "CLASS" && !colors[uid]) {
      colors[uid] = determineColorForUser(uid);
      updated = true;
    }
  });

  // Nur speichern, wenn wirklich ein neuer User hinzugefügt wurde (spart Performance)
  if (updated) {
    saveUserColors(colors);
    console.log("🎨 Neue User-Farben im LocalStorage gesichert!");
  }
}
