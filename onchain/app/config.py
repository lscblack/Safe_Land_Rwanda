import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

RPC_URL = os.getenv("RPC_URL", "http://127.0.0.1:8545")
CHAIN_ID = int(os.getenv("CHAIN_ID", "1337"))
ACCOUNT_ADDRESS = os.getenv("ACCOUNT_ADDRESS")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
_DEFAULT_ABI = "./abi/SafeLand.json"
CONTRACT_ABI_PATH = os.getenv("CONTRACT_ABI_PATH", _DEFAULT_ABI)

BASE_DIR = Path(__file__).resolve().parents[1]
if CONTRACT_ABI_PATH.startswith("."):
    CONTRACT_ABI_PATH = str((BASE_DIR / CONTRACT_ABI_PATH).resolve())


def validate_config() -> None:
    missing = [
        key
        for key, value in {
            "ACCOUNT_ADDRESS": ACCOUNT_ADDRESS,
            "PRIVATE_KEY": PRIVATE_KEY,
            "CONTRACT_ADDRESS": CONTRACT_ADDRESS,
            "CONTRACT_ABI_PATH": CONTRACT_ABI_PATH,
        }.items()
        if not value
    ]
    if missing:
        raise RuntimeError(f"Missing configuration values: {', '.join(missing)}")
