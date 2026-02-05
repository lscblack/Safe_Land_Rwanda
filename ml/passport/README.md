# Passport MRZ Parser

FastAPI service that accepts a passport image, extracts MRZ with PaddleOCR, and returns parsed fields.

## Run

1) Install dependencies:

```
pip install -r requirements.txt
```

2) Start the API on port 8080:

```
uvicorn main:app --host 0.0.0.0 --port 8080
```

## Endpoint

`POST /parse` (multipart/form-data)

- field: `file` (image)

Response:
```json
{
  "mrz": {
    "line1": "P<RWAE...",
    "line2": "A12345678<..."
  },
  "data": {
    "name": "SURNAME GIVEN NAMES",
    "country": "RWA",
    "passport_number": "A12345678",
    "expiry_date": "300101"
  }
}
```

`GET /health` returns service status.
