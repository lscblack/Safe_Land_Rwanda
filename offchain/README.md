# SafeLand Rwanda - Offchain API (FastAPI)

Production-ready FastAPI backend for SafeLand Rwanda with JWT auth (access + refresh), frontend token auth, LIIP login, OTP/notifications (SMTP + SMS), password reset, and land/citizen external integrations. PostgreSQL is primary storage; LIIP connectivity is optional.

## What’s Inside
- FastAPI + async SQLAlchemy + PostgreSQL
- JWT access/refresh tokens, role-based middleware
- Frontend token guard (separate from user tokens)
- LIIP login + auto-provision into SafeLand DB
- OTP + notifications (SMTP + SMS) with branded templates
- External land/citizen proxy endpoints (parcel, UPIs, title PDF, tax arrears, NID lookups)

## Quickstart

```bash
cd offchain
python -m venv .venv && source .venv/bin/activate  # or conda
pip install -r requirements.txt
cp .env.example .env  # fill DB/JWT/SMTP/SMS/external URLs/LIIP
uvicorn main:app --reload --port 3000
```

Docs: http://localhost:3000/docs • Redoc: http://localhost:3000/redoc

## Folder Map

```
api/            # routers and auth middleware
  routes/       # user, frontend, LIIP, notifications, OTP, external
  middlewares/  # token/role verification
assets/         # logos
config/         # Pydantic settings loader
data/           # db engine, models, services (notification, otp)
pkg/            # auth (JWT, hashing), roles, utils
main.py         # FastAPI app + router wiring
requirements.txt
start.sh | run.sh | Makefile_python
```

## Environment (essentials)
- DB: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSLMODE
- JWT: JWT_SECRET, JWT_REFRESH_SECRET, ACCESS_TOKEN_EXPIRATION, REFRESH_TOKEN_EXPIRATION
- Frontend auth: FRONTEND_USERNAME, FRONTEND_PASSWORD, FRONTEND_BASE_URL, BASE_URL
- SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM (or EMAIL_* variants)
- SMS: SMS_AUTH, SMS_SEND, SMS_USERNAME, SMS_PASSWORD (or SMS_API_KEY/SMS_SENDER_ID)
- External: CITIZEN_INFORMATION_ENDPOINT, PARCEL_INFORMATION_IP_ADDRESS, GET_UPIS_BY_ID, GET_AUTH_TOKEN, GET_AUTH_TOKEN_USERNAME, GET_AUTH_TOKEN_PASSWORD, PHONE_NUMBERS_BY_NID, NID_BY_PHONE_NUMBER_ENDPOINT, TITLE_DOWNLOAD, TAX_ARREARS_ENDPOINT
- LIIP (optional): LIIP_DB_*, LIIP_SECRET_KEY

## Auth Model
- Frontend token (no auth): POST /api/frontend/login → Bearer token with role `frontend`; refresh at /api/frontend/refresh.
- User token: POST /api/user/login with `identifier` (email | phone | NID) + password; refresh at /api/user/refresh.
- LIIP login: POST /api/liip/login (SHA-256 check against LIIP DB) → SafeLand tokens; also /api/liip/user-from-token to exchange LIIP JWT.
- Protected routes require Authorization: Bearer <access_token>; frontend token works only for external/notification/OTP calls depending on role checks.

## Endpoint Reference (paths include prefixes from main.py)
- Frontend auth: POST /api/frontend/login, POST /api/frontend/refresh
- User: POST /api/user/register, POST /api/user/login, POST /api/user/refresh, GET /api/user/profile, POST /api/user/admin/create (admin), PUT /api/user/role (admin)
- LIIP: POST /api/liip/login, POST /api/liip/user-from-token
- OTP: POST /otp/send (email|sms), POST /otp/verify
- Notifications: POST /api/notifications/send-email, POST /api/notifications/send-sms, POST /api/notifications/send-otp, POST /api/notifications/send-reset-email, GET /api/notifications/password-reset-form, POST /api/notifications/password-reset
- External (Bearer required): GET /api/external/citizen/{nid}, GET /api/external/nid/{nid}/phonenumbers, GET /api/external/phoneuser/{phone}, POST /api/external/parcel, POST /api/external/upis, GET /api/external/tax-arrears?upi=, GET /api/external/title?upi=&language=, GET /api/external/gis-extract?upi=

## Quick cURL Samples

Frontend token (public):
```bash
curl -X POST http://localhost:3000/api/frontend/login \
  -H "Content-Type: application/json" \
  -d '{"username":"$FRONTEND_USERNAME","password":"$FRONTEND_PASSWORD"}'
```

Register user:
```bash
curl -X POST http://localhost:3000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"first_name":"A","last_name":"B","email":"user@example.com","n_id_number":"1234567890123456","phone":"250788000000","country":"RW","password":"Secret123"}'
```

User login (identifier supports email/phone/NID):
```bash
curl -X POST http://localhost:3000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"user@example.com","password":"Secret123"}'
```

Profile (Bearer from user/LIIP login):
```bash
curl -H "Authorization: Bearer $ACCESS" http://localhost:3000/api/user/profile
```

Send OTP (email or sms, protected):
```bash
curl -X POST http://localhost:3000/otp/send \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"otp_type":"email","email":"user@example.com","purpose":"login"}'
```

Send password reset email (protected):
```bash
curl -X POST http://localhost:3000/api/notifications/send-reset-email \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

LIIP login:
```bash
curl -X POST http://localhost:3000/api/liip/login \
  -H "Content-Type: application/json" \
  -d '{"id_or_email":"liip@example.com","password":"pass"}'
```

External title download (requires Bearer):
```bash
curl -L -o title.pdf "http://localhost:3000/api/external/title?upi=YOUR_UPI&language=english" \
  -H "Authorization: Bearer $ACCESS"
```

## Notes
- Login events send branded login-alert emails automatically.
- Tables auto-create on startup; keep `migration.sql` for reference.
- Removed legacy Go artifacts; this repo is FastAPI-only now.

---

**SafeLand Rwanda** - Secure Land Information Platform

