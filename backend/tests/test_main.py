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

    assert metadata_response.status_code == 200
    assert metadata_response.json()["models"]["amazon_rating"]["classes"] == 5
    assert readiness_response.status_code == 200
    assert readiness_response.json()["status"] == "ready"


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
