"""
Snake Game - Flask Backend
---------------------------
Handles routes and APIs:
  1. "/"               -> Home page with Play button, high score, leaderboard preview, and settings
  2. "/game"           -> Playable Snake game (HTML5 canvas + Web Audio chiptune)
  3. "/gameover"       -> Game Over summary, stats, name input, and full leaderboard
  4. "/api/leaderboard" -> JSON endpoint for current top scores and game statistics
  5. "/api/score"      -> JSON endpoint to submit final score, name, and gameplay stats
"""

from flask import Flask, render_template, request, jsonify
from datetime import datetime
import json
import os

app = Flask(__name__)

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "highscore.json")
MAX_LEADERBOARD_ENTRIES = 10


def get_game_data():
    """
    Read game data from disk. Automatically migrates legacy formats:
      Legacy: {"highscore": 30}
      Current: {
        "highscore": 30,
        "leaderboard": [{"name": "ACE", "score": 30, "mode": "Classic", "date": "2026-09-11"}],
        "stats": {"games_played": 0, "total_food": 0}
      }
    """
    default_data = {
        "highscore": 0,
        "leaderboard": [],
        "stats": {
            "games_played": 0,
            "total_food": 0,
        },
    }

    if not os.path.exists(DATA_FILE):
        return default_data

    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, dict):
            return default_data

        # Migration from legacy single highscore format
        if "leaderboard" not in data:
            legacy_score = int(data.get("highscore", 0))
            leaderboard = []
            if legacy_score > 0:
                leaderboard.append({
                    "name": "ACE",
                    "score": legacy_score,
                    "mode": "Classic",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                })
            data["leaderboard"] = leaderboard

        if "stats" not in data or not isinstance(data["stats"], dict):
            data["stats"] = {"games_played": 0, "total_food": 0}

        # Ensure highscore matches top of leaderboard
        leaderboard = data.get("leaderboard", [])
        if leaderboard:
            highest = max(entry.get("score", 0) for entry in leaderboard)
            data["highscore"] = max(int(data.get("highscore", 0)), highest)
        else:
            data["highscore"] = int(data.get("highscore", 0))

        return data
    except (json.JSONDecodeError, ValueError, OSError):
        return default_data


def save_game_data(data):
    """Persist game data atomically to disk."""
    temp_file = f"{DATA_FILE}.tmp"
    try:
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        os.replace(temp_file, DATA_FILE)
    except OSError:
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except OSError:
                pass


@app.route("/")
def home():
    """Landing page with Play button, high score, and top scores."""
    data = get_game_data()
    leaderboard = data.get("leaderboard", [])[:5]
    return render_template(
        "index.html",
        highscore=data.get("highscore", 0),
        leaderboard=leaderboard,
        stats=data.get("stats", {}),
    )


@app.route("/game")
def game():
    """The playable Snake game view."""
    data = get_game_data()
    return render_template(
        "game.html",
        highscore=data.get("highscore", 0),
        stats=data.get("stats", {}),
    )


@app.route("/gameover")
def gameover():
    """
    Game Over screen. Accepts query params:
      score: integer
      mode: string ('Classic' or 'Wrap')
      food: integer
    """
    score = request.args.get("score", default=0, type=int)
    mode = request.args.get("mode", default="Classic", type=str)
    food_eaten = request.args.get("food", default=0, type=int)

    if score < 0:
        score = 0

    data = get_game_data()
    leaderboard = data.get("leaderboard", [])
    current_highscore = data.get("highscore", 0)
    is_new_highscore = score > current_highscore

    # Check if qualifies for leaderboard (top 10 or empty slots)
    qualifies_for_leaderboard = (
        score > 0 and (
            len(leaderboard) < MAX_LEADERBOARD_ENTRIES
            or score > leaderboard[-1].get("score", 0)
        )
    )

    return render_template(
        "gameover.html",
        score=score,
        mode=mode,
        food_eaten=food_eaten,
        highscore=current_highscore,
        is_new_highscore=is_new_highscore,
        qualifies_for_leaderboard=qualifies_for_leaderboard,
        leaderboard=leaderboard[:10],
    )


@app.route("/api/leaderboard", methods=["GET"])
def api_leaderboard():
    """Returns top scores and overall player stats."""
    data = get_game_data()
    return jsonify({
        "success": True,
        "highscore": data.get("highscore", 0),
        "leaderboard": data.get("leaderboard", [])[:MAX_LEADERBOARD_ENTRIES],
        "stats": data.get("stats", {}),
    })


@app.route("/api/score", methods=["POST"])
def api_submit_score():
    """
    Submit a completed game score.
    Payload: { "name": "ACE", "score": 120, "mode": "Classic", "food_eaten": 12, "max_combo": 3 }
    """
    payload = request.get_json(silent=True) or {}

    raw_name = str(payload.get("name", "ANON")).strip().upper()
    name = raw_name[:6] if raw_name else "ANON"
    score = max(0, int(payload.get("score", 0)))
    mode = str(payload.get("mode", "Classic")).strip().title()
    food_eaten = max(0, int(payload.get("food_eaten", 0)))

    data = get_game_data()
    leaderboard = data.get("leaderboard", [])
    stats = data.get("stats", {})

    # Update global stats
    stats["games_played"] = stats.get("games_played", 0) + 1
    stats["total_food"] = stats.get("total_food", 0) + food_eaten
    data["stats"] = stats

    rank = None
    is_highscore = False

    if score > 0:
        new_entry = {
            "name": name,
            "score": score,
            "mode": mode,
            "date": datetime.now().strftime("%Y-%m-%d"),
        }
        leaderboard.append(new_entry)
        # Sort by score descending
        leaderboard.sort(key=lambda item: item.get("score", 0), reverse=True)
        leaderboard = leaderboard[:MAX_LEADERBOARD_ENTRIES]
        data["leaderboard"] = leaderboard

        # Find position of our newly added score
        for idx, entry in enumerate(leaderboard):
            if entry is new_entry:
                rank = idx + 1
                break

        if rank == 1 or score > data.get("highscore", 0):
            data["highscore"] = score
            is_highscore = True

    save_game_data(data)

    return jsonify({
        "success": True,
        "rank": rank,
        "is_highscore": is_highscore,
        "highscore": data.get("highscore", 0),
        "leaderboard": leaderboard,
        "stats": stats,
    })


if __name__ == "__main__":
    app.run(debug=True)
