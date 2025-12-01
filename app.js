// Screen wechseln
function openScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

// Standard-Screen
openScreen("screen-home");

// Theme ändern
function setTheme(color) {
    document.body.style.background = color;
}
