const CDN = window.CDN_BASE || "https://cdn.jsdelivr.net/gh/Lxk5z/kotzapp-web@latest";
const API_BASE = "https://kotzapp.onrender.com";
const currentUserId = localStorage.getItem("currently_account");
window.CURRENT_USER_ID = localStorage.getItem("currently_account");


let userCache = {}; // Globaler Speicher für Nutzerdaten (Namen/Bilder)
const inMemoryImageCache = {};
const IMAGE_SESSION_CACHE_PREFIX = 'cached_image_';
const IMAGE_SESSION_INDEX_KEY = 'cached_image_index';
const MAX_IMAGE_SESSION_STORAGE_CHARS = 180000; // Ca. 180 KB base64 - sicher im Storage
const MAX_SESSION_CACHED_IMAGES = 10;

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
    const response = await fetch(getFreshUrl(`${API_BASE}/supabase-config`), {
      cache: 'no-store'
    });
    const config = await response.json();

    if (!config.url || !config.key) {
      throw new Error("Config unvollständig");
    }

    // Hier wird der Client mit den dynamischen Daten erstellt
    supabaseClient = window.supabase.createClient(config.url, config.key, {
      fetch: (url, options) => window.fetch(getFreshUrl(url), {
        ...options,
        cache: 'no-store'
      })
    });
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
    const response = await fetch(getFreshUrl(`${API_BASE}/user/get/${empfänger}`), {
      cache: 'no-store'
    });
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

      // Initialisiere die Farben für alle Klassenmitglieder im LocalStorage,
      // sofern diese Funktion in main.js definiert wurde.
      if (typeof initializeUserColors === 'function') {
        initializeUserColors(memberIds.map(id => ({ benutzer_id: id })));
      }

      // 2. Caching-Logik für Usernamen (Ressourcen sparen)
      let data;
      const cachedNames = sessionStorage.getItem("name_list");

      if (cachedNames) {
        data = JSON.parse(cachedNames);
      } else {
        const response = await fetch(getFreshUrl(`${API_BASE}/username/get`), {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: memberIds })
        });
        if (!response.ok) throw new Error("Konnte Namen nicht laden");
        data = await response.json();
        sessionStorage.setItem("name_list", JSON.stringify(data));
      }

      if (data.users) {
        const processedUsers = {};
        for (const userId in data.users) {
            // Nur verarbeiten, wenn noch nicht im Cache (spart CPU/Akku)
            if (userCache[userId] && userCache[userId].squaredImage) continue;

            const user = data.users[userId];
            processedUsers[userId] = { ...user };
            if (user.image && user.image !== "NULL" && user.image !== "NONE") {
                const cleanBase64 = user.image.startsWith('data:') ? user.image : `data:image/png;base64,${user.image}`;
                processedUsers[userId].squaredImage = await createSquareBase64Image(cleanBase64, 35); // Target size for avatars
            }
        }
        userCache = { ...userCache, ...processedUsers };

        // 4. Online-Status laden
        const statusRes = await fetch(getFreshUrl(`${API_BASE}/online/status`), {
          cache: 'no-store'
        });
        if (!statusRes.ok) throw new Error("Online-Status konnte nicht geladen werden");
        const statusData = await statusRes.json();
        const onlineMap = statusData.online || {};

        // 5. Nur die Namen derer filtern, die wirklich "online" sind
        const onlineNames = [];
        memberIds.forEach(id => {
          if (onlineMap[id] === "online") {
            const u = data.users[id];
            if (u && u.name) onlineNames.push(u.name);
          }
        });

        onlineNames.sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
        const namesList = onlineNames.join(", ");

        // 6. Anzeige im Header (Online-Label in grün, Namen in Standardfarbe)
        const onlinePrefix = `<span style="color: #00ff00; font-weight: bold;">online (${onlineNames.length}):</span>`;
        const namesSpan = `<span style="color: var(--text-color);"> ${namesList || 'keiner'}</span>`;

        statusText.innerHTML = `<span class="marquee-content">${onlinePrefix}${namesSpan}</span>`;
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

      // Auch für Einzel-Chats die Farbe sicherstellen
      if (typeof initializeUserColors === 'function') {
        initializeUserColors([{ benutzer_id: empfänger }]);
      }
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

// 🔁 Intervall starten: 13s für Klassenchat (wie gewünscht), 15s für Einzelchats
setInterval(updateOnlineStatus, 13000);

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

// Attached media state (single image allowed for now)
let attachedMediaBase64 = null; // pure base64 string WITHOUT data: prefix
let attachedMediaMime = null;

function stripDataUrlPrefix(dataUrl) {
  if (!dataUrl) return dataUrl;
  const idx = dataUrl.indexOf('base64,');
  if (idx === -1) return dataUrl;
  return dataUrl.substring(idx + 7);
}

function updateAddButtonIcon(hasMedia) {
  const addToggleBtn = document.getElementById('addToggleBtn');
  if (!addToggleBtn) return;
  const addIcon = addToggleBtn.querySelector('.add-icon');
  if (!addIcon) return;
  if (hasMedia) {
    addToggleBtn.classList.add('media-attached');
    // Replace inner SVG path with a trash icon (keeps same element)
    addIcon.innerHTML = '<path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360Zm-240-560v40h240v-40H200Z"/>';
  } else {
    addToggleBtn.classList.remove('media-attached');
    // Restore original plus icon (simple form)
    addIcon.innerHTML = '<path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>';
  }
}

function attachMedia(base64, mime) {
  attachedMediaBase64 = base64;
  attachedMediaMime = mime || 'image/jpeg';

  // Create / show preview bar
  let bar = document.querySelector('.selected-media-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'selected-media-bar';
    const item = document.createElement('div');
    item.className = 'selected-media-item';
    const img = document.createElement('img');
    img.className = 'selected-media-img';
    item.appendChild(img);
    const removeBtn = document.createElement('div');
    removeBtn.className = 'selected-media-remove';
    removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    removeBtn.addEventListener('click', (e) => { e.stopPropagation(); removeAttachedMedia(); });
    item.appendChild(removeBtn);
    bar.appendChild(item);
    document.body.appendChild(bar);
  }
  const imgEl = bar.querySelector('img');
  imgEl.src = `data:${attachedMediaMime};base64,${attachedMediaBase64}`;

  // Close drawer
  const drawer = document.getElementById('attachment-drawer');
  const addToggleBtn = document.getElementById('addToggleBtn');
  if (drawer) drawer.classList.remove('show');
  if (addToggleBtn) {
    addToggleBtn.classList.add('media-attached');
    updateAddButtonIcon(true);
  }

  // Force send icon visible even if no text
  const inputBar = document.querySelector('.input-content');
  if (inputBar) inputBar.classList.add('has-text');

  // ensure CSS variables for input/drawer heights are current then update dock height
  updateBottomBarHeight();
  // wait a frame for layout, then update dock height
  requestAnimationFrame(() => requestAnimationFrame(updateDockHeight));
}

function removeAttachedMedia() {
  attachedMediaBase64 = null;
  attachedMediaMime = null;
  const bar = document.querySelector('.selected-media-bar');
  if (bar) bar.remove();
  updateAddButtonIcon(false);

  // restore input bar state depending on text content
  const inputBar = document.querySelector('.input-content');
  const messageInput = document.getElementById('messageInput');
  if (inputBar) {
    const hasText = messageInput && messageInput.value.trim().length > 0;
    inputBar.classList.toggle('has-text', hasText);
  }

  // update input height and dock height after removal
  updateBottomBarHeight();
  requestAnimationFrame(() => requestAnimationFrame(updateDockHeight));
}

function updateDockHeight() {
  const bar = document.querySelector('.selected-media-bar');
  const drawer = document.getElementById('attachment-drawer');
  let h = 0;
  if (bar) {
    // subtract top shadow overlap if present (approx 6px) to avoid clipping chat items
    const raw = Math.round(bar.getBoundingClientRect().height);
    const shadowOverlap = 6; // matches box-shadow vertical spread roughly
    h = Math.max(0, raw - shadowOverlap) + 8;
  } else if (drawer && drawer.classList.contains('show')) {
    h = Math.round(drawer.getBoundingClientRect().height) + 8;
  }
  document.documentElement.style.setProperty('--dock-height', `${h}px`);
}

// Global helper: calculate and set the bottom bar height as a CSS variable.
// This is used by attachment handlers that run outside of the drawer init scope.
function updateBottomBarHeight() {
  const inputContent = document.querySelector('.input-content');
  const selectedBar = document.querySelector('.selected-media-bar');
  const drawer = document.getElementById('attachment-drawer');

  let h = 0;
  if (inputContent) {
    h += Math.round(inputContent.getBoundingClientRect().height);
  }
  if (selectedBar) {
    h += Math.round(selectedBar.getBoundingClientRect().height);
  }
  if (drawer && drawer.classList.contains('show')) {
    h += Math.round(drawer.getBoundingClientRect().height);
  }

  // Add a small padding to avoid clipping
  h = Math.max(0, h) + 8;
  document.documentElement.style.setProperty('--bottom-bar-height', `${h}px`);
}

function openPhotoPicker() {
  // create hidden file input if not exists
  let fileInput = document.getElementById('__photo_picker_input');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.id = '__photo_picker_input';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) {
        try {
          const mime = (f.type || '').toLowerCase();
          if (mime === 'image/jpeg' || mime === 'image/jpg') {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result;
              const base64 = stripDataUrlPrefix(dataUrl);
              attachMedia(base64, 'image/jpeg');
            };
            reader.readAsDataURL(f);
          } else {
            const base64Jpg = await convertFileToJpg(f);
            attachMedia(base64Jpg, 'image/jpeg');
          }
        } catch (err) {
          console.error('Photo conversion failed:', err);
          alert(`Foto konnte nicht konvertiert werden: ${err.message}`);
        }
      }
      // reset value so same file can be selected later
      fileInput.value = '';
    });
    document.body.appendChild(fileInput);
  }
  fileInput.click();
}

