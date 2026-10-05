// ============================================================
// Generic modal handling.
// Any button with data-open-modal="some-id" opens the element
// with that id (which must have class "modal-overlay").
// Any element inside a modal with data-close-modal closes it,
// clicking the dark backdrop closes it, and so does Escape.
//
// Other scripts (like game.js) can listen for these to know when
// a modal opened/closed, e.g. to pause the game while Settings is open:
//   document.addEventListener("modal:opened", (e) => { ... e.detail.id ... });
//   document.addEventListener("modal:closed", (e) => { ... e.detail.id ... });
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  function openModal(modal) {
    modal.classList.remove("hidden");
    document.dispatchEvent(new CustomEvent("modal:opened", { detail: { id: modal.id } }));
  }

  function closeModal(modal) {
    modal.classList.add("hidden");
    document.dispatchEvent(new CustomEvent("modal:closed", { detail: { id: modal.id } }));
  }

  document.querySelectorAll("[data-open-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      const modal = document.getElementById(button.dataset.openModal);
      if (modal) openModal(modal);
    });
  });

  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeModal(overlay);
    });

    overlay.querySelectorAll("[data-close-modal]").forEach((button) => {
      button.addEventListener("click", () => closeModal(overlay));
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      if (!overlay.classList.contains("hidden")) closeModal(overlay);
    });
  });
});
