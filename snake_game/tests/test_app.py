import unittest
import json
import os
import shutil
import tempfile
import sys

# Ensure snake_game directory is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import app as snake_app


class TestSnakeApp(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.original_data_file = snake_app.DATA_FILE
        snake_app.DATA_FILE = os.path.join(self.temp_dir, "test_highscore.json")
        snake_app.app.config["TESTING"] = True
        self.client = snake_app.app.test_client()

    def tearDown(self):
        snake_app.DATA_FILE = self.original_data_file
        shutil.rmtree(self.temp_dir)

    def test_legacy_data_migration(self):
        # Write legacy format
        with open(snake_app.DATA_FILE, "w", encoding="utf-8") as f:
            json.dump({"highscore": 50}, f)

        data = snake_app.get_game_data()
        self.assertEqual(data["highscore"], 50)
        self.assertEqual(len(data["leaderboard"]), 1)
        self.assertEqual(data["leaderboard"][0]["score"], 50)
        self.assertIn("stats", data)

    def test_routes_load(self):
        res_home = self.client.get("/")
        self.assertEqual(res_home.status_code, 200)

        res_game = self.client.get("/game")
        self.assertEqual(res_game.status_code, 200)

        res_gameover = self.client.get("/gameover?score=40&mode=Classic&food=4")
        self.assertEqual(res_gameover.status_code, 200)

    def test_api_leaderboard(self):
        res = self.client.get("/api/leaderboard")
        self.assertEqual(res.status_code, 200)
        json_data = res.get_json()
        self.assertTrue(json_data["success"])
        self.assertIn("leaderboard", json_data)
        self.assertIn("stats", json_data)

    def test_api_score_submission(self):
        payload = {
            "name": "TEST",
            "score": 100,
            "mode": "Classic",
            "food_eaten": 10,
            "max_combo": 2,
        }
        res = self.client.post("/api/score", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["rank"], 1)
        self.assertTrue(data["is_highscore"])
        self.assertEqual(data["highscore"], 100)
        self.assertEqual(data["stats"]["games_played"], 1)
        self.assertEqual(data["stats"]["total_food"], 10)


if __name__ == "__main__":
    unittest.main()
