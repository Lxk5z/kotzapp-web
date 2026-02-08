const CURRENT_USER_ID = "U01"; // ⬅️ später dynamisch
const DEBUG_LOADING_DELAY = 0; // in ms, zu Testzwecken
const CDN = window.CDN_BASE || "https://cdn.jsdelivr.net/gh/Lxk5z/kotzapp-web@latest";
const API_BASE = "https://kotzapp.onrender.com";
const USER_GET = "/user/get/";
let nameChangeAllowed = false;
let lastOpenedCategory = null;
const allowedImageTypes = [
  "image/jpeg", "image/jpg", "image/png", "image/gif", "image/tiff",
  "image/bmp", "image/svg+xml", "image/webp", "image/avif",
  "image/x-nikon-nef", "image/x-canon-cr2", "image/x-olympus-orf",
  "image/vnd.adobe.photoshop", "application/postscript",
  "application/pdf", "image/vnd.adobe.illustrator",
  "image/x-icon", "image/x-tga", "image/x-exr",
  "image/jp2", "image/jpx", "image/jpm", "image/j2k",
  "image/heif", "image/heic", "image/bpg", "image/flif"
];

const SETTINGS_STRUCTURE = {
  allgemein: {
    title: "Allgemein",
    searchTerms: ["allgemein", "einstellungen", "general", "settings"],
    subs: {
      design: {
        title: "Design, Darstellung & Visuelles",
        searchTerms: ["design", "darstellung", "visuelles", "aussehen", "theme", "farben", "colors"],
        items: [
          { 
            label: "Hell-/Dunkelmodus", 
            searchTerms: ["hell", "dunkel", "dark", "light", "mode", "modus", "theme"],
            action: "openThemeSettings" 
          },
          { 
            label: "Chat-Hintergrund ändern", 
            searchTerms: ["hintergrund", "background", "wallpaper", "chat"],
            action: "openBackgroundPicker" 
          },
          { 
            label: "Online-/Offline Animation über Chat", 
            searchTerms: ["online", "offline", "animation", "status", "chat"],
            action: "openOnlineAnimationSettings" 
          }
        ]
      },
      shortcuts: {
        title: "App-Kurzbefehle",
        searchTerms: ["kurzbefehle", "shortcuts", "tastatur", "keyboard", "hotkeys"],
        items: [
          { 
            label: "Enter = Senden", 
            searchTerms: ["enter", "senden", "send", "return", "tastatur"],
            action: "toggleEnterToSend" 
          }
        ]
      }
    }
  },

  benachrichtigungen: {
    title: "Benachrichtigungen",
    searchTerms: ["benachrichtigungen", "mitteilungen", "notifications", "alerts", "push"],
    subs: {
      tones: {
        title: "Töne",
        searchTerms: ["töne", "sounds", "audio", "klingelton", "ton"],
        items: [
          { 
            label: "Ton abspielen", 
            searchTerms: ["ton", "abspielen", "play", "sound", "test"],
            action: "playTestTone" 
          },
          { 
            label: "Nachrichtenton", 
            searchTerms: ["nachrichtenton", "message", "sound", "ton", "benachrichtigung"],
            action: "openNotificationTone" 
          }
        ]
      },
      popup: {
        title: "Popup & Vorschau",
        searchTerms: ["popup", "vorschau", "preview", "banner", "anzeige"],
        items: [
          { 
            label: "Benachrichtigungen aktivieren", 
            searchTerms: ["benachrichtigungen", "aktivieren", "enable", "notifications", "einschalten"],
            action: "toggleNotifications" 
          },
          { 
            label: "Vorschau anzeigen", 
            searchTerms: ["vorschau", "preview", "anzeigen", "show", "nachrichten"],
            action: "togglePreview" 
          }
        ]
      },
      mute: {
        title: "Stummschaltung",
        searchTerms: ["stumm", "mute", "silent", "lautlos", "stummschaltung"],
        items: [
          { 
            label: "Stumme Chats & Gruppen", 
            searchTerms: ["stumm", "mute", "chats", "gruppen", "groups", "silent"],
            action: "openMutedChats" 
          }
        ]
      }
    }
  },

  datenschutz: {
    title: "Datenschutz",
    searchTerms: ["datenschutz", "privacy", "sicherheit", "security", "privat"],
    subs: {
      visibility: {
        title: "Sichtbarkeit",
        searchTerms: ["sichtbarkeit", "visibility", "status", "online", "anzeige"],
        items: [
          { 
            label: "Online-Status verbergen", 
            searchTerms: ["online", "status", "verbergen", "hide", "sichtbar"],
            action: "toggleOnlineStatus" 
          },
          { 
            label: "Lesebestätigungen deaktivieren", 
            searchTerms: ["lesebestätigung", "read", "receipts", "gelesen", "haken"],
            action: "toggleReadReceipts" 
          }
        ]
      },
      block: {
        title: "Blockieren",
        searchTerms: ["blockieren", "block", "sperren", "banned"],
        items: [
          { 
            label: "Blockierte Kontakte", 
            searchTerms: ["blockiert", "blocked", "kontakte", "contacts", "gesperrt"],
            action: "openBlockedContacts" 
          }
        ]
      }
    }
  },

  konto: {
    title: "Konto",
    searchTerms: ["konto", "account", "profil", "profile", "user"],
    items: [
      { 
        label: "Email Adresse", 
        searchTerms: ["email", "e-mail", "adresse", "address", "mail"],
        action: "openEmailSettings" 
      },
      { 
        label: "Anmeldeverfahren", 
        searchTerms: ["anmeldung", "login", "passwort", "password", "sicherheit"],
        action: "openLoginSettings" 
      }
    ]
  },

  invite: {
    title: "Zu KotzApp einladen",
    searchTerms: ["einladen", "invite", "freunde", "friends", "teilen", "share"],
    items: [
      { 
        label: "Freunde einladen", 
        searchTerms: ["freunde", "friends", "einladen", "invite", "link"],
        action: "inviteFriends" 
      }
    ]
  }
}