function openDocumentPicker() {
  // accepted document/image formats
  const accept = '.jpg,.jpeg,.png,.gif,.tiff,.tif,.bmp,.webp,.heic,.heif,.svg,.raw,.pdf,.psd,.ai,.eps';
  
  let fileInput = document.getElementById('__document_picker_input');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = accept;
    fileInput.id = '__document_picker_input';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) {
        try {
          const base64Jpg = await convertFileToJpg(f);
          attachMedia(base64Jpg, 'image/jpeg');
        } catch (err) {
          console.error('Document conversion failed:', err);
          alert(`Datei konnte nicht konvertiert werden: ${err.message}`);
        }
      }
      // reset value so same file can be selected later
      fileInput.value = '';
    });
    document.body.appendChild(fileInput);
  }
  fileInput.click();
}

async function convertFileToJpg(file) {
  // Read file as data URL
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // For image formats (jpg, jpeg, png, gif, bmp, webp, heic, heif, tiff, tif, svg, raw)
  // Load via Image and render to canvas
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Create canvas with image dimensions
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        // Draw image (animated GIFs will show first frame only)
        // Use black background for transparent areas
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Convert to JPG
        const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const base64 = stripDataUrlPrefix(jpgDataUrl);
        resolve(base64);
      } catch (err) {
        reject(new Error(`Canvas rendering failed: ${err.message}`));
      }
    };
    img.onerror = () => {
      // Fallback: PDF, PSD, AI, EPS are not directly loadable as images
      const ext = file.name.split('.').pop().toLowerCase();
      if (['pdf', 'psd', 'ai', 'eps'].includes(ext)) {
        reject(new Error(`Format .${ext} wird noch nicht unterstützt. Bitte nur Bildformate (PNG, JPG, GIF, etc.) hochladen.`));
      } else {
        reject(new Error(`Datei konnte nicht als Bild geladen werden.`));
      }
    };
    img.src = dataUrl;
  });
}

