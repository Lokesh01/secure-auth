# Secure Auth - Server

The backend API for Secure Auth, built with Express.js, TypeScript, and MongoDB.

## 🌐 Live API

**Base URL**: `https://secure-auth-9chv.onrender.com/api/v1`

<!-- Replace with your actual deployed URL -->

> **Note**: The API is deployed on Render's free tier, so it may take a few seconds to wake up on first request.

## 🛠️ Tech Stack

### Core

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type-safe JavaScript
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM

### Authentication & Security

- **jsonwebtoken** - JWT token generation & verification
- **Passport.js** - Authentication middleware
- **passport-jwt** - JWT strategy for Passport
- **bcrypt** - Password hashing
- **speakeasy** - TOTP generation for 2FA
- **qrcode** - QR code generation for MFA setup

### Utilities

- **Zod** - Schema validation
- **cookie-parser** - Cookie handling
- **cors** - Cross-origin resource sharing
- **date-fns** - Date manipulation
- **uuid** - Unique ID generation
- **Nodemailer** - Email sending (Brevo in production, Ethereal in development)
- **Winston** - Logging

## 📁 Project Structure

```
server/
├── src/
│   ├── index.ts                   # Application entry point
│   ├── config/
│   │   ├── app.config.ts          # Environment configuration
│   │   └── http.config.ts         # HTTP status codes
│   ├── database/
│   │   ├── database.ts            # MongoDB connection
│   │   └── models/
│   │       ├── user.model.ts      # User schema
│   │       ├── session.model.ts   # Session schema
│   │       └── verification.model.ts
│   ├── modules/
│   │   ├── auth/                  # Authentication module
│   │   ├── mfa/                   # Multi-factor auth module
│   │   ├── session/               # Session management module
│   │   └── user/                  # User module
│   ├── common/
│   │   ├── utils/                 # Utility functions
│   │   ├── validators/            # Zod schemas
│   │   ├── enums/                 # TypeScript enums
│   │   ├── interface/             # TypeScript interfaces
│   │   └── strategies/            # Passport strategies
│   ├── middlewares/
│   │   ├── asyncHandler.ts        # Async error wrapper
│   │   ├── errorHandler.ts        # Global error handler
│   │   └── passport.ts            # Passport configuration
│   └── mailers/                   # Email templates & sending
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 21.0.0
- MongoDB instance
- Brevo account

### Installation

1. **Install dependencies**

```bash
   npm install
```

2. **Configure environment**

```bash
   cp .env.example .env
```

   Update `.env` with your values:

```env
   PORT=8000
   NODE_ENV=development
   MONGO_URI=mongodb+srv://...
   APP_ORIGIN=http://localhost:3000
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_SECRET=your_refresh_secret
   JWT_REFRESH_EXPIRES_IN=30d
   SMTP_USER=your@gmail.com
   BREVO_API_KEY=your_brevo_api_key
   BREVO_SENDER_EMAIL=your@gmail.com
```

   > **Development**: Emails are intercepted by Ethereal (no real emails sent). Check your terminal for a preview URL after any email flow.

3. **Start development server**

```bash
   npm run dev
```

## 📜 Available Scripts

```bash
npm run dev      # Start dev server with hot reload
npm run build    # Compile TypeScript
npm start        # Run production build
```

---

# 📚 API Documentation

## Base URL

```
Production: https://secure-auth-9chv.onrender.com/api/v1
Development: http://localhost:8000/api/v1
```

## Authentication

The API uses JWT tokens stored in HTTP-only cookies:

- `accessToken` - Short-lived token (15 min)
- `refreshToken` - Long-lived token (30 days)

## Endpoints

### Health Check

#### Check API Status

```http
GET /health
```

**Response** `200 OK`

```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

---

### 🔐 Auth Endpoints

#### Register User

```http
POST /api/v1/auth/register
```

