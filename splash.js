document.addEventListener("DOMContentLoaded", () => {
  // Simulierter Ladeeffekt (1–2 Sekunden)
  setTimeout(() => {
    document.getElementById("splash").style.opacity = "0";

    setTimeout(() => {
      document.getElementById("splash").style.display = "none";
      document.getElementById("app").style.display = "block";
    }, 500);
  }, 800); // echte Ladezeit simuliert
});
