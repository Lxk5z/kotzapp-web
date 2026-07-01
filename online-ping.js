function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

window.CURRENT_USER_ID = localStorage.getItem("currently_account");

// ===================================
// 🟢 OPTIMIERTES ONLINE SYSTEM
// ===================================

(function() {
    if (!window.CURRENT_USER_ID) {
        console.warn("⚠️ CURRENT_USER_ID fehlt – Online-System deaktiviert");
        return;
    }

    const PING_INTERVAL = 13000; // 13 Sekunden
    const STORAGE_KEY = "last_online_ping";

    async function sendOnlinePing() {
        const now = Date.now();
        
        try {
            await fetch(getFreshUrl("https://kotzapp.onrender.com/online/ping"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    benutzer_id: window.CURRENT_USER_ID,
                    visible: document.visibilityState === "visible"
                })
            });
            // Zeitstempel nach Erfolg speichern
            localStorage.setItem(STORAGE_KEY, now.toString());
        } catch (err) {
            console.warn("⚠️ Online-Ping fehlgeschlagen", err);
        }
    }

    function checkAndPing() {
        const lastPing = parseInt(localStorage.getItem(STORAGE_KEY) || "0");
        const now = Date.now();

        // Wenn noch nie gepiept wurde oder das Intervall abgelaufen ist
        if (now - lastPing >= PING_INTERVAL) {
            sendOnlinePing();
        }
    }

    // 1. SOFORT-CHECK beim Laden (Löst das Problem beim Seitenwechsel)
    checkAndPing();

    // 2. REGELMÄSSIGER CHECK (Falls man auf einer Seite bleibt)
    // Wir checken alle 1 Sekunde, ob die 13 Sekunden schon um sind
    setInterval(checkAndPing, 1000);

    // 3. OPTIONAL: Ping senden, wenn die Seite wieder sichtbar wird
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            checkAndPing();
        }
    });
})();