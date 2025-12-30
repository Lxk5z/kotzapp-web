window.CDN_BASE = "https://cdn.jsdelivr.net/gh/Lxk5z/kotzapp-web";


if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register(`${CDN_BASE}/sw.js`)
    .then((reg) => {
      console.log("✅ SW registriert:", reg.scope);
    })
    .catch((err) => {
      console.error("❌ SW Fehler:", err);
    });
}

