import json
from pathlib import Path
from typing import Any, Dict, Tuple

from web3 import Web3
from web3.exceptions import ContractLogicError

try:
    from app.config import (
        ACCOUNT_ADDRESS,
        CHAIN_ID,
        CONTRACT_ABI_PATH,
        CONTRACT_ADDRESS,
        PRIVATE_KEY,
        RPC_URL,
        validate_config,
    )
except ModuleNotFoundError:  # pragma: no cover
    from config import (
        ACCOUNT_ADDRESS,
        CHAIN_ID,
        CONTRACT_ABI_PATH,
        CONTRACT_ADDRESS,
        PRIVATE_KEY,
        RPC_URL,
        validate_config,
    )


class BlockchainService:
    def __init__(self) -> None:
        validate_config()
        self.web3 = Web3(Web3.HTTPProvider(RPC_URL))
        if not self.web3.is_connected():
            raise RuntimeError("Failed to connect to Ethereum RPC")

        abi_path = Path(CONTRACT_ABI_PATH)
        if not abi_path.is_file():
            raise RuntimeError(f"ABI file not found: {abi_path}")

        with abi_path.open("r", encoding="utf-8") as handle:
            abi = json.load(handle)

        contract_address = self.web3.to_checksum_address(CONTRACT_ADDRESS)
        code = self.web3.eth.get_code(contract_address)
        if not code or code == b"\x00":
            raise RuntimeError(
                "Contract bytecode not found at CONTRACT_ADDRESS. "
                "Check RPC_URL points to the same Ganache workspace and "
                "CONTRACT_ADDRESS matches the latest deployment."
            )

        self.contract = self.web3.eth.contract(address=contract_address, abi=abi)
        self.account_address = self.web3.to_checksum_address(ACCOUNT_ADDRESS)
        self.private_key = PRIVATE_KEY

    def _build_base_tx(self) -> Dict[str, Any]:
        latest_block = self.web3.eth.get_block("latest")
        base_fee = latest_block.get("baseFeePerGas", self.web3.eth.gas_price)
        max_priority_fee = self.web3.to_wei(2, "gwei")
        max_fee = base_fee * 2 + max_priority_fee
        return {
            "from": self.account_address,
            "nonce": self.web3.eth.get_transaction_count(self.account_address, "pending"),
            "chainId": CHAIN_ID,
            "gas": 500000,
            "maxFeePerGas": max_fee,
            "maxPriorityFeePerGas": max_priority_fee,
        }

    def _send_transaction(self, tx: Dict[str, Any]) -> str:
        signed = self.web3.eth.account.sign_transaction(tx, private_key=self.private_key)
        tx_hash = self.web3.eth.send_raw_transaction(signed.rawTransaction)
        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
        if receipt.status != 1:
            raise RuntimeError("Transaction failed")
        return tx_hash.hex()

    def create_transaction(self, payload: Dict[str, Any]) -> str:
        tx = self.contract.functions.createTransaction(
            payload["tra_id"],
            payload["upi"],
            payload["buyer_id"],
            payload["seller_id"],
            payload["agreed_amount"],
        ).build_transaction(self._build_base_tx())
        return self._send_transaction(tx)

    def update_status(self, tra_id: str, status: str) -> str:
        tx = self.contract.functions.updateStatus(tra_id, status).build_transaction(
            self._build_base_tx()
        )
        return self._send_transaction(tx)

    def pay_amount(self, tra_id: str, amount: int) -> str:
        tx = self.contract.functions.payAmount(tra_id, amount).build_transaction(
            self._build_base_tx()
        )
        return self._send_transaction(tx)

    def get_transaction(self, tra_id: str) -> Tuple[Any, ...]:
        return self.contract.functions.getTransaction(tra_id).call()

    def get_transaction_ids(self) -> list[str]:
        count = self.contract.functions.getTransactionCount().call()
        ids = []
        for idx in range(count):
            ids.append(self.contract.functions.getTransactionIdByIndex(idx).call())
        return ids

    def is_upi_locked(self, upi: str) -> bool:
        return self.contract.functions.isUpiLocked(upi).call()

    def fetch_event_logs(self, event_name: str, from_block: int = 0, to_block: str = "latest"):
        event = getattr(self.contract.events, event_name)
        return event().get_logs(fromBlock=from_block, toBlock=to_block)


class BlockchainError(Exception):
    pass


def map_contract_error(error: Exception) -> BlockchainError:
    if isinstance(error, ContractLogicError):
        return BlockchainError(error.args[0] if error.args else "contract error")
    if isinstance(error, ValueError):
        return BlockchainError("transaction rejected")
    return BlockchainError(str(error))
