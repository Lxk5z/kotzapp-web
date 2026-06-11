const CDN = window.CDN_BASE || "https://cdn.jsdelivr.net/gh/Lxk5z/kotzapp-web@latest";
const API_BASE = "https://kotzapp.onrender.com";
const currentUserId = localStorage.getItem("currently_account");

let userCache = {}; // Globaler Speicher für Nutzerdaten (Namen/Bilder)

/**
 * Schneidet ein Base64-Bild quadratisch zu und passt die Größe an.
 * @param {string} base64Data - Die Base64-Bilddaten.
 * @param {number} targetSize - Die Zielgröße (Breite/Höhe) des Quadrats.
 * @returns {Promise<string|null>} Das quadratische Bild als Data-URL.
 */
async function createSquareBase64Image(base64Data, targetSize) {
    return new Promise((resolve) => {
        if (!base64Data || base64Data === "NULL" || base64Data === "NONE") {
            resolve(null);
            return;
        }

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d');

            const imgWidth = img.naturalWidth || img.width;
            const imgHeight = img.naturalHeight || img.height;

            let sX = 0, sY = 0, sWidth = imgWidth, sHeight = imgHeight;
            // Quadratischen Ausschnitt berechnen (Zentrierung)
            if (imgWidth > imgHeight) {
                sWidth = imgHeight;
                sX = (imgWidth - imgHeight) / 2;
            } else if (imgHeight > imgWidth) {
                sHeight = imgWidth;
                sY = (imgHeight - imgWidth) / 2;
            }
            ctx.drawImage(img, sX, sY, sWidth, sHeight, 0, 0, targetSize, targetSize);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            console.warn("Fehler beim Verarbeiten des Profilbilds:", base64Data.substring(0, 50) + "...");
            resolve(null);
        };
        const cleanBase64 = base64Data.startsWith('data:') ? base64Data : `data:image/png;base64,${base64Data}`;
        img.src = cleanBase64;
    });
}

// Wir definieren den Client global, aber noch leer
let supabaseClient = null;

// Diese Funktion holt die Keys vom Server
async function setupSupabase() {
  try {
    const response = await fetch(`${API_BASE}/supabase-config`);
    const config = await response.json();

    if (!config.url || !config.key) {
      throw new Error("Config unvollständig");
    }

    // Hier wird der Client mit den dynamischen Daten erstellt
    supabaseClient = window.supabase.createClient(config.url, config.key);
    return true;
  } catch (err) {
    console.error("❌ Kritischer Fehler beim Laden der Supabase-Config:", err);
    return false;
  }
}



const EMPTY_PHRASES = ["📭 Niemand da… nur Staub und Stille.", "👻 Dieser Chat ist offiziell verflucht leer.", "🦗 Zirp zirp … mehr passiert hier nicht.", "📵 Funkstille seit… immer.", "🕳️ Hallo? Irgendwer im Datenloch?", "🫥 Chat leer. Motivation auch.", "🧹 Hier wurde wohl gründlich gelöscht.", "🪑 Niemand sitzt im Chatraum.", "🧊 Dieser Chat ist kälter als mein Kaffee.", "🐌 Nachrichten kommen hier im Schneckentempo.", "🕰️ Warte… immer noch nichts.", "🫗 Chat tropft vor Leere.", "🧘 Ruhe. Sehr viel Ruhe.", "🪦 RIP Chataktivität.", "🧭 Orientierungslos: Wo sind die Nachrichten?", "🧊 Gefrorener Chat. Bitte auftauen.", "🫧 Blubb… oh, doch nur Stille.", "🧩 Fehlendes Teil: eine Nachricht.", "🪫 Chat-Akku komplett leer.", "🐾 Keine Spuren von Aktivität.", "🛎️ Ding! … ach nee, falscher Alarm.", "🪄 Nachricht erscheint… irgendwann… vielleicht.", "🧠 Chat denkt nach. Sehr lange.", "🐼 Dieser Chat schläft tief und fest.","🌫️ Nebel im Chat. Nichts zu sehen.", "🧳 Alle Nachrichten sind ausgezogen.","🪼 Chat schwebt ziellos durchs Nichts.", "🧨 Spannung… und dann passiert nichts.","🛰️ Signal verloren. Chat im All.", "🪙 Kopf oder Zahl? Egal, niemand schreibt."];
const randomPhrase = EMPTY_PHRASES[Math.floor(Math.random() * EMPTY_PHRASES.length)];

// ======================
// 👤 USER-DATEN & STATUS
// ======================

// 1. Empfänger aus der URL ziehen
const urlParams = new URLSearchParams(window.location.search);
let empfänger = urlParams.get('user');

// Prüfen, ob es der Klassenchat ist (entweder ?CLASS oder ?user=CLASS)
const isClassChat = window.location.search.includes('CLASS') || empfänger === 'CLASS';

if (isClassChat) {
  empfänger = "CLASS";
}

// 🛡️ Validierung: Format prüfen (U + mindestens 2 Ziffern ODER Klassenchat)
const idRegex = /^U\d{2,}$/;

if (!empfänger || (!isClassChat && !idRegex.test(empfänger))) {
  console.error("Ungültige User-ID! Zurück zur Chatliste... 🏃💨");
  window.location.href = "/messenger.html?CLASS";
}

/**
 * Lädt die Profildaten (Name, Bild)
 */
