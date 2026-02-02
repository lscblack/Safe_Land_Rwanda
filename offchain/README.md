# SafeLand Rwanda - Offchain API

A secure, production-ready backend API for SafeLand Rwanda's land information management system. Built with Go 1.25.5, Fiber v2, and PostgreSQL with comprehensive authentication, professional email templates, and integrated external services.

## 🚀 Features

- ✅ **JWT Authentication** - User & admin authentication with role-based access control
- 🔒 **Frontend Token Security** - All endpoints protected with Bearer token authentication
- 📧 **Professional Email System** - SMTP with branded HTML templates (SafeLand colors & logo)
- 📱 **Dual OTP Delivery** - Send same OTP via SMS and Email simultaneously
- 🔑 **Password Reset Flow** - Complete flow with professional forms and success pages
- 🗺️ **Land Information Services** - Parcel info, UPIs, tax arrears, e-titles (PDF), GIS data
- 👤 **Citizen Information** - NID lookup, phone verification, LIIP authentication
- 📊 **Database Auto-Migration** - GORM with models for User, Property, OTP, PasswordReset, NotificationLog
- 📖 **Swagger Documentation** - Interactive API docs with security testing
- 🔐 **CORS Enabled** - Configured for cross-origin requests

## Project Structure

```
/offchain
├───api
│   ├───handlers
│   ├───middlewares
│   └───routes
├───config
├───data
│   ├───database
│   └───models
├───docs
├───pkg
│   ├───auth
│   └───utils
├───tests
├───.env
├───.gitignore
├───go.mod
├───go.sum
└───main.go
```

### Folder Explanations

*   **`/api`**: API-specific logic and HTTP handling
    *   **`/handlers`**: HTTP handlers for all endpoints (users, external services, notifications, LIIP, land info)
    *   **`/middlewares`**: Custom middlewares (JWT auth, role verification, frontend token validation)
    *   **`/routes`**: Route definitions with security middleware configuration
*   **`/config`**: Application configuration management
*   **`/data`**: Data layer and persistence
    *   **`/database`**: Database connections (PostgreSQL, MySQL for LIIP)
    *   **`/models`**: GORM models (User, Property, OTP, PasswordReset, NotificationLog)
*   **`/docs`**: Swagger/OpenAPI documentation (auto-generated)
*   **`/pkg`**: Reusable packages
    *   **`/auth`**: JWT token generation/validation, frontend token verification
    *   **`/templates`**: Professional email HTML templates with SafeLand branding
    *   **`/utils`**: Helper functions and utilities
*   **`/tests`**: Test suites
*   **`.env`**: Environment variables (credentials, API endpoints, SMTP settings)

## Getting Started

### Prerequisites

