self.skipWaiting();

const CACHE_NAME = "kotzapp-27122025";
const CDN_BASE = "https://cdn.jsdelivr.net/gh/Lxk5z/kotzapp-web@main";
const STATIC_ASSETS = [
  "/",

  // HTML
  "/index.html",
  "/chats.html",
  "/settings.html",

  // CSS
  `${CDN_BASE}/style.css`,
  `${CDN_BASE}/chats.css`,
  `${CDN_BASE}/settings.css`,

  // JAVA-SCRIPT
  `${CDN_BASE}/main.js`,
  `${CDN_BASE}/chats.js`,
  `${CDN_BASE}/settings.js`,

  // /FONTS
  `${CDN_BASE}/fonts/aclonica.css`,
  `${CDN_BASE}/fonts/aclonica-v25-latin-regular.woff2`,

  // /IMAGES
  `${CDN_BASE}/images/logo-clean.png`,
  `${CDN_BASE}/images/header-background.gif`,
  `${CDN_BASE}/images/header-background-christmas.png`,

  // /IMAGES/ICONS
  `${CDN_BASE}/images/icons/ai_logo.png`,
  `${CDN_BASE}/images/icons/apps.svg`,
  `${CDN_BASE}/images/icons/chats.svg`,
  `${CDN_BASE}/images/icons/more-icon.svg`,
  `${CDN_BASE}/images/icons/plus.svg`,
  `${CDN_BASE}/images/icons/settings.svg`,
  `${CDN_BASE}/images/icons/star-filled.svg`,
  `${CDN_BASE}/images/icons/star.svg`,
  `${CDN_BASE}/images/icons/support.svg`,

  // /IMAGES/USERS
  `${CDN_BASE}/images/users/class.png`,
  `${CDN_BASE}/images/users/online.png`,
  `${CDN_BASE}/images/users/user-template.png`,
  `${CDN_BASE}/images/users/user1.png`,
  `${CDN_BASE}/images/users/user2.png`,
  `${CDN_BASE}/images/users/user3.png`,
  `${CDN_BASE}/images/users/user4.png`,
  `${CDN_BASE}/images/users/user5.png`,
  `${CDN_BASE}/images/users/user6.png`,
  `${CDN_BASE}/images/users/user7.png`,
  `${CDN_BASE}/images/users/user8.png`,
  `${CDN_BASE}/images/users/user9.png`,
  `${CDN_BASE}/images/users/user10.pn`,

  // /IMAGES/USERS/BACKGROUNDS
  `${CDN_BASE}/images/users/backgrounds/background1.png`,
  `${CDN_BASE}/images/users/backgrounds/background2.png`,
  `${CDN_BASE}/images/users/backgrounds/background3.png`,
  `${CDN_BASE}/images/users/backgrounds/background4.png`,
  `${CDN_BASE}/images/users/backgrounds/background5.png`,
  `${CDN_BASE}/images/users/backgrounds/background6.png`,
  `${CDN_BASE}/images/users/backgrounds/background7.png`,
  `${CDN_BASE}/images/users/backgrounds/background8.png`,
  `${CDN_BASE}/images/users/backgrounds/background9.png`,
  `${CDN_BASE}/images/users/backgrounds/background10.png`,
  `${CDN_BASE}/images/users/backgrounds/background11.png`,
  `${CDN_BASE}/images/users/backgrounds/background12.png`,
  `${CDN_BASE}/images/users/backgrounds/background13.png`,
  // `${CDN_BASE}/images/users/backgrounds/background14.png`,
  // `${CDN_BASE}/images/users/backgrounds/background15.png`,
  // `${CDN_BASE}/images/users/backgrounds/background16.png`,
  // `${CDN_BASE}/images/users/backgrounds/background17.png`,
  // `${CDN_BASE}/images/users/backgrounds/background18.png`,
  // `${CDN_BASE}/images/users/backgrounds/background19.png`,
  `${CDN_BASE}/images/users/backgrounds/background20.png`,
  // `${CDN_BASE}/images/users/backgrounds/background21.png`,
  // `${CDN_BASE}/images/users/backgrounds/background22.png`,
  // `${CDN_BASE}/images/users/backgrounds/background23.png`,
  // `${CDN_BASE}/images/users/backgrounds/background24.png`,
  // `${CDN_BASE}/images/users/backgrounds/background25.png`,
  // `${CDN_BASE}/images/users/backgrounds/background26.png`,
  // `${CDN_BASE}/images/users/backgrounds/background27.png`,
  // `${CDN_BASE}/images/users/backgrounds/background28.png`,
  // `${CDN_BASE}/images/users/backgrounds/background29.png`,
  // `${CDN_BASE}/images/users/backgrounds/background30.png`,
];

/* =========================
   INSTALL
========================= */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

/* =========================
   ACTIVATE
========================= */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) return caches.delete(key);
          })
        )
      ),
      self.clients.claim() // ⬅️ DAS ist der Gamechanger
    ])
  );
});

/* =========================
   FETCH (MAGIE ✨)
========================= */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Nur GET-Anfragen cachen
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((res) => {
        // Nur erfolgreiche Responses cachen
        if (!res || res.status !== 200) return res;

        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, resClone);
        });

        return res;
      });
    })
  );
});