async function loadUserInfo() {
  // SONDERFALL: Klassenchat
  if (isClassChat) {
    document.querySelector(".username").textContent = "Klassenchat";
    document.getElementById("profileImage").src = CDN + "/images/users/classchat.png";
    return; // Keine API nötig
  }

  try {
    const response = await fetch(getFreshUrl(`${API_BASE}/user/get/${empfänger}`));
    if (!response.ok) throw new Error("User nicht gefunden");

    const data = await response.json();

    document.querySelector(".username").textContent = data.formatierter_name;

    const profileImgElement = document.getElementById("profileImage");
    if (data.profile_image && data.profile_image !== "NULL" && data.profile_image !== "NONE") {
      const squaredImage = await createSquareBase64Image(data.profile_image, 55); // Target size for header profile image
      if (squaredImage) {
          profileImgElement.src = squaredImage;
          userCache[empfänger] = { ...userCache[empfänger], image: data.profile_image, squaredImage: squaredImage };
      } else {
          profileImgElement.src = CDN + "/images/users/default.png";
      }
    } else {
      profileImgElement.src = CDN + "/images/users/default.png";
    }

    console.log(`Profil von ${data.formatierter_name} geladen! ✅`);
  } catch (err) {
    console.error("Fehler beim Laden der User-Infos:", err);
  }
}

/**
 * Prüft den Online-Status und lädt die Mitgliederliste für den Klassenchat
 */
