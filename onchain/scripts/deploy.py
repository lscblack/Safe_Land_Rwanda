import json
import os
from pathlib import Path

from dotenv import load_dotenv
from solcx import compile_standard, install_solc
from web3 import Web3

load_dotenv()

RPC_URL = os.getenv("RPC_URL", "http://127.0.0.1:8545")
CHAIN_ID = int(os.getenv("CHAIN_ID", "1337"))
ACCOUNT_ADDRESS = os.getenv("ACCOUNT_ADDRESS")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")

ROOT_DIR = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT_DIR / "contracts/SafeLand.sol"
ABI_OUTPUT = ROOT_DIR / "abi/SafeLand.json"
DEPLOY_OUTPUT = ROOT_DIR / "deployed.json"
ENV_FILE = ROOT_DIR / ".env"


def _update_env(contract_address: str, chain_id: int) -> None:
    if not ENV_FILE.exists():
        return

    lines = ENV_FILE.read_text(encoding="utf-8").splitlines()
    updated = []
    found_address = False
    found_abi = False
    found_chain = False

    for line in lines:
        if line.startswith("CONTRACT_ADDRESS="):
            updated.append(f"CONTRACT_ADDRESS={contract_address}")
            found_address = True
        elif line.startswith("CONTRACT_ABI_PATH="):
            updated.append("CONTRACT_ABI_PATH=./abi/SafeLand.json")
            found_abi = True
        elif line.startswith("CHAIN_ID="):
            updated.append(f"CHAIN_ID={chain_id}")
            found_chain = True
        else:
            updated.append(line)

    if not found_address:
        updated.append(f"CONTRACT_ADDRESS={contract_address}")
    if not found_abi:
        updated.append("CONTRACT_ABI_PATH=./abi/SafeLand.json")
    if not found_chain:
        updated.append(f"CHAIN_ID={chain_id}")

    ENV_FILE.write_text("\n".join(updated) + "\n", encoding="utf-8")


def main() -> None:
    if not ACCOUNT_ADDRESS or not PRIVATE_KEY:
        raise RuntimeError("ACCOUNT_ADDRESS and PRIVATE_KEY must be set in .env")

    install_solc("0.8.20")
    source = CONTRACT_PATH.read_text(encoding="utf-8")

    compiled = compile_standard(
        {
            "language": "Solidity",
            "sources": {"SafeLand.sol": {"content": source}},
            "settings": {
                "evmVersion": "paris",
                "outputSelection": {"*": {"*": ["abi", "evm.bytecode"]}},
            },
        },
        solc_version="0.8.20",
    )

    contract_interface = compiled["contracts"]["SafeLand.sol"]["SafeLand"]
    abi = contract_interface["abi"]
    bytecode = contract_interface["evm"]["bytecode"]["object"]

    ABI_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    ABI_OUTPUT.write_text(json.dumps(abi, indent=2), encoding="utf-8")

    web3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not web3.is_connected():
        raise RuntimeError("Failed to connect to RPC")

    chain_id = web3.eth.chain_id

    account = web3.to_checksum_address(ACCOUNT_ADDRESS)
    contract = web3.eth.contract(abi=abi, bytecode=bytecode)

    latest_block = web3.eth.get_block("latest")
    base_fee = latest_block.get("baseFeePerGas", web3.eth.gas_price)
    max_priority_fee = web3.to_wei(2, "gwei")
    max_fee = base_fee * 2 + max_priority_fee

    tx = contract.constructor().build_transaction(
        {
            "from": account,
            "nonce": web3.eth.get_transaction_count(account, "pending"),
            "chainId": chain_id,
            "gas": 7000000,
            "maxFeePerGas": max_fee,
            "maxPriorityFeePerGas": max_priority_fee,
        }
    )

    signed = web3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = web3.eth.send_raw_transaction(signed.rawTransaction)
    receipt = web3.eth.wait_for_transaction_receipt(tx_hash)

    if receipt.status != 1:
        raise RuntimeError("Deployment failed")

    output = {
        "contract_address": receipt.contractAddress,
        "tx_hash": tx_hash.hex(),
        "chain_id": chain_id,
        "rpc_url": RPC_URL,
    }

    DEPLOY_OUTPUT.write_text(json.dumps(output, indent=2), encoding="utf-8")
    _update_env(receipt.contractAddress, chain_id)
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
