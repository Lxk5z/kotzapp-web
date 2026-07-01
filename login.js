 // ====== SPAN GRID AUTOMATISCH GENERIEREN ======
const section = document.getElementById("grid");
const container = document.querySelector(".container");

const spanCount = 1000; // 😈 wirklich 1000

// Container kurz rausnehmen
container.remove();

// 1000 Spans erzeugen
for (let i = 0; i < spanCount; i++) {
    const span = document.createElement("span");
    section.appendChild(span);
}

// Container wieder reinpacken (damit er oben bleibt)
section.appendChild(container);


    // ====== Design Code ======
    let signinBtn = document.querySelector('.signinBtn');
    let signupBtn = document.querySelector('.signupBtn');
    let body = document.querySelector('body');


    document.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
        btn.classList.remove("pulse"); // falls Animation gerade läuft
        void btn.offsetWidth;          // reflow erzwingen (reset)
        btn.classList.add("pulse");    // Animation starten
    });
});

const logo = document.getElementById("kotzapp");
let logoTimer = null;

function initImageLoaders() {
    const imgIds = ["kotzapp", "kotzapplock", "textWillkommen", "willkommenBudy", "setpasswordGIF", "tutorialImage"];
    imgIds.forEach(id => {
        const img = document.getElementById(id);
        if (!img) return;
        const wrapper = img.parentElement;
        
        // Prüfen ob das Bild bereits geladen ist und KEIN Platzhalter-Pixel ist
        if (img.complete && img.src && !img.src.startsWith('data:image/gif')) {
            wrapper.classList.add("loaded");
        }
        
        img.onload = () => {
            // Nur als geladen markieren, wenn es kein transparenter Pixel ist
            if (img.src && !img.src.startsWith('data:image/gif')) {
                wrapper.classList.add("loaded");
            }
        };
    });
}

function updateLogoDelayed() {
    // Falls bereits ein Timer läuft → abbrechen
    if (logoTimer) {
        clearTimeout(logoTimer);
    }

    const ph = document.getElementById("logoPlaceholder");
    const wrapper = document.getElementById("kotzappWrapper");

    // Neuen Timer setzen
    logoTimer = setTimeout(() => {
        wrapper.classList.remove("loaded"); // Reset beim Wechsel
        if (body.classList.contains("slide")) {
            logo.src = CDN_BASE + "/images/kotzapp-red.webp";
            if(ph) ph.className = "img-placeholder placeholder-kotzapp-red";
        } else {
            logo.src = CDN_BASE + "/images/kotzapp.webp";
            if(ph) ph.className = "img-placeholder placeholder-kotzapp";
        }
        logoTimer = null;
    }, 619); // 1 Sekunde Delay
}

signupBtn.onclick = function() {
    body.classList.add('slide');
    updateLogoDelayed();
}

signinBtn.onclick = function() {
    body.classList.remove('slide');
    updateLogoDelayed();
}


// ====== Touch-Hover für die span-Kacheln ======
const spans = document.querySelectorAll("#grid span");

function getSpanUnderTouch(touch) {
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    return el && el.tagName === "SPAN" ? el : null;
}