function compressImage(file, maxSize = 512) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = e => {
      img.src = e.target.result;
    };

    img.onload = () => {
      let { width, height } = img;

      // Skalieren falls zu groß
      if (width > maxSize || height > maxSize) {
        const scale = Math.min(maxSize / width, maxSize / height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // JPEG → kleiner, gute Qualität
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

      // Prefix entfernen
      const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");

      resolve(base64);
    };

    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}


/* Loading Bar Hilfsfunktionen */
function showLoadingBar() {
  document.getElementById("loading-bar")?.classList.remove("hidden");
  document.getElementById("loading-bar")?.style.setProperty("display", "block");
}

function hideLoadingBar() {
  document.getElementById("loading-bar")?.classList.add("hidden");
  document.getElementById("loading-bar")?.style.setProperty("display", "none");
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = 5, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res;
    } catch (err) {
      console.warn(`Fetch failed (${i + 1}/${retries}):`, err);

      if (i === retries - 1) throw err; // letzter Versuch → Fehler weiterwerfen

      await new Promise(r => setTimeout(r, delayMs)); // warten
    }
  }
}

// =================================================
// PROFIL LADEN
// =================================================

function setProfileImage(imgEl, base64) {
  if (!imgEl) return;

  // ❌ kein Bild → Fallback
  if (!base64 || base64 === null) {
    imgEl.src = "assets/default_profile.png";
    return;
  }

  // ✅ Falls Backend irgendwann schon data:image/... liefert
  if (base64.startsWith("data:image")) {
    imgEl.src = base64;
    return;
  }

  // ✅ Reines Base64 → Data URL bauen
  imgEl.src = `data:image/png;base64,${base64}`;
}

