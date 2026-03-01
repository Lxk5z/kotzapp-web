  window.CDN_BASE = "https://cdn.jsdelivr.net/gh/Lxk5z/kotzapp-web@latest";

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
// AUTH SYSTEM (GLOBAL)
// ----------------------

(function initAuth() {

  function resolveCurrentUserId() {
    const raw = localStorage.getItem("currently_account");

    if (!raw) {
      console.warn("🚪 Kein Account → redirect login");
      window.location.replace("/login.html");
      return null; // ⬅️ KEIN THROW
    }

    const id = String(raw).trim();

    if (!/^U\d{2,}$/.test(id)) {
      console.warn("🚪 Ungültige User-ID → redirect login:", id);
      window.location.replace("/login.html");
      return null; // ⬅️ KEIN THROW
    }

    return id;
  }

  window.CURRENT_USER_ID = resolveCurrentUserId();

  console.log("👤 CURRENT_USER_ID:", window.CURRENT_USER_ID);

})();


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