*   [Go 1.25+](https://go.dev/)
*   [PostgreSQL 12+](https://www.postgresql.org/)
*   [Swag](https://github.com/swaggo/swag) - For Swagger documentation
    ```bash
    go install github.com/swaggo/swag/cmd/swag@latest
    ```

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/lscblack/Safe_Land_Rwanda
    cd Safe_Land_Rwanda/offchain
    ```

2.  **Install dependencies:**
    ```bash
    go mod tidy
    ```

3.  **Configure environment:**
    - Copy `.env.example` to `.env` (if available) or create `.env` file
    - Update the following critical variables:
    ```env
   setup the env
    ```

4.  **Generate Swagger documentation:**
    ```bash
    swag init
    ```

5.  **Run the application:**
    ```bash
    go run main.go
    ```
    
    The API will be available at `http://localhost:3000`
    
6.  **Access Swagger UI:**
    Navigate to `http://localhost:3000/swagger/index.html`

## 🔐 Security & Authentication

### Frontend Token Authentication

All API endpoints (except `/api/frontend/login`) require a Bearer token for access.

**Step 1: Get Frontend Token**
```bash
curl -X POST http://localhost:3000/api/frontend/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "uname",
    "password": "password"
  }'
```

**Response:**
```json
{
  "error": false,
  "msg": "Frontend authenticated successfully",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

**Step 2: Use Token in Requests**
```bash
curl -X GET http://localhost:3000/api/external/title?data&data2 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Protected Endpoint Groups

#### 🔒 User Management
- `POST /api/user/register` - Register new user
- `POST /api/user/login` - User login
- `PUT /api/user/role` - Update user roles
- `POST /api/admin/create` - Create admin account

#### 🔒 External Services
- `GET /api/external/citizen/:nid` - Get citizen information
- `GET /api/external/nid/:nid/phonenumbers` - Get phone numbers by NID
- `GET /api/external/phoneuser/:phone` - Get NID by phone number
- `POST /api/external/parcel` - Get parcel information
- `POST /api/external/upis` - Get UPIs by owner ID
- `GET /api/external/tax-arrears` - Get tax arrears by UPI
- `GET /api/external/title` - Download e-title (PDF)
- `GET /api/external/gis-extract` - Get GIS plot shape data

#### 🔒 Notifications
- `POST /api/notifications/send-email` - Send professional email
- `POST /api/notifications/send-otp` - Send OTP via SMS + Email
- `POST /api/notifications/send-reset-email` - Send password reset email
- `GET /api/notifications/password-reset-form` - Password reset form (HTML)
- `POST /api/notifications/password-reset` - Submit password reset

#### 🔒 LIIP Authentication
- `POST /api/liip/login` - Login LIIP user
- `POST /api/liip/user-from-token` - Get LIIP user from token

### 🌐 Public Endpoints
- `POST /api/frontend/login` - Get frontend access token (no auth required)

## 📚 API Usage Examples

### Send OTP (SMS + Email)
```bash
curl -X POST http://localhost:3000/api/notifications/send-otp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "250788123456",
    "email": "user@example.com",
    "type": "phone"
  }'
```

**Response:**
```json
{
  "error": false,
  "msg": "OTP sent via SMS and Email successfully",
  "otp": "AB12CD",
  "verification_code": "550e8400-e29b-41d4-a716-446655440000",
  "expires_in": "10 minutes",
  "email_sent": true
}
```

### Download E-Title (PDF)
```bash
curl -X GET "http://localhost:3000/api/external/title?upi=YOUR_UPI&language=english" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output title.pdf
```

### Get Parcel Information
```bash
curl -X POST http://localhost:3000/api/external/parcel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "upi": "YOUR_UPI_HERE"
  }'
```

### Send Professional Email
```bash
curl -X POST http://localhost:3000/api/notifications/send-email \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Welcome to SafeLand",
    "title": "Account Created",
    "message": "Your SafeLand account has been successfully created."
  }'
```

## 🎨 Email Templates

All emails use professional HTML templates with SafeLand branding:
- **Brand Colors:** Primary `#395d91`, Dark `#0a162e`, Success `#10b981`, Error `#e11d48`
- **Features:** Responsive design, inline CSS, SafeLand logo, security tips
- **Templates:**
  - OTP Email (30px monospace code, 10-minute expiry)
  - Password Reset (reset link + button, 20-minute expiry)
  - Generic Notifications (customizable with action buttons)
  - Security Alerts

## 🗄️ Database Models

### User
- ID, FirstName, MiddleName, LastName
- Email, Username, Password (bcrypt)
- Role (JSON array), Avatar, NIDNumber, Phone, Country
- CreatedAt, UpdatedAt

### OTP
- ID, Phone, OTPCode, VerificationCode
- Status (active/used), ExpiresAt
- CreatedAt, UpdatedAt

### PasswordReset
- ID, UserID (FK to users)
- Token (unique), ExpiresAt, Used
- CreatedAt, UpdatedAt

### Property
- ID, UPI, OwnerID, Location
- Size, Value, Status
- CreatedAt, UpdatedAt

### NotificationLog
- ID, Type (email/sms), Recipient
- Subject, Message, Status
- CreatedAt

## 🔧 Configuration

## ✅ Completed Features

### Backend Infrastructure
- ✅ Fiber v2 web framework setup
- ✅ PostgreSQL connection with GORM
- ✅ Database auto-migration (5 models)
- ✅ CORS middleware configuration
- ✅ Swagger/OpenAPI documentation
- ✅ Environment variable management

### Authentication & Security
- ✅ JWT token generation (access + refresh)
- ✅ Frontend Bearer token authentication
- ✅ Role-based access control (admin, user)
- ✅ Password hashing (bcrypt)
- ✅ All endpoints protected (except frontend login)
- ✅ Token validation middleware
- ✅ Custom auth middleware for routes

### Email System
- ✅ SMTP integration with custom server
- ✅ Custom LOGIN auth implementation
- ✅ Professional HTML email templates
- ✅ SafeLand branded templates (colors, logo, footer)
- ✅ OTP email template (10-minute expiry)
- ✅ Password reset email template (20-minute expiry)
- ✅ Generic notification template
- ✅ Security alert template

### OTP System
- ✅ Dual delivery (SMS + Email simultaneously)
- ✅ Same OTP code for both channels
- ✅ 6-character mixed alphanumeric OTP
- ✅ 10-minute expiry
- ✅ Database persistence
- ✅ Verification code generation
- ✅ SMS integration with messaging API

### Password Reset Flow
- ✅ Password reset email with secure link
- ✅ Professional reset form (HTML with validation)
- ✅ Password strength indicator
- ✅ Client-side validation
- ✅ Loading states and error handling
- ✅ Success page with redirect to frontend
- ✅ Token-based reset (20-minute expiry)
- ✅ User lookup by email for FK constraint

### External Services Integration
- ✅ Citizen information lookup (NID)
- ✅ Phone numbers by NID
- ✅ NID by phone number
- ✅ Parcel information by UPI
- ✅ UPIs by owner ID (with LIIP auth)
- ✅ Tax arrears lookup
- ✅ E-title download (PDF proxy with headers)
- ✅ GIS plot shape data
- ✅ LIIP authentication (SHA-256 password)
- ✅ LIIP token decoding

### User Management
- ✅ User registration
- ✅ User login with JWT
- ✅ Admin creation
- ✅ Role updates
- ✅ Profile management

## 📖 Swagger Documentation

Access interactive API documentation at: `http://localhost:3000/swagger/index.html`

**Features:**
- Bearer token authentication testing
- Request/response examples
- Schema definitions
- Try-it-out functionality

**Using Swagger with Authentication:**
1. Get token from `/api/frontend/login`
2. Click "Authorize" button (🔒 icon at top)
3. Enter: `Bearer YOUR_TOKEN_HERE`
4. Click "Authorize"
5. Test any protected endpoint

## 🚀 Development

### Run with Live Reload
```bash
# Install Air
go install github.com/cosmtrek/air@latest

# Run with Air
air
```

### Regenerate Swagger Docs
```bash
swag init
```

### Database Migrations
Migrations run automatically on startup using GORM AutoMigrate.

## 📝 Notes

- **Database Constraint Warning:** The `uni_password_resets_token` constraint warning during migration is expected and harmless
- **LIIP Database:** Optional MySQL connection for LIIP user authentication
- **Email Sending:** Uses custom LOGIN auth method (not PLAIN) for SMTP
- **PDF Downloads:** Title endpoint acts as a proxy, preserving all headers from upstream service
- **Token Expiry:** Frontend tokens valid for 24 hours, user access tokens for 15 minutes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

SafeLand Rwanda Development Team

## 🆘 Support

For issues and questions:
- Email: support@safeland.rw
- Create an issue on GitHub

---

**SafeLand Rwanda** - Secure Land Information Platform