document.addEventListener("touchmove", (e) => {
    const touch = e.touches[0];
    const span = getSpanUnderTouch(touch);

    // Nur eingreifen, wenn wir tatsächlich eine Kachel im Hintergrund berühren
    if (span) {
        // Erst ALLE zurücksetzen
        spans.forEach(s => s.classList.remove("touch-hover"));
        span.classList.add("touch-hover");
        
        // Scrollen nur verhindern, wenn wir über den Hintergrund-Kacheln sind
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener("touchend", () => {
    // Beim Loslassen ALLES entfernen
    spans.forEach(s => s.classList.remove("touch-hover"));
});

// ====== Touch-Scrolling verhindern, wenn über den span-Kacheln gewischt wird ======
const spanArea = document.querySelector("section");

spanArea.addEventListener("touchmove", (e) => {
    // Erlaube das Scrollen, wenn die Berührung innerhalb der Boxen stattfindet
    if (e.target.closest('.container') || e.target.closest('.setpw-box')) return;
    e.preventDefault();
}, { passive: false });


// ====== Mobile Switch Buttons ======
const mobileSignup = document.querySelector(".signupSwitch");
const mobileSignin = document.querySelector(".signinSwitch");

function switchToSignup() {
    body.classList.add("slide");
    updateLogoDelayed();
}

function switchToSignin() {
    body.classList.remove("slide");
    updateLogoDelayed();
}

if (mobileSignup) {
    mobileSignup.addEventListener("click", switchToSignup);
}

if (mobileSignin) {
    mobileSignin.addEventListener("click", switchToSignin);
}

// ------------------------------
// Helper: API Request
// ------------------------------
async function api(path, data) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    return res.json();
}

// ---------------------------
// KotzApp: safer currently_account checks (insert near top of login.js)
// ---------------------------

function isValidAccount(acc) {
  if (!acc || typeof acc !== 'string') return false;
  const clean = acc.trim();
  return /^U\d{2,}$/.test(clean);
}

// Utility: remove invalid currently_account to prevent redirect-loops
function clearInvalidAccountIfAny() {
  try {
    const acc = localStorage.getItem('currently_account');
    if (acc && !isValidAccount(acc)) {
      console.warn('KotzApp: found invalid currently_account — removing to avoid redirect loop:', acc);
      localStorage.removeItem('currently_account');
      return true;
    }
  } catch (e) {
    console.error('Error checking/clearing currently_account', e);
  }
  return false;
}

// ---------------------------
// Replace your existing ?tutorial block with this
// (original block used: const acc = localStorage.getItem("currently_account"); if(!acc) { window.location.replace("/login.html"); } — see file). :contentReference[oaicite:2]{index=2}
const paramsTutorial = new URLSearchParams(window.location.search);

if (paramsTutorial.has("tutorial")) {

  const acc = localStorage.getItem("currently_account");

  // Wenn kein gültiger Account -> clear und zurück zur normalen Login URL (ohne ?tutorial)
  if (!isValidAccount(acc)) {
    console.warn("⚠️ Tutorial blocked: missing or invalid currently_account:", acc);
    try { localStorage.removeItem("currently_account"); } catch(e) {}
    // replace = verhindert Back-Button Chaos
    window.location.replace("/login.html");
  } else {
    console.log("🎓 Tutorial Mode detected (account OK)");
    const containerEl = document.getElementById("setPwContainer");
    if (containerEl) {
      containerEl.classList.remove("hidden");
      containerEl.classList.add("active-setpw");
    }
    const mainContainer = document.querySelector("#grid .container");
    if (mainContainer) mainContainer.style.display = "none";
    currentStep = 3;
  }
}

// ------------------------------
// Aktivität aktualisieren
// ------------------------------
window.updateActivity = function() {
  localStorage.setItem("currently_approved", Date.now().toString());
};


// ---------------------------
// Patch: Ping IIFE — prüfe Account-Format bevor gepingt wird
// (siehe ursprüngliche Ping-Logik in deiner Datei). :contentReference[oaicite:3]{index=3}
(function ping() {
  const username = localStorage.getItem("currently_account");

  if (!isValidAccount(username)) {
    // wenn ungültig: löschen (verhindert, dass andere Seiten auf Grund des falschen Werts hierher redirecten)
    if (username) {
      console.warn('KotzApp: ping blocked — invalid currently_account found and removed:', username);
      try { localStorage.removeItem('currently_account'); } catch(e){}
    }
    return;
  }

  // OK — Account gültig, führe Ping aus
  updateActivity();

  api("/auth/ping", { username }).catch(() => {
    // offline → egal
  });
})();


// ==============================
// AUTO REDIRECT IF ALREADY LOGGED IN (robust, safer)
// ==============================
(function(){
    const acc = localStorage.getItem("currently_account");
    if (!acc) return;

    // Query-Params parsen
    const params = new URLSearchParams(window.location.search);

    // Wenn token oder tutorial in der URL sind => NICHT redirecten
    if (params.has('token') || params.has('tutorial')) {
        console.log("DEBUG: skipping auto-redirect because URL has token/tutorial:", window.location.search);
        return;
    }

    const firstSetupFlag = localStorage.getItem("first_setup");
    const inSetup = firstSetupFlag === "true";

    // Wenn kein setup aktiv → redirect (nur auf "saubere" URL ohne params)
    if (!inSetup) {
        // replace statt href, damit Back-Button sauberer ist
        window.location.replace("/messenger.html?CLASS");
    }
})();








// ==============================
// DEVICE_ID ENSURE (MINIMAL)
// ==============================
(function ensureDeviceId(){

    let id = localStorage.getItem("device_id");

    // Falls keine vorhanden → neue UUID erzeugen
    if(!id){

        // moderne Browser
        if(crypto.randomUUID){
            id = crypto.randomUUID();
        }
        // Fallback für ältere Browser
        else{
            id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
                const r = Math.random()*16|0;
                const v = c === 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
        }

        localStorage.setItem("device_id", id);
        console.log("🔑 Neue device_id erstellt:", id);

    } else {

        console.log("📱 device_id bereits vorhanden:", id);

    }

})();


// ====== Passwort-Augen Toggle ======
document.querySelectorAll(".passwordBx").forEach(box => {
    const input = box.querySelector("input");
    const toggle = box.querySelector(".togglePw");
    const iconHidden = box.querySelector(".hiddenPw");
    const iconShow = box.querySelector(".showPw");

    if (!toggle || !input) return; // 🛡️ Schutz

    toggle.addEventListener("click", () => {
        const isHidden = input.type === "password";

        input.type = isHidden ? "text" : "password";

        if (iconHidden) iconHidden.style.display = isHidden ? "none" : "block";
        if (iconShow) iconShow.style.display = isHidden ? "block" : "none";
    });
});

// ====== Passwort-Abgleich bei Registrierung ======
const signupForm = document.querySelector(".signupform form");

if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
        const pw1 = signupForm.querySelectorAll(".passwordBx input")[0];
        const pw2 = signupForm.querySelectorAll(".passwordBx input")[1];
        const errorBox = signupForm.querySelector(".pwError");

        // Reset vorheriger Fehler
        pw1.parentElement.classList.remove("error");
        pw2.parentElement.classList.remove("error");

        // Wenn falsch → verhindern + Animation neu starten
        if (pw1.value !== pw2.value) {
            e.preventDefault();

            // Fehler anzeigen
            errorBox.style.display = "block";

            // Animation resetten
            errorBox.style.animation = "none";
            void errorBox.offsetWidth; // MAGIC LINE ✨
            errorBox.style.animation = "popup 0.35s ease forwards";

            // Inputs rot markieren
            pw1.parentElement.classList.add("error");
            pw2.parentElement.classList.add("error");
        }
    });
}

