# Migration Guide: Go to FastAPI

## Overview

Your SafeLand backend has been successfully rewritten from Go (using Fiber framework) to Python (using FastAPI). This guide will help you understand the changes and how to use the new system.

## What Was Migrated

### ✅ Complete Migration

1. **Authentication System**
   - JWT token generation and validation
   - Password hashing with bcrypt
   - Access and refresh tokens
   - User authentication middleware

2. **Database Models**
   - User
   - Property
   - OTP
   - PasswordReset
   - NotificationLog
   - LIIPUser

3. **API Endpoints**
   - User registration and login
   - User profile management
   - Admin creation and role management
   - External services integration
   - Frontend authentication

4. **Services**
   - OTP generation and verification
   - Email notifications
   - SMS notifications (framework ready)

5. **Middleware**
   - JWT authentication
   - Role-based access control
   - CORS configuration

## Key Differences

### Framework: Fiber (Go) → FastAPI (Python)

| Aspect | Go/Fiber | FastAPI |
|--------|----------|---------|
| Language | Go | Python 3.11+ |
| Framework | Fiber v2 | FastAPI |
| ORM | GORM | SQLAlchemy (async) |
| Database Driver | pgx | asyncpg |
| Server | Built-in | Uvicorn |
| Documentation | Swagger (manual) | Automatic OpenAPI |

### File Structure Comparison

```
Go Structure:              →    Python Structure:
├── main.go                     ├── main.py
├── config/                     ├── config/
│   └── config.go                   └── config.py
├── api/                        ├── api/
│   ├── handlers/                   ├── routes/
│   │   ├── user_handler.go         │   ├── user_routes.py
│   │   └── ...                     │   └── ...
│   ├── middlewares/                └── middlewares/
│   │   └── auth.go                     └── auth.py
│   └── routes/                 ├── data/
├── data/                           ├── database/
│   ├── database/                   │   └── database.py
│   │   └── database.go             ├── models/
│   └── models/                     │   └── models.py
│       └── user.go                 └── services/
└── pkg/                                ├── otp_service.py
    ├── auth/                           └── notification_service.py
    │   └── auth.go             └── pkg/
    ├── roles/                      ├── auth/
    │   └── roles.go                │   └── auth.py
    └── utils/                      ├── roles/
        └── utils.go                │   └── roles.py
                                    └── utils/
                                        └── utils.py
```

## Running the New System

### Prerequisites

1. **Conda Environment**
   ```bash
   # Your environment 'fastapi_setup' is already activated
   conda activate fastapi_setup
   ```

2. **Database**
   - PostgreSQL 12+ (same as before)
   - Same database name: `safeland`

3. **Environment Variables**
   - Copy from existing `.env` or use `.env.example`
   - All variable names remain the same

### Starting the Server

```bash
# Option 1: Quick start (recommended)
./start.sh

# Option 2: Using run script
./run.sh

# Option 3: Using Makefile
make -f Makefile_python dev

# Option 4: Direct python
python main.py

# Option 5: Uvicorn with auto-reload
uvicorn main:app --reload --port 3000
```

### Accessing the API

- **API Base URL**: http://localhost:3000
- **Swagger UI**: http://localhost:3000/docs (Interactive API documentation)
- **ReDoc**: http://localhost:3000/redoc (Alternative documentation)
- **Health Check**: http://localhost:3000/health

## API Compatibility

### ✅ Fully Compatible Endpoints

All endpoints maintain the same paths and behavior:

```
POST   /api/frontend/login          (Public)
POST   /api/user/register           (Protected)
POST   /api/user/login              (Protected)
GET    /api/user/profile            (Protected)
POST   /api/admin/create            (Protected, Admin only)
PUT    /api/user/role               (Protected, Admin only)
GET    /api/external/citizen/{nid}  (Protected)
GET    /api/external/phone-numbers/{nid} (Protected)
GET    /api/external/nid-by-phone/{phone} (Protected)
```

### Request/Response Format

**Same as before!** No changes needed to your frontend.

Example Login Request:
```json
{
  "username": "john_doe",
  "password": "password123"
}
```