async function updateOnlineStatus() {
  const statusText = document.querySelector(".info-description");
  if (!statusText) return;

  if (isClassChat) {
    try {
      // 1. Wir generieren die IDs U01 bis U28 (unser "memberIds" Ersatz)
      const memberIds = Array.from({ length: 28 }, (_, i) => {
        const num = (i + 1).toString().padStart(2, '0');
        return `U${num}`;
      });

      // 2. Abfrage an dein neues Backend-Endpunkt
      const response = await fetch(`${API_BASE}/username/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: memberIds })
      });

      if (!response.ok) throw new Error("Konnte Namen nicht laden");

      const data = await response.json();

      if (data.users) {
        const processedUsers = {};
        for (const userId in data.users) {
            const user = data.users[userId];
            processedUsers[userId] = { ...user };
            if (user.image && user.image !== "NULL" && user.image !== "NONE") {
                const cleanBase64 = user.image.startsWith('data:') ? user.image : `data:image/png;base64,${user.image}`;
                processedUsers[userId].squaredImage = await createSquareBase64Image(cleanBase64, 35); // Target size for avatars
            }
        }
        userCache = { ...userCache, ...data.users };

        // 4. Namen für die Anzeige extrahieren und alphabetisch sortieren
        const namesArray = Object.values(data.users).map(u => u.name);
        namesArray.sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
        const namesList = namesArray.join(", ");
        
        // 5. Anzeige im Header (mit Marquee-Animation falls vorhanden)
        const displayElement = document.getElementById("chat-members-display");
        if (displayElement) {
          displayElement.innerText = namesList;
        }
        userCache = { ...userCache, ...processedUsers };
        // Falls du den Status-Text im Header auch füllen willst:
        statusText.innerHTML = `<span class="marquee-content">${namesList}</span>`;
        statusText.style.color = "var(--text-muted)";
      }
      
    } catch (err) {
      console.error("❌ Fehler beim Laden der Klassenmitglieder:", err);
      statusText.textContent = "Mitglieder konnten nicht geladen werden";
    }
    return;
  }

  // --- Normaler Online-Check für Einzel-User ---
  try {
    const response = await fetch(getFreshUrl(`${API_BASE}/online/status`));
    if (!response.ok) throw new Error("Status-Server nicht erreichbar");
    
    const data = await response.json();
    const currentStatus = data.online[empfänger];

    if (currentStatus === "online") {
      statusText.textContent = "online";
      statusText.style.color = "var(--messenger-online-akzent)";
    } else {
      statusText.textContent = "offline";
      statusText.style.color = ""; 
    }
  } catch (err) {
    console.error("Online-Status konnte nicht geladen werden:", err);
  }
}

function updateDescriptionMarquee() {
  const description = document.querySelector('.info-description');
  const parent = document.querySelector('.user-info');

  if (!description || !parent) return;

  // 1. Animation kurz killen, um die ECHTE Breite zu messen
  description.style.animation = 'none';
  description.style.transform = 'translateX(0)';
  void description.offsetWidth; // Force Reflow (zwingt den Browser, neu zu zeichnen)

  // 2. Platz vs. Textlänge messen
  const parentWidth = parent.clientWidth;
  const textWidth = description.scrollWidth;

  // 3. Nur animieren, wenn Text wirklich länger ist
  if (textWidth > parentWidth) {
    const scrollDistance = textWidth - parentWidth + 10; // 10px extra Puffer
    const speed = 35; // Pixel pro Sekunde (etwas entspannter)
    const slideTime = scrollDistance / speed;
    const pauseTime = 3; // 3 Sekunden stehen bleiben
    const totalTime = (slideTime * 2) + (pauseTime * 2);

    const p1 = (pauseTime / totalTime) * 100;
    const p2 = ((pauseTime + slideTime) / totalTime) * 100;
    const p3 = ((pauseTime * 2 + slideTime) / totalTime) * 100;

    let styleTag = document.getElementById('marquee-style-tag');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'marquee-style-tag';
      document.head.appendChild(styleTag);
    }

    styleTag.innerHTML = `
      @keyframes description-bounce {
        0%, ${p1}% { transform: translateX(0); }
        ${p2}%, ${p3}% { transform: translateX(-${scrollDistance}px); }
        100% { transform: translateX(0); }
      }
    `;

    description.style.animation = `description-bounce ${totalTime}s linear infinite`;
  }
}

// Beobachter starten (Wartet auf Textänderungen aus der Datenbank)
const observer = new MutationObserver(() => {
  setTimeout(updateDescriptionMarquee, 50); // Kurze 50ms Pause, damit HTML sicher gerendert ist
});

const targetNode = document.querySelector('.info-description');
if (targetNode) {
  observer.observe(targetNode, { childList: true, characterData: true, subtree: true });
}

window.addEventListener('resize', updateDescriptionMarquee);

setTimeout(updateDescriptionMarquee, 100);

// Fade-In für den SVG-Hintergrund
window.addEventListener('load', () => {
  const chatBg = document.querySelector('.chat-bg');
  if (chatBg) {
    // Kurze Verzögerung für den extra smoothen Effekt
    setTimeout(() => {
      chatBg.style.opacity = "1";
    }, 200); 
  }
});

// 🔁 Nur Intervall starten, wenn es NICHT der Klassenchat ist (spart Ressourcen!)
if (!isClassChat) {
  setInterval(updateOnlineStatus, 15000);
}


// ==========================================
// 💬 NACHRICHTEN LADEN & ANZEIGEN
// ==========================================

// Wir holen uns die ID des aktuell eingeloggten Accounts aus dem Speicher
const MY_ACCOUNT_ID = localStorage.getItem("currently_account");

// Falls mal gar nichts im Speicher steht (warum auch immer), 
// setzen wir einen Fallback, damit die App nicht crasht.
if (!MY_ACCOUNT_ID) {
    console.warn("Huch? Keine User-ID im localStorage gefunden! 🕵️‍♂️");
}

const MESSAGES_CONTAINER = document.querySelector(".chat-content"); // Stell sicher, dass dein Chat-Bereich diese Klasse hat!

/**
 * Der Haupt-Verteiler für Nachrichten
 */
async function loadMessages() {
  if (isClassChat) {
    await loadClassChatMessages();
  } else {
    // 🚧 HIER KOMMT SPÄTER DIE LOGIK FÜR NORMALE CHATS REIN!
    console.log("Normale Chats werden geladen... (Work in Progress 🛠️)");
  }
}

/**
 * Hilfsfunktion: Farbe für Avatare abdunkeln
 */
function darkenColor(hex, percent) {
    if (!hex) hex = "#cccccc";
    const num = parseInt(hex.replace("#", ""), 16);
    let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
    r = Math.max(0, Math.floor(r * (1 - percent)));
    g = Math.max(0, Math.floor(g * (1 - percent)));
    b = Math.max(0, Math.floor(b * (1 - percent)));
    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Erzeugt ein SVG-Profilbild, falls kein echtes Bild vorhanden ist
 */
function createDefaultAvatarSVG(userId) {
    const color = getUserColor(userId);
    const bgColor = darkenColor(color, 0.25);
    const svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="${bgColor}"/><circle cx="50" cy="32" r="14" fill="${color}"/><path d="M20 77c0-18 15-28 30-28s30 10 30 28" fill="${color}"/></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Holt die Bildquelle für einen Avatar.
 */
function getAvatarSrc(userId) {
    const userData = userCache[userId];

    // Prioritize pre-processed squared image from cache
    if (userData && userData.squaredImage) {
        return userData.squaredImage;
    }

    // Fallback: If no squared image in cache, but original image data exists,
    // return the original and rely on CSS object-fit: cover.
    if (userData && userData.image && userData.image !== "NULL" && userData.image !== "NONE") {
        return userData.image.startsWith('data:') ? userData.image : `data:image/png;base64,${userData.image}`;
    }
    
    // Fallback: Wenn kein Bild da ist, generieren wir das dynamische SVG in der User-Farbe
    return createDefaultAvatarSVG(userId);
}

/**
 * Wendet WhatsApp-ähnliche Formatierung an (*fett*, _kursiv_, ~durchgestrichen~)
 * @param {string} text - Der Rohtext
 * @param {boolean} hideMarks - Wenn true, werden die Symbole entfernt (für Chat-Bubbles)
 */
function parseFormatting(text, hideMarks = false) {
  const boldPattern = /\*([^\s*](?:[^*]*[^\s*])?|[^\s*])\*/g;
  const italicPattern = /_([^\s_](?:[^_]*[^\s_])?|[^\s_])_/g;
  const strikePattern = /~([^\s~](?:[^~]*[^\s~])?|[^\s~])~/g;

  if (hideMarks) {
    return text
      .replace(boldPattern, '<b>$1</b>')
      .replace(italicPattern, '<i>$1</i>')
      .replace(strikePattern, '<s>$1</s>');
  } else {
    return text
      .replace(boldPattern, '<span class="formatting-mark">*</span><b>$1</b><span class="formatting-mark">*</span>')
      .replace(italicPattern, '<span class="formatting-mark">_</span><i>$1</i><span class="formatting-mark">_</span>')
      .replace(strikePattern, '<span class="formatting-mark">~</span><s>$1</s><span class="formatting-mark">~</span>');
  }
}

/**
 * Generiert die HTML-Elemente (Sprechblasen) für eine Nachricht
 */
function renderMessage(msg) {
  const senderId = msg.user_id || msg.sender_id;
  const messageText = msg.text;
  const absenderName = msg.benutzer || senderId;

  if (!senderId) return;

  const me = localStorage.getItem("currently_account");
  const isMe = senderId === me;

  const msgRow = document.createElement("div");
  msgRow.className = `message-row ${isMe ? "me" : "other"}`;

  // Avatar für andere Nutzer
  if (!isMe) {
    const avatarCont = document.createElement("div");
    avatarCont.className = "avatar-container";
    const avatarImg = document.createElement("img");
    avatarImg.className = "avatar-img";
    avatarImg.src = getAvatarSrc(senderId);
    avatarImg.onerror = () => { avatarImg.src = createDefaultAvatarSVG(senderId); };
    avatarCont.appendChild(avatarImg);
    msgRow.appendChild(avatarCont);
  }

  const bubble = document.createElement("div");
  bubble.className = `message-bubble ${isMe ? "message-bubble-me" : "message-bubble-other"}`;

  // Name im Gruppenchat anzeigen
  if (!isMe && isClassChat) {
    const nameEl = document.createElement("div");
    nameEl.className = "message-sender-name";
    nameEl.textContent = absenderName;
    const color = getUserColor(senderId);
    nameEl.style.setProperty('color', color, 'important');
    nameEl.style.backgroundColor = `color-mix(in srgb, color-mix(in srgb, ${color}, var(--messenger-name-bg-mix) 40%) 30%, transparent)`;
    bubble.appendChild(nameEl);
  }

  // Bilder (Media)
  if (msg.media_url && msg.media_url.startsWith("base64://")) {
    const imageId = msg.media_url.replace("base64://", "");
    const imgPlaceholder = document.createElement("div");
    imgPlaceholder.className = "message-image-placeholder";
    imgPlaceholder.innerHTML = "Bild wird geladen... <br> ⏳";
    bubble.appendChild(imgPlaceholder);
    fetchBase64Image(imageId).then(base64Data => {
      if (base64Data) {
        const imgEl = document.createElement("img");
        imgEl.className = "message-image";
        imgEl.src = `data:image/jpeg;base64,${base64Data}`;
        imgPlaceholder.replaceWith(imgEl);
        if (isMe || isAtBottom()) scrollToBottom(true);
      } else {
        imgPlaceholder.textContent = "Bild fehlerhaft ❌";
      }
    });
  }

  // Nachrichtentext
  if (messageText) {
    const textEl = document.createElement("div");
    textEl.className = "message-text";

    const lines = messageText.split('\n');
    if (lines.length > 20) {
      // Nur die ersten 20 Zeilen anzeigen
      const truncatedText = lines.slice(0, 20).join('\n');
      const formattedText = parseFormatting(truncatedText, true).replace(/\n/g, '<br>');
      textEl.innerHTML = formattedText;
      bubble.appendChild(textEl);

      const readMore = document.createElement("div");
      readMore.className = "read-more-btn";
      readMore.textContent = "Mehr lesen";
      readMore.onclick = () => {
        textEl.innerHTML = parseFormatting(messageText, true).replace(/\n/g, '<br>');
        readMore.remove();
      };
      bubble.appendChild(readMore);
    } else {
      textEl.innerHTML = parseFormatting(messageText, true).replace(/\n/g, '<br>');
      bubble.appendChild(textEl);
    }
  }

  // Uhrzeit
  const timeEl = document.createElement("div");
  timeEl.className = "message-time";
  timeEl.textContent = msg.time ? msg.time.replace(/\[|\]/g, "") : "";
  bubble.appendChild(timeEl);

  msgRow.appendChild(bubble);
  MESSAGES_CONTAINER.appendChild(msgRow);
}

/**
 * Fetch-Request für die Bilder
 */
async function fetchBase64Image(imageId) {
  try {
    const response = await fetch(`${API_BASE}/image/base64/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_id: imageId })
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return data.base64;
  } catch (err) {
    console.error("❌ Fehler beim Laden des Bildes:", err);
    return null;
  }
}

