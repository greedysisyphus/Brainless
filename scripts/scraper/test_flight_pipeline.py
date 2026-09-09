import json
import importlib.util
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import firebase_admin


def load_script(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


fetch_script = load_script("fetch_flight_data", "fetch-from-txt-api.py")
save_script = load_script("save_flight_data", "save-to-firebase.py")
TaoyuanAirportTxtAPIScraper = fetch_script.TaoyuanAirportTxtAPIScraper
init_firebase = save_script.init_firebase
save_to_firebase = save_script.save_to_firebase


VALID_FLIGHT = {
    "gate": "D11",
    "type": "departure",
}


class FakeBatch:
    def __init__(self, fail=False):
        self.writes = []
        self.fail = fail

    def set(self, ref, data):
        self.writes.append((ref, data))

    def commit(self):
        if self.fail:
            raise RuntimeError("Firestore unavailable")


class FakeDb:
    def __init__(self, fail=False):
        self.last_batch = FakeBatch(fail)

    def batch(self):
        return self.last_batch

    def collection(self, name):
        return FakeCollection(name)


class FakeCollection:
    def __init__(self, name):
        self.name = name

    def document(self, doc_id):
        return f"{self.name}/{doc_id}"


def write_record(directory, date="2026-09-09", flights=None, total=None):
    flights = flights if flights is not None else [VALID_FLIGHT]
    data = {
        "date": date,
        "flights": flights,
        "summary": {"total_flights": len(flights) if total is None else total},
    }
    path = Path(directory) / "flight-data-2026-09-09.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


class FlightPipelineTests(unittest.TestCase):
    def test_missing_or_wrong_project_credential_fails_closed(self):
        with patch.object(firebase_admin, "get_app", side_effect=ValueError), patch.dict(os.environ, {}, clear=True):
            self.assertIsNone(init_firebase())
        wrong = json.dumps({"project_id": "wrong-project"})
        with patch.object(firebase_admin, "get_app", side_effect=ValueError), patch.dict(os.environ, {"FIREBASE_SERVICE_ACCOUNT_JSON": wrong}, clear=True):
            self.assertIsNone(init_firebase())

    def test_official_format_change_produces_no_flights(self):
        flights = TaoyuanAirportTxtAPIScraper().parse_flight_data("unexpected html response")
        self.assertEqual(flights, [])

    def test_invalid_record_never_reaches_firestore(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_record(directory, flights=[{"gate": "A1", "type": "arrival"}])
            db = FakeDb()
            self.assertFalse(save_to_firebase(db, directory, [path]))
            self.assertEqual(db.last_batch.writes, [])

    def test_all_dates_use_one_atomic_batch(self):
        with tempfile.TemporaryDirectory() as directory:
            first = write_record(directory)
            second = Path(directory) / "flight-data-2026-09-10.json"
            second.write_text(json.dumps({"date": "2026-09-10", "flights": [VALID_FLIGHT], "summary": {"total_flights": 1}}), encoding="utf-8")
            db = FakeDb()
            self.assertTrue(save_to_firebase(db, directory, [first, second]))
            self.assertEqual(len(db.last_batch.writes), 2)

    def test_batch_failure_is_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_record(directory)
            self.assertFalse(save_to_firebase(FakeDb(fail=True), directory, [path]))


if __name__ == "__main__":
    unittest.main()
