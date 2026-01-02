const CURRENT_USER_ID = "U01"; // ⬅️ später dynamisch
const DEBUG_LOADING_DELAY = 0; // in ms, zu Testzwecken
const CDN = window.CDN_BASE;

document.addEventListener("DOMContentLoaded", () => {
  loadUserProfile();
});

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

async function loadUserProfile() {
  showLoadingBar();
  await delay(DEBUG_LOADING_DELAY);

  try {
    const res = await fetch(`https://kotzapp.onrender.com/user/get/${CURRENT_USER_ID}`);

    if (!res.ok) {
      throw new Error("Profil konnte nicht geladen werden");
    }

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
    if (user.profile_image) {
      profileImage.src = user.profile_image;
    }

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