/**
 * Scrollt den Chat nach unten. 
 * @param {boolean} smooth - Wenn true, wird sanft gescrollt. Wenn false, sofortiger Sprung.
 */
function scrollToBottom(smooth = true) {
  requestAnimationFrame(() => {
    MESSAGES_CONTAINER.scrollTo({
      top: MESSAGES_CONTAINER.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant'
    });
  });
}

/**
 * Prüft, ob der User gerade ganz unten ist (mit 20px Toleranz)
 */
function isAtBottom() {
  const threshold = 30; // Genau 30px Abstand zum Ende
  const position = MESSAGES_CONTAINER.scrollHeight - MESSAGES_CONTAINER.scrollTop - MESSAGES_CONTAINER.clientHeight;
  return position <= threshold;
}

/**
 * Hilfsfunktion um zu checken, ob eine Nachricht von mir ist
 */
function checkIfMe(msg) {
  const absenderId = msg.user_id ? String(msg.user_id).trim() : "null";
  const storageId = localStorage.getItem("USER_ID") ? String(localStorage.getItem("USER_ID")).trim() : "";
  const globalId = typeof MY_ACCOUNT_ID !== 'undefined' ? String(MY_ACCOUNT_ID).trim() : "";
  
  return (absenderId === storageId && storageId !== "") || 
         (absenderId === globalId && globalId !== "") ||
         (absenderId === "null" && msg.benutzer === (document.getElementById("profileName")?.textContent || ""));
}


// ======================
// Header Particle Animation
// ======================

const header = document.querySelector(".header-particles");

const MAX_PARTICLES = 75;
let particles = 0;

// Spawnrate je Bildschirm
function getSpawnDelay() {
  const w = window.innerWidth;

  if (w < 600) return 600;   // Handy
  if (w < 1000) return 250;  // Tablet
  if (w < 1600) return 150;  // Desktop

  return 100; // Minimum
}

// Random Helper
const rand = (min, max) => Math.random() * (max - min) + min;

// Farbe variieren
function randomColor() {
  const mix = rand(10, 35);

  return `color-mix(in srgb,
    var(--messenger-theme),
    black ${mix}%
  )`;
}

