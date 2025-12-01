// Automatisch Darkmode je nach System, wenn User nichts anderes eingestellt hat
window.addEventListener("load", () => {
  const savedDark = localStorage.getItem("kotz_dark");
  
  if (savedDark === null) {
    // System Dark Mode?
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      document.body.classList.add("dark");
      const toggle = document.getElementById("toggle-dark");
      if (toggle) toggle.checked = true;
    }
  }
});

// Dark Mode
document.getElementById("toggle-dark").addEventListener("change", (e) => {
  document.body.classList.toggle("dark", e.target.checked);
  localStorage.setItem("kotz_dark", e.target.checked);
});

// Theme ändern
document.getElementById("color-theme").addEventListener("change", (e) => {
  const color = e.target.value;

  const themes = {
    green: "#00c853",
    blue: "#2979ff",
    purple: "#aa00ff",
    red: "#d50000"
  };

  document.documentElement.style.setProperty("--primary", themes[color]);
  localStorage.setItem("kotz_theme", color);
});

// Speicherung beim Laden wiederherstellen
window.onload = () => {
  const savedDark = localStorage.getItem("kotz_dark") === "true";
  document.getElementById("toggle-dark").checked = savedDark;
  document.body.classList.toggle("dark", savedDark);

  const savedTheme = localStorage.getItem("kotz_theme") || "green";
  document.getElementById("color-theme").value = savedTheme;

  const themes = {
    green: "#00c853",
    blue: "#2979ff",
    purple: "#aa00ff",
    red: "#d50000"
  };
  document.documentElement.style.setProperty("--primary", themes[savedTheme]);
};

// PIN ändern Button
document.getElementById("change-pin").addEventListener("click", () => {
  alert("PIN ändern kommt gleich 😉");
});