**Request Body**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "confirmPassword": "securePassword123"
}
```

**Response** `201 Created`

```json
{
  "message": "User registered successfully",
  "data": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "isEmailVerified": false,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

#### Login

```http
POST /api/v1/auth/login
```

**Request Body**

```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response** `200 OK` (MFA disabled)

```json
{
  "message": "Login successful",
  "user": { ... },
  "mfaRequired": false
}
```

**Response** `200 OK` (MFA enabled)

```json
{
  "message": "Verify MFA Authentication",
  "mfaRequired": true,
  "user": {
    "email": "john@example.com"
  }
}
```

> Cookies `accessToken` and `refreshToken` are set on successful login (when MFA is disabled).

---

#### Logout

```http
POST /api/v1/auth/logout
```

**Auth Required**: Yes (JWT Cookie)

**Response** `200 OK`

```json
{
  "message": "Logout successful"
}
```

---

#### Refresh Access Token

```http
GET /api/v1/auth/refresh
```

**Requires**: `refreshToken` cookie

**Response** `200 OK`

```json
{
  "message": "Refresh access token successful"
}
```

> New `accessToken` cookie is set.

---

#### Verify Email

```http
POST /api/v1/auth/verify/email
```

**Request Body**

```json
{
  "code": "abc123xyz"
}
```

**Response** `200 OK`

```json
{
  "message": "Email verified successfully"
}
```

---

#### Forgot Password

```http
POST /api/v1/auth/password/forgot
```

**Request Body**

```json
{
  "email": "john@example.com"
}
```

**Response** `200 OK`

```json
{
  "message": "Password reset email sent successfully"
}
```

---

#### Reset Password

```http
POST /api/v1/auth/password/reset
```

**Request Body**

```json
{
  "password": "newSecurePassword123",
  "verificationCode": "reset_code_from_email"
}
```

**Response** `200 OK`

```json
{
  "message": "Reset Password successfully"
}
```

---

### 🔒 MFA Endpoints

#### Generate MFA Setup

```http
GET /api/v1/mfa/setup
```

**Auth Required**: Yes (JWT Cookie)

**Response** `200 OK`

```json
{
  "message": "Scan the QR code or enter the secret key in your authenticator app",
  "secret": "JBSWY3DPEHPK3PXP",
  "qrImageUrl": "data:image/png;base64,..."
}
```

---

#### Verify MFA Setup

```http
POST /api/v1/mfa/verify
```

**Auth Required**: Yes (JWT Cookie)

**Request Body**

```json
{
  "code": "123456",
  "secretKey": "JBSWY3DPEHPK3PXP"
}
```

**Response** `200 OK`

```json
{
  "message": "MFA setup verified successfully",
  "userPreferences": {
    "enable2FA": true
  }
}
```

---

#### Revoke MFA

```http
PUT /api/v1/mfa/revoke
```

**Auth Required**: Yes (JWT Cookie)

**Response** `200 OK`

```json
{
  "message": "MFA revoked successfully",
  "userPreferences": {
    "enable2FA": false
  }
}
```

---

#### Verify MFA for Login

```http
POST /api/v1/mfa/verify-login
```

**Request Body**

```json
{
  "code": "123456",
  "email": "john@example.com"
}
```

**Response** `200 OK`

```json
{
  "message": "verified and login successfully",
  "user": { ... }
}
```

> Cookies `accessToken` and `refreshToken` are set on successful verification.

---

### 📋 Session Endpoints

> All session endpoints require authentication (JWT Cookie).

#### Get Current Session

```http
GET /api/v1/session
```

**Auth Required**: Yes (JWT Cookie)

**Response** `200 OK`

```json
{
  "message": "Session retrieved successfully",
  "user": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "isEmailVerified": true,
    "userPreferences": {
      "enable2FA": false
    },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

#### Get All Sessions

```http
GET /api/v1/session/all
```

**Auth Required**: Yes (JWT Cookie)

**Response** `200 OK`

```json
{
  "message": "Retrieved all session successfully",
  "sessions": [
    {
      "_id": "...",
      "userId": "...",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "...",
      "expiresAt": "...",
      "isCurrent": true
    },
    {
      "_id": "...",
      "userId": "...",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "...",
      "expiresAt": "..."
    }
  ]
}
```

---

#### Delete Session

```http
DELETE /api/v1/session/:id
```

**Auth Required**: Yes (JWT Cookie)

**URL Parameters**

- `id` - Session ID to delete

**Response** `200 OK`

```json
{
  "message": "Session deleted successfully"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "message": "Error description",
  "errorCode": "ERROR_CODE"
}
```

### Common HTTP Status Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found
- `500` - Internal Server Error

---

## Testing with Postman

1. Import the API endpoints into Postman
2. Set the base URL to the deployed API or `http://localhost:8000`
3. For authenticated endpoints, make sure to:
   - First login to get the cookies
   - Enable "Include cookies" in Postman settings

### Postman Tips

- Create an environment with `baseUrl` variable
- Use Postman's cookie jar to manage authentication cookies
- The cookies are automatically sent with subsequent requests

---

## 🔗 Related

- [Client Documentation](../client/README.md)
- [Project Overview](../README.md)