async function openCameraModal() {
  if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
    openPhotoPicker();
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'camera-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0,0,0,0.85)';
  overlay.style.zIndex = '20000';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  const container = document.createElement('div');
  container.style.width = '100%';
  container.style.maxWidth = '920px';
  container.style.maxHeight = '92vh';
  container.style.position = 'relative';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'center';

  const videoWrap = document.createElement('div');
  videoWrap.style.position = 'relative';
  videoWrap.style.width = '100%';
  videoWrap.style.background = '#000';
  videoWrap.style.borderRadius = '12px';
  videoWrap.style.overflow = 'hidden';

  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.style.width = '100%';
  video.style.height = 'auto';
  video.style.display = 'block';
  videoWrap.appendChild(video);

  // Crop selection box
  const crop = document.createElement('div');
  crop.className = 'crop-box';
  // initial box: centered square 70% of width
  crop.style.width = '70%';
  crop.style.height = '70%';
  crop.style.left = '15%';
  crop.style.top = '15%';
  videoWrap.appendChild(crop);
  ['nw','ne','sw','se'].forEach(cls=>{
    const h = document.createElement('div');
    h.className = 'crop-handle ' + cls;
    crop.appendChild(h);
  });

  container.appendChild(videoWrap);

  const controls = document.createElement('div');
  controls.className = 'cam-controls';
  controls.style.display = 'flex';
  controls.style.alignItems = 'center';

  const switchBtn = document.createElement('button');
  switchBtn.className = 'cam-switch-btn cam-btn';
  switchBtn.title = 'Kamera wechseln';
  switchBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3"><path d="M480-240q79 0 136-53.5T678-426l30 28 42-42-100-100-100 100 42 42 26-26q-6 53-45 88.5T480-300q-13 0-25.5-2.5T430-310l-44 44q22 12 45.5 19t48.5 7ZM310-340l100-100-42-42-26 26q6-53 45-88.5t93-35.5q13 0 25.5 2.5T530-570l44-44q-22-12-45.5-19t-48.5-7q-79 0-136 53.5T282-454l-30-28-42 42 100 100ZM160-120q-33 0-56.5-23.5T80-200v-480q0-33 23.5-56.5T160-760h126l74-80h240l74 80h126q33 0 56.5 23.5T880-680v480q0 33-23.5 56.5T800-120H160Zm0-80h640v-480H638l-73-80H395l-73 80H160v480Zm320-240Z"/></svg>';

  const captureBtn = document.createElement('button');
  captureBtn.className = 'cam-btn primary';
  captureBtn.textContent = 'Foto aufnehmen';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'cam-btn';
  cancelBtn.textContent = 'Abbrechen';

  controls.appendChild(switchBtn);
  controls.appendChild(captureBtn);
  controls.appendChild(cancelBtn);
  container.appendChild(controls);

  overlay.appendChild(container);
  document.body.appendChild(overlay);

  let stream = null;
  let currentFacing = 'environment';

  async function startStream() {
    if (stream) stream.getTracks().forEach(t=>t.stop());
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: currentFacing }, audio: false });
      video.srcObject = stream;
      await video.play();
    } catch (err) {
      console.error('Kamera nicht verfügbar:', err);
      overlay.remove();
      openPhotoPicker();
    }
  }

  await startStream();

  // Crop box interactivity (drag + corner resize)
  (function setupCropInteractions(){
    let isDragging=false, dragOffsetX=0, dragOffsetY=0;
    let isResizing=false, resizeDir=null, startRect=null, startPointer={x:0,y:0};

    function getBounds(){ return video.getBoundingClientRect(); }
    function toNumber(v){ return parseFloat(v.replace('%',''))/100; }

    crop.addEventListener('pointerdown', (ev)=>{
      ev.preventDefault();
      isDragging = true;
      const rect = crop.getBoundingClientRect();
      dragOffsetX = ev.clientX - rect.left;
      dragOffsetY = ev.clientY - rect.top;
      crop.setPointerCapture(ev.pointerId);
    });

    crop.addEventListener('pointerup', (ev)=>{ isDragging=false; crop.releasePointerCapture(ev.pointerId); });
    crop.addEventListener('pointercancel', ()=>{ isDragging=false; });

    crop.querySelectorAll('.crop-handle').forEach(h => {
      h.addEventListener('pointerdown', (ev)=>{
        ev.stopPropagation();
        isResizing=true; resizeDir = Array.from(h.classList).find(c=>['nw','ne','sw','se'].includes(c));
        startRect = crop.getBoundingClientRect();
        startPointer = {x: ev.clientX, y: ev.clientY};
        h.setPointerCapture(ev.pointerId);
      });
      h.addEventListener('pointerup', (ev)=>{ isResizing=false; h.releasePointerCapture(ev.pointerId); });
    });

    window.addEventListener('pointermove', (ev)=>{
      const vBounds = getBounds();
      if (isDragging) {
        let newLeft = ev.clientX - vBounds.left - dragOffsetX;
        let newTop = ev.clientY - vBounds.top - dragOffsetY;
        // clamp
        newLeft = Math.max(0, Math.min(newLeft, vBounds.width - crop.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, vBounds.height - crop.offsetHeight));
        crop.style.left = (newLeft / vBounds.width * 100) + '%';
        crop.style.top = (newTop / vBounds.height * 100) + '%';
      } else if (isResizing && startRect) {
        let dx = ev.clientX - startPointer.x;
        let dy = ev.clientY - startPointer.y;
        let left = startRect.left, top = startRect.top, width = startRect.width, height = startRect.height;
        if (resizeDir === 'nw') { left += dx; top += dy; width -= dx; height -= dy; }
        if (resizeDir === 'ne') { top += dy; width += dx; height -= dy; }
        if (resizeDir === 'sw') { left += dx; width -= dx; height += dy; }
        if (resizeDir === 'se') { width += dx; height += dy; }
        // clamp to video bounds
        const vL = vBounds.left, vT = vBounds.top, vW = vBounds.width, vH = vBounds.height;
        left = Math.max(vL, Math.min(left, vL+vW-40));
        top = Math.max(vT, Math.min(top, vT+vH-40));
        width = Math.max(40, Math.min(width, vL+vW - left));
        height = Math.max(40, Math.min(height, vT+vH - top));
        // apply
        crop.style.left = ((left - vBounds.left)/vBounds.width*100) + '%';
        crop.style.top = ((top - vBounds.top)/vBounds.height*100) + '%';
        crop.style.width = (width / vBounds.width * 100) + '%';
        crop.style.height = (height / vBounds.height * 100) + '%';
      }
    });
  })();

  // Switch camera
  switchBtn.addEventListener('click', async () => {
    currentFacing = currentFacing === 'environment' ? 'user' : 'environment';
    await startStream();
  });

  cancelBtn.addEventListener('click', () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    overlay.remove();
  });

  captureBtn.addEventListener('click', () => {
    // crop-aware capture
    const vRect = video.getBoundingClientRect();
    const cRect = crop.getBoundingClientRect();
    const sx = Math.max(0, (cRect.left - vRect.left) * (video.videoWidth / vRect.width));
    const sy = Math.max(0, (cRect.top - vRect.top) * (video.videoHeight / vRect.height));
    const sw = Math.max(1, cRect.width * (video.videoWidth / vRect.width));
    const sh = Math.max(1, cRect.height * (video.videoHeight / vRect.height));
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = stripDataUrlPrefix(dataUrl);
    if (stream) stream.getTracks().forEach(t => t.stop());
    overlay.remove();
    attachMedia(base64, 'image/jpeg');
  });
}

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
 * Hilfsfunktion zum Einfügen von Nachrichten vor dem Loader (damit dieser immer am Ende bleibt)
 */
