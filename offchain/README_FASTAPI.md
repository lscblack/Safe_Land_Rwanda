# SafeLand API - FastAPI Version

This is the FastAPI (Python) version of the SafeLand backend API.

## Prerequisites

- Python 3.9+
- PostgreSQL 12+
- Conda environment named `fastapi_setup`

## Setup

1. **Activate Conda Environment**
   ```bash
   conda activate fastapi_setup
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   
   Make sure PostgreSQL is running and create the database:
   ```bash
   createdb safeland
   ```

5. **Run the Server**
   ```bash
   # Using the run script
   chmod +x run.sh
   ./run.sh
   
   # Or directly with Python
   python main.py
   
   # Or with uvicorn for development
   uvicorn main:app --reload --port 3000
   ```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/docs
- **ReDoc**: http://localhost:3000/redoc

## Project Structure

```
offchain/
├── main.py                 # Main application entry point
├── config/
│   └── config.py          # Configuration management
├── api/
│   ├── routes/            # API routes/endpoints
│   │   ├── user_routes.py
│   │   ├── frontend_auth_routes.py
│   │   └── external_routes.py
│   └── middlewares/       # Authentication & authorization
│       └── auth.py
├── data/
│   ├── database/          # Database connection
│   │   └── database.py
│   ├── models/            # SQLAlchemy models
│   │   └── models.py
│   └── services/          # Business logic services
│       ├── otp_service.py
│       └── notification_service.py
└── pkg/
    ├── auth/              # JWT authentication
    │   └── auth.py
    ├── roles/             # Role management
    │   └── roles.py
    └── utils/             # Utility functions
        └── utils.py
```

## API Endpoints

### Public Endpoints
- `POST /api/frontend/login` - Frontend login (no auth required)

### User Endpoints (Requires Authentication)
- `POST /api/user/register` - Register new user
- `POST /api/user/login` - User login
- `GET /api/user/profile` - Get user profile
- `POST /api/admin/create` - Create admin (admin only)
- `PUT /api/user/role` - Update user role (admin only)

### External Services (Requires Authentication)
- `GET /api/external/citizen/{nid}` - Get citizen info by NID
- `GET /api/external/phone-numbers/{nid}` - Get phone numbers by NID
- `GET /api/external/nid-by-phone/{phone}` - Get NID by phone number

## Authentication

All endpoints (except `/api/frontend/login`) require Bearer token authentication:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/user/profile
```

## Database Models

- **User** - User accounts
- **Property** - Land properties
- **OTP** - One-time passwords for verification
- **PasswordReset** - Password reset tokens
- **NotificationLog** - Email/SMS notification logs
- **LIIPUser** - External LIIP system users

## Environment Variables

See `.env.example` for all available configuration options:

- Database configuration (PostgreSQL)
- JWT secrets and expiration times
- SMTP settings for email
- SMS API configuration
- External service credentials (LIIP, LAIS)

## Development

### Running in Development Mode
```bash
uvicorn main:app --reload --port 3000 --log-level debug
```

### Running Tests
```bash
pytest
```

### Database Migrations

The application automatically creates tables on startup. For migrations in production, consider using Alembic:

```bash
# Initialize alembic
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Description"

# Apply migration
alembic upgrade head
```

## Production Deployment

For production, use a production ASGI server:

```bash
uvicorn main:app --host 0.0.0.0 --port 3000 --workers 4
```

Or use Gunicorn with Uvicorn workers:

```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:3000
```

## Migration from Go

This FastAPI version maintains the same API structure as the original Go/Fiber implementation:
- Same endpoints and request/response formats
- Same authentication flow
- Same database schema
- Compatible with existing frontend applications

## Support

For issues or questions, contact the SafeLand development team.