/* ===========================
    CONFETTI 🎉
============================*/
window.launchConfetti = function launchConfetti() {

    const existing = document.querySelector('.confetti-container');

    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    // 🎨 12 Farben statt 6
    const colors = [
        "#ff4d4d",
        "#ffd24d",
        "#4dff88",
        "#4db8ff",
        "#ff66ff",
        "#ff944d",
        "#66ffff",
        "#aaff4d",
        "#ff4da6",
        "#b84dff",
        "#ffffff",
        "#ffccff"
    ];

    // 🎉 80 Pieces statt 48
    const totalPieces = 80;
    let finishedPieces = 0;

    for (let i = 0; i < totalPieces; i++) {

        const piece = document.createElement('div');
        piece.className = 'confetti-piece';

        // Größe random
        const w = 6 + Math.random() * 16;
        const h = Math.round(w * (1.2 + Math.random() * 0.7));

        piece.style.width = `${w}px`;
        piece.style.height = `${h}px`;

        // 🌍 horizontale Position
        piece.style.left = `${Math.random() * 100}vw`;

        // 🎨 Farbe
        piece.style.backgroundColor =
            colors[Math.floor(Math.random() * colors.length)];

        // ⭐ HIER IST DER WICHTIGE TEIL ⭐
        // vertikale Streuung über Zeit statt gleichzeitig

        const duration = 3 + Math.random() * 3.5;

        // Delay jetzt größer → verteilt sich über Zeit
        const delay = Math.random() * 2.2;

        piece.style.animationDuration = `${duration}s`;
        piece.style.animationDelay = `${delay}s`;

        // zufällige Rotation
        piece.style.transform =
            `rotate(${Math.floor(Math.random() * 360)}deg)`;

        piece.addEventListener('animationend', () => {

            finishedPieces++;
            piece.remove();

            if (finishedPieces >= totalPieces) {
                setTimeout(() => {
                    if (container.parentElement) container.remove();
                }, 80);
            }

        }, { once: true });

        container.appendChild(piece);
    }
};


// WillkommenBuddy onklick Konfetti 
document.addEventListener("DOMContentLoaded", () => {
  const buddy = document.getElementById("willkommenBudy");

  if (buddy) {
    buddy.addEventListener("click", () => {
      launchConfetti();
    });
  }
});

        
// ======================================================
//  LOGIN / QR-LOGIN / PASSWORT-SETZEN / SESSION LOGIK
// ======================================================

const API_BASE = "https://kotzapp.onrender.com";

// ------------------------------
// Helper: Session speichern
// ------------------------------
function saveSession(username) {
    const now = Date.now();
    localStorage.setItem("currently_account", username);
    localStorage.setItem("currently_at", now.toString());
    localStorage.setItem("currently_approved", now.toString());
}

// ------------------------------
// Auto-Logout nach Inaktivität
// ------------------------------
(function inactivityCheck() {

    const last = parseInt(localStorage.getItem("currently_approved") || "0", 10);
    const now = Date.now();
    const ONE_MONTH = 1000 * 60 * 60 * 24 * 30;

    if (last > 0 && (now - last) > ONE_MONTH) {

        // nur Login-Daten entfernen (NICHT alles!)
        localStorage.removeItem("currently_approved");
        localStorage.removeItem("currently_at");
        localStorage.removeItem("currently_account");

        console.log("🧹 Login-Daten wegen Inaktivität gelöscht");
    }

})();

// ------------------------------
// QR-Token aus URL lesen
// ------------------------------
const urlParams = new URLSearchParams(window.location.search);
const qrToken = urlParams.get("token");
let qrOverlayStartTime = 0;
const QR_MIN_DURATION = 2500; // 2 Sekunden

// Wenn QR-Token vorhanden → QR-Login starten
if (qrToken) {
    // gespeicherten Step lesen (fallback 0)
    const savedStep = parseInt(localStorage.getItem("setpw_step") || "0", 10);
    const playAnimation = isNaN(savedStep) || savedStep === 0;

    // overlay nur zeigen wenn playAnimation === true
    if (playAnimation) showQROverlay();

    // handleQRLogin bekommt nun ein Flag, ob Animation / confetti abgespielt werden sollen
    handleQRLogin(qrToken, playAnimation);
}


function showQROverlay() {
    const overlay = document.getElementById("qrOverlay");
    qrOverlayStartTime = Date.now();
    overlay.classList.remove("hidden");
    overlay.classList.remove("fade-out");
}

function hideQROverlay() {
    return new Promise(resolve => {
        const overlay = document.getElementById("qrOverlay");
        const elapsed = Date.now() - qrOverlayStartTime;
        const remaining = Math.max(QR_MIN_DURATION - elapsed, 0);

        setTimeout(() => {
            overlay.classList.add("fade-out");

            setTimeout(() => {
                overlay.classList.add("hidden");
                resolve(); // 🚀 erst hier geht's weiter
            }, 0); // Fade Dauer

        }, remaining);
    });
}


