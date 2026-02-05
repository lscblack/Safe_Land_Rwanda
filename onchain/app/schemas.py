from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    upi: str = Field(..., min_length=1)
    buyer_id: str = Field(..., min_length=1)
    seller_id: str = Field(..., min_length=1)
    agreed_amount: int = Field(..., gt=0)
    amount_payed: int = Field(default=0, ge=0)


class TransactionStatusUpdate(BaseModel):
    status: str = Field(..., min_length=1)


class TransactionPay(BaseModel):
    amount: int = Field(..., gt=0)


class TransactionResponse(BaseModel):
    tra_id: str
    upi: str
    buyer_id: str
    seller_id: str
    status: str
    agreed_amount: int
    amount_payed: int
    locked: bool


class UpiLockResponse(BaseModel):
    upi: str
    locked: bool