function appendToChat(element) {
  const loaderCont = document.getElementById('pull-up-loader-container');
  if (loaderCont) {
    MESSAGES_CONTAINER.insertBefore(element, loaderCont);
  } else {
    MESSAGES_CONTAINER.appendChild(element);
  }
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

    const cachedBase64 = getCachedImageBase64(imageId);
    if (cachedBase64) {
      const imgEl = document.createElement("img");
      imgEl.className = "message-image";
      imgEl.src = `data:image/jpeg;base64,${cachedBase64}`;
      const openPreview = () => openImagePreview(imgEl.src);
      imgEl.addEventListener('click', openPreview);
      imgEl.addEventListener('pointerup', openPreview);
      imgEl.addEventListener('touchend', openPreview);
      imgPlaceholder.replaceWith(imgEl);
    } else {
      fetchBase64Image(imageId).then(base64Data => {
        if (base64Data) {
          cacheImageBase64(imageId, base64Data);
          const imgEl = document.createElement("img");
          imgEl.className = "message-image";
          imgEl.src = `data:image/jpeg;base64,${base64Data}`;
          const openPreview = () => openImagePreview(imgEl.src);
          imgEl.addEventListener('click', openPreview);
          imgEl.addEventListener('pointerup', openPreview);
          imgEl.addEventListener('touchend', openPreview);
          imgPlaceholder.replaceWith(imgEl);
        } else {
          imgPlaceholder.textContent = "Bild fehlerhaft ❌";
        }
      });
    }
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
  appendToChat(msgRow);
}

function setPreviewButtonState(button, successText) {
  if (!button) return;
  button.classList.add('pop');
  button.classList.add('active');
  const icon = button.querySelector('svg');
  if (icon) icon.style.fill = '#5dd65f';

  setTimeout(() => {
    button.classList.remove('pop');
  }, 240);
  setTimeout(() => {
    button.classList.remove('active');
    if (icon) icon.style.fill = '#e3e3e3';
  }, 800);
}

