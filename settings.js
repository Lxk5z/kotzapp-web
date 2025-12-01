/* ================================
   INITIAL LOAD
================================ */
window.addEventListener("DOMContentLoaded", () => {

  // 1) Dark Mode laden
  const savedDark = localStorage.getItem("kotz_dark");

  if (savedDark === null) {
    // System übernimmt
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.body.classList.toggle("dark", prefersDark);

  } else {
    // Nutzer hat gewählt
    document.body.classList.toggle("dark", savedDark === "true");
    document.getElementById("toggle-dark").checked = savedDark === "true";
  }

  // 2) Primary-Farbe laden
  const savedColor = localStorage.getItem("kotz_color") || "#00c853";
  document.documentElement.style.setProperty("--primary", savedColor);
  const picker = document.getElementById("color-picker");
  if (picker) picker.value = savedColor;
});


/* ================================
   DARK MODE SWITCH
================================ */
document.getElementById("toggle-dark").addEventListener("change", (e) => {
  const active = e.target.checked;
  document.body.classList.toggle("dark", active);
  localStorage.setItem("kotz_dark", active);
});


/* ================================
   COLOR PICKER
================================ */
document.getElementById("color-picker").addEventListener("input", (e) => {
  const color = e.target.value;
  document.documentElement.style.setProperty("--primary", color);
  localStorage.setItem("kotz_color", color);
});


/* ================================
   PIN FUNKTION
================================ */
document.getElementById("change-pin").addEventListener("click", () => {
  alert("PIN ändern kommt später 🙂");
});
