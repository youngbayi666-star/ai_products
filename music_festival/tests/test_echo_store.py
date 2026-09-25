import unittest

import server


class EchoStoreTests(unittest.TestCase):
    def test_valid_echoes_get_sequential_ids_and_public_fields_only(self):
        self.assertTrue(hasattr(server, "EchoStore"), "EchoStore must be implemented")
        store = server.EchoStore()
        first = store.add({"persona": "pulse", "style": "neon", "seed": 71, "nickname": "private"})
        second = store.add({"persona": "roam", "style": "sunset", "seed": 72, "message": "private"})
        snapshot = store.snapshot()
        self.assertEqual((first["id"], second["id"]), (1, 2))
        self.assertEqual(snapshot["count"], 2)
        self.assertEqual([item["id"] for item in snapshot["echoes"]], [1, 2])
        self.assertEqual(set(snapshot["echoes"][0]), {"id", "persona", "style", "seed", "createdAt"})
        self.assertNotIn("private", str(snapshot))

    def test_invalid_echoes_do_not_change_count(self):
        self.assertTrue(hasattr(server, "EchoStore"), "EchoStore must be implemented")
        store = server.EchoStore()
        for payload in ({"persona": "unknown", "style": "neon", "seed": 1},
                        {"persona": "pulse", "style": "unknown", "seed": 1},
                        {"persona": "pulse", "style": "neon", "seed": "1"},
                        {"persona": "pulse", "style": "neon", "seed": -1}):
            with self.assertRaises(ValueError):
                store.add(payload)
        self.assertEqual(store.snapshot()["count"], 0)


if __name__ == "__main__":
    unittest.main()
