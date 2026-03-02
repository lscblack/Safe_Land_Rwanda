import os
import json
import joblib
from threading import Lock

MODELS_DIR = os.path.join(os.path.dirname(__file__), '../../../models')
LATEST_PATH = os.path.join(MODELS_DIR, 'latest.json')

class ModelRegistry:
    _models = {}     # name -> sklearn/lgbm model object
    _features = {}   # name -> list of feature column names
    _lock = Lock()

    @classmethod
    def load_models(cls):
        with cls._lock:
            if not os.path.exists(LATEST_PATH):
                cls._models = {}
                cls._features = {}
                return
            with open(LATEST_PATH, 'r') as f:
                latest = json.load(f)
            for key, fname in latest.items():
                path = os.path.join(MODELS_DIR, fname)
                if os.path.exists(path):
                    payload = joblib.load(path)
                    if isinstance(payload, dict):
                        cls._models[key] = payload['model']
                        cls._features[key] = payload.get('features', [])
                    else:
                        # Legacy: plain model
                        cls._models[key] = payload
                        cls._features[key] = []

    @classmethod
    def get_model(cls, name):
        return cls._models.get(name)

    @classmethod
    def get_features(cls, name):
        return cls._features.get(name, [])

    @classmethod
    def reload_models(cls):
        cls.load_models()

# Load models at startup
ModelRegistry.load_models()
