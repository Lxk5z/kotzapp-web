// ======================
// Header Particle Animation
// ======================

const header = document.querySelector(".header-particles");

const MAX_PARTICLES = 75;
let particles = 0;

// Spawnrate je Bildschirm
function getSpawnDelay() {
  const w = window.innerWidth;

  if (w < 600) return 600;   // Handy
  if (w < 1000) return 250;  // Tablet
  if (w < 1600) return 150;  // Desktop

  return 100; // Minimum
}

// Random Helper
const rand = (min, max) => Math.random() * (max - min) + min;

// Farbe variieren
function randomColor() {
  const mix = rand(10, 35);

  return `color-mix(in srgb,
    var(--messenger-theme),
    black ${mix}%
  )`;
}

// Particle erzeugen
function spawnParticle() {

  if (particles >= MAX_PARTICLES) return;

  particles++;

  const el = document.createElement("div");
  el.className = "header-particle";

  const size = rand(6, 18);
  const duration = rand(5, 9);

  const startX = rand(0, header.offsetWidth);
  const drift = rand(-40, 40);
  const rotate = rand(90, 360);

  el.style.width = size + "px";
  el.style.height = size + "px";
  el.style.left = startX + "px";

  el.style.background = randomColor();

  el.style.animationDuration = duration + "s";

  el.style.setProperty("--driftX", drift + "px");
  el.style.setProperty("--rotateEnd", rotate + "deg");

  header.appendChild(el);

  /* cleanup */
  setTimeout(() => {
    el.remove();
    particles--;
  }, duration * 1000);
}

// Spawn Loop
let spawnTimer;

function startSpawner() {
  clearInterval(spawnTimer);

  spawnTimer = setInterval(() => {
    spawnParticle();
  }, getSpawnDelay());
}

startSpawner();
window.addEventListener("resize", startSpawner);


// ======================
// SEND BUTTON ANIMATION
// ======================
  const messageInput = document.getElementById('messageInput');
  const inputBar = messageInput.closest('.input-content');

  function updateInputState() {
    const hasText = messageInput.value.trim().length > 0;
    inputBar.classList.toggle('has-text', hasText);
  }

  messageInput.addEventListener('input', updateInputState);

  // Initial (falls Autofill o.ä.)
  updateInputState();