// Particle erzeugen
function spawnParticle() {

  if (particles >= MAX_PARTICLES) return;

  particles++;

  const el = document.createElement("div");
  el.className = "header-particle";

  const size = rand(6, 18);
  const duration = rand(5, 9);

  const startX = rand(0, header.offsetWidth);
  const drift = rand(-40, 40);
  const rotate = rand(90, 360);

  el.style.width = size + "px";
  el.style.height = size + "px";
  el.style.left = startX + "px";

  el.style.background = randomColor();

  el.style.animationDuration = duration + "s";

  el.style.setProperty("--driftX", drift + "px");
  el.style.setProperty("--rotateEnd", rotate + "deg");

  header.appendChild(el);

  /* cleanup */
  setTimeout(() => {
    el.remove();
    particles--;
  }, duration * 1000);
}

// Spawn Loop
let spawnTimer;

function startSpawner() {
  clearInterval(spawnTimer);

  spawnTimer = setInterval(() => {
    spawnParticle();
  }, getSpawnDelay());
}

startSpawner();
window.addEventListener("resize", startSpawner);


// ======================
// SEND BUTTON ANIMATION
// ======================
  const messageInput = document.getElementById('messageInput');
  const inputHighlighter = document.getElementById('inputHighlighter');
  const inputBar = messageInput.closest('.input-content');

  function updateInputState() {
    const val = messageInput.value;
    const hasText = val.trim().length > 0;
    inputBar.classList.toggle('has-text', hasText);
    
    // Sync Highlighter & Formatierung
    if (inputHighlighter) {
      inputHighlighter.innerHTML = parseFormatting(val.replace(/&/g, '&amp;').replace(/</g, '&lt;')) + (val.endsWith('\n') ? ' ' : '');
    }
  }

  messageInput.addEventListener('input', updateInputState);

  // Initial (falls Autofill o.ä.)
  updateInputState();


// ==========================================
// ⚠️ FEATURE NOTICE (Nicht verfügbar)
// ==========================================

function showFeatureNotice() {
  const notice = document.getElementById('not-available-notice');
  if (!notice) return;
  
  notice.classList.add('show');
  
  // Timer zurücksetzen, falls er schon läuft (Spam-Schutz)
  if (window.noticeTimeout) clearTimeout(window.noticeTimeout);
  
  window.noticeTimeout = setTimeout(() => {
    notice.classList.remove('show');
  }, 2000);
}

function initFeatureNotices() {
  document.querySelector('.add-icon')?.addEventListener('click', showFeatureNotice);
  document.querySelector('.camera-icon')?.addEventListener('click', showFeatureNotice);
  document.getElementById('stickerBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    showFeatureNotice();
  });
}

// ==========================================
// 🚀 NACHRICHTEN SENDEN
// ==========================================

const micSendBtn = document.getElementById("micSendBtn");
// Das messageInput hast du ja schon weiter unten definiert, wir nutzen es direkt mit!

/**
 * Gibt die aktuelle Uhrzeit im Format HH:MM zurück
 */
function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Sendet die geschriebene Nachricht an das Backend
 */