async function handleQRLogin(token, playAnimation = true) {
    const device_id = localStorage.getItem("device_id");

    try {
        const res = await api("/auth/qr-login", {
            qr_token: token,
            device_id: device_id
        });

        if (res.error) {
            if (playAnimation) {
                // nur verbergen, wenn wir die Animation gezeigt haben
                await hideQROverlay();
            }
            alert("QR ungültig oder bereits benutzt.");
            return;
        }

        saveSession(res.username);

        if (playAnimation) {
            await hideQROverlay(); // nur wenn gezeigt
            activateSetPasswordForm({ qr: token });
            launchConfetti();
        } else {
            // direkt aktivieren, ohne Overlay + Confetti
            activateSetPasswordForm({ qr: token });
        }

    } catch (err) {
        if (playAnimation) {
            await hideQROverlay();
        }
        alert("Server nicht erreichbar.");
        console.error(err);
    }
}



// ------------------------------
// LOGIN FORMULAR
// ------------------------------
const loginForm = document.querySelector(".signinform form");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // ====== FRONTEND VALIDIERUNG (LEERE FELDER) ======
const usernameInput = loginForm.querySelector("input[name=loginUsername]");
const passwordInput = loginForm.querySelector("input[name=loginPassword]");
const errBox = loginForm.querySelector(".loginError");

// Reset
errBox.style.display = "none";
errBox.style.color = "#ff4d4d";
errBox.textContent = "Falscher Nutzername oder Passwort";

usernameInput.parentElement.classList.remove("error");
passwordInput.parentElement.classList.remove("error");

let hasError = false;

// Username leer?
if (!usernameInput.value.trim()) {
    usernameInput.parentElement.classList.add("error");
    hasError = true;
}

// Passwort leer?
if (!passwordInput.value.trim()) {
    passwordInput.parentElement.classList.add("error");
    hasError = true;
}

if (hasError) {
    errBox.textContent = "Fülle alle Felder aus!";
    errBox.style.color = "#ff8400";
    errBox.style.display = "block";

    // Animation neu triggern
    errBox.style.animation = "none";
    void errBox.offsetWidth;
    errBox.style.animation = "loginErrorPop 0.3s ease";

    return; // ⛔ STOP → kein Loader, kein API-Call
}
// ====== VALIDIERUNG ENDE ======


        // === LOADER START ===
        const submitBtn = loginForm.querySelector("input[type=submit]");
        attachLoaderToButton(submitBtn);
        // =====================

        const username = loginForm.querySelector("input[name=loginUsername]").value.trim();
        const password = loginForm.querySelector("input[name=loginPassword]").value;
        const device_id = localStorage.getItem("device_id");


        const res = await api("/auth/login", {
            username,
            password,
            device_id
        });

        if (res.error) {
            removeLoaderFromButton(submitBtn); // <— WICHTIG
            const errBox = loginForm.querySelector(".loginError");
            errBox.style.display = "block";
            errBox.style.animation = "none";
            void errBox.offsetWidth;
            errBox.style.animation = "loginErrorPop 0.3s ease";
            return;
        }

        if (res.first_login) {
    try { localStorage.setItem("setpw_temp", password); } catch(e){}

    const savedStep = parseInt(localStorage.getItem("setpw_step") || "0", 10);
    const playAnimation = isNaN(savedStep) || savedStep === 0;

    // ❌ KEIN saveSession mehr hier!
    // 👉 Stattdessen nur Setup starten

    activateSetPasswordForm({ user: res.username });

    if (playAnimation) {
        launchConfetti();
    }
    return;
}

        saveSession(res.username);
        updateActivity();
        window.location.href = "/index.html";
    });
}

// ====== BUTTON LOADER ======
function attachLoaderToButton(btn) {
    if (btn.classList.contains("loading")) return;

    btn.classList.add("loading");
    btn.disabled = true;

    const loader = document
        .getElementById("btnLoaderTemplate")
        .firstElementChild.cloneNode(true);

    loader.classList.add("activeLoader");

    // WICHTIG: Loader in die inputBx einfügen, NICHT in den input
    const wrapper = btn.closest(".inputBx");
    wrapper.prepend(loader);
}

function removeLoaderFromButton(btn) {
    btn.classList.remove("loading");
    btn.disabled = false;

    const wrapper = btn.closest(".inputBx");
    const loader = wrapper.querySelector(".activeLoader");
    if (loader) loader.remove();
}


// ------------------------------
// REGISTRIERUNG (deaktiviert)
// ------------------------------
const signupForm2 = document.querySelector(".signupform form");
if (signupForm2) {
    signupForm2.addEventListener("submit", (e) => {
    e.preventDefault();

    const submitBtn = signupForm2.querySelector("input[type=submit]");
    attachLoaderToButton(submitBtn);

    alert("Registrierung ist nicht verfügbar. Dieses Feature wird es bald geben.");

    removeLoaderFromButton(submitBtn);
  });
}

// ------------------------------
// PING BEI SEITENAUFRUF
// ------------------------------
(function ping() {
    const username = localStorage.getItem("currently_account");
    if (!username) return;

    updateActivity();

    api("/auth/ping", { username }).catch(() => {
        // offline → egal
    });
})();


// ====== Autofokus verhindern ======
window.addEventListener("load", () => {
    // Fokus aktiv entfernen
    document.activeElement.blur();
});

