function setThemeColor() {
    const color = prompt("Welche Farbe? (z.B. #00ffcc oder red)");
    if (!color) return;

    document.getElementById("theme-overlay").style.background = color;
}

function setThemeImage() {
    const url = prompt("Bild-URL eingeben:");
    if (!url) return;

    const el = document.getElementById("theme-overlay");
    el.style.backgroundImage = `url(${url})`;
}

function setThemeGif() {
    const url = prompt("GIF-URL eingeben:");
    if (!url) return;

    const el = document.getElementById("theme-overlay");
    el.style.backgroundImage = `url(${url})`;
}
