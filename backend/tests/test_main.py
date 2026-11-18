import json
import shutil
from pathlib import Path

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app import main


client = TestClient(app)


def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "nlp-lab-api"}


class FakeAmazon:
    ready = True
    load_error = None

    def load(self):
        self.ready = True

    def predict(self, text):
        return {"rating": 5, "probabilities": [0, 0, 0, 0.1, 0.9]}


class FakeGoEmotions:
    ready = True
    load_error = None

    def load(self):
        self.ready = True

    def predict(self, text):
        return {
            "emotions": [{"label": "joy", "probability": 0.9}],
            "probabilities": {"joy": 0.9},
            "threshold": 0.3,
        }


def test_metadata_and_readiness(monkeypatch):
    monkeypatch.setattr(main, "amazon_model", FakeAmazon())
    monkeypatch.setattr(main, "go_emotions_model", FakeGoEmotions())

    metadata_response = client.get("/metadata")
    readiness_response = client.get("/readiness")
    statistics_response = client.get("/statistics")

    assert metadata_response.status_code == 200
    assert metadata_response.json()["models"]["amazon_rating"]["classes"] == 5
    assert readiness_response.status_code == 200
    assert readiness_response.json()["status"] == "ready"
    assert statistics_response.status_code == 200
    assert "amazon_reviews" in statistics_response.json()["datasets"]
    assert "amazon_rating" in statistics_response.json()["metrics"]


def test_prediction_routes(monkeypatch):
    monkeypatch.setattr(main, "amazon_model", FakeAmazon())
    monkeypatch.setattr(main, "go_emotions_model", FakeGoEmotions())

    amazon_response = client.post("/predict/amazon", json={"text": "Great"})
    emotions_response = client.post(
        "/predict/go-emotions", json={"text": "I am happy"}
    )

    assert amazon_response.status_code == 200
    assert amazon_response.json()["rating"] == 5
    assert emotions_response.status_code == 200
    assert emotions_response.json()["emotions"][0]["label"] == "joy"


def test_prediction_validation():
    response = client.post("/predict/amazon", json={"text": ""})

    assert response.status_code == 422
    assert response.json()["error"] == "validation_error"


def test_prediction_reports_unready_model(monkeypatch):
    class UnreadyAmazon:
        ready = False
        load_error = "checkpoint missing"

        def load(self):
            raise main.AmazonModelNotReadyError(self.load_error)

    monkeypatch.setattr(main, "amazon_model", UnreadyAmazon())

    response = client.post("/predict/amazon", json={"text": "Great"})

    assert response.status_code == 503
    assert response.json() == {
        "error": "model_not_ready",
        "detail": "checkpoint missing",
    }


def test_datasets_summary_returns_verified_metadata():
    response = client.get("/datasets/summary")

    assert response.status_code == 200
    payload = response.json()
    raw_text = response.text

    assert payload["provenance"] == "Repository audit artifacts (Notebooks 00-02, data/*.json)"
    assert payload["last_audit_date"] == "2026-11-13"
    assert "/content/drive" not in raw_text
    assert "MyDrive" not in raw_text
    assert "C:\\" not in raw_text

    datasets = payload["datasets"]
    assert "amazon_reviews" in datasets
    assert "go_emotions" in datasets

    amazon = datasets["amazon_reviews"]
    assert (
        amazon["source_url"]
        == "https://www.kaggle.com/datasets/yacharki/amazon-reviews-for-sentianalysis-finegrained-csv"
    )
    assert (
        amazon["mirror_url"]
        == "https://huggingface.co/datasets/yassiracharki/Amazon_Reviews_for_Sentiment_Analysis_fine_grained_5_classes"
    )
    assert amazon["splits"]["train"] == 3000000
    assert amazon["splits"]["test"] == 650000
    assert amazon["splits"]["sampled_train"] == 450000
    assert amazon["duplicates_audit"]["recorded"] is False
    assert amazon["duplicates_audit"]["duplicate_count"] is None
    assert amazon["duplicates_audit"]["missing_reason"]
    assert amazon["samples_policy"]["approved"] is False
    assert "train.csv" in amazon["schema"]

    go_emotions = datasets["go_emotions"]
    assert (
        go_emotions["source_url"]
        == "https://huggingface.co/datasets/google-research-datasets/go_emotions"
    )
    assert go_emotions["paper_url"] == "https://aclanthology.org/2020.acl-main.372/"
    assert go_emotions["splits"] == {"train": 43410, "validation": 5426, "test": 5427}
    assert go_emotions["duplicates_audit"]["recorded"] is False
    assert go_emotions["duplicates_audit"]["duplicate_count"] is None
    assert go_emotions["cooccurrence_audit"]["recorded"] is False
    assert go_emotions["cooccurrence_audit"]["matrix"] is None
    assert go_emotions["samples_policy"]["approved"] is False
    assert "features" in go_emotions["schema"]