Example Login Response:
```json
{
  "error": false,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "user_code": "BUY-RW-A3F9G2",
    "role": ["buyer"],
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

## Performance Considerations

### Async/Await Pattern

FastAPI uses async/await, which provides excellent performance:

```python
# All database operations are async
async def get_user(user_id: int, db: AsyncSession):
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()
```

### Connection Pooling

SQLAlchemy async engine manages connection pooling automatically:
- Pool size: 10 connections
- Max overflow: 20 connections

## Database Migrations

The app automatically creates tables on startup. For production migrations:

```bash
# Initialize Alembic (first time only)
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Initial migration"

# Apply migration
alembic upgrade head
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_auth.py
```

## Common Tasks

### Adding a New Endpoint

1. Create route in `api/routes/your_routes.py`:
```python
from fastapi import APIRouter, Depends
from api.middlewares.auth import get_current_user

router = APIRouter()

@router.get("/my-endpoint")
async def my_endpoint(current_user: User = Depends(get_current_user)):
    return {"message": "Hello!"}
```

2. Register router in `main.py`:
```python
from api.routes import your_routes

app.include_router(your_routes.router, prefix="/api/my", tags=["My API"])
```

### Adding Authentication to an Endpoint

```python
from api.middlewares.auth import get_current_user, require_admin

# Require any authenticated user
@router.get("/protected")
async def protected_route(current_user: User = Depends(get_current_user)):
    return {"user": current_user.username}

# Require admin role
@router.get("/admin-only", dependencies=[Depends(require_admin())])
async def admin_route():
    return {"message": "Admin access"}
```

### Working with Database

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from data.database.database import get_db
from data.models.models import User

@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return users
```

## Troubleshooting

### Issue: Module Import Errors

**Solution**: Make sure you're in the offchain directory and conda environment is activated:
```bash
cd /path/to/offchain
conda activate fastapi_setup
python main.py
```

### Issue: Database Connection Failed

**Solution**: Check your `.env` file:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=safeland
```

### Issue: Port Already in Use

**Solution**: Change port in `main.py` or stop the service using port 3000:
```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>
```

## Environment Variables

All environment variables remain the same as the Go version:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=safeland
DB_SSLMODE=disable

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
ACCESS_TOKEN_EXPIRATION=15
REFRESH_TOKEN_EXPIRATION=7

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASSWORD=your_password
SMTP_FROM=noreply@safeland.rw

# SMS (optional)
SMS_API_KEY=your_api_key
SMS_SENDER_ID=SafeLand
```

## Production Deployment

### Using Systemd Service

Create `/etc/systemd/system/safeland-api.service`:

```ini
[Unit]
Description=SafeLand FastAPI Service
After=network.target postgresql.service

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/offchain
Environment="PATH=/home/your_user/miniconda3/envs/fastapi_setup/bin"
ExecStart=/home/your_user/miniconda3/envs/fastapi_setup/bin/python main.py
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable safeland-api
sudo systemctl start safeland-api
sudo systemctl status safeland-api
```

### Using Docker (Optional)

Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 3000

CMD ["python", "main.py"]
```

Build and run:
```bash
docker build -t safeland-api .
docker run -p 3000:3000 --env-file .env safeland-api
```

## Benefits of FastAPI Migration

1. **Automatic Documentation**: OpenAPI/Swagger UI generated automatically
2. **Type Safety**: Pydantic models provide automatic validation
3. **Async Performance**: Native async/await for high concurrency
4. **Easy Testing**: Built-in test client for API testing
5. **Rich Ecosystem**: Access to Python's extensive library ecosystem
6. **Simpler Deployment**: No compilation needed, easier debugging

## Next Steps

1. ✅ Review the generated API documentation at `/docs`
2. ✅ Test all endpoints with your frontend
3. ✅ Configure email/SMS services if needed
4. ✅ Set up proper monitoring and logging
5. ✅ Configure production database
6. ✅ Set up CI/CD pipeline

## Support

For questions or issues:
1. Check the API documentation: http://localhost:3000/docs
2. Review logs in the terminal
3. Check the `README_FASTAPI.md` file
4. Contact the SafeLand development team

---

**Congratulations!** Your SafeLand API is now running on FastAPI! 🎉
