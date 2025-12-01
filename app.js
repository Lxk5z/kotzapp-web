// Navigation Handler
const screen = document.getElementById("screen");
const navButtons = document.querySelectorAll(".nav-btn");

navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        navButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const target = btn.dataset.screen;

        if (target === "settings") {
            openSettingsMenu();
            return;
        }

        if (target === "chats") {
            screen.innerHTML = "<h2>Chats</h2><p>Hier baust du später deinen Chatclient hin 😎</p>";
        }

        if (target === "gaming") {
            screen.innerHTML = "<h2>Gaming</h2><p>KotzApp Gaming kommt hier rein 🎮</p>";
        }

        if (target === "support") {
            screen.innerHTML = "<h2>Support</h2><p>Melde Bugs, Probleme oder Ideen 🐞</p>";
        }
    });
});

// ----- Einstellungen Menü -----

const settingsMenu = document.getElementById("settings-menu");
const themeMenu = document.getElementById("theme-menu");

function openSettingsMenu() {
    settingsMenu.classList.remove("hidden");
}

function closeSettingsMenu() {
    settingsMenu.classList.add("hidden");
}

// ----- Theme Menü -----

function openThemeMenu() {
    settingsMenu.classList.add("hidden");
    themeMenu.classList.remove("hidden");
}

function closeThemeMenu() {
    themeMenu.classList.add("hidden");
}

// Theme ändern
function setThemeColor(hex) {
    document.documentElement.style.setProperty("--theme", hex);
}
