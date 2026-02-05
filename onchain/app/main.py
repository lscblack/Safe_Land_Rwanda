from fastapi import FastAPI, HTTPException
from uuid import uuid4
from fastapi.responses import StreamingResponse

try:
    from app.schemas import (
        TransactionCreate,
        TransactionPay,
        TransactionResponse,
        TransactionStatusUpdate,
        UpiLockResponse,
    )
    from app.services.blockchain import BlockchainService, BlockchainError, map_contract_error
    from app.services.visualization import VisualizationService
except ModuleNotFoundError:  # pragma: no cover
    from schemas import (
        TransactionCreate,
        TransactionPay,
        TransactionResponse,
        TransactionStatusUpdate,
        UpiLockResponse,
    )
    from services.blockchain import BlockchainService, BlockchainError, map_contract_error
    from services.visualization import VisualizationService

app = FastAPI(title="SafeLand Blockchain API")

blockchain = BlockchainService()
visualizations = VisualizationService()

ALLOWED_STATUSES = {"pending", "completed", "cancelled"}


def _to_response(data: tuple) -> TransactionResponse:
    return TransactionResponse(
        tra_id=data[0],
        upi=data[1],
        buyer_id=data[2],
        seller_id=data[3],
        status=data[4],
        agreed_amount=data[5],
        amount_payed=data[6],
        locked=data[7],
    )


@app.post("/transactions", response_model=dict)
def create_transaction(payload: TransactionCreate):
    try:
        tra_id = f"TRA-{uuid4().hex[:12].upper()}"
        tx_hash = blockchain.create_transaction(
            {
                "tra_id": tra_id,
                "upi": payload.upi,
                "buyer_id": payload.buyer_id,
                "seller_id": payload.seller_id,
                "agreed_amount": payload.agreed_amount,
            }
        )

        if payload.amount_payed and payload.amount_payed > 0:
            blockchain.pay_amount(tra_id, payload.amount_payed)

        return {"tx_hash": tx_hash, "tra_id": tra_id}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(map_contract_error(exc)))


@app.put("/transactions/{tra_id}/status", response_model=dict)
def update_status(tra_id: str, payload: TransactionStatusUpdate):
    try:
        normalized = payload.status.strip().lower()
        if normalized not in ALLOWED_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Use one of: {', '.join(sorted(ALLOWED_STATUSES))}",
            )

        tx_hash = blockchain.update_status(tra_id, normalized)
        return {"tx_hash": tx_hash}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(map_contract_error(exc)))


@app.post("/transactions/{tra_id}/pay", response_model=dict)
def pay_amount(tra_id: str, payload: TransactionPay):
    try:
        tx_hash = blockchain.pay_amount(tra_id, payload.amount)
        return {"tx_hash": tx_hash}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(map_contract_error(exc)))


@app.get("/upi/{upi}/locked", response_model=UpiLockResponse)
def check_upi_lock(upi: str):
    try:
        locked = blockchain.is_upi_locked(upi)
        return UpiLockResponse(upi=upi, locked=locked)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(map_contract_error(exc)))


@app.get("/transactions/{tra_id}", response_model=TransactionResponse)
def get_transaction(tra_id: str):
    try:
        data = blockchain.get_transaction(tra_id)
        return _to_response(data)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=404, detail=str(map_contract_error(exc)))


@app.get("/transactions", response_model=list[TransactionResponse])
def list_transactions():
    try:
        ids = blockchain.get_transaction_ids()
        results: list[TransactionResponse] = []
        for tra_id in ids:
            try:
                results.append(_to_response(blockchain.get_transaction(tra_id)))
            except Exception:
                continue
        return results
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(map_contract_error(exc)))


@app.get("/visualizations/transactions-flow")
def viz_transactions_flow():
    buffer = visualizations.transaction_flow_graph()
    return StreamingResponse(buffer, media_type="image/png")


@app.get("/visualizations/upi-lock-timeline")
def viz_upi_lock_timeline():
    buffer = visualizations.upi_lock_timeline()
    return StreamingResponse(buffer, media_type="image/png")


@app.get("/visualizations/payment-progress")
def viz_payment_progress():
    buffer = visualizations.payment_progress_chart()
    return StreamingResponse(buffer, media_type="image/png")


@app.get("/visualizations/event-activity")
def viz_event_activity():
    buffer = visualizations.event_activity_graph()
    return StreamingResponse(buffer, media_type="image/png")


@app.get("/visualizations/event-activity-timeline")
def viz_event_activity_timeline():
    buffer = visualizations.event_activity_timeline()
    return StreamingResponse(buffer, media_type="image/png")
