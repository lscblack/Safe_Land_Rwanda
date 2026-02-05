# SafeLand On-Chain (Ganache + FastAPI + web3.py)

## Overview
SafeLand is a blockchain-backed land transaction system using Ethereum smart contracts on Ganache and a FastAPI backend that signs transactions with web3.py. The contract enforces UPI lock rules to prevent double-sale and ensures a secure, auditable transaction flow.

## System Schematic
Client → FastAPI → web3.py → Ganache → Smart Contract → Event Logs → Visualization Layer

**Data flow**
1. Client calls FastAPI to create/update/pay a transaction.
2. FastAPI signs and submits a transaction to Ganache via web3.py.
3. Smart contract validates rules and emits events.
4. Event logs are read for analytics and visualization charts.

---

## Architecture Design
- **Smart Contract (Solidity)**: On-chain validation for unique `tra_id`, UPI locking, payment updates, and status changes.
- **FastAPI Backend**: REST API that signs transactions, handles input validation, and returns tx hashes.
- **web3.py Client**: RPC interface to Ganache at http://127.0.0.1:8545.
- **Visualization Layer**: Uses on-chain event logs to generate charts.

---

## Contract Rules (Business Logic)
- `tra_id` must be unique.
- Only one active locked transaction per UPI.
- On create: `locked = true`, status = `pending`.
- While `status != completed`, the UPI stays locked.
- When `status == completed`, the transaction unlocks automatically.
- Status update only allowed if transaction exists.
- Payment can’t exceed `agreed_amount`.
- Events emitted: `TransactionCreated`, `PaymentUpdated`, `StatusChanged`, `UnlockAction`.

---

## Setup Guide (Step-by-step)

### 1) Install dependencies
```bash
cd /mnt/42da9889-4773-493d-914e-04647afdab69/projects/ventures/Safe_Land_Rwanda/onchain
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2) Start Ganache
- Start Ganache on http://127.0.0.1:8545.
- Copy an account address + private key from Ganache.

### 3) Configure environment
```bash
cp .env.example .env
```
Set values in `.env`:
- `ACCOUNT_ADDRESS` = Ganache account address
- `PRIVATE_KEY` = Ganache private key

### 4) Deploy smart contract
```bash
cd scripts
python deploy.py
```
This writes:
- ABI to `onchain/abi/SafeLand.json`
- Deployment info to `onchain/deployed.json`

Update `.env` with `CONTRACT_ADDRESS` from `deployed.json`.

### 5) Run FastAPI
```bash
cd ..
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6) Generate charts
```bash
cd ..
python -m visualizations.generate_charts
```
Charts saved in `onchain/visualizations/output`.

---

## FastAPI Endpoints

### POST /transactions
Creates a blockchain transaction and locks the UPI.

**Request**
```json
{
  "upi": "RW-0001-AB",
  "buyer_id": "BUY-101",
  "seller_id": "SELL-501",
  "agreed_amount": 750000,
  "amount_payed": 0
}
```
**Response**
```json
{"tx_hash": "0x...", "tra_id": "TRA-ABC123..."}
```

### PUT /transactions/{tra_id}/status
Updates status. Unlocks UPI automatically when status becomes `completed`.

**Request**
```json
{"status": "completed"}
```
**Response**
```json
{"tx_hash": "0x..."}
```

### POST /transactions/{tra_id}/pay
Updates `amount_payed` with validation.

**Request**
```json
{"amount": 250000}
```
**Response**
```json
{"tx_hash": "0x..."}
```

### GET /upi/{upi}/locked
Returns current UPI lock state.

**Response**
```json
{"upi": "RW-0001-AB", "locked": true}
```

### GET /transactions/{tra_id}
Fetch a single transaction.

**Response**
```json
{
  "tra_id": "TRA-001",
  "upi": "RW-0001-AB",
  "buyer_id": "BUY-101",
  "seller_id": "SELL-501",
  "status": "pending",
  "agreed_amount": 750000,
  "amount_payed": 250000,
  "locked": true
}
```

### GET /transactions
Fetch all transactions (iterates on-chain list).

---

## Visualization Endpoints
All charts are derived from on-chain event logs.

- GET /visualizations/transactions-flow
- GET /visualizations/upi-lock-timeline
- GET /visualizations/payment-progress
- GET /visualizations/event-activity
- GET /visualizations/event-activity-timeline

---

## Security Design
**Implemented**
- **Signed transactions**: All state-changing calls are signed in the backend using the private key.
- **Access control**: Only owner/operator can create/update/pay (`onlyOperator`).
- **Require guards**: Uniqueness of `tra_id`, UPI lock enforcement, payment cap, status update checks.
- **Input validation**: Pydantic validation in FastAPI.
- **Replay protection**: Uniqueness of `tra_id` prevents replays.
- **Audit events**: Emits events for all key transitions.
- **Double-sale prevention**: UPI lock prevents concurrent sale transactions on same land parcel.

**Production Network Changes**
- Replace Ganache with a managed Ethereum node (Infura/Alchemy) or self-hosted Geth/Nethermind.
- Use hardware wallets or custodial signing, never store private keys in plaintext.
- Add monitoring (event indexing, alerting, reorg handling).
- Increase gas management sophistication (EIP-1559 max fees).
- Add role-based access via OpenZeppelin AccessControl for multi-operator governance.

---

## Example Test Requests
```bash
curl -X POST http://127.0.0.1:8000/transactions \
  -H 'Content-Type: application/json' \
  -d '{"tra_id":"TRA-001","upi":"RW-0001-AB","buyer_id":"BUY-101","seller_id":"SELL-501","agreed_amount":750000}'

curl -X POST http://127.0.0.1:8000/transactions/TRA-001/pay \
  -H 'Content-Type: application/json' \
  -d '{"amount":250000}'

curl -X PUT http://127.0.0.1:8000/transactions/TRA-001/status \
  -H 'Content-Type: application/json' \
  -d '{"status":"completed"}'

curl http://127.0.0.1:8000/upi/RW-0001-AB/locked
curl http://127.0.0.1:8000/transactions/TRA-001
```

---

## Files
- Smart contract: onchain/contracts/SafeLand.sol
- Deployment script: onchain/scripts/deploy.py
- FastAPI app: onchain/app/main.py
- Visualization script: onchain/visualizations/generate_charts.py