// ====== Touch: Tastatur schließen beim Tippen außerhalb ======
document.addEventListener("touchstart", (e) => {
    const isInput = e.target.tagName === "INPUT" || e.target.closest(".inputBx");
    if (!isInput) {
        document.activeElement.blur();
    }
});

// ====== 3. ENTER Navigation ======
function setupEnterNavigation(formSelector, orderSelectors, submitSelector) {
    const form = document.querySelector(formSelector);
    if (!form) return;

    const fields = orderSelectors.map(sel => form.querySelector(sel));
    const submitBtn = form.querySelector(submitSelector);

    fields.forEach((field, index) => {
        if (!field) return;

        field.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();

                // Wenn nicht letztes Feld → nächstes fokussieren
                if (index < fields.length - 1) {
                    fields[index + 1].focus();
                } 
                // Wenn letztes Feld → Button triggern
                else {
                    submitBtn.click();
                }
            }
        });
    });
}

// LOGIN
setupEnterNavigation(
    ".signinform form",
    [
        "input[name=loginUsername]",
        "input[name=loginPassword]"
    ],
    "input[type=submit]"
);

// REGISTRIEREN
setupEnterNavigation(
    ".signupform form",
    [
        ".inputBx:nth-child(2) input", // Nutzername
        ".passwordBx:nth-child(3) input", // Passwort
        ".passwordBx:nth-child(4) input"  // Passwort bestätigen
    ],
    "input[type=submit]"
);





