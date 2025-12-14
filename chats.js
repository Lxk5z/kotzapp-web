// 🎨 Zufälliges Default-Profilbild (aber stabil pro User)
function getRandomDefaultAvatar(userId) {
  // 📘 Klassenchat bekommt immer ein festes Bild
  if (userId === "CLASS") {
    return "/kotzapp-web/images/users/user10.png";
  }

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash += userId.charCodeAt(i);
  }

  const index = (hash % 10) + 1; // 1–10
  return `/kotzapp-web/images/users/user${index}.png`;
}

// 💬 Chats laden & anzeigen
async function loadChats() {
  try {
    const res = await fetch("https://kotzapp.onrender.com/chats/get");
    const data = await res.json();

    const list = document.getElementById("chatList");
    list.innerHTML = "";

    data.chats.forEach(chat => {
      // 🧱 Chat-Item
      const item = document.createElement("div");
      item.className = "chat-item";

      // =========================
      // 👤 Avatar + Online Punkt
      // =========================
      const avatarWrapper = document.createElement("div");
      avatarWrapper.className = "chat-avatar-wrapper";

      const avatar = document.createElement("img");
      avatar.className = "chat-avatar";
      avatar.src = chat.profile_image
        ? chat.profile_image
        : getRandomDefaultAvatar(chat.benutzer_id);
      avatar.alt = "Profilbild";

      avatarWrapper.appendChild(avatar);

      // 🟢 Online-Status (Demo-Logik)
      // Klassenchat immer online, User zufällig
      const isOnline =
        chat.type === "class" || Math.random() > 0.5;

      if (isOnline) {
        const onlineDot = document.createElement("img");
        onlineDot.src = "/kotzapp-web/images/users/online.png";
        onlineDot.className = "chat-online-dot";
        avatarWrapper.appendChild(onlineDot);
      }

      // =========================
      // 📄 Chat-Content
      // =========================
      const content = document.createElement("div");
      content.className = "chat-content";

      const name = document.createElement("div");
      name.className = "chat-name";
      name.innerHTML = chat.formatierter_name;

      const last = document.createElement("div");
      last.className = "chat-last";
      last.textContent = chat.last_message || " ";

      content.appendChild(name);
      content.appendChild(last);

      // =========================
      // ⏱️ Meta (Zeit + Badge)
      // =========================
      const meta = document.createElement("div");
      meta.className = "chat-meta";

      const time = document.createElement("div");
      time.className = "chat-time";
      time.textContent = chat.last_time || "";

      meta.appendChild(time);

      if (chat.new_message) {
        const badge = document.createElement("div");
        badge.className = "chat-badge";
        meta.appendChild(badge);
      }

      // ==========================
      // 🖼️ Hintergrund
      // ==========================
      
      if (typeof chat.background === "number") {
  item.classList.add("has-background");
  item.style.backgroundImage =
    `url(/kotzapp-web/images/users/backgrounds/background${chat.background}.png)`;
  item.style.backgroundSize = "cover";
  item.style.backgroundPosition = "bottom center";
}

      // =========================
      // 🧩 Zusammensetzen
      // =========================
      item.appendChild(avatarWrapper);
      item.appendChild(content);
      item.appendChild(meta);

      list.appendChild(item);
    });

  } catch (err) {
    console.error("❌ Fehler beim Laden der Chats:", err);
  }
}

// 🚀 Start
loadChats();