def test_dataset_samples_governance_and_not_found():
    for dataset_id in ("amazon_reviews", "go_emotions"):
        response = client.get(f"/datasets/{dataset_id}/samples")
        assert response.status_code == 200
        data = response.json()
        assert data["dataset_id"] == dataset_id
        assert data["approved"] is False
        assert data["total_available"] == 0
        assert data["page"] == 1
        assert data["page_size"] == 10
        assert data["items"] == []
        assert data["notice"]
        assert "/content/drive" not in response.text

    paged_response = client.get("/datasets/amazon_reviews/samples?page=2&page_size=25")
    assert paged_response.status_code == 200
    assert paged_response.json()["page"] == 2
    assert paged_response.json()["page_size"] == 25
    assert paged_response.json()["items"] == []

    unknown_response = client.get("/datasets/unknown_corpus/samples")
    assert unknown_response.status_code == 404
    assert unknown_response.json()["error"] == "dataset_not_found"


def test_datasets_summary_unavailable_returns_503(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "REPO_ROOT", tmp_path)

    response = client.get("/datasets/summary")

    assert response.status_code == 503
    payload = response.json()
    assert payload["error"] == "dataset_summary_unavailable"
    assert payload["detail"]


def test_models_lab_returns_verified_metadata(monkeypatch):
    monkeypatch.setattr(main, "amazon_model", FakeAmazon())
    monkeypatch.setattr(main, "go_emotions_model", FakeGoEmotions())

    response = client.get("/models/lab")

    assert response.status_code == 200
    payload = response.json()
    raw_text = response.text

    assert "/content/drive" not in raw_text
    assert "MyDrive" not in raw_text
    assert "C:\\" not in raw_text

    assert (
        payload["provenance"]
        == "Notebooks 01–02, reports/metrics/*.json, artifacts/models/*"
    )
    assert "2026-11-13" in payload["run_timestamp_note"]
    assert len(payload["comparison"]) == 8

    amazon = payload["tracks"]["amazon_rating"]
    assert amazon["readiness"] == {"ready": True, "error": None}
    assert len(amazon["pipeline_steps"]) == 11
    assert amazon["pipeline_steps"][1]["status"] == "not_available"
    assert amazon["hyperparameters"]["classifier"]["total_parameters"] == 16734869
    assert amazon["run_timestamp"] is None
    assert len(amazon["epochs"]["word2vec"]) == 3
    assert len(amazon["epochs"]["baseline"]) == 3
    assert amazon["test_metrics"]["word2vec"]["accuracy"] == 0.53574
    assert amazon["test_metrics"]["word2vec"]["macro_f1"] == 0.5336841879916191
    assert amazon["test_metrics"]["word2vec"]["mae"] == 0.62246
    assert amazon["per_class_report"]["1 star"]["f1-score"] == 0.6364492139696885
    cm_matrix = amazon["confusion_matrix"]["matrix"]
    assert len(cm_matrix) == 5
    assert [sum(row) for row in cm_matrix] == [9933, 9985, 10024, 10049, 10009]
    assert amazon["onnx_parity"]["within_tolerance"] is True
    assert (
        amazon["sha256"]
        == "c6a6773f7e453f29bdec6ffeeddb82f687999e85347b96e2e9cf4aca0a7c4210"
    )
    assert len(amazon["artifact_files"]) > 0
    assert all(
        item["exists"] is True and isinstance(item["size_bytes"], int) and item["size_bytes"] > 0
        for item in amazon["artifact_files"]
    )

    go_emotions = payload["tracks"]["go_emotions"]
    assert go_emotions["readiness"] == {"ready": True, "error": None}
    assert len(go_emotions["pipeline_steps"]) == 10
    assert go_emotions["hyperparameters"]["total_parameters"] == 66975004
    assert go_emotions["run_timestamp"] is None
    assert go_emotions["epochs"]["history_json_exported"] is False
    assert len(go_emotions["epochs"]["items"]) == 3
    assert len(go_emotions["threshold_sweep"]["points"]) == 9
    assert go_emotions["test_metrics"]["test_macro_f1"] == 0.48394947055717247
    assert go_emotions["test_metrics"]["test_micro_f1"] == 0.5917212626563431
    assert go_emotions["test_metrics"]["hamming_loss"] == 0.03608939429834952
    assert go_emotions["test_metrics"]["subset_accuracy"] == 0.4182789754929058
    assert len(go_emotions["per_label_report"]) == 32
    assert go_emotions["onnx_parity"]["within_tolerance"] is True
    assert (
        go_emotions["sha256"]
        == "ae0a3058b444e0380aeba5043c568af46d2c9544f289aa56eaff13f3901e72f5"
    )
    assert len(go_emotions["artifact_files"]) > 0
    assert all(
        item["exists"] is True and isinstance(item["size_bytes"], int) and item["size_bytes"] > 0
        for item in go_emotions["artifact_files"]
    )