async function loadUserProfile() {
  showLoadingBar();
  await delay(DEBUG_LOADING_DELAY);

  try {
    const url = API_BASE + USER_GET + CURRENT_USER_ID;
    const res = await fetchWithRetry(url, {}, 5, 1000);

    const data = await res.json();
    const user = Array.isArray(data) ? data[0] : data;

    const profileImage = document.getElementById("profileImage");
    const usernameEl = document.querySelector(".profile-username");
    const rangEl = document.querySelector(".profile-rang");
    const bioEl = document.querySelector(".profile-bio");

    usernameEl.textContent =
      user.formatierter_name !== null && user.formatierter_name !== undefined
        ? user.formatierter_name
        : "Unbekannt";

    bioEl.textContent =
      user.description && user.description.trim() !== ""
        ? user.description
        : "Keine Beschreibung vorhanden.";

    const profileInner = document.querySelector(".profile-inner");
    const rang = user.rang ?? "Normaler User";

    if (rang === "Normaler User") {
      rangEl.style.display = "none";
      profileInner.classList.add("no-rang");
    } else {
      profileInner.classList.remove("no-rang");
      rangEl.style.display = "inline-block";
      rangEl.textContent = rang;
      rangEl.className = "profile-rang";

      const rangClassMap = {
        Admin: "rang-admin",
        Moderator: "rang-moderator",
        Donator: "rang-donator",
        "Donator+": "rang-donatorplus",
        Apex: "rang-apex"
      };

      if (rangClassMap[rang]) {
        rangEl.classList.add(rangClassMap[rang]);
      }
    }

    setProfileImage(profileImage, user.profile_image);

    const bgEl = document.getElementById("profileBackground");
    if (typeof user.background === "number") {
      bgEl.style.backgroundImage =
        `url(${CDN}/images/users/backgrounds/background${user.background}.png)`;
    } else {
      bgEl.style.background = "linear-gradient(135deg, #111, #000)";
    }

  } catch (err) {
    console.error("❌ Profil konnte nicht geladen werden:", err);

    const container = document.querySelector(".profile-inner");
    if (container) {
      container.innerHTML = `
        <div style="padding:20px; text-align:center;">
          <p style="color:#f55; font-size:16px; margin-bottom:10px; font-family: Arial, sans-serif; font-weight: bold;">
            Server nicht erreichbar.
          </p>
          <button id="retryLoadProfile" style="
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
    }

    document.getElementById("retryLoadProfile")?.addEventListener("click", () => {
      loadUserProfile();
    });

  } finally {
    hideLoadingBar();
  }
}


loadUserProfile();

// =================================================
// SEARCH FIELD
// =================================================

// ========= Search Icon Farblogik ==========

const searchContainer = document.querySelector(".search-container");
const searchInput = searchContainer.querySelector("input");
const clearBtn = document.querySelector(".search-clear");
const searchIcon = document.querySelector(".search-icon");

function updateSearchState() {
  const hasText = searchInput.value.trim().length > 0;

  // Icon-Farbe per Klasse steuern
  if (hasText) {
    searchContainer.classList.add("has-text");
    clearBtn.classList.remove("hidden");
  } else {
    searchContainer.classList.remove("has-text");
    clearBtn.classList.add("hidden");
  }
}

// Live reagieren
searchInput.addEventListener("input", updateSearchState);

// Clear-Button
clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  updateSearchState();
  searchInput.focus();
});

// Initialzustand beim Laden
updateSearchState();

// =================================================
// PROFILE EDIT OVERLAY
// =================================================

const overlay = document.getElementById("profileEditOverlay");

// Öffnen über beide Buttons
document.querySelector(".settings-edit-btn")?.addEventListener("click", openEdit);
document.querySelector(".edit-button")?.addEventListener("click", openEdit);

// Schließen
document.querySelector(".edit-overlay-backdrop")
  ?.addEventListener("click", closeEdit);

document.getElementById("cancelEditBtn")
  ?.addEventListener("click", closeEdit);

// ===============================
// PROFILE EDIT – Daten laden & Overlay öffnen
// ===============================

async function openEdit() {
  try {
    showLoadingBar();

    const res = await fetch(`${API_BASE}/user/get/${CURRENT_USER_ID}`);
    if (!res.ok) throw new Error("Profil konnte nicht geladen werden");

    const raw = await res.json();
    const user = Array.isArray(raw) ? raw[0] : raw;

    // Name
    document.getElementById("newName").value =
      user.formatierter_name || "";
      window.originalNameValue = user.formatierter_name || "";

  
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// NAME CHANGE CHECK

try {
  const askUrl = `${API_BASE}/user/name/change/ask/${CURRENT_USER_ID}`;
  const askRes = await fetch(askUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ benutzer_id: CURRENT_USER_ID })
  });

  const askData = await askRes.json();

  const nameInput = document.getElementById("newName");
  const lockOverlay = document.querySelector(".name-lock-overlay");
  const lockInfo = document.getElementById("nameLockedInfo");

  if (askData.allowed === true) {
    // Name darf geändert werden
    nameChangeAllowed = true;
    nameInput.disabled = false;
    lockOverlay.classList.add("hidden");
    lockInfo.classList.add("hidden");
  } else {
    // Name darf NICHT geändert werden
    nameChangeAllowed = false;
    nameInput.disabled = true;
    lockOverlay.classList.remove("hidden");

    const days = askData.days_left;
    const suffix = days === 1 ? "Tag" : "Tagen";

    lockInfo.textContent =
      `Du kannst deinen Namen erst wieder in ${days} ${suffix} ändern.`;

    lockInfo.classList.remove("hidden");
  }
} catch (err) {
  console.error("Fehler beim Name-Check:", err);
}


    // Description
    document.getElementById("newDescription").value =
      user.description || "";
      window.originalDescriptionValue = user.description || "";

    // Hintergrund
    const bgValue = typeof user.background === "number" ? user.background : 1;
    document.getElementById("newBackground").value = bgValue;
    window.originalBackgroundValue = bgValue;

    // WICHTIG: Picker-Logik hier synchronisieren
    currentBgIndex = bgValue;
    updateBackgroundPreview();

    // Profilbild
    const preview = document.getElementById("editProfilePreview");

    if (!user.profile_image) {
      preview.src = `${CDN}/images/users/default.png`;
    } else if (user.profile_image.startsWith("data:image")) {
      preview.src = user.profile_image;
    } else {
      preview.src = `data:image/png;base64,${user.profile_image}`;
    }

    if (!user.profile_image) {
  window.originalProfileImageBase64 = "";
} else if (user.profile_image.startsWith("data:image")) {
  window.originalProfileImageBase64 =
    user.profile_image.replace(/^data:image\/\w+;base64,/, "");
} else {
  window.originalProfileImageBase64 = user.profile_image;
}

// Reset Flags für Editor
preview.dataset.removed = "false";
preview.dataset.newImageBase64 = "";


    overlay.classList.remove("hidden");

setTimeout(() => {
  overlay.classList.add("visible");
  document.querySelector(".edit-modal").classList.add("visible");
}, 10);


    // Bio nach dem Öffnen korrekt initialisieren
setTimeout(() => {
  const bio = document.getElementById("newDescription");
  const counter = document.getElementById("bioCounter");

  if (bio && counter) {
    // Counter aktualisieren
    const length = bio.value.length;
    counter.textContent = `${length}/300`;

    // Farb-Logik
    counter.classList.remove("warn", "max");
    if (length >= 300) {
      counter.classList.add("max");
    } else if (length >= 250) {
      counter.classList.add("warn");
    }

    // Auto-Resize
    bio.style.height = "auto";
    bio.style.height = bio.scrollHeight + "px";
  }
}, 10);

  } catch (err) {
    console.error("❌ Fehler beim Öffnen des Profil-Editors:", err);
  } finally {
    hideLoadingBar();
  }
}

const nameInput = document.getElementById("newName");
const nameLockedInfo = document.getElementById("nameLockedInfo");

nameInput.addEventListener("input", () => {
  if (!nameChangeAllowed) return;

  const current = nameInput.value.trim();
  const original = (window.originalNameValue || "").trim();

  // Wenn Name wieder original ist → Hinweis ausblenden
  if (current === original) {
    nameLockedInfo.classList.add("hidden");
    return;
  }

  // Wenn Name verändert wurde → Hinweis anzeigen
  if (current !== "") {
    nameLockedInfo.textContent =
  "Nach einer Namensänderung ist dein Name für 30 Tage unänderbar. \nAußerdem muss ein Moderator deine Änderung bestätigen.";
    nameLockedInfo.classList.remove("hidden");
  }
});

function closeEdit() {
  overlay.classList.remove("visible");
  document.querySelector(".edit-modal").classList.remove("visible");

  setTimeout(() => {
    overlay.classList.add("hidden");
  }, 250); // gleiche Dauer wie CSS transition
}


// ===============================
// Hintergrund Picker (NEU)
// ===============================

let currentBgIndex = 1;
const bgPreview = document.getElementById("bgPreview");
const bgCounterEl = document.getElementById("bgCounter");
const bgInput = document.getElementById("newBackground");

function updateBackgroundPreview() {
  bgPreview.style.backgroundImage =
    `url(${CDN}/images/users/backgrounds/background${currentBgIndex}.png)`;

  bgCounterEl.textContent = `${currentBgIndex}/30`;
  bgInput.value = currentBgIndex;
}

function animateArrowClick(btn) {
  btn.classList.add("active-click");
  btn.classList.add("no-hover");

  setTimeout(() => btn.classList.remove("active-click"), 150);
  setTimeout(() => btn.classList.remove("no-hover"), 200);
}

// PREV
document.getElementById("bgPrev").addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();

  currentBgIndex = currentBgIndex === 1 ? 30 : currentBgIndex - 1;

  animateArrowClick(e.currentTarget);
  updateBackgroundPreview();
});

// NEXT
document.getElementById("bgNext").addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();

  currentBgIndex = currentBgIndex === 30 ? 1 : currentBgIndex + 1;

  animateArrowClick(e.currentTarget);
  updateBackgroundPreview();
});

// ===============================
// Keyboard Navigation für Background Picker (nur PC)
// ===============================

document.addEventListener("keydown", (e) => {
  // Overlay muss offen sein
  const overlay = document.querySelector(".edit-overlay");
  if (!overlay || overlay.classList.contains("hidden")) return;

  // Wenn man gerade in einem Input/Textarea tippt → nicht reagieren
  const active = document.activeElement;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;

  // Links
  if (e.key === "ArrowLeft") {
    const btn = document.getElementById("bgPrev");
    btn.click(); // nutzt deine bestehende Logik + Animation
  }

  // Rechts
  if (e.key === "ArrowRight") {
    const btn = document.getElementById("bgNext");
    btn.click();
  }
});

// ===============================
// Bio: Auto-Resize + Zeichen-Counter
// ===============================

const bioTextarea = document.getElementById("newDescription");
const bioCounter = document.getElementById("bioCounter");

function autoResizeTextarea(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function updateBioCounter() {
  const length = bioTextarea.value.length;

  // Text setzen
  bioCounter.textContent = `${length}/300`;

  // Klassen zurücksetzen
  bioCounter.classList.remove("warn", "max");

  // Farb-Logik
  if (length >= 300) {
    bioCounter.classList.add("max");
    bioTextarea.value = bioTextarea.value.substring(0, 300);
    bioCounter.textContent = "300/300";
  } else if (length >= 250) {
    bioCounter.classList.add("warn");
  }

  // Auto-Resize
  autoResizeTextarea(bioTextarea);
}

// Live beim Tippen
bioTextarea.addEventListener("input", updateBioCounter);

// Beim Öffnen des Editors → Höhe + Counter setzen
function initBioField() {
  updateBioCounter();
  autoResizeTextarea(bioTextarea);
}

// openEdit erweitern
const oldOpenEdit = openEdit;
openEdit = async function () {
  await oldOpenEdit();

  // Bio nach dem Öffnen korrekt anpassen
  setTimeout(() => initBioField(), 10);
};

// Profilbild Zoom-Logik
const editAvatar = document.getElementById("editProfilePreview");

editAvatar.addEventListener("click", () => {
  editAvatar.classList.toggle("expanded");
});

// =================================================
// BOTTOM SHEET LOGIK
// =================================================

const bottomSheet = document.getElementById("editBottomSheet");
const bottomSheetOverlay = document.getElementById("editBottomSheetOverlay");

const btnChoosePhoto = document.getElementById("sheetChoosePhoto");
const btnTakePhoto = document.getElementById("sheetTakePhoto");
const btnRemovePhoto = document.getElementById("sheetRemovePhoto");
const btnCancelSheet = document.getElementById("sheetCancel");

const fileInput = document.getElementById("newProfileImage");
const previewImg = document.getElementById("editProfilePreview");

document.querySelector(".edit-avatar-button").addEventListener("click", openBottomSheet);

function openBottomSheet() {
  bottomSheet.classList.remove("hidden");
  bottomSheetOverlay.classList.remove("hidden");

  // Animation aktivieren
  setTimeout(() => {
    bottomSheet.classList.add("visible");
    bottomSheetOverlay.classList.add("visible");
  }, 10);
}

function closeBottomSheet() {
  bottomSheet.classList.remove("visible");
  bottomSheetOverlay.classList.remove("visible");

  setTimeout(() => {
    bottomSheet.classList.add("hidden");
    bottomSheetOverlay.classList.add("hidden");
  }, 250);
}

function closeBottomSheetOnly() {
  // 1. hidden entfernen, damit die Animation überhaupt laufen kann
  bottomSheet.classList.remove("hidden");

  // 2. Reflow erzwingen (Browser zwingt Layout-Neuberechnung)
  void bottomSheet.offsetHeight;

  // 3. visible entfernen → CSS Transition startet
  bottomSheet.classList.remove("visible");

  // 4. nach der Animation wieder verstecken
  setTimeout(() => {
    bottomSheet.classList.add("hidden");
  }, 250); // gleiche Dauer wie deine CSS-Transition
}

bottomSheetOverlay.addEventListener("click", closeBottomSheet);
btnCancelSheet.addEventListener("click", closeBottomSheet);

btnChoosePhoto.addEventListener("click", () => {
  closeBottomSheetOnly();   // nur Sheet schließen
  fileInput.click();        // Blur bleibt sichtbar
});

btnTakePhoto.addEventListener("click", () => {
  closeBottomSheetOnly();
  fileInput.setAttribute("capture", "user");
  fileInput.click();
  setTimeout(() => fileInput.removeAttribute("capture"), 500);
});

btnRemovePhoto.addEventListener("click", () => {
  closeBottomSheetOnly();
  previewImg.src = `${CDN}/images/users/default.png`;
  previewImg.dataset.removed = "true";
  previewImg.dataset.newImageBase64 = "";
});


fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  // 1. Format prüfen
  if (!allowedImageTypes.includes(file.type)) {
    alert("Dieses Dateiformat wird nicht unterstützt.");
    return;
  }

  try {
    // 2. Bild komprimieren
    const compressedBase64 = await compressImage(file);

    // 3. Preview aktualisieren
    previewImg.src = "data:image/jpeg;base64," + compressedBase64;

    // 4. Merken, dass ein neues Bild existiert
    previewImg.dataset.removed = "false";
    previewImg.dataset.newImageBase64 = compressedBase64;

    // 5. Blur-Overlay ausblenden
    bottomSheetOverlay.classList.add("hidden");

  } catch (err) {
    console.error("Fehler beim Verarbeiten des Bildes:", err);
    alert("Das Bild konnte nicht verarbeitet werden.");
  }
});


// ==============================
// SAVE BUTTON LOGIK
// ==============================

document.getElementById("saveProfileBtn").addEventListener("click", async () => {
  showLoadingBar();

  const payload = {
    benutzer_id: CURRENT_USER_ID
  };

  // === NAME ===
  const newName = document.getElementById("newName").value.trim();
  if (nameChangeAllowed && newName !== window.originalNameValue) {
    payload.new_name = newName;
  }

  // === DESCRIPTION ===
  const newDescription = document.getElementById("newDescription").value.trim();
  if (newDescription !== window.originalDescriptionValue) {
    payload.new_description = newDescription;
  }

  // === BACKGROUND ===
  const newBackground = Number(document.getElementById("newBackground").value);
  if (newBackground !== window.originalBackgroundValue) {
    payload.new_background = newBackground;
  }

  // === PROFILE IMAGE ===
  const previewImg = document.getElementById("editProfilePreview");

  if (previewImg.dataset.removed === "true") {
    // Bild wurde gelöscht
    payload.new_profile_image = "";
  } else if (previewImg.dataset.newImageBase64) {
    // Neues Bild wurde hochgeladen
    payload.new_profile_image = previewImg.dataset.newImageBase64;
  }

  // Wenn sich NICHTS geändert hat → abbrechen
  if (Object.keys(payload).length === 1) {
    hideLoadingBar();
    closeEdit();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/user/update/${CURRENT_USER_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Fehler beim Speichern");

    // Profil neu laden
    await loadUserProfile();

    // Overlay schließen
    closeEdit();

  } catch (err) {
    console.error("❌ Fehler beim Speichern:", err);
    alert("Profil konnte nicht gespeichert werden.");
  } finally {
    hideLoadingBar();
  }
});


// ===================================
// NAVIGATION BAR – Keyboard Navigation
// ===================================

let navSelectedIndex = -1;

// Auswahl entfernen
function clearNavbarKeyboardHover() {
  const navItems = Array.from(document.querySelectorAll("nav ul li"));
  navItems.forEach(li => li.classList.remove("keyboard-hover"));
  navSelectedIndex = -1;
}

document.addEventListener("keydown", (e) => {
  // Wenn User in einem Textfeld tippt → abbrechen
  const active = document.activeElement;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
    return;
  }

  const navItems = Array.from(document.querySelectorAll("nav ul li"));
  if (navItems.length === 0) return;

  // ENTER → Link öffnen
  if (e.key === "Enter" && navSelectedIndex !== -1) {
    const link = navItems[navSelectedIndex].querySelector("a");
    if (link) window.location.href = link.href;
    return;
  }

  // Nur Tasten 1–4 erlauben
  if (!["1", "2", "3", "4"].includes(e.key)) {
    clearNavbarKeyboardHover();
    return;
  }

  // Index setzen
  navSelectedIndex = Number(e.key) - 1;

  // Sicherheit
  if (!navItems[navSelectedIndex]) return;

  // Hover-Klasse setzen
  navItems.forEach(li => li.classList.remove("keyboard-hover"));
  navItems[navSelectedIndex].classList.add("keyboard-hover");
});

// Mausbewegung → Auswahl löschen
document.addEventListener("mousemove", clearNavbarKeyboardHover);

// Klick irgendwo → Auswahl löschen
document.addEventListener("click", clearNavbarKeyboardHover);


// ===================================
// Settings Liste
// ===================================

const panelRoot = document.getElementById("panel-root");
const panelSub = document.getElementById("panel-sub");
const panelDetail = document.getElementById("panel-detail");
const panelSearch = document.getElementById("panel-search");

const subTitle = document.getElementById("sub-title");
const detailTitle = document.getElementById("detail-title");

const subContent = document.getElementById("sub-content");
const detailContent = document.getElementById("detail-content");

// Panel-Wechsel-Funktion
function showPanel(panel) {
  panelRoot.classList.remove("active", "slide-left", "slide-right");
  panelSub.classList.remove("active", "slide-left", "slide-right");
  panelDetail.classList.remove("active", "slide-left", "slide-right");
  panelSearch.classList.remove("active", "slide-left", "slide-right");

  if (panel === "root") {
    moveSearchField("root");
    panelRoot.classList.add("active");
    panelSub.classList.add("slide-right");
    panelDetail.classList.add("slide-right");
    panelSearch.classList.add("slide-right");
  }

  if (panel === "sub") {
    moveSearchField("root");
    panelRoot.classList.add("slide-left");
    panelSub.classList.add("active");
    panelDetail.classList.add("slide-right");
    panelSearch.classList.add("slide-right");
  }

  if (panel === "detail") {
    moveSearchField("root");
    panelRoot.classList.add("slide-left");
    panelSub.classList.add("slide-left");
    panelDetail.classList.add("active");
    panelSearch.classList.add("slide-right");
  }

  if (panel === "search") {
    moveSearchField("search");
    panelRoot.classList.add("slide-left");
    panelSub.classList.add("slide-left");
    panelDetail.classList.add("slide-left");
    panelSearch.classList.add("active");

    // 🔥 WICHTIG: Fokus wiederherstellen, damit Tastatur offen bleibt
    setTimeout(() => {
        settingsSearchInput.focus();
    }, 0);
  }
}

// Das eine echte Suchfeld
const searchWrapper = document.querySelector("#panel-root .search-wrapper");

// Zielbereiche
const rootPanel = document.getElementById("panel-root");
const searchPanel = document.getElementById("panel-search");

// Suchfeld verschieben
function moveSearchField(to) {
  if (to === "search") {
    searchPanel.insertBefore(searchWrapper, searchPanel.children[1]);
  } else {
    rootPanel.insertBefore(searchWrapper, rootPanel.children[1]);
  }
}

function openCategory(categoryId) {
  const category = SETTINGS_STRUCTURE[categoryId];
  if (!category) return;

  lastOpenedCategory = categoryId; // merken

  // Kategorie hat direkte Items → direkt Panel 3
  if (category.items) {
    detailTitle.textContent = category.title;
    detailContent.innerHTML = "";

    category.items.forEach(item => {
      const btn = document.createElement("button");
      btn.className = "settings-btn-detail";
      btn.dataset.action = item.action;
      btn.innerHTML = `
        <span>${item.label}</span>
        <span class="chevron">›</span>
      `;
      detailContent.appendChild(btn);
    });

    showPanel("detail");
    return;
  }

  // Kategorie hat Unterkategorien → Panel 2
  subTitle.textContent = category.title;
  subContent.innerHTML = "";

  Object.entries(category.subs).forEach(([subId, sub]) => {
    const btn = document.createElement("button");
    btn.className = "settings-btn-sub";
    btn.dataset.sub = `${categoryId}.${subId}`;
    btn.innerHTML = `
      <span>${sub.title}</span>
      <span class="chevron">›</span>
    `;
    subContent.appendChild(btn);
  });

  showPanel("sub");
}

function openSubCategory(path) {
  const [categoryId, subId] = path.split(".");
  const sub = SETTINGS_STRUCTURE[categoryId].subs[subId];

  detailTitle.textContent = sub.title;
  detailContent.innerHTML = "";

  sub.items.forEach(item => {
    const btn = document.createElement("button");
    btn.className = "settings-btn-detail";
    btn.dataset.action = item.action;
    btn.innerHTML = `
      <span>${item.label}</span>
      <span class="chevron">›</span>
    `;
    detailContent.appendChild(btn);
  });

  showPanel("detail");
}
document.addEventListener("click", (e) => {
  const rootBtn = e.target.closest(".settings-btn-root");
  if (rootBtn) {
    openCategory(rootBtn.dataset.category);
    return;
  }

  const subBtn = e.target.closest(".settings-btn-sub");
  if (subBtn) {
    openSubCategory(subBtn.dataset.sub);
    return;
  }

const backBtn = e.target.closest(".back-btn");
if (backBtn) {

  // Wenn wir im Search-Panel sind → zurück zu Root
  if (panelSearch.classList.contains("active")) {
  settingsSearchInput.value = "";
  showPanel("root");
  return;
}

  // Wenn wir im Detail-Panel sind
  if (panelDetail.classList.contains("active")) {

    const category = SETTINGS_STRUCTURE[lastOpenedCategory];

    // Kategorie hat KEINE Unterkategorien → zurück zu root
    if (category.items) {
      showPanel("root");
      return;
    }

    // Kategorie hat Unterkategorien → zurück zu sub
    showPanel("sub");
    return;
  }

  // Wenn wir im Sub-Panel sind → immer zurück zu root
  if (panelSub.classList.contains("active")) {
    showPanel("root");
    return;
  }
}

const detailBtn = e.target.closest(".settings-btn-detail");
  if (detailBtn) {
    const action = detailBtn.dataset.action;
    console.log("Action:", action);
    // später: echte Funktionen
  }
});

// ===============================
// GLOBAL SETTINGS SEARCH
// ===============================

const settingsSearchInput = document.getElementById("settingsSearchInput");
const searchResultsContainer = document.getElementById("search-results");

// Funktion: Text mit Highlighting
function highlightText(text, query) {
  if (!query) return text;
  
  const regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, '<span class="search-highlight">$1</span>');
}

// Funktion: Suchergebnisse sammeln
function searchSettings(query) {
  const results = {};
  
  // Hilfsfunktion: Prüft ob Query in searchTerms vorkommt
  function matchesSearch(searchTerms, query) {
    if (!searchTerms) return false;
    return searchTerms.some(term => term.toLowerCase().includes(query));
  }
  
  // Durch alle Kategorien iterieren
  Object.entries(SETTINGS_STRUCTURE).forEach(([catId, category]) => {
    
    // Kategorie hat direkte Items (z.B. "Konto", "Invite")
    if (category.items) {
      const matchingItems = category.items.filter(item =>
        item.label.toLowerCase().includes(query) ||
        matchesSearch(item.searchTerms, query)
      );
      
      if (matchingItems.length > 0) {
        results[catId] = {
          title: category.title,
          items: matchingItems.map(item => ({
            ...item,
            path: catId
          }))
        };
      }
    }
    
    // Kategorie hat Unterkategorien (z.B. "Allgemein", "Benachrichtigungen")
    if (category.subs) {
      Object.entries(category.subs).forEach(([subId, sub]) => {
        const matchingItems = sub.items.filter(item =>
          item.label.toLowerCase().includes(query) ||
          matchesSearch(item.searchTerms, query)
        );
        
        if (matchingItems.length > 0) {
          if (!results[catId]) {
            results[catId] = {
              title: category.title,
              subs: {}
            };
          }
          
          if (!results[catId].subs) {
            results[catId].subs = {};
          }
          
          results[catId].subs[subId] = {
            title: sub.title,
            items: matchingItems.map(item => ({
              ...item,
              path: `${catId}.${subId}`
            }))
          };
        }
      });
    }
  });
  
  return results;
}

// Funktion: Suchergebnisse anzeigen
function displaySearchResults(results, query) {
  searchResultsContainer.innerHTML = "";
  
  if (Object.keys(results).length === 0) {
    searchResultsContainer.innerHTML = `
      <div style="padding: 40px 20px; text-align: center;">
        <p style="color: var(--text-color-light); font-size: 16px; font-family: Arial, sans-serif;">
          Keine Ergebnisse für "${query}"
        </p>
      </div>
    `;
    return;
  }
  
  // Durch Kategorien iterieren
  Object.entries(results).forEach(([catId, category]) => {
    const categoryDiv = document.createElement("div");
    categoryDiv.className = "search-result-category";
    
    const categoryTitle = document.createElement("div");
    categoryTitle.className = "search-result-category-title";
    categoryTitle.textContent = category.title;
    categoryTitle.style.cursor = "pointer";
    categoryTitle.dataset.categoryId = catId;
    categoryDiv.appendChild(categoryTitle);
    
    // Kategorie hat direkte Items
    if (category.items) {
      category.items.forEach(item => {
        const itemBtn = document.createElement("button");
        itemBtn.className = "search-result-item";
        itemBtn.dataset.path = item.path;
        itemBtn.dataset.action = item.action;
        itemBtn.innerHTML = `
          <span class="label">${highlightText(item.label, query)}</span>
          <span class="chevron">›</span>
        `;
        categoryDiv.appendChild(itemBtn);
      });
    }
    
    // Kategorie hat Unterkategorien
    if (category.subs) {
      Object.entries(category.subs).forEach(([subId, sub]) => {
        const subDiv = document.createElement("div");
        subDiv.className = "search-result-sub";
        
        const subTitle = document.createElement("div");
        subTitle.className = "search-result-sub-title";
        subTitle.textContent = sub.title;
        subTitle.style.cursor = "pointer";
        subTitle.dataset.path = `${catId}.${subId}`;
        subDiv.appendChild(subTitle);
        
        sub.items.forEach(item => {
          const itemBtn = document.createElement("button");
          itemBtn.className = "search-result-item";
          itemBtn.dataset.path = item.path;
          itemBtn.dataset.action = item.action;
          itemBtn.innerHTML = `
            <span class="label">${highlightText(item.label, query)}</span>
            <span class="chevron">›</span>
          `;
          subDiv.appendChild(itemBtn);
        });
        
        categoryDiv.appendChild(subDiv);
      });
    }
    
    searchResultsContainer.appendChild(categoryDiv);
  });
}

// Event Listener für Suchfeld
settingsSearchInput.addEventListener("input", () => {
  const query = settingsSearchInput.value.trim().toLowerCase();
  
  // Wenn leer → zurück zu Root
  if (query === "") {
    showPanel("root");
    return;
  }
  
  // Suche durchführen
  const results = searchSettings(query);
  
  // Ergebnisse anzeigen
  displaySearchResults(results, query);
  
  // Zum Search-Panel wechseln
  showPanel("search");
});

// ENTER-Taste → Blur
settingsSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    settingsSearchInput.blur();
  }
});

// Click außerhalb → Blur
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-container")) {
    settingsSearchInput.blur();
  }
});

// Klick auf Suchergebnis
searchResultsContainer.addEventListener("click", (e) => {
  const item = e.target.closest(".search-result-item");
  const categoryTitle = e.target.closest(".search-result-category-title");
  const subTitle = e.target.closest(".search-result-sub-title");
  
  // Klick auf Kategorie-Titel
  if (categoryTitle) {
    const categoryId = categoryTitle.dataset.categoryId;
    settingsSearchInput.value = "";
    settingsSearchInput.blur();
    
    openCategory(categoryId);
    return;
  }
  
  // Klick auf Unterkategorie-Titel
  if (subTitle) {
    const path = subTitle.dataset.path;
    settingsSearchInput.value = "";
    settingsSearchInput.blur();
    
    const [catId, subId] = path.split(".");
    openCategory(catId);
    
    setTimeout(() => {
      openSubCategory(path);
    }, 300);
    return;
  }
  
  // Klick auf Item
  if (item) {
    const path = item.dataset.path;
    settingsSearchInput.value = "";
    settingsSearchInput.blur();
    
    if (path.includes(".")) {
      const [catId, subId] = path.split(".");
      openCategory(catId);
      
      setTimeout(() => {
        openSubCategory(path);
      }, 300);
    } else {
      openCategory(path);
    }
  }
});
