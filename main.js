  window.CDN_BASE = "https://cdn.jsdelivr.net/gh/Lxk5z/kotzapp-web";


// DEVICE_ID - generator
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


// SERVICE WORKER - register
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