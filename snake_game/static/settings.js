// ============================================================
// Settings — Difficulty, Grid Size, and Wall Mode.
//
// Settings are saved in the browser's localStorage (not on the
// Python side) since they're per-player preferences, not the kind
// of thing that needs to be remembered by the server. game.js
// reads these values with loadSnakeSettings() each time a fresh
// game page loads, so a change made from any page takes effect
// the next time Play (or Play Again) is pressed.
// ============================================================

const SNAKE_SETTINGS_KEY = "snakeSettings";

const DEFAULT_SNAKE_SETTINGS = {
  difficulty: "normal", // "easy" | "normal" | "hard"
  gridSize: "medium",   // "small" | "medium" | "large"
  wallMode: "classic",  // "classic" | "wrap"
};

function loadSnakeSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SNAKE_SETTINGS_KEY));
    return { ...DEFAULT_SNAKE_SETTINGS, ...(saved || {}) };
  } catch (error) {
    return { ...DEFAULT_SNAKE_SETTINGS };
  }
}

function saveSnakeSettings(settings) {
  localStorage.setItem(SNAKE_SETTINGS_KEY, JSON.stringify(settings));
}

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("settings-modal");
  if (!modal) return; // this page doesn't have a settings modal

  let settings = loadSnakeSettings();

  function refreshUI() {
    modal.querySelectorAll(".segmented").forEach((group) => {
      const key = group.dataset.setting;
      group.querySelectorAll("button").forEach((button) => {
        button.classList.toggle("active", button.dataset.value === settings[key]);
      });
    });
  }

  // Re-sync the on-screen buttons every time the modal is opened,
  // in case settings were changed on a different page in the meantime.
  document.addEventListener("modal:opened", (event) => {
    if (event.detail.id === "settings-modal") {
      settings = loadSnakeSettings();
      refreshUI();
    }
  });

  modal.querySelectorAll(".segmented button").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.parentElement.dataset.setting;
      settings = { ...settings, [key]: button.dataset.value };
      saveSnakeSettings(settings);
      refreshUI();
    });
  });

  refreshUI();
});