def test_models_lab_live_readiness_and_missing_artifacts(monkeypatch, tmp_path):
    class UnreadyGoEmotions:
        ready = False
        load_error = "distilbert weights missing"

        def load(self):
            raise main.GoEmotionsModelNotReadyError(self.load_error)

    src_json = Path(main.REPO_ROOT) / "data" / "model_lab_artifacts.json"
    (tmp_path / "data").mkdir(parents=True)
    shutil.copyfile(src_json, tmp_path / "data" / "model_lab_artifacts.json")

    dummy_vocab = tmp_path / "artifacts" / "models" / "word2vec_bilstm" / "vocab.json"
    dummy_vocab.parent.mkdir(parents=True)
    dummy_vocab.write_text("{}", encoding="utf-8")

    monkeypatch.setattr(main, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(main, "amazon_model", FakeAmazon())
    monkeypatch.setattr(main, "go_emotions_model", UnreadyGoEmotions())

    response = client.get("/models/lab")

    assert response.status_code == 200
    payload = response.json()
    amazon = payload["tracks"]["amazon_rating"]
    go_emotions = payload["tracks"]["go_emotions"]

    assert amazon["readiness"] == {"ready": True, "error": None}
    assert go_emotions["readiness"] == {
        "ready": False,
        "error": "distilbert weights missing",
    }

    vocab_entry = next(
        item
        for item in amazon["artifact_files"]
        if item["path"] == "artifacts/models/word2vec_bilstm/vocab.json"
    )
    assert vocab_entry == {
        "path": "artifacts/models/word2vec_bilstm/vocab.json",
        "exists": True,
        "size_bytes": 2,
    }
    missing_entries = [
        item
        for item in amazon["artifact_files"]
        if item["path"] != "artifacts/models/word2vec_bilstm/vocab.json"
    ]
    assert all(
        item["exists"] is False and item["size_bytes"] is None
        for item in missing_entries
    )


def test_models_lab_unavailable_returns_503(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "REPO_ROOT", tmp_path)

    response = client.get("/models/lab")

    assert response.status_code == 503
    payload = response.json()
    assert payload["error"] == "model_lab_unavailable"
    assert payload["detail"]


def test_technology_returns_verified_manifest_and_live_telemetry(monkeypatch):
    monkeypatch.setattr(main, "amazon_model", FakeAmazon())
    monkeypatch.setattr(main, "go_emotions_model", FakeGoEmotions())

    response = client.get("/technology")

    assert response.status_code == 200
    payload = response.json()
    raw_text = response.text

    assert "/content/drive" not in raw_text
    assert "MyDrive" not in raw_text
    assert "1qvzd" not in raw_text
    assert "C:\\" not in raw_text
    assert "vercel" not in raw_text.lower()

    assert payload["api_version"] == app.version
    assert payload["readiness"] == {
        "amazon_rating": {"ready": True, "error": None},
        "go_emotions": {"ready": True, "error": None},
    }
    assert payload["onnx_artifacts_expected"] == 2
    assert payload["onnx_artifacts_present"] == 2

    expected_categories = {
        "frontend",
        "backend",
        "ml_nlp",
        "data",
        "testing",
        "deployment",
    }
    assert set(payload["categories_summary"].keys()) == expected_categories
    assert len(payload["boundaries"]) == 4
    assert {b["id"] for b in payload["boundaries"]} == {
        "frontend-fastapi",
        "fastapi-pytorch",
        "offline-notebooks-artifacts",
        "docker-ci",
    }

    by_id = {item["id"]: item for item in payload["technologies"]}
    assert by_id["onnx"]["status"] == "verified_export_only"
    assert by_id["gensim"]["status"] == "partial"
    for unused_id in (
        "framer-motion",
        "motion",
        "lenis",
        "lottie-react",
        "rive-react-canvas",
        "tailwindcss",
    ):
        assert by_id[unused_id]["status"] == "declared_unused"

    repo_root = Path(main.REPO_ROOT)
    for item in payload["technologies"]:
        assert 2 <= len(item["monogram"]) <= 4
        assert len(item["verification_sources"]) > 0
        for rel_src in item["verification_sources"]:
            assert (repo_root / rel_src).exists(), f"Missing source {rel_src}"
        if item["logo_path"] is not None:
            svg_path = repo_root / "frontend" / "public" / item["logo_path"].lstrip("/")
            assert svg_path.is_file(), f"Missing logo asset {svg_path}"


def test_technology_live_readiness_and_missing_onnx(monkeypatch, tmp_path):
    class UnreadyAmazon:
        ready = False
        load_error = "amazon checkpoint missing"

        def load(self):
            raise main.AmazonModelNotReadyError(self.load_error)

    src_json = Path(main.REPO_ROOT) / "data" / "technology_manifest.json"
    (tmp_path / "data").mkdir(parents=True)
    shutil.copyfile(src_json, tmp_path / "data" / "technology_manifest.json")

    monkeypatch.setattr(main, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(main, "amazon_model", UnreadyAmazon())
    monkeypatch.setattr(main, "go_emotions_model", FakeGoEmotions())

    response = client.get("/technology")

    assert response.status_code == 200
    payload = response.json()
    assert payload["readiness"]["amazon_rating"] == {
        "ready": False,
        "error": "amazon checkpoint missing",
    }
    assert payload["readiness"]["go_emotions"] == {"ready": True, "error": None}
    assert payload["onnx_artifacts_expected"] == 2
    assert payload["onnx_artifacts_present"] == 0


def test_technology_unavailable_returns_503(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "REPO_ROOT", tmp_path)

    response = client.get("/technology")

    assert response.status_code == 503
    payload = response.json()
    assert payload["error"] == "technology_manifest_unavailable"
    assert payload["detail"]


def test_openapi_schema_matches_committed_export():
    openapi_path = Path(main.REPO_ROOT) / "docs" / "openapi.json"
    assert openapi_path.is_file(), (
        "Committed OpenAPI schema missing; run `python scripts/export_openapi.py`."
    )

    committed = json.loads(openapi_path.read_text(encoding="utf-8"))
    live = app.openapi()
    assert committed == live

    expected_routes = {
        "/readiness",
        "/predict/amazon",
        "/predict/go-emotions",
        "/datasets/summary",
        "/models/lab",
        "/technology",
    }
    assert expected_routes.issubset(committed["paths"].keys())