// SET PASSWORD FORMULAR AKTIVIEREN
function activateSetPasswordForm(data) {

    if(document.getElementById("setPwContainer")
        .classList.contains("active-setpw")) return;

    const el = document.getElementById("setPwContainer");

    el.classList.remove("hidden");
    el.classList.add("active-setpw");

    const container = document.querySelector("#grid .container");
    if (container) container.style.display = "none";

    const loaderTemplate = document.getElementById("btnLoaderTemplate");
    if (loaderTemplate) loaderTemplate.remove();

    if (data.qr) localStorage.setItem("setpw_qr", data.qr);
    if (data.user) localStorage.setItem("setpw_user", data.user);

    localStorage.setItem("first_setup", "true");

// Name sofort nach dem Öffnen setzen
setWelcomeName();
}

  // ---- setpw welcome name loader ----
  async function setWelcomeName() {
    console.log("setWelcomeName() gestartet");
    console.log("setpw_user =", localStorage.getItem("setpw_user"));
    try {
      const userId = localStorage.getItem("setpw_user");
      if (!userId) {
        // Kein setup-user gesetzt -> nichts tun
        return;
      }

      // Falls API_BASE nicht definiert, sicherstellen:
      if (typeof API_BASE === "undefined") {
        console.warn("API_BASE nicht definiert — bitte in main.js setzen.");
        return;
      }

      const resp = await fetch(`${API_BASE}/user/get/${encodeURIComponent(userId)}`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      if (!resp.ok) {
        console.warn("User-API antwortete nicht OK", resp.status);
        return;
      }

      const json = await resp.json();
      const name = (json && json.formatierter_name) ? json.formatierter_name : null;
      const welcomeEl = document.getElementById("welcomeText");

      if (welcomeEl) {
        if (name) {
          welcomeEl.innerHTML = `Willkommen ${escapeHtml(name)}!<br>Noch 3 Schritte - dann kannst du schreiben, teilen und in KotzApp verweilen.`;
        } else {
          // Fallback
          welcomeEl.innerHTML = `Willkommen!<br>Noch 3 Schritte - dann kannst du schreiben, teilen und in KotzApp verweilen.`;
        }
      }
    } catch (err) {
      console.error("Fehler beim Laden des formatierten Namens:", err);
    }
  }

  // kleine helper: XSS-sicheres Einfügen
  function escapeHtml(unsafe) {
    return String(unsafe)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }







// ==============================
// SET PASSWORD STEP SYSTEM
// ==============================

// Guard: true während wir die Seite initial wiederherstellen,
// verhindert, dass updateStep() beim ersten Call setpw_step überschreibt.
let initialLoad = true;
let currentStep = 0;
const totalSteps = 4;

const pages = document.getElementById("setPwPages");
const progressText = document.getElementById("setPwProgress");
const backBtn = document.getElementById("setPwBack");
const nextBtn = document.getElementById("setPwNext");

function updateStep() {

    pages.style.transform = `translateX(-${currentStep * 25}%)`;
    progressText.textContent = `${currentStep + 1} / ${totalSteps}`;

    backBtn.style.visibility =
    (currentStep === 0 || currentStep === totalSteps - 1)
        ? "hidden"
        : "visible";


    // ======================
    // DATENSCHUTZ SPECIAL
    // ======================

    if (currentStep === 1) {

        nextBtn.textContent = "Akzeptieren & Weiter";

        // Button erstmal deaktivieren
        nextBtn.disabled = true;
        nextBtn.classList.add("disabledNext");

        // Falls Nutzer schon ganz unten ist → sofort aktivieren
        setTimeout(() => {

            const bottomReached =
                dataInput.scrollTop + dataInput.clientHeight >= dataInput.scrollHeight - 5;

            if (bottomReached) {
                nextBtn.disabled = false;
                nextBtn.classList.remove("disabledNext");
            }

        }, 50);

    } else {

        // Normaler Zustand
        nextBtn.disabled = false;
        nextBtn.classList.remove("disabledNext");

        if (currentStep === totalSteps - 1) {
            nextBtn.textContent = "Fertig";
        } else {
            nextBtn.textContent = "Weiter";
        }
    }

    // Nur nach initialer Wiederherstellung in den Storage schreiben.
if (!initialLoad && localStorage.getItem("first_setup") === "true") {
  const existing = localStorage.getItem("setpw_step");
  if (existing !== currentStep.toString()) {
    localStorage.setItem("setpw_step", currentStep.toString());
  }
}

updateSkipButton();

}



backBtn.addEventListener("click", () => {
    if (currentStep > 0) {
        currentStep--;
        localStorage.setItem("setpw_step", currentStep.toString());
        updateStep();
    }
});

// ---------- Helfer: Loader in Nav-Button anzeigen/entfernen ----------
function showNavLoader(btn) {
    // falls schon Loader vorhanden -> return
    if (btn.querySelector(".navLoader")) return;
    const template = document.getElementById("btnLoaderTemplate");
    if (!template) return;
    const loader = template.firstElementChild.cloneNode(true);
    loader.classList.add("navLoader");
    loader.style.marginRight = "6px";
    // prepend, damit Loader links vom Text ist
    btn.prepend(loader);
}

function removeNavLoader(btn) {
    const loader = btn.querySelector(".navLoader");
    if (loader) loader.remove();
}

// ---------- Helfer: form error / reset --------------
function resetSetPwErrors() {
    const form = document.getElementById("setPwForm");
    if (!form) return;
    form.querySelectorAll(".inputBx").forEach(b => b.classList.remove("error"));
    const err = form.querySelector(".pwError");
    if (err) {
        err.style.display = "none";
        err.textContent = "Die Passwörter müssen übereinstimmen!";
    }
}

// ---------- Haupt-Handler für "Nächster/Passwort sichern" ----------
nextBtn.addEventListener("click", async () => {

    // Wenn Passwort Seite (index 2) -> validieren / senden
    if (currentStep === 2) {
        const form = document.getElementById("setPwForm");
        const pw1 = form.querySelector("input[name=pw1]");
        const pw2 = form.querySelector("input[name=pw2]");
        const errorBox = form.querySelector(".pwError");

        // reset old errors
        resetSetPwErrors();

        let hasError = false;

        // Felder ausgefüllt?
        if (!pw1.value.trim()) {
            pw1.parentElement.classList.add("error");
            hasError = true;
        }
        if (!pw2.value.trim()) {
            pw2.parentElement.classList.add("error");
            hasError = true;
        }

        if (hasError) {
            if (errorBox) {
                errorBox.style.display = "block";
                errorBox.style.color = "#ff8400";
                errorBox.textContent = "Bitte fülle alle Felder aus!";
            }
            return;
        }

        // Stimmen Passwörter überein?
        if (pw1.value !== pw2.value) {
            pw1.parentElement.classList.add("error");
            pw2.parentElement.classList.add("error");
            if (errorBox) {
                errorBox.style.display = "block";
                errorBox.style.color = "#ff8400";
                errorBox.textContent = "Die Passwörter stimmen nicht überein!";
            }
            return;
        }

        // Alles gut -> Button in "loading" setzen, Loader zeigen
        nextBtn.disabled = true;
        nextBtn.classList.add("disabledNext");
        // setze Text auf "Passwort sichern"
        const prevText = nextBtn.textContent;
        nextBtn.textContent = ""; // wir fügen Loader + Text node neu ein
        showNavLoader(nextBtn);
        const textNode = document.createElement("span");
        textNode.textContent = "Passwort sichern";
        nextBtn.appendChild(textNode);

        // Build payload: username, new_password, device_id, optional temp_password/qr_token
        const username = localStorage.getItem("setpw_user") || localStorage.getItem("currently_account");
        const new_password = pw1.value;
        const device_id = localStorage.getItem("device_id");

        const payload = { username, new_password, device_id };

        // optional: temp password (falls irgendwo gespeichert) - z.B. localStorage.setpw_temp
        const temp_password = localStorage.getItem("setpw_temp");
        if (temp_password) payload.temp_password = temp_password;

        // optional: qr token
        const qr_token = localStorage.getItem("setpw_qr");
        if (qr_token) payload.qr_token = qr_token;

        try {
            const res = await api("/auth/set-password", payload);

            // remove loader first
            removeNavLoader(nextBtn);

            if (res.error) {
                // Backend-Fehler anzeigen
                nextBtn.disabled = false;
                nextBtn.classList.remove("disabledNext");
                // restore label
                nextBtn.textContent = "Passwort sichern";

                if (errorBox) {
                    errorBox.style.display = "block";
                    errorBox.style.color = "#ff4d4d";
                    errorBox.textContent = res.error || "Fehler beim Speichern";
                }
                return;
            }

            // Erfolg
launchConfetti();
nextBtn.textContent = "Gesichert ✓";

if (username) saveSession(username);

// ⭐ ALLES SETUP STORAGE LÖSCHEN (wir machen das jetzt, bevor wir navigieren)
localStorage.removeItem("setpw_qr");
localStorage.removeItem("setpw_user");
localStorage.removeItem("setpw_temp");
localStorage.removeItem("first_setup");
localStorage.removeItem("setpw_step");

// --- Trigger: Password Manager via real form submit (sichere Navigation) ---
// Erzeuge ein verstecktes Formular mit username + password, submit -> Browser bietet Speichern an.
// Ziel: /login.html?tutorial (du hattest das vorgeschlagen)
try {

    // echtes Loginformular simulieren (für Passwortmanager)
    const fakeForm = document.createElement("form");
    fakeForm.style.position = "absolute";
    fakeForm.style.opacity = "0";
    fakeForm.autocomplete = "on";

    const u = document.createElement("input");
    u.name = "loginUsername";
    u.autocomplete = "username";
    u.value = username;

    const p = document.createElement("input");
    p.type = "password";
    p.name = "loginPassword";
    p.autocomplete = "current-password";
    p.value = new_password;

    fakeForm.appendChild(u);
    fakeForm.appendChild(p);

    document.body.appendChild(fakeForm);

    // kurzer Delay → Passwortmanager erkennt Inputs
    setTimeout(()=>{

        // hier KEIN submit mehr!
        // nur normal redirect

        window.location.href = "/login.html?tutorial";

    }, 400);

} catch(e){

    console.warn("Password-save redirect failed", e);

    setTimeout(()=>{
        currentStep++;
        updateStep();
    },650);

}


        } catch (err) {
            removeNavLoader(nextBtn);
            nextBtn.disabled = false;
            nextBtn.classList.remove("disabledNext");
            nextBtn.textContent = "Passwort sichern";

            if (errorBox) {
                errorBox.style.display = "block";
                errorBox.style.color = "#ff4d4d";
                errorBox.textContent = "Server nicht erreichbar.";
            }
            console.error(err);
        }

        return;
    }

    // Wenn Datenschutz-Seite (1) -> normales Weiter-Verhalten (deaktiviert wird vorher durch updateStep)
    if (currentStep === 1) {
        // Wenn Button disabled, ignorieren
        if (nextBtn.disabled) return;
    }

    // Passwort-Seite nicht → normales weiter
    if (currentStep < totalSteps - 1) {
        currentStep++;
    localStorage.setItem("setpw_step", currentStep.toString());
    updateStep();
    } else {
        // letzter Schritt
        console.log("Flow abgeschlossen 🚀");
    }
});


// ==============================
// FORCE TUTORIAL STEP VIA URL (?tutorial)
// ==============================
if(paramsTutorial.has("tutorial")){

    const acc = localStorage.getItem("currently_account");

    // 🛑 KEIN ACCOUNT → zurück zur normalen Login URL
    if(!acc){

        console.warn("⚠️ Tutorial blocked: no currently_account");

        // replace = verhindert Back-Button Chaos
        window.location.replace("/login.html");
    }

    console.log("🎓 Tutorial Mode detected (account OK)");

    const containerEl = document.getElementById("setPwContainer");
    if(containerEl){
        containerEl.classList.remove("hidden");
        containerEl.classList.add("active-setpw");
    }

    const mainContainer = document.querySelector("#grid .container");
    if(mainContainer) mainContainer.style.display = "none";

    currentStep = 3;
}



// ==============================
// RESUME SET PASSWORD FLOW (fixed order)
// ==============================
console.log("DEBUG storage on load:", {
  first_setup: localStorage.getItem("first_setup"),
  setpw_user: localStorage.getItem("setpw_user"),
  setpw_step: localStorage.getItem("setpw_step")
});

const firstSetup = localStorage.getItem("first_setup");
const hasUser = localStorage.getItem("setpw_user");
const hasQR = localStorage.getItem("setpw_qr");

if (firstSetup === "true" && (hasUser || hasQR)) {
  const containerEl = document.getElementById("setPwContainer");
  if (containerEl) {
    containerEl.classList.remove("hidden");
    // wichtig: dieselbe Klasse, die activateSetPasswordForm verwenden würde
    containerEl.classList.add("active-setpw");
  }

  const mainContainer = document.querySelector("#grid .container");
  if (mainContainer) mainContainer.style.display = "none";

  // READ saved step (default 0)
  const savedStep = parseInt(localStorage.getItem("setpw_step") || "0", 10);
  currentStep = (!isNaN(savedStep) && savedStep >= 0 && savedStep < totalSteps) ? savedStep : 0;

  // Direkt transform setzen OHNE Transition, damit kein "split-screen" / sliding glitch passiert.
  if (pages) {
      // temporär Transition abschalten
      const prevTransition = pages.style.transition;
      pages.style.transition = "none";
      pages.style.transform = `translateX(-${currentStep * 25}%)`;
      // force reflow / repaint
      void pages.offsetHeight;
      // Transition zurücksetzen (kleines Timeout, damit der Browser die "keine Transition" nimmt)
      setTimeout(() => {
          pages.style.transition = prevTransition || "transform 0.4s ease";
      }, 20);
  }
}

// Jetzt ist die Wiederherstellung abgeschlossen — zukünftige updateStep()-Aufrufe dürfen speichern.
initialLoad = false;
updateStep();


// ==============================
// DATENSCHUTZ SCROLL CHECK
// ==============================

const dataInput = document.querySelector(".dataInput");

function checkPrivacyScroll() {

    // nur wenn Datenschutz-Seite aktiv
    if (currentStep !== 1) return;

    const bottomReached =
        dataInput.scrollTop + dataInput.clientHeight >= dataInput.scrollHeight - 5;

    if (bottomReached) {
        nextBtn.disabled = false;
        nextBtn.classList.remove("disabledNext");
    }
}

// Scroll Listener
if (dataInput) {
    dataInput.addEventListener("scroll", checkPrivacyScroll);
}

// ==============================
// TUTORIAL SKIP SYSTEM
// ==============================

const skipOverlay = document.getElementById("skipTutorialOverlay");

const cancelBtn = document.querySelector(".skip-cancel");
const confirmBtn = document.querySelector(".skip-confirm");
const backdrop = document.querySelector(".skip-backdrop");


// 🔥 Button Text automatisch ändern wenn Tutorial-Seite aktiv
function updateSkipButton(){

    if(currentStep === 3){
        nextBtn.textContent = "Tutorial überspringen";
    } else {
        nextBtn.textContent = "Weiter";
    }
}


// 👉 Klick auf "Weiter" im Tutorial
nextBtn.addEventListener("click",()=>{

    if(currentStep !== 3) return;

    // normales Weiter blockieren
    skipOverlay.classList.remove("hidden");

});


// ❌ abbrechen
cancelBtn.addEventListener("click",()=>{
    skipOverlay.classList.add("hidden");
});

// klick auf backdrop auch schließen
backdrop.addEventListener("click",()=>{
    skipOverlay.classList.add("hidden");
});


// ✅ überspringen → redirect
confirmBtn.addEventListener("click",()=>{
    window.location.href="/index.html";
});

/* ======= SetPw small UX enhancements:
   1) Add eye toggle to "Neues Passwort" only
   2) Disable paste/drop/ctrl/cmd+V on "Passwort wiederholen"
   3) Enter-navigation: pw1 -> pw2, pw2 -> nextBtn click
   Paste this AFTER your main JS (so nextBtn etc. already exist).
*/

document.addEventListener("DOMContentLoaded", () => {
  const setPwForm = document.getElementById("setPwForm");
  if (!setPwForm) return;

  const pw1 = setPwForm.querySelector('input[name="pw1"]');
  const pw2 = setPwForm.querySelector('input[name="pw2"]');

  if (!pw1 || !pw2) return;

  // ---------- 1) Add eye toggle to pw1 (re-uses your existing SVGs/style) ----------
  const pw1Box = pw1.closest(".inputBx") || pw1.parentElement;
  if (pw1Box && !pw1Box.querySelector(".togglePw")) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "togglePw setpw-toggle";
    toggle.setAttribute("aria-label", "Passwort ein-/ausblenden");
    // Reuse the same two SVG icons as in the other toggles (hiddenPw / showPw)
    toggle.innerHTML = `
      <!-- verborgene / sichtbare Icons (copy of your other icons) -->
      <svg class="pw-icon hiddenPw" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
        <path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z"/>
      </svg>
      <svg class="pw-icon showPw" style="display:none" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
        <path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/>
      </svg>
    `;
    pw1Box.appendChild(toggle);

    // Toggle logic (only for pw1)
    const hiddenIcon = toggle.querySelector(".hiddenPw");
    const showIcon = toggle.querySelector(".showPw");

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      const isHidden = pw1.type === "password";
      pw1.type = isHidden ? "text" : "password";
      if (hiddenIcon) hiddenIcon.style.display = isHidden ? "none" : "block";
      if (showIcon) showIcon.style.display = isHidden ? "block" : "none";
      // update aria
      toggle.setAttribute("aria-pressed", String(!isHidden));
    });
  }

  // ---------- 2) Disable paste/drag/drop/ctrl/cmd+V for pw2 ----------
  // Helper message (brief flash) — optional visual feedback
  function flashInputError(el) {
    const parent = el.closest(".inputBx");
    if (!parent) return;
    parent.classList.add("error");
    setTimeout(() => parent.classList.remove("error"), 650);
  }

  // Block paste & drop
  ["paste", "drop"].forEach(ev => {
    pw2.addEventListener(ev, (e) => {
      e.preventDefault();
      flashInputError(pw2);
      // optional console message for debugging
      console.debug("Paste/drop prevented on pw2");
    });
  });

  // Block Ctrl/Cmd+V
  pw2.addEventListener("keydown", (e) => {
    const key = (e.key || "").toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === "v") {
      e.preventDefault();
      flashInputError(pw2);
      return;
    }
    // ENTER in pw2 => trigger next button
    if (key === "enter") {
      e.preventDefault();
      // nextBtn is declared earlier in your script — use it (don't redeclare)
      try {
        if (typeof nextBtn !== "undefined" && nextBtn) {
          nextBtn.click();
        } else {
          console.warn("nextBtn not available when pressing Enter in pw2");
        }
      } catch (err) {
        console.error("Error triggering nextBtn from pw2 Enter:", err);
      }
    }
  });

  // Also block drop by preventing dragover default behaviour (drop sometimes comes from drop)
  pw2.addEventListener("dragover", (e) => e.preventDefault());

  // ---------- 3) Enter navigation: pw1 -> pw2 ----------
  pw1.addEventListener("keydown", (e) => {
    if ((e.key || "").toLowerCase() === "enter") {
      e.preventDefault();
      // focus next field
      pw2.focus();
      // small UX: move cursor to end
      const val = pw2.value || "";
      pw2.setSelectionRange(val.length, val.length);
    }
  });

});