Snake — Enhanced Retro Arcade Console (Python + Flask)
A browser-based retro Snake arcade console game with multiple gameplay modes, audio synthesis, dynamic power-ups, customizable themes, and a persistent server-side leaderboard. Built with Python (Flask) backend and vanilla HTML5/CSS/JavaScript frontend.

What's New & Components
Power-Ups & Food Varieties:

Regular Food: +10 pts, grows snake length.
Golden Apple (timed): +30 pts, spawns periodically with flashing countdown.
Slow Snail Berry: Temporarily relaxes game speed for 6 seconds.
Ghost Berry: Grants 5 seconds of invulnerability (warp through walls and pass through tail safely).
Combo Multiplier:

Eating food quickly in succession rewards up to a 5x score multiplier.
Game Modes & Difficulties:

Classic Mode: Colliding with border walls causes Game Over.
Wrap / Portal Mode: Snake loops around and emerges on the opposite wall.
Difficulty Speeds: Casual, Normal, and Hardcore.
8-Bit Chiptune Audio Synthesizer (static/audio.js):

Pure Web Audio API procedural sound synthesis (no external audio files needed).
Crisp sounds for eating, collecting power-ups, pausing, crashes, button clicks, and high-score fanfares.
Persistent Sound Mute toggle (🔊/🔇) saved across sessions.
Visual Customization & Palettes:

Dynamic LCD themes:
Nokia 3310 (Classic greenish LCD)
Game Boy DMG-01 (Retro handheld palette)
Cyberpunk Neon (Dark slate + electric cyan & pink)
Pocket Monochrome (Clean retro black-and-white)
CRT Amber (Warm amber phosphor glow)
Visual FX: Snake eyes looking in movement direction, particle burst animations when eating, and screen shake on crash.
In-Game Menus & Overlays:

Pause Overlay: Pause anytime using Spacebar or P, or by tapping the ⏸ button. Resume, restart, or configure settings mid-game.
Settings Modal: Select themes, difficulty, and wall modes seamlessly.
How-to-Play Modal: Illustrated guide explaining food values and controls.
Arcade Hall of Fame Leaderboard (app.py & highscore.json):

Server-side Top 10 Leaderboard storing initials/names, scores, modes, and timestamps.
Global statistics tracking total games played and total food eaten.
REST API endpoints:
GET /api/leaderboard: Fetch top scores and statistics.
POST /api/score: Submit player initials, score, and gameplay metrics.
Running Locally
# 1. Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1

# 2. Run the Flask server
cd snake_game
python app.py

Then open http://127.0.0.1:5000/ in your browser.

Controls
Movement: Arrow Keys (←, ↑, →, ↓) or W, A, S, D.
Pause / Resume: Spacebar or P (or on-screen ⏸ button).
Mobile / Touch: On-screen D-Pad or swipe directly on the game canvas.

Then open http://127.0.0.1:5000/ in your browser.

Controls
Movement: Arrow Keys (←, ↑, →, ↓) or W, A, S, D.
Pause / Resume: Spacebar or P (or on-screen ⏸ button).
Mobile / Touch: On-screen D-Pad or swipe directly on the game canvas.
