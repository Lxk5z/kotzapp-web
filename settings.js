const CURRENT_USER_ID = "U01"; // ⬅️ später dynamisch
const DEBUG_LOADING_DELAY = 0; // in ms, zu Testzwecken
const CDN = window.CDN_BASE;
const API_BASE = "https://kotzapp.onrender.com";
const USER_GET = "/user/get/";

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
    const res = await fetch(url);

    if (!res.ok) throw new Error("Profil konnte nicht geladen werden");

    const data = await res.json();
    const user = Array.isArray(data) ? data[0] : data;

    const profileImage = document.getElementById("profileImage");
    const usernameEl = document.querySelector(".profile-username");
    const rangEl = document.querySelector(".profile-rang");
    const bioEl = document.querySelector(".profile-bio");

    /* =========================
       FORMATIERTER NAME
       ========================= */
    usernameEl.textContent =
  user.formatierter_name !== null && user.formatierter_name !== undefined
    ? user.formatierter_name
    : "Unbekannt";

    /* =========================
       BIO
       ========================= */
    bioEl.textContent = 
    user.description && user.description.trim() !== ""
        ? user.description
        : "Keine Beschreibung vorhanden.";

    /* =========================
       RANG
       ========================= */

const profileInner = document.querySelector(".profile-inner");

const rang = user.rang ?? "Normaler User";

if (rang === "Normaler User") {
  rangEl.style.display = "none";
  profileInner.classList.add("no-rang");   // 👈 WICHTIG
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

    /* =========================
       PROFILE IMAGE
       ========================= */
    setProfileImage(profileImage, user.profile_image);

    /* =========================
   BACKGROUND
    ========================= */
const bgEl = document.getElementById("profileBackground");

if (typeof user.background === "number") {
  bgEl.style.backgroundImage =
    `url(${CDN}/images/users/backgrounds/background${user.background}.png)`
} else {
  bgEl.style.background = "linear-gradient(135deg, #111, #000)";
}

  } catch (err) {
    console.error("❌ Fehler beim Laden des Profils:", err);
  } finally {
    hideLoadingBar(); // 👈 IMMER ausblenden
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
    nameInput.disabled = false;
    lockOverlay.classList.add("hidden");
    lockInfo.classList.add("hidden");
  } else {
    // Name darf NICHT geändert werden
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

    // Hintergrund
    const bgValue = typeof user.background === "number" ? user.background : 1;
    document.getElementById("newBackground").value = bgValue;

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

    overlay.classList.remove("hidden");

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

function closeEdit() { overlay.classList.add("hidden"); }

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

bottomSheetOverlay.addEventListener("click", closeBottomSheet);
btnCancelSheet.addEventListener("click", closeBottomSheet);

btnChoosePhoto.addEventListener("click", () => {
  closeBottomSheet();
  fileInput.click();
});

btnTakePhoto.addEventListener("click", () => {
  closeBottomSheet();
  fileInput.setAttribute("capture", "user");
  fileInput.click();
  setTimeout(() => fileInput.removeAttribute("capture"), 500);
});

btnRemovePhoto.addEventListener("click", () => {
  closeBottomSheet();
  previewImg.src = `${CDN}/images/users/default.png`;
  previewImg.dataset.removed = "true";
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    previewImg.src = reader.result;
    previewImg.dataset.removed = "false";
  };
  reader.readAsDataURL(file);
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