function closeImagePreview() {
  const overlay = document.getElementById('imagePreviewOverlay');
  const img = document.getElementById('imagePreviewMedia');
  if (overlay) {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
  }
  if (img) {
    img.src = '';
  }
}

async function saveImagePreview() {
  const img = document.getElementById('imagePreviewMedia');
  if (!img || !img.src) return;

  try {
    const anchor = document.createElement('a');
    anchor.href = img.src;
    anchor.download = `kotzapp-image-${Date.now()}.jpg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    const button = document.getElementById('imagePreviewSave');
    setPreviewButtonState(button, 'Gespeichert');
  } catch (err) {
    console.error('Speichern fehlgeschlagen:', err);
  }
}

async function copyImagePreview() {
  const img = document.getElementById('imagePreviewMedia');
  if (!img || !img.src) return;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(img.src);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = img.src;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }

    const button = document.getElementById('imagePreviewCopy');
    setPreviewButtonState(button, 'Kopiert');
  } catch (err) {
    console.error('Kopieren fehlgeschlagen:', err);
  }
}

function openImagePreview(src) {
  const overlay = document.getElementById('imagePreviewOverlay');
  const img = document.getElementById('imagePreviewMedia');
  if (!overlay || !img) return;
  img.src = src;
  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden', 'false');
}

function initImagePreviewControls() {
  const overlay = document.getElementById('imagePreviewOverlay');
  const closeBtn = document.getElementById('imagePreviewClose');
  const saveBtn = document.getElementById('imagePreviewSave');
  const copyBtn = document.getElementById('imagePreviewCopy');

  if (overlay) {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeImagePreview();
      }
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', closeImagePreview);
  if (saveBtn) saveBtn.addEventListener('click', saveImagePreview);
  if (copyBtn) copyBtn.addEventListener('click', copyImagePreview);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeImagePreview();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initImagePreviewControls);
} else {
  initImagePreviewControls();
}

/**
 * Fetch-Request für die Bilder
 */
async function fetchBase64Image(imageId) {
  try {
const response = await fetch(getFreshUrl(`${API_BASE}/image/base64/get`), {
        method: "POST",
        cache: 'no-store',
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

function getCachedImageBase64(imageId) {
  if (!imageId) return null;
  try {
    const cached = sessionStorage.getItem(`${IMAGE_SESSION_CACHE_PREFIX}${imageId}`);
    if (cached) {
      updateSessionImageTimestamp(imageId);
      return cached;
    }
  } catch (err) {
    console.debug("ℹ️ SessionStorage nicht verfügbar für Bildcache:", err);
  }
  return inMemoryImageCache[imageId] || null;
}

function cacheImageBase64(imageId, base64Data) {
  if (!imageId || !base64Data) return;
  if (base64Data.length > MAX_IMAGE_SESSION_STORAGE_CHARS) {
    inMemoryImageCache[imageId] = base64Data;
    return;
  }

  try {
    sessionStorage.setItem(`${IMAGE_SESSION_CACHE_PREFIX}${imageId}`, base64Data);
    updateSessionImageTimestamp(imageId);
  } catch (err) {
    if (err instanceof DOMException && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      evictSessionImageCache(2);
      try {
        sessionStorage.setItem(`${IMAGE_SESSION_CACHE_PREFIX}${imageId}`, base64Data);
        updateSessionImageTimestamp(imageId);
        return;
      } catch (_err) {
        console.debug("ℹ️ SessionStorage weiterhin voll, nutze In-Memory Cache für Bild:", _err);
      }
    } else {
      console.debug("ℹ️ SessionStorage nicht verfügbar für Bildcache:", err);
    }
    inMemoryImageCache[imageId] = base64Data;
  }
}

function getSessionImageIndex() {
  try {
    const raw = sessionStorage.getItem(IMAGE_SESSION_INDEX_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

function saveSessionImageIndex(index) {
  try {
    sessionStorage.setItem(IMAGE_SESSION_INDEX_KEY, JSON.stringify(index));
  } catch (err) {
    // Falls der Index nicht gespeichert werden kann, ist das nicht kritisch.
  }
}

function updateSessionImageTimestamp(imageId) {
  try {
    const index = getSessionImageIndex();
    index[imageId] = Date.now();
    const keys = Object.keys(index);
    if (keys.length > MAX_SESSION_CACHED_IMAGES) {
      const sortedKeys = keys.sort((a, b) => index[a] - index[b]);
      const toRemove = sortedKeys.slice(0, keys.length - MAX_SESSION_CACHED_IMAGES);
      toRemove.forEach((key) => {
        sessionStorage.removeItem(`${IMAGE_SESSION_CACHE_PREFIX}${key}`);
        delete index[key];
      });
    }
    saveSessionImageIndex(index);
  } catch (err) {
    // Bei Problemen mit dem Index einfach ignorieren.
  }
}

function evictSessionImageCache(count = 1) {
  try {
    const index = getSessionImageIndex();
    const keys = Object.keys(index);
    if (!keys.length) return;
    const sortedKeys = keys.sort((a, b) => index[a] - index[b]);
    const remove = sortedKeys.slice(0, count);
    remove.forEach((key) => {
      sessionStorage.removeItem(`${IMAGE_SESSION_CACHE_PREFIX}${key}`);
      delete index[key];
    });
    saveSessionImageIndex(index);
  } catch (err) {
    // Falls die SessionStorage-Operation schlägt fehl, nichts weiter tun.
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
  let wasAtBottomBefore = true; // Merkt sich den Scroll-Status

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
  
  // Merken, ob wir unten sind, wenn der User das Feld anklickt
  messageInput.addEventListener('focus', () => {
    wasAtBottomBefore = isAtBottom();
  });

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
  document.querySelector('.camera-icon')?.addEventListener('click', showFeatureNotice);
  document.getElementById('stickerBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    showFeatureNotice();
  });
  
  // Drawer-Items mit der Feature-Notice verbinden (außer Fotos/Kamera)
  document.querySelectorAll('.drawer-item').forEach(item => {
    const action = item.dataset.action;
    if (action === 'fotos' || action === 'kamera') return; // handled elsewhere
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      showFeatureNotice();
    });
  });
}

// ==========================================
// 📎 ATTACHMENT DRAWER (Ausklappbares Fenster)
// ==========================================

function initAttachmentDrawer() {
  const addToggleBtn = document.getElementById('addToggleBtn');
  const drawer = document.getElementById('attachment-drawer');
  const inputContent = document.querySelector('.input-content');
  const messageInput = document.getElementById('messageInput');

  if (!addToggleBtn || !drawer || !inputContent) return;

  // Function to calculate and update bottom bar height as CSS variable
  function updateBottomBarHeight() {
    const height = inputContent.offsetHeight;
    document.documentElement.style.setProperty('--input-height', `${height}px`);
  }

  // Update --drawer-height CSS variable so notice and scroll btn can shift above it
  function updateDrawerHeight() {
    const height = drawer.offsetHeight;
    document.documentElement.style.setProperty('--drawer-height', `${height}px`);
    // also set dock-height when drawer visible
    if (drawer.classList.contains('show')) document.documentElement.style.setProperty('--dock-height', `${height + 8}px`);
  }

  // Open or close the drawer, syncing all dependent elements
  function openDrawer() {
    updateBottomBarHeight();
    // Measure drawer height before it's visible using a hidden pre-render
    drawer.style.visibility = 'hidden';
    drawer.classList.add('show');
    updateDrawerHeight();
    drawer.style.visibility = '';
    addToggleBtn.classList.add('show-keyboard');
    document.body.classList.add('drawer-open');
    messageInput?.blur();
    // ensure chat gets pushed
    updateDockHeight();
  }

  function closeDrawer(focusInput = false) {
    drawer.classList.remove('show');
    addToggleBtn.classList.remove('show-keyboard');
    document.body.classList.remove('drawer-open');
    if (focusInput) messageInput?.focus();
    // update dock height when drawer closes
    updateDockHeight();
  }

  // Toggle on button click
  function toggleDrawer(e) {
    if (e) e.stopPropagation();
    if (drawer.classList.contains('show')) {
      closeDrawer(true); // keyboard icon pressed → focus input to reopen keyboard
    } else {
      openDrawer();
    }
  }

  // Event Listeners
  addToggleBtn.addEventListener('click', (e) => {
    if (attachedMediaBase64) { e.stopPropagation(); removeAttachedMedia(); return; }
    toggleDrawer(e);
  });

  // Drawer actions: fotos / kamera / dokument
  drawer.querySelectorAll('.drawer-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      if (attachedMediaBase64) return; // ignore while media attached
      if (action === 'fotos') {
        openPhotoPicker();
        closeDrawer(false);
      } else if (action === 'kamera') {
        openCameraModal();
        closeDrawer(false);
      } else if (action === 'dokument') {
        openDocumentPicker();
        closeDrawer(false);
      } else {
        showFeatureNotice();
        closeDrawer(false);
      }
    });
  });

  // Update height on textarea input & window resize
  messageInput?.addEventListener('input', updateBottomBarHeight);
  window.addEventListener('resize', () => {
    updateBottomBarHeight();
    if (drawer.classList.contains('show')) updateDrawerHeight();
    updateDockHeight();
  });

  // Close drawer on click outside (without refocusing input)
  document.addEventListener('click', (e) => {
    if (drawer.classList.contains('show')) {
      if (!drawer.contains(e.target) && !addToggleBtn.contains(e.target)) {
        closeDrawer(false);
      }
    }
  });

  // Calculate heights initially
  setTimeout(() => {
    updateBottomBarHeight();
    updateDrawerHeight();
    updateDockHeight();
  }, 200);
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
  
  // Wenn kein Text da ist, aber ein Bild angehängt ist, darf trotzdem gesendet werden.
  if (!text && !attachedMediaBase64) {
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

  // If media attached, include pure base64 string
  if (attachedMediaBase64) {
    payload.bildBase64 = attachedMediaBase64;
    payload.bildMime = attachedMediaMime || 'image/jpeg';
  }

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
      // Remove attached media preview if any
      if (attachedMediaBase64) removeAttachedMedia();
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
    appendToChat(divider);
    
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
      // Nur Nachrichten und Divider entfernen, um den Loader-Container im DOM zu behalten
      const elementsToRemove = MESSAGES_CONTAINER.querySelectorAll('.message-row, .chat-divider');
      elementsToRemove.forEach(el => el.remove());

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

let messageChannel = null; // Speicher für den aktiven Realtime-Kanal

function initRealtime() {
  if (!supabaseClient) {
    console.error("❌ initRealtime: Supabase noch nicht bereit!");
    return;
  }

  // Alten Kanal trennen, falls vorhanden (wichtig für das Pull-to-Refresh Feature)
  if (messageChannel) {
    console.log("♻️ Trenne alten Realtime-Kanal...");
    supabaseClient.removeChannel(messageChannel);
    messageChannel = null;
  }

  try {
    messageChannel = supabaseClient
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
    
    messageChannel.subscribe((status) => {
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

  // Wenn Farbe gewählt wird
  if (colorInput) {
    colorInput.value = savedColor || "#28a200";
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
    textColorInput.value = savedTextColor || "#e9edef";
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

  // Logout-Funktionalität
  const logoutButton = document.getElementById("logoutBtn");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      // LocalStorage-Einträge entfernen
      localStorage.removeItem("currently_account");
      localStorage.removeItem("currently_at");
      localStorage.removeItem("currently_approved");
      // Zur Login-Seite weiterleiten
      window.location.href = "/login.html";
    });
  }
}

// ======================
// 🚀 DIE MASTER-STEUERUNG (OPTIMIERT)
// ======================
async function startApp() {

  // Theme initialisieren (Farbe laden)
  initThemeSystem();

  // Feature Notices initialisieren
  initFeatureNotices();

  // Attachment Drawer initialisieren
  initAttachmentDrawer();

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

/**
 * Refresht den Chat-Inhalt, falls der User den Tab wechselt oder die Verbindung wiederherstellt.
 * Das verhindert, dass Nachrichten fehlen, die während der Inaktivität gesendet wurden.
 */
function setupAutoRefresh() {
  // 1. Wenn der Tab wieder in den Vordergrund kommt (Visibility API)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      console.log("👀 Tab wieder sichtbar – prüfe auf neue Nachrichten...");
      if (isClassChat) {
        loadClassChatMessages();
        initRealtime();
      }
    }
  });

  // 2. Wenn das Fenster den Fokus zurückerhält (falls visibilitychange nicht greift)
  window.addEventListener("focus", () => {
    console.log("🎯 Fenster fokussiert – Chat-Sync gestartet.");
    if (isClassChat) {
      loadClassChatMessages();
      initRealtime();
    }
  });

  // 3. Wenn das Internet nach einem Abbruch wieder da ist
  window.addEventListener("online", () => {
    console.log("🌐 Internetverbindung wiederhergestellt – lade Chat neu.");
    if (isClassChat) {
      loadClassChatMessages();
      // Optional: Realtime neu initialisieren, falls die Verbindung tot war
      initRealtime(); 
    }
  });
}

// Den Motor einmalig starten
startApp().then(() => {
    // Nachdem die App geladen ist, aktivieren wir den Auto-Refresh
    setupAutoRefresh();
});




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
// 🔄 PULL-UP TO REFRESH REALTIME LOGIK
// ==========================================
(function initPullToRefresh() {
  let startY = 0;
  let pullDistance = 0;
  let activePointerId = null;
  let wheelAccumulator = 0;
  let wheelTimer = null;
  const threshold = 1800; // Extrem hoher Widerstand für bewussten Scroll-Schwung
  const loaderContainer = document.getElementById('pull-up-loader-container');
  const loader = loaderContainer?.querySelector('.pull-up-loader');

  if (!MESSAGES_CONTAINER || !loaderContainer || !loader) return;

  async function triggerRefresh() {
    // Feature ausgelöst!
    if (loader.classList.contains('spinning')) return;

    loader.classList.add('spinning');
    loaderContainer.classList.add('visible');
    
    // 1. Sofortiges Feedback: Nachrichten im Frontend leeren
    const elementsToRemove = MESSAGES_CONTAINER.querySelectorAll('.message-row, .chat-divider');
    elementsToRemove.forEach(el => el.remove());
    globalLastDateText = "";

    console.log("🔄 Realtime-Reset: UI geleert, lade Daten neu...");

    // 2. Nachrichten history neu laden (holt die aktuellsten Daten per REST)
    await loadClassChatMessages();

    // 3. Realtime neu starten (trennt alten Kanal und verbindet neu)
    initRealtime();
    
    setTimeout(() => {
      // Sanft wieder ein Stück hochscrollen, um den Loader elegant zu verstecken
      MESSAGES_CONTAINER.scrollBy({ top: -150, behavior: 'smooth' });
      
      loaderContainer.classList.remove('visible');
      setTimeout(() => {
        loader.classList.remove('spinning');
        loader.style.transform = `scale(0.5)`;
      }, 300);
    }, 1200);
  }

  // 🖱️ 1. MAUSRAD & TOUCHPAD SCROLL (PC)
  // Das triggert, wenn man am Ende des Chats einfach "weiter-scrollt"
  MESSAGES_CONTAINER.addEventListener('wheel', (e) => {
    // Nur im Klassenchat relevant
    if (!isClassChat) {
      wheelAccumulator = 0;
      if (!loader.classList.contains('spinning')) loaderContainer.classList.remove('visible');
      return;
    }

    // Wenn nach oben gescrollt wird, oder wir nicht am Ende sind, oder der Loader schon dreht
    if (e.deltaY < 0 || !isAtBottom() || loader.classList.contains('spinning')) {
      wheelAccumulator = 0; // Akkumulator zurücksetzen
      if (!loader.classList.contains('spinning')) loaderContainer.classList.remove('visible'); // Loader ausblenden
      return;
    }

    // Wenn wir am Ende sind und nach unten scrollen (e.deltaY > 0)
    if (isAtBottom() && e.deltaY > 0) {
      wheelAccumulator += e.deltaY;

      if (wheelAccumulator > 10) { // Loader sichtbar machen, sobald etwas gezogen wurde
        loaderContainer.classList.add('visible');
        const scale = Math.min(wheelAccumulator / threshold, 1);
        loader.style.transform = `scale(${0.5 + (scale * 0.5)})`;
      }

      if (wheelAccumulator >= threshold) { // Refresh auslösen, wenn Threshold erreicht
        triggerRefresh();
        wheelAccumulator = 0; // Akkumulator zurücksetzen
      }
    }

    // Reset, wenn der User aufhört zu scrollen
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      if (!loader.classList.contains('spinning')) { // Nur zurücksetzen, wenn nicht aktiv geladen wird
        loaderContainer.classList.remove('visible');
        wheelAccumulator = 0;
      }
    }, 150);
  }, { passive: true });

  // 👆 2. DRAG GESTE (TOUCH & MAUS KLICK-ZIEHEN)
  MESSAGES_CONTAINER.addEventListener('pointerdown', (e) => {
    if (!isClassChat || !isAtBottom() || activePointerId !== null) return;

    // Vermeide, dass Klicks/Taps auf interaktive Elemente wie Bilder oder Buttons
    // von der Pull-to-refresh-Geste abgefangen werden.
    if (e.target.closest('.message-image, .image-preview-close, .image-preview-btn, .drawer-item, button, a, input, textarea, label')) {
      return;
    }

    e.preventDefault(); // Verhindert natives Scrollen/Overscroll, sobald eine Geste beginnt
    startY = e.pageY;
    activePointerId = e.pointerId;
    MESSAGES_CONTAINER.setPointerCapture(e.pointerId);
  });

  MESSAGES_CONTAINER.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activePointerId) return;
    e.preventDefault(); // Verhindert natives Scrollen/Overscroll während des Ziehens

    const currentY = e.pageY;
    pullDistance = startY - currentY;

    if (pullDistance < 0) { // Wenn der Nutzer nach unten zieht, Geste abbrechen
      pullDistance = 0;
      loaderContainer.classList.remove('visible');
      return;
    }

    if (pullDistance > 10) { // Loader sichtbar machen, sobald etwas gezogen wurde
      loaderContainer.classList.add('visible');
      const scale = Math.min(pullDistance / threshold, 1);
      loader.style.transform = `scale(${0.5 + (scale * 0.5)})`;
    }
  });

  MESSAGES_CONTAINER.addEventListener('pointerup', (e) => {
    if (e.pointerId !== activePointerId) return;
    const finalDistance = pullDistance;
    MESSAGES_CONTAINER.releasePointerCapture(activePointerId);
    activePointerId = null;
    pullDistance = 0;

    if (isClassChat && finalDistance >= threshold) { // Refresh auslösen, wenn Threshold erreicht
      triggerRefresh();
    } else {
      loaderContainer.classList.remove('visible');
    }
  });

  MESSAGES_CONTAINER.addEventListener('pointercancel', (e) => {
    if (e.pointerId !== activePointerId) return;
    MESSAGES_CONTAINER.releasePointerCapture(activePointerId);
    loaderContainer.classList.remove('visible'); // Loader ausblenden
    activePointerId = null;
    pullDistance = 0;
  });
})();

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
    const header = document.querySelector('.header');
    const bg = document.querySelector('.chat-bg');
    const filter = document.querySelector('.black-bg-filter');
    const inputBar = document.querySelector('.input-content');
    const scrollBtn = document.getElementById('scrollToBottomBtn');

    const offsetTop = vv.offsetTop;
    const keyboardHeight = window.innerHeight - vv.height - offsetTop;
    const bottomPos = Math.max(0, keyboardHeight);

    // Header/Background/Filter synchron zum Visual Viewport bewegen.
    // Wir nutzen transform, da dies auf mobilen Browsern (iOS Safari) deutlich 
    // zuverlässiger funktioniert als die top-Eigenschaft bei fixed-Elementen.
    const transformStyle = offsetTop > 0 ? `translateY(${offsetTop}px)` : '';
    if (header) { header.style.top = "0"; header.style.transform = transformStyle; }
    if (bg)     { bg.style.top = "0";     bg.style.transform = transformStyle; }
    if (filter) { filter.style.top = "0"; filter.style.transform = transformStyle; }

    if (inputBar) {
      inputBar.style.bottom = `${bottomPos}px`;
    }

    const drawer = document.getElementById('attachment-drawer');
    if (drawer) {
      drawer.style.bottom = `calc(var(--input-height, 80px) + ${bottomPos}px)`;
    }

    if (scrollBtn) {
      scrollBtn.style.bottom = `${bottomPos + 90}px`;
    }

    if (MESSAGES_CONTAINER) {
      // Wir verschieben den Container physikalisch mit dem Viewport mit.
      // So bleibt die Scrollbar IMMER zwischen Header und Input-Bar sichtbar.
      MESSAGES_CONTAINER.style.top = `${offsetTop + 80}px`;
      MESSAGES_CONTAINER.style.bottom = `${bottomPos + 80}px`;
    }

    // Nur nach unten scrollen, wenn die Tastatur aufging UND wir vorher am Ende waren
    if (bottomPos > 50 && wasAtBottomBefore) {
      setTimeout(() => {
        const lastMessage = MESSAGES_CONTAINER.lastElementChild;
        if (lastMessage) lastMessage.scrollIntoView({ behavior: 'instant', block: 'end' });
      }, 30);
    }
  };

  vv.addEventListener('resize', updateLayoutForKeyboard);
  vv.addEventListener('scroll', updateLayoutForKeyboard);
}