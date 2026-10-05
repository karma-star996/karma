// ============================================================
// Snake — Enhanced Game Engine
// Modular components: Power-ups, Themes, Sound, Combos, Obstacles,
// Pause Menu, and Responsive Controls.
// ============================================================

(function () {
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  // DOM Elements
  const scoreEl = document.getElementById("score-value");
  const hiScoreEl = document.getElementById("hiscore-value");
  const levelEl = document.getElementById("level-value");
  const comboEl = document.getElementById("combo-badge");
  const powerupBar = document.getElementById("powerup-bar");
  const powerupNameEl = document.getElementById("powerup-name");
  const powerupTimerEl = document.getElementById("powerup-timer");
  const pauseModal = document.getElementById("pause-modal");
  const settingsModal = document.getElementById("settings-modal");
  const screenEl = document.querySelector(".screen");

  // Grid & Speeds
  const GRID_SIZE = 18;
  const CELL = canvas.width / GRID_SIZE;

  const SPEED_CONFIGS = {
    casual: { start: 160, min: 90, step: 6 },
    normal: { start: 130, min: 65, step: 7 },
    hardcore: { start: 95, min: 45, step: 8 },
  };

  // State
  let snake = [];
  let direction = "right";
  let nextDirection = "right";
  let score = 0;
  let foodCount = 0;
  let currentLevel = 1;
  let speed = 130;
  let loopTimeout = null;
  let gameActive = false;
  let isPaused = false;

  // Active game settings
  let settings = {
    mode: localStorage.getItem("snake_mode") || "classic", // 'classic' | 'wrap'
    difficulty: localStorage.getItem("snake_difficulty") || "normal",
    theme: localStorage.getItem("snake_theme") || "nokia",
  };

  // Entities & Power-ups
  let food = null;
  let specialItem = null; // { type: 'golden'|'slow'|'ghost', x, y, expiresAt, duration }
  let activePowerup = null; // { type: 'slow'|'ghost', expiresAt, totalDuration }
  let combo = 1;
  let lastEatTime = 0;
  let particles = [];
  let obstacles = [];

  // ------------------------------------------------------------
  // Color & Theme Palette Extraction
  // ------------------------------------------------------------
  function getThemeColors() {
    const computed = window.getComputedStyle(document.body);
    return {
      bg: computed.getPropertyValue("--lcd-lightest").trim() || "#C7D96B",
      dark: computed.getPropertyValue("--lcd-dark").trim() || "#0F380F",
      mid: computed.getPropertyValue("--lcd-mid").trim() || "#306230",
      light: computed.getPropertyValue("--lcd-light").trim() || "#8BAC0F",
      gold: "#d49100",
      cyan: "#00adb5",
      pink: "#e83e8c",
    };
  }

  function applyTheme(themeName) {
    settings.theme = themeName;
    localStorage.setItem("snake_theme", themeName);
    document.body.dataset.theme = themeName;
    draw();
  }

  // ------------------------------------------------------------
  // Reset / Initialization
  // ------------------------------------------------------------
  function resetGame() {
    snake = [
      { x: 8, y: 9 },
      { x: 7, y: 9 },
      { x: 6, y: 9 },
    ];
    direction = "right";
    nextDirection = "right";
    score = 0;
    foodCount = 0;
    currentLevel = 1;
    combo = 1;
    lastEatTime = 0;
    specialItem = null;
    activePowerup = null;
    particles = [];
    obstacles = [];

    const cfg = SPEED_CONFIGS[settings.difficulty] || SPEED_CONFIGS.normal;
    speed = cfg.start;
    gameActive = true;
    isPaused = false;

    if (scoreEl) scoreEl.textContent = "0";
    if (levelEl) levelEl.textContent = "1";
    updateComboBadge();
    updatePowerupHUD();

    food = placeEntity();
    draw();

    clearTimeout(loopTimeout);
    loopTimeout = setTimeout(step, speed);
  }

  function isCellOccupied(x, y) {
    if (snake.some((seg) => seg.x === x && seg.y === y)) return true;
    if (food && food.x === x && food.y === y) return true;
    if (specialItem && specialItem.x === x && specialItem.y === y) return true;
    if (obstacles.some((obs) => obs.x === x && obs.y === y)) return true;
    return false;
  }

  function placeEntity() {
    let position;
    let attempts = 0;
    do {
      position = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      attempts++;
    } while (isCellOccupied(position.x, position.y) && attempts < 200);
    return position;
  }

  // ------------------------------------------------------------
  // Special Food / Power-up Spawner
  // ------------------------------------------------------------
  function maybeSpawnSpecial() {
    if (specialItem || Math.random() > 0.35) return;

    const rand = Math.random();
    let type = "golden";
    let lifetime = 7000; // 7 seconds

    if (rand < 0.4) {
      type = "golden";
      lifetime = 7000;
    } else if (rand < 0.75) {
      type = "slow";
      lifetime = 8000;
    } else {
      type = "ghost";
      lifetime = 7500;
    }

    const pos = placeEntity();
    specialItem = {
      type: type,
      x: pos.x,
      y: pos.y,
      spawnedAt: Date.now(),
      expiresAt: Date.now() + lifetime,
      duration: lifetime,
    };
  }

  // ------------------------------------------------------------
  // Particle System
  // ------------------------------------------------------------
  function addEatParticles(x, y, color) {
    const px = x * CELL + CELL / 2;
    const py = y * CELL + CELL / 2;
    for (let i = 0; i < 7; i++) {
      const angle = (Math.PI * 2 * i) / 7 + Math.random() * 0.4;
      const speed = 1.5 + Math.random() * 2;
      particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3,
        color: color,
        life: 1.0,
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.08;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  // ------------------------------------------------------------
  // Drawing / Canvas Rendering
  // ------------------------------------------------------------
  function draw() {
    const colors = getThemeColors();

    // Clear Canvas
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid dots for retro arcade feel
    ctx.fillStyle = colors.mid;
    ctx.globalAlpha = 0.15;
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      for (let gy = 0; gy < GRID_SIZE; gy++) {
        ctx.fillRect(gx * CELL + CELL / 2, gy * CELL + CELL / 2, 1, 1);
      }
    }
    ctx.globalAlpha = 1.0;

    // Draw Obstacles (if any)
    if (obstacles.length > 0) {
      ctx.fillStyle = colors.dark;
      obstacles.forEach((obs) => {
        ctx.fillRect(obs.x * CELL + 2, obs.y * CELL + 2, CELL - 4, CELL - 4);
        ctx.strokeStyle = colors.mid;
        ctx.strokeRect(obs.x * CELL + 2, obs.y * CELL + 2, CELL - 4, CELL - 4);
      });
    }

    // Draw Standard Food (Dark Pixel Apple)
    if (food) {
      ctx.fillStyle = colors.dark;
      const fx = food.x * CELL;
      const fy = food.y * CELL;
      ctx.fillRect(fx + 3, fy + 3, CELL - 6, CELL - 6);
      // Apple stem
      ctx.fillStyle = colors.mid;
      ctx.fillRect(fx + CELL / 2 - 1, fy + 1, 2, 3);
    }

    // Draw Special / Power-up Item
    if (specialItem) {
      const sx = specialItem.x * CELL;
      const sy = specialItem.y * CELL;
      const timeLeft = specialItem.expiresAt - Date.now();
      // Flash faster as expiration approaches
      const flash = timeLeft < 2500 ? Math.floor(Date.now() / 150) % 2 === 0 : true;

      if (flash) {
        if (specialItem.type === "golden") {
          ctx.fillStyle = colors.gold;
          ctx.fillRect(sx + 2, sy + 2, CELL - 4, CELL - 4);
          ctx.fillStyle = colors.bg;
          ctx.fillRect(sx + 5, sy + 5, CELL - 10, CELL - 10);
        } else if (specialItem.type === "slow") {
          ctx.fillStyle = colors.cyan;
          ctx.fillRect(sx + 3, sy + 3, CELL - 6, CELL - 6);
        } else if (specialItem.type === "ghost") {
          ctx.fillStyle = colors.pink;
          ctx.beginPath();
          ctx.arc(sx + CELL / 2, sy + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw Snake
    const isGhost = activePowerup && activePowerup.type === "ghost";
    snake.forEach((segment, index) => {
      if (isGhost) {
        ctx.globalAlpha = 0.55 + 0.3 * Math.sin(Date.now() / 100);
      } else {
        ctx.globalAlpha = 1.0;
      }

      const x = segment.x * CELL;
      const y = segment.y * CELL;

      if (index === 0) {
        // Head
        ctx.fillStyle = isGhost ? colors.pink : colors.dark;
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);

        // Head Eyes pointing in direction
        ctx.fillStyle = colors.bg;
        let eye1X, eye1Y, eye2X, eye2Y;
        const eyeSize = 3;

        if (direction === "right") {
          eye1X = x + CELL - 5; eye1Y = y + 4;
          eye2X = x + CELL - 5; eye2Y = y + CELL - 7;
        } else if (direction === "left") {
          eye1X = x + 2; eye1Y = y + 4;
          eye2X = x + 2; eye2Y = y + CELL - 7;
        } else if (direction === "up") {
          eye1X = x + 4; eye1Y = y + 2;
          eye2X = x + CELL - 7; eye2Y = y + 2;
        } else {
          eye1X = x + 4; eye1Y = y + CELL - 5;
          eye2X = x + CELL - 7; eye2Y = y + CELL - 5;
        }
        ctx.fillRect(eye1X, eye1Y, eyeSize, eyeSize);
        ctx.fillRect(eye2X, eye2Y, eyeSize, eyeSize);
      } else {
        // Body segments
        ctx.fillStyle = isGhost ? colors.mid : colors.mid;
        ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
      }
    });
    ctx.globalAlpha = 1.0;

    // Draw Particles
    particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;
  }

  // ------------------------------------------------------------
  // Game Step / Main Logic
  // ------------------------------------------------------------
  function step() {
    if (!gameActive || isPaused) return;

    direction = nextDirection;
    const head = { ...snake[0] };

    if (direction === "up") head.y -= 1;
    if (direction === "down") head.y += 1;
    if (direction === "left") head.x -= 1;
    if (direction === "right") head.x += 1;

    // Handle Wrap Mode vs Classic Mode
    if (settings.mode === "wrap") {
      if (head.x < 0) head.x = GRID_SIZE - 1;
      else if (head.x >= GRID_SIZE) head.x = 0;
      if (head.y < 0) head.y = GRID_SIZE - 1;
      else if (head.y >= GRID_SIZE) head.y = 0;
    }

    const hitWall = head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE;
    const hitSelf = snake.some((segment) => segment.x === head.x && segment.y === head.y);
    const hitObstacle = obstacles.some((obs) => obs.x === head.x && obs.y === head.y);

    const isGhostActive = activePowerup && activePowerup.type === "ghost";

    // Collision Check
    if ((hitWall || hitSelf || hitObstacle) && !isGhostActive) {
      endGame();
      return;
    }

    // Ghost safety in classic mode if passing wall
    if (isGhostActive && hitWall) {
      if (head.x < 0) head.x = GRID_SIZE - 1;
      else if (head.x >= GRID_SIZE) head.x = 0;
      if (head.y < 0) head.y = GRID_SIZE - 1;
      else if (head.y >= GRID_SIZE) head.y = 0;
    }

    snake.unshift(head);

    let ateFood = false;

    // Check Special Item Eating
    if (specialItem && head.x === specialItem.x && head.y === specialItem.y) {
      const colors = getThemeColors();
      if (specialItem.type === "golden") {
        const bonus = 30 * combo;
        score += bonus;
        addEatParticles(head.x, head.y, colors.gold);
        window.soundFX?.playGolden();
      } else if (specialItem.type === "slow") {
        activatePowerup("slow", 6000);
        score += 15 * combo;
        addEatParticles(head.x, head.y, colors.cyan);
        window.soundFX?.playPowerup();
      } else if (specialItem.type === "ghost") {
        activatePowerup("ghost", 5000);
        score += 20 * combo;
        addEatParticles(head.x, head.y, colors.pink);
        window.soundFX?.playPowerup();
      }
      specialItem = null;
      ateFood = true;
    }

    // Check Standard Food Eating
    if (head.x === food.x && head.y === food.y) {
      const now = Date.now();
      if (now - lastEatTime < 3500) {
        combo = Math.min(5, combo + 1);
      } else {
        combo = 1;
      }
      lastEatTime = now;
      updateComboBadge();

      const earned = 10 * combo;
      score += earned;
      foodCount++;

      addEatParticles(head.x, head.y, getThemeColors().dark);
      window.soundFX?.playEat();

      // Spawn new standard food
      food = placeEntity();
      maybeSpawnSpecial();

      // Check level up and speed acceleration
      const cfg = SPEED_CONFIGS[settings.difficulty] || SPEED_CONFIGS.normal;
      if (foodCount % 4 === 0) {
        currentLevel++;
        if (levelEl) levelEl.textContent = String(currentLevel);
        speed = Math.max(cfg.min, speed - cfg.step);
      }

      ateFood = true;
    }

    if (!ateFood) {
      snake.pop();
    }

    // Check Combo expiration
    if (combo > 1 && Date.now() - lastEatTime > 3500) {
      combo = 1;
      updateComboBadge();
    }

    // Check Special Item Despawn
    if (specialItem && Date.now() > specialItem.expiresAt) {
      specialItem = null;
    }

    // Update active power-up HUD & timers
    updateActivePowerup();

    if (scoreEl) scoreEl.textContent = String(score);
    updateParticles();
    draw();

    // Adjust step interval if slow-motion powerup is active
    let currentInterval = speed;
    if (activePowerup && activePowerup.type === "slow") {
      currentInterval = Math.floor(speed * 1.5);
    }

    loopTimeout = setTimeout(step, currentInterval);
  }

  // ------------------------------------------------------------
  // Power-up Management
  // ------------------------------------------------------------
  function activatePowerup(type, durationMs) {
    activePowerup = {
      type: type,
      totalDuration: durationMs,
      expiresAt: Date.now() + durationMs,
    };
    updatePowerupHUD();
  }

  function updateActivePowerup() {
    if (!activePowerup) return;
    const remaining = activePowerup.expiresAt - Date.now();
    if (remaining <= 0) {
      activePowerup = null;
      updatePowerupHUD();
    } else {
      updatePowerupHUD(remaining);
    }
  }

  function updatePowerupHUD(remainingMs) {
    if (!powerupBar) return;
    if (!activePowerup || !remainingMs) {
      powerupBar.classList.remove("active");
      return;
    }

    powerupBar.classList.add("active");
    if (powerupNameEl) {
      powerupNameEl.textContent = activePowerup.type === "ghost" ? "GHOST (NO WALLS)" : "SLOW-MO";
    }
    if (powerupTimerEl) {
      powerupTimerEl.textContent = `${Math.ceil(remainingMs / 1000)}s`;
    }
    const progressBar = document.getElementById("powerup-progress");
    if (progressBar) {
      const pct = (remainingMs / activePowerup.totalDuration) * 100;
      progressBar.style.width = `${pct}%`;
    }
  }

  function updateComboBadge() {
    if (!comboEl) return;
    if (combo > 1) {
      comboEl.textContent = `${combo}x COMBO`;
      comboEl.classList.add("active");
    } else {
      comboEl.classList.remove("active");
    }
  }

  // ------------------------------------------------------------
  // Game Over & Screen Shake
  // ------------------------------------------------------------
  function endGame() {
    gameActive = false;
    clearTimeout(loopTimeout);

    window.soundFX?.playDie();
    if (screenEl) {
      screenEl.classList.add("screen--shake");
      setTimeout(() => screenEl.classList.remove("screen--shake"), 400);
    }

    setTimeout(() => {
      const modeParam = encodeURIComponent(settings.mode);
      window.location.href = `/gameover?score=${score}&mode=${modeParam}&food=${foodCount}`;
    }, 450);
  }

  // ------------------------------------------------------------
  // Pause & Modals
  // ------------------------------------------------------------
  function togglePause() {
    if (!gameActive) return;
    isPaused = !isPaused;

    if (isPaused) {
      clearTimeout(loopTimeout);
      window.soundFX?.playPause();
      if (pauseModal) pauseModal.classList.add("active");
    } else {
      window.soundFX?.playResume();
      if (pauseModal) pauseModal.classList.remove("active");
      loopTimeout = setTimeout(step, speed);
    }
  }

  function openSettings() {
    const wasPaused = isPaused;
    if (gameActive && !isPaused) {
      togglePause();
    }
    if (settingsModal) settingsModal.classList.add("active");
  }

  function closeSettings() {
    if (settingsModal) settingsModal.classList.remove("active");
  }

  // ------------------------------------------------------------
  // Input Handling
  // ------------------------------------------------------------
  function setDirection(newDirection) {
    const opposites = { up: "down", down: "up", left: "right", right: "left" };
    if (opposites[newDirection] !== direction) {
      nextDirection = newDirection;
    }
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "p" || event.key === "P") {
      event.preventDefault();
      togglePause();
      return;
    }

    const keyMap = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
      W: "up",
      S: "down",
      A: "left",
      D: "right",
    };

    const mapped = keyMap[event.key];
    if (mapped) {
      event.preventDefault();
      setDirection(mapped);
    }
  });

  // Touch controls / D-Pad
  document.querySelectorAll(".dpad button").forEach((button) => {
    button.addEventListener("click", () => setDirection(button.dataset.dir));
  });

  // Swipe controls
  let touchStartX = 0;
  let touchStartY = 0;
  canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  canvas.addEventListener("touchend", (e) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setDirection(deltaX > 0 ? "right" : "left");
    } else {
      setDirection(deltaY > 0 ? "down" : "up");
    }
  }, { passive: true });

  // ------------------------------------------------------------
  // UI & Menu Listeners
  // ------------------------------------------------------------
  const pauseBtn = document.getElementById("pause-btn");
  if (pauseBtn) pauseBtn.addEventListener("click", togglePause);

  const resumeBtn = document.getElementById("resume-btn");
  if (resumeBtn) resumeBtn.addEventListener("click", togglePause);

  const restartBtn = document.getElementById("restart-btn");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      if (pauseModal) pauseModal.classList.remove("active");
      resetGame();
    });
  }

  const settingsBtn = document.getElementById("settings-btn");
  if (settingsBtn) settingsBtn.addEventListener("click", openSettings);

  const closeSettingsBtn = document.getElementById("close-settings-btn");
  if (closeSettingsBtn) closeSettingsBtn.addEventListener("click", closeSettings);

  const muteBtn = document.getElementById("mute-btn");
  if (muteBtn) {
    const updateMuteIcon = () => {
      const isMuted = window.soundFX?.isMuted();
      muteBtn.textContent = isMuted ? "🔇" : "🔊";
    };
    updateMuteIcon();
    muteBtn.addEventListener("click", () => {
      window.soundFX?.toggleMute();
      updateMuteIcon();
    });
  }

  // Theme selection pills
  document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-theme-choice]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      applyTheme(btn.dataset.themeChoice);
    });
  });

  // Wall mode selection pills
  document.querySelectorAll("[data-mode-choice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-mode-choice]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      settings.mode = btn.dataset.modeChoice;
      localStorage.setItem("snake_mode", settings.mode);
    });
  });

  // Difficulty selection pills
  document.querySelectorAll("[data-diff-choice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-diff-choice]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      settings.difficulty = btn.dataset.diffChoice;
      localStorage.setItem("snake_difficulty", settings.difficulty);
    });
  });

  // Initial theme application
  if (settings.theme) {
    document.body.dataset.theme = settings.theme;
  }

  // Synchronize active pills on start
  const activeThemePill = document.querySelector(`[data-theme-choice="${settings.theme}"]`);
  if (activeThemePill) activeThemePill.classList.add("active");

  const activeModePill = document.querySelector(`[data-mode-choice="${settings.mode}"]`);
  if (activeModePill) activeModePill.classList.add("active");

  const activeDiffPill = document.querySelector(`[data-diff-choice="${settings.difficulty}"]`);
  if (activeDiffPill) activeDiffPill.classList.add("active");

  // Start the Game
  resetGame();
})();