async function sendMessage() {
  // Wenn es kein Klassenchat ist, soll die Nachricht vorerst nicht gesendet werden.
  if (!isClassChat) {
    return;
  }

  const text = messageInput.value.trim();
  
  // Wenn kein Text da ist, würden wir eigentlich die Sprachaufnahme (Mic) starten.
  if (!text) {
    showFeatureNotice();
    return;
  }

  // Button kurz deaktivieren, damit keiner 10x pro Sekunde draufhämmert (Spam-Schutz)
  micSendBtn.style.pointerEvents = "none";
  micSendBtn.style.opacity = "0.7";

  const payload = {
    auth: btoa(MY_ACCOUNT_ID), // Boom: Base64 Codierung direkt eingebaut!
    time: getCurrentTime(),
    text: text
  };

  try {
    const response = await fetch(`${API_BASE}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log("✅ Nachricht wie ein Boss gesendet!");
      messageInput.value = ""; // Feld leeren
      updateInputState(); // Button switcht automatisch zurück zum Mic 🎤
      
    } else {
      console.error("❌ Server sagt Nein:", result.error);
    }
  } catch (err) {
    console.error("💥 Fehler beim Senden:", err);
  } finally {
    // Button wieder freigeben und Fokus aufs Eingabefeld setzen
    micSendBtn.style.pointerEvents = "auto";
    micSendBtn.style.opacity = "1";
    messageInput.focus();
  }
}

// Globale Elemente für den Floating Date Badge
const FLOATING_DATE_BADGE = document.getElementById("floating-date-badge");
const HEADER_HEIGHT = document.querySelector(".header").offsetHeight;
// 🖱️ Auf Klick reagieren
micSendBtn.addEventListener("click", sendMessage);

// ⌨️ Auf 'Enter' Taste reagieren (für die Keyboard-Ninjas)
messageInput.addEventListener("keydown", (e) => { // Geändert zu keydown für bessere Kontrolle über Shift+Enter
  if (e.key === "Enter" && e.shiftKey) {
    e.preventDefault(); // Verhindert den Zeilenumbruch, da wir senden wollen
    sendMessage();
  }
  // Normales Enter lässt die Textarea standardmäßig eine neue Zeile machen.
});

// Scroll-Synchronisation für den Highlighter
messageInput.addEventListener('scroll', () => {
  inputHighlighter.scrollTop = messageInput.scrollTop;
});

// Globale Variable, um das Datum der absolut letzten Nachricht zu speichern (für Chat-Divider)
let globalLastDateText = "";

function smartRender(msg) {
  const currentDateText = formatChatDividerDate(msg.timestamp);

  if (currentDateText && currentDateText !== globalLastDateText) {
    const divider = document.createElement("div");
    divider.className = "chat-divider";
    divider.dataset.date = currentDateText;
    divider.innerHTML = `<span>${currentDateText}</span>`;
    MESSAGES_CONTAINER.appendChild(divider);
    
    globalLastDateText = currentDateText;
  }

  renderMessage(msg);
}

/**
 * Holt die Nachrichten spezifisch für den Klassenchat (Mit Anti-Flacker-Schild)
 */
async function loadClassChatMessages() {
  if (!supabaseClient) {
    console.error("❌ loadClassChatMessages: Supabase noch nicht bereit!");
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("messages")
      .select("*")
      .order("id", { ascending: false })
      .limit(200);

    if (error) {
      console.error("❌ Fehler beim Laden der alten Nachrichten:", error.message);
      console.error("Vollständiger Error-Body:", error); // LOG 2
      return;
    }

    if (data) {

    const orderedData = [...data].reverse();
      // Alten Chat leeren
      MESSAGES_CONTAINER.innerHTML = "";
      globalLastDateText = ""; // Reset für den neuen Ladevorgang

      // Nachrichten rendern
      orderedData.forEach((msg) => {
      smartRender(msg); 
    });

    // Direkt nach unten springen
    setTimeout(() => scrollToBottom(false), 100);

    // Nach dem Rendern und Scrollen den Floating Date Badge initial aktualisieren
    setTimeout(updateFloatingDateBadge, 150); // Eine kleine Verzögerung, damit alles gerendert ist

    // Empty-State prüfen
    updateEmptyState(orderedData.length === 0);
    }
  } catch (err) {
    console.error("❌ Catch-Block Error in loadClassChatMessages:", err);
  }
}

let currentFloatingDate = ""; // Um das aktuell angezeigte Datum zu verfolgen
let lastScrollTop = 0;      // Für die Animationsrichtung des Badges
let hideBadgeTimeout = null; // Timer zum Ausblenden des Badges

/**
 * Aktualisiert die Sichtbarkeit und den Inhalt des Floating Date Badges.
 * Passt auch die Sichtbarkeit der normalen Chat-Divider an.
 */
function updateFloatingDateBadge() {
  const scrollTop = MESSAGES_CONTAINER.scrollTop;
  const dividers = MESSAGES_CONTAINER.querySelectorAll(".chat-divider");
  let activeDivider = null;

  // Bestimme den aktuell "sticky" zu machenden Divider
  // Wir gehen von unten nach oben durch, um den höchsten Divider zu finden,
  // der den Header-Bereich überlappt
  for (let i = dividers.length - 1; i >= 0; i--) {
    const divider = dividers[i];
    // divider.offsetTop ist relativ zum MESSAGES_CONTAINER
    // Wenn der Divider über den Header scrollt (kleiner als HEADER_HEIGHT)
    if (divider.offsetTop - scrollTop < HEADER_HEIGHT) {
      activeDivider = divider;
      break;
    }
  }

  if (activeDivider) {
    const dateText = activeDivider.dataset.date;
    if (dateText && dateText !== currentFloatingDate) {
      currentFloatingDate = dateText;
      FLOATING_DATE_BADGE.textContent = dateText;

      // Animation triggern (Expansionseffekt)
      FLOATING_DATE_BADGE.classList.remove("badge-expand-anim");
      void FLOATING_DATE_BADGE.offsetWidth; // Reflow zwingen
      FLOATING_DATE_BADGE.classList.add("badge-expand-anim");
    }

    FLOATING_DATE_BADGE.classList.add("visible");

    // Den echten Divider im Chat ausblenden, während das Badge drüber schwebt
    dividers.forEach((div) => {
      div.classList.toggle("is-hidden", div === activeDivider);
    });

    // Auto-Hide Logik: Wenn 1 Sekunde nicht gescrollt wird, das Badge ausblenden
    if (hideBadgeTimeout) clearTimeout(hideBadgeTimeout);
    hideBadgeTimeout = setTimeout(() => {
      FLOATING_DATE_BADGE.classList.remove("visible");
      // Den echten Divider wieder einblenden, wenn das schwebende Badge verschwindet
      dividers.forEach((div) => div.classList.remove("is-hidden"));
    }, 500);
  } else {
    // Wenn wir ganz oben sind und kein Divider den Header berührt
    FLOATING_DATE_BADGE.classList.remove("visible");
    currentFloatingDate = "";
    dividers.forEach((div) => div.classList.remove("is-hidden"));
    if (hideBadgeTimeout) clearTimeout(hideBadgeTimeout);
  }
}
 
// WICHTIG: Scroll-Event an den Container binden, damit das Badge live reagiert
MESSAGES_CONTAINER.addEventListener("scroll", updateFloatingDateBadge);



/**
 * Holt die gespeicherte Farbe für einen User aus dem localStorage
 */
function getUserColor(userId) {
  
  try {
    const colorsData = localStorage.getItem('user_colors');

    if (!colorsData) {
      console.warn("🎨 [FARB-CHECK] ⚠️ Kein Eintrag 'user_colors' im localStorage gefunden!");
      return '#53bdeb';
    }

    const colors = JSON.parse(colorsData);

    const foundColor = colors[userId];
    
    if (foundColor) {
      return foundColor;
    } else {
      console.warn(`🎨 [FARB-CHECK] ⚠️ ID '${userId}' nicht im Objekt gefunden. Lade Standard-Blau.`);
      return '#53bdeb';
    }
  } catch (e) {
    console.error("🎨 [FARB-CHECK] ❌ FEHLER beim Lesen der Daten! Wahrscheinlich ist das JSON-Format kaputt:", e);
    return '#53bdeb';
  }
}

/**
 * Hilfsfunktion zum Steuern des Banners
 */
function updateEmptyState(isEmpty) {
  let banner = document.getElementById('emptyStateBanner');
  
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'emptyStateBanner';
    banner.className = 'empty-state-banner';
    banner.textContent = randomPhrase;
    
    // --- DER FIX FÜR DEN FOKUS ---
    banner.addEventListener('click', () => {
      // Wir suchen das Feld direkt per ID, um sicherzugehen
      const inputField = document.getElementById("messageInput");
      const inputPill = document.getElementById("inputPill");
      if (inputField) {
        inputField.focus();
        
        // Bonus: Ein kleiner Glow-Effekt, damit man sieht, dass es aktiv ist
        inputPill.style.outline = "2px solid var(--messenger-theme)";
        setTimeout(() => {
           inputPill.style.outline = "1px solid rgba(255,255,255,0.06)";
        }, 1000);
      } else {
        console.error("❌ Eingabefeld #messageInput wurde nicht gefunden!");
      }
    });

    document.body.appendChild(banner);
  }

  if (isEmpty) {
    banner.classList.add('visible');
    banner.style.pointerEvents = "auto"; // Klickbar machen
  } else {
    banner.classList.remove('visible');
    banner.style.pointerEvents = "none"; // Klicks ignorieren
  }
}

// ==========================================
// ⚡ SUPABASE REALTIME LOGIK
// ==========================================

function initRealtime() {
  if (!supabaseClient) {
    console.error("❌ initRealtime: Supabase noch nicht bereit!");
    return;
  }
  try {
    // 🛠️ HIER GEFIXT: 'supabase' statt 'supabaseClient'
    supabaseClient
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          console.log("🚀 Neue Nachricht via Realtime:", payload.new);
          
          const wasAtBottom = isAtBottom(); // 1. Check: War ich vor der Nachricht unten?
          const isMe = checkIfMe(payload.new); // 2. Check: Ist die Nachricht von mir?

          smartRender(payload.new); 
          
          // Nur scrollen, wenn ich selbst geschrieben habe ODER schon unten war
          if (isMe || wasAtBottom) {
            scrollToBottom(true); // Hier nutzen wir die Smooth-Animation 🌊
          } else {
            console.log("Anker gesetzt! Nachricht oben eingetroffen, aber wir bleiben hier. ⚓");
          }

          updateEmptyState(false);
        }
      )
      .subscribe((status) => {
        console.log("📡 Realtime Status:", status);
      });

  } catch (err) {
    console.error("❌ Fehler beim Starten von Realtime:", err);
  }
}

// ==========================================
// 🎨 THEME / FARB-STEUERUNG
// ==========================================

function initThemeSystem() {
  const savedColor = localStorage.getItem("messenger_theme_color");
  if (savedColor) {
    document.documentElement.style.setProperty('--messenger-theme', savedColor);
    const preview = document.getElementById("theme-color-preview");
    if (preview) preview.style.backgroundColor = savedColor;
  }

  const savedTextColor = localStorage.getItem("messenger_me_text_color");
  if (savedTextColor) {
    document.documentElement.style.setProperty('--messenger-me-text', savedTextColor);
    const textPreview = document.getElementById("text-color-preview");
    if (textPreview) textPreview.style.backgroundColor = savedTextColor;
  }

  const clickArea = document.querySelector(".click-area");
  const themeDropdown = document.getElementById("theme-dropdown");
  const colorInput = document.getElementById("theme-color-input");
  const editBtn = document.getElementById("edit-theme-btn");
  const colorPreview = document.getElementById("theme-color-preview");

  const textColorInput = document.getElementById("text-color-input");
  const editTextBtn = document.getElementById("edit-text-btn");
  const textColorPreview = document.getElementById("text-color-preview");

  // Initialisiere die Werte der Color-Picker, damit das erste Event korrekt feuert
  if (colorInput) colorInput.value = savedColor || "#28a200";
  if (textColorInput) textColorInput.value = savedTextColor || "#e9edef";

  // Dropdown umschalten bei Klick auf Header-Info
  if (clickArea && themeDropdown) {
    clickArea.addEventListener("click", (e) => {
      // Verhindere das Schließen wenn man auf das Icon klickt (falls das separat wäre)
      themeDropdown.classList.toggle("show");
      e.stopPropagation();
    });
  }

  // Gesamte Zeile für Akzentfarbe klickbar machen
  const accentRow = colorInput?.closest('.theme-row');
  if (accentRow && colorInput) {
    accentRow.addEventListener("click", (e) => {
      // e.preventDefault(); // Entfernt, da es das Öffnen des Color Pickers blockieren kann
      e.stopPropagation();
      colorInput.click();
    });
  }

  // Gesamte Zeile für Schriftfarbe klickbar machen
  const textRow = textColorInput?.closest('.theme-row');
  if (textRow && textColorInput) {
    textRow.addEventListener("click", (e) => {
      // e.preventDefault(); // Entfernt, da es das Öffnen des Color Pickers blockieren kann
      e.stopPropagation();
      textColorInput.click();
    });
  }

  // Wenn Farbe gewählt wird
  if (colorInput) {
    const updateTheme = (e) => {
      const newColor = e.target.value;
      document.documentElement.style.setProperty('--messenger-theme', newColor);
      if (colorPreview) colorPreview.style.backgroundColor = newColor;
      localStorage.setItem("messenger_theme_color", newColor);
    };
    colorInput.addEventListener("input", updateTheme);
    colorInput.addEventListener("change", updateTheme);
  }

  // Wenn Textfarbe gewählt wird
  if (textColorInput) {
    const updateTextColor = (e) => {
      const newColor = e.target.value;
      document.documentElement.style.setProperty('--messenger-me-text', newColor);
      if (textColorPreview) textColorPreview.style.backgroundColor = newColor;
      localStorage.setItem("messenger_me_text_color", newColor);
    };
    textColorInput.addEventListener("input", updateTextColor);
    textColorInput.addEventListener("change", updateTextColor);
  }

  // Schließen wenn man woanders hinklickt
  document.addEventListener("click", (e) => {
    if (themeDropdown && !themeDropdown.contains(e.target) && !clickArea.contains(e.target)) {
      themeDropdown.classList.remove("show");
    }
  });
}

// ======================
// 🚀 DIE MASTER-STEUERUNG (OPTIMIERT)
// ======================
async function startApp() {

  // Theme initialisieren (Farbe laden)
  initThemeSystem();

  // Feature Notices initialisieren
  initFeatureNotices();

  // 1. Keys von API holen
  const isReady = await setupSupabase();
  
  if (isReady) {
    // 2. Profil des Gegenübers laden
    loadUserInfo(); 

    // 3. WICHTIG: Wir warten (await), bis alle Klassendaten im Cache sind!
    // Erst wenn diese Funktion fertig ist, geht es weiter.
    await updateOnlineStatus(); 

    // 4. Jetzt erst die Nachrichten laden - der Cache ist nun voll! ✅
    await loadMessages();
    
    if (isClassChat) {
      initRealtime();
    }
    
  } else {
    console.error("⛔ Abbruch: Keine Verbindung zu Supabase.");
  }
}

// Den Motor einmalig starten
startApp();




// ======================
// 🚀 SCROLL-BOTTOM LOGIK
// ======================
// ID angepasst an messenger.html (scrollToBottomBtn)
const scrollBottomBtn = document.getElementById('scrollToBottomBtn');

if (scrollBottomBtn) {
  // Klick-Logik
  scrollBottomBtn.onclick = () => scrollToBottom(true);

  // Scroll-Logik
  MESSAGES_CONTAINER.addEventListener('scroll', () => {
    const isDown = isAtBottom();
    
    // Debugging: Falls du die Konsole öffnest (F12), siehst du ob er triggert
    // console.log("Am Boden:", isDown, "ScrollTop:", MESSAGES_CONTAINER.scrollTop);

    if (!isDown) {
      scrollBottomBtn.classList.add('visible');
    } else {
      scrollBottomBtn.classList.remove('visible');
    }
  });
}

/* =======================================
    📅 DATUMS-LOGIK
    ======================================= */
function formatChatDividerDate(timestamp) {
  if (!timestamp) return "";
  
  const msgDate = new Date(timestamp);
  const today = new Date();
  
  // Setze beide auf 00:00 Uhr, um saubere Tagesdifferenzen zu berechnen
  const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const diffTime = Math.abs(currentDay - msgDay);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffMonths = (today.getFullYear() - msgDate.getFullYear()) * 12 + (today.getMonth() - msgDate.getMonth());

  const wochentage = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const wochentageKurz = ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."];
  const monateKurz = ["Jan.", "Feb.", "Mär.", "Apr.", "Mai", "Jun.", "Jul.", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];

  if (diffDays === 0) return "Heute";
  if (diffDays === 1) return "Gestern";
  
  if (diffDays >= 2 && diffDays <= 6) {
    return wochentage[msgDate.getDay()]; // z.B. "Mittwoch"
  }
  
  if (diffMonths >= 6) {
    return `${msgDate.getDate()}. ${monateKurz[msgDate.getMonth()]} ${msgDate.getFullYear()}`; // z.B. "12. Mär. 2025"
  }
  
  if (diffDays >= 7) {
    return `${wochentageKurz[msgDate.getDay()]} ${msgDate.getDate()}. ${monateKurz[msgDate.getMonth()]}`; // z.B. "Fr. 3. Apr."
  }
}

// ==========================================
// 📱 RESPONSIVE KEYBOARD (Visual Viewport Fix)
// ==========================================
/**
 * Sorgt dafür, dass das Input-Feld auf Mobilgeräten exakt über der Tastatur sitzt,
 * ohne dass die gesamte Seite (Header etc.) nach oben geschoben wird.
 */
if (window.visualViewport) {
  const vv = window.visualViewport;

  const updateLayoutForKeyboard = () => {
    const inputBar = document.querySelector('.input-content');
    const scrollBtn = document.getElementById('scrollToBottomBtn');

    // Der Versatz durch die Tastatur (Layout-Höhe minus sichtbare Höhe)
    // Wir ziehen vv.offsetTop ab, falls der Browser dennoch versucht zu pannen.
    const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
    const bottomPos = Math.max(0, keyboardHeight);

    if (inputBar) {
      inputBar.style.bottom = `${bottomPos}px`;
    }

    if (scrollBtn) {
      scrollBtn.style.bottom = `${bottomPos + 90}px`;
    }

    if (MESSAGES_CONTAINER) {
      MESSAGES_CONTAINER.style.paddingBottom = `${bottomPos + 100}px`;
    }

    // Wenn die Tastatur aufging, ans Ende scrollen (mit kurzem Timeout für Render-Sync)
    if (bottomPos > 50) {
      setTimeout(() => scrollToBottom(false), 30);
    }
  };

  vv.addEventListener('resize', updateLayoutForKeyboard);
  vv.addEventListener('scroll', updateLayoutForKeyboard);
}