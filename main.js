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

