# WARP.md - Secure Auth Application Flow Guide

This comprehensive guide covers the entire authentication system flow from top to bottom. Perfect for interview revision.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Models](#database-models)
3. [Authentication Flow](#authentication-flow)
4. [Multi-Factor Authentication (MFA)](#multi-factor-authentication-mfa)
5. [Session Management](#session-management)
6. [Password Management](#password-management)
7. [Token Management](#token-management)
8. [Security Features](#security-features)
9. [API Endpoints Summary](#api-endpoints-summary)
10. [Frontend Architecture](#frontend-architecture)
11. [Key Interview Points](#key-interview-points)

---

## Architecture Overview

### Tech Stack

- **Backend**: Node.js, Express, TypeScript, MongoDB (Mongoose)
- **Frontend**: Next.js 14 (App Router), React, TanStack Query
- **Authentication**: JWT (Access + Refresh tokens), TOTP for MFA
- **Email**: Nodemailer (Gmail SMTP)
- **Password Hashing**: bcrypt

### Project Structure (Monorepo)

```
secure-auth/
├── server/              # Express API
│   └── src/
│       ├── modules/    # Feature modules (auth, mfa, session, user)
│       ├── database/   # Mongoose models
│       ├── common/     # Utils, validators, strategies
│       ├── middlewares/
│       └── mailers/
├── client/             # Next.js Frontend
│   ├── app/           # App Router pages
│   ├── components/    # UI components
│   ├── context/       # React Context (Auth, Theme, Query)
│   ├── hooks/         # Custom hooks
│   └── lib/           # API client, utilities
```

---

## Database Models

### User Model (`server/src/database/models/user.model.ts`)

```typescript
{
  name: string;           // Required
  email: string;         // Required, Unique
  password: string;      // Hashed with bcrypt
  isEmailVerified: boolean;  // Default: false
  userPreferences: {
    enable2FA: boolean;              // Default: false
    emailNotifications: boolean;    // Default: true
    twoFactorSecret?: string;        // TOTP secret (hidden in responses)
  }
  createdAt: Date;
  updatedAt: Date;
}
```

**Key Features:**

- Password hashing via Mongoose pre-save hook
- `comparePassword()` method for authentication
- `toJSON` transform removes sensitive fields (password, 2FA secret)

### Session Model (`server/src/database/models/session.model.ts`)

```typescript
{
  userId: ObjectId;      // Reference to User
  userAgent?: string;    // Browser/device info
  expiredAt: Date;       // Default: 30 days from now
  createdAt: Date;
}
```

**Key Features:**

- Tracks user sessions across devices
- Enables session revocation
- Supports multiple concurrent sessions per user

### Verification Model (`server/src/database/models/verification.model.ts`)

```typescript
{
  userId: ObjectId;      // Reference to User
  code: string;         // Unique verification code
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
  expiresAt: Date;      // 45 min for email, 1 hour for password reset
  createdAt: Date;
}
```

---

## Authentication Flow

### 1. Registration Flow

```
User fills form → Validate input (Zod) → Check if user exists
    ↓
Create user (password hashed automatically via pre-save hook)
    ↓
Generate verification code (UUID)
    ↓
Send verification email via Nodemailer
    ↓
Return success response (201)
```

**Key Points:**

- Password is hashed before saving (Mongoose pre-save middleware)
- Verification code expires in 45 minutes
- Email verification is mandatory before full account access
- In development, emails are intercepted by Ethereal (check terminal for preview URL)

**API Endpoint:** `POST /api/v1/auth/register`

```json
Request: { "name": "John", "email": "john@example.com", "password": "secure123", "confirmPassword": "secure123" }
Response: { "message": "User registered successfully", "data": { /* user object */ } }
```

---

### 2. Email Verification Flow

```
User clicks email link → Enter code on frontend
    ↓
Backend validates code (exists, not expired, correct type)
    ↓
Update user.isEmailVerified = true
    ↓
Delete verification code (one-time use)
    ↓
Return success response
```

**API Endpoint:** `POST /api/v1/auth/verify/email`

```json
Request: { "code": "abc123xyz" }
Response: { "message": "Email verified successfully" }
```

---

### 3. Login Flow (Without MFA)

```
User enters email + password
    ↓
Find user by email
    ↓
Compare password (bcrypt)
    ↓
Create session in MongoDB
    ↓
Generate JWT access token (15 min) + refresh token (30 days)
    ↓
Set HTTP-only cookies (accessToken, refreshToken)
    ↓
Return user data + success message
```

**API Endpoint:** `POST /api/v1/auth/login`

```json
Request: { "email": "john@example.com", "password": "secure123" }
Response: { "message": "Login successful", "user": { /* user data */ }, "mfaRequired": false }
Cookies: accessToken (15 min), refreshToken (30 days)
```

---

### 4. Login Flow (With MFA Enabled)

```
User enters email + password
    ↓
Find user and validate password
    ↓
Check user.userPreferences.enable2FA === true
    ↓
Return MFA required response (WITHOUT setting tokens)
    ↓
User redirected to MFA verification page
    ↓
User enters TOTP code from authenticator app
    ↓
Verify code against stored secret (speakeasy)
    ↓
Create session + Generate tokens
    ↓
Set cookies + Return user data
```

**Key Points:**

- Access tokens are NOT set until MFA is verified
- This prevents unauthorized access even if password is compromised

---

### 5. Logout Flow

```
User clicks logout
    ↓
Extract sessionId from JWT payload (via Passport)
    ↓
Delete session from MongoDB
    ↓
Clear authentication cookies
    ↓
Return success response
```

**API Endpoint:** `POST /api/v1/auth/logout` (Requires JWT)

---

### 6. Token Refresh Flow

```
Access token expires → Frontend calls refresh endpoint
    ↓
Extract refreshToken from cookie
    ↓
Verify refreshToken (validate signature, expiration)
    ↓
Find session in MongoDB
    ↓
Check session not expired
    ↓
If session expires within 24h → extend session + rotate refresh token
    ↓
Generate new access token (15 min)
    ↓
Return new accessToken (and new refreshToken if rotated)
```

**API Endpoint:** `GET /api/v1/auth/refresh`

**Key Points:**

- Access token: 15 minutes expiry
- Refresh token: 30 days expiry
- Token rotation: New refresh token issued if current one expires within 24h
- Session auto-extends on refresh

---

## Multi-Factor Authentication (MFA)

### 1. MFA Setup Flow (Enable 2FA)

```
User logged in → Navigate to enable MFA
    ↓
Call GET /api/v1/mfa/setup (requires JWT)
    ↓
Check if MFA already enabled → return if yes
    ↓
Generate TOTP secret (speakeasy.generateSecret)
    ↓
Store secret in user.userPreferences.twoFactorSecret
    ↓
Generate QR code URL (otpauth://)
    ↓
Convert to QR image (qrcode.toDataURL)
    ↓
Return secret + QR image to frontend
    ↓
User scans QR with authenticator app (Google Auth, Authy, etc.)
    ↓
User enters 6-digit code from app
    ↓
Call POST /api/v1/mfa/verify
    ↓
Verify code against secret (speakeasy.totp.verify)
    ↓
If valid: set user.userPreferences.enable2FA = true
    ↓
Return success
```

**API Endpoints:**

- `GET /api/v1/mfa/setup` - Generate secret + QR code
- `POST /api/v1/mfa/verify` - Verify and enable MFA

---

### 2. MFA Login Verification Flow

```
Login with email + password → MFA required response
    ↓
User enters TOTP code
    ↓
Call POST /api/v1/mfa/verify-login
    ↓
Find user by email
    ↓
Verify code against stored secret
    ↓
Create session + Generate tokens
    ↓
Set cookies + Return user data
```

**API Endpoint:** `POST /api/v1/mfa/verify-login`

```json
Request: { "code": "123456", "email": "john@example.com" }
Response: { "message": "verified and login successfully", "user": { /* user data */ } }
```

---

### 3. MFA Revocation Flow (Disable 2FA)

```
User wants to disable MFA
    ↓
Call PUT /api/v1/mfa/revoke (requires JWT)
    ↓
Set user.userPreferences.twoFactorSecret = undefined
    ↓
Set user.userPreferences.enable2FA = false
    ↓
Return success
```

**API Endpoint:** `PUT /api/v1/mfa/revoke` (Requires JWT)

---

## Session Management

### 1. Get Current Session (User Info)

```
Call GET /api/v1/session (requires JWT)
    ↓
Extract userId from JWT payload (via Passport)
    ↓
Fetch user from database
    ↓
Return user data
```

**API Endpoint:** `GET /api/v1/session` (Requires JWT)

---

### 2. Get All Sessions

```
Call GET /api/v1/session/all (requires JWT)
    ↓
Find all sessions for current user
    ↓
Mark current session (compare sessionId with JWT sessionId)
    ↓
Return list of sessions with userAgent, createdAt, expiresAt
```

**API Endpoint:** `GET /api/v1/session/all` (Requires JWT)

```json
Response: {
  "sessions": [
    { "_id": "...", "userAgent": "Mozilla/5.0...", "createdAt": "...", "expiresAt": "...", "isCurrent": true }
  ]
}
```

---

### 3. Delete (Revoke) Session

```
Call DELETE /api/v1/session/:id (requires JWT)
    ↓
Delete session by ID
    ↓
Return success
```

**Note:** User can delete other sessions (logout from other devices)

**API Endpoint:** `DELETE /api/v1/session/:id` (Requires JWT)

---

## Password Management

### 1. Forgot Password Flow

```
User enters email → Click "Forgot Password"
    ↓
Call POST /api/v1/auth/password/forgot
    ↓
Find user by email (silently - don't reveal if user exists)
    ↓
Check rate limit: max 3 requests per 10 minutes
    ↓
Generate verification code (1 hour expiry)
    ↓
Send password reset email via Nodemailer
    ↓
Return success (always - to prevent email enumeration)
```

**Rate Limiting:** 3 attempts per 10 minutes per user

**API Endpoint:** `POST /api/v1/auth/password/forgot`

```json
Request: { "email": "john@example.com" }
Response: { "message": "Password reset email sent successfully" }
```

---

### 2. Reset Password Flow

```
User clicks reset link in email → Enter new password
    ↓
Call POST /api/v1/auth/password/reset
    ↓
Validate verification code (exists, not expired, correct type)
    ↓
Hash new password (bcrypt)
    ↓
Update user password
    ↓
Delete verification code
    ↓
Delete ALL user sessions (force logout everywhere)
    ↓
Clear authentication cookies
    ↓
Return success
```

**Security:** Invalidates all existing sessions on password reset

**API Endpoint:** `POST /api/v1/auth/password/reset`

```json
Request: { "password": "newSecure123", "verificationCode": "abc123" }
Response: { "message": "Reset Password successfully" }
```

---

## Token Management

### JWT Structure

**Access Token (15 min)**

```json
{
  "userId": "user_id",
  "sessionId": "session_id",
  "aud": ["secure-auth"],
  "iat": timestamp,
  "exp": timestamp + 15min
}
```

**Refresh Token (30 days)**

```json
{
  "sessionId": "session_id",
  "aud": ["secure-auth"],
  "iat": timestamp,
  "exp": timestamp + 30days
}
```

### Cookie Configuration

```typescript
// Access Token Cookie
{
  httpOnly: true,
  secure: true (production),
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000  // 15 minutes
}

// Refresh Token Cookie
{
  httpOnly: true,
  secure: true (production),
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000  // 30 days
}
```

### Token Flow Diagram

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client    │         │   Server    │         │  MongoDB    │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  1. Login Request     │                       │
       │──────────────────────>│                       │
       │                       │  2. Validate creds    │
       │                       │──────────────────────>│
       │                       │                       │
       │                       │  3. Create Session    │
       │                       │──────────────────────>│
       │                       │                       │
       │                       │  4. Generate JWTs     │
       │                       │<──────────────────────│
       │                       │                       │
       │  5. Set Cookies      │                       │
       │<──────────────────────│                       │
       │                       │                       │
       │  6. Authenticated     │                       │
       │      Request          │                       │
       │──────────────────────>│                       │
       │                       │  7. Verify JWT        │
       │                       │──────────────────────>│
       │                       │                       │
       │                       │  8. Return Data       │
       │<──────────────────────│                       │
       │                       │                       │
```

---

## Security Features

### 1. Password Security

- **bcrypt** hashing with automatic salting
- Pre-save hook for automatic hashing
- Never stored in plain text

### 2. Token Security

- **HTTP-only cookies**: Cannot be accessed via JavaScript (XSS protection)
- **Short-lived access tokens**: 15 minutes (minimizes damage if compromised)
- **Long-lived refresh tokens**: 30 days (for UX, with rotation)
- **Token rotation**: New refresh token when expiring within 24h

### 3. Session Security

- Sessions stored in database (can be revoked)
- User agent tracking (identify devices)
- Expiration tracking
- Delete all sessions on password reset

### 4. MFA Security

- **TOTP** (Time-based One-Time Password) - industry standard
- Secret stored encrypted in database (hidden in responses)
- QR code for easy setup
- Required before granting access

### 5. Input Validation

- **Zod** schema validation on all inputs
- Sanitization at API boundary
- TypeScript for compile-time safety

### 6. Error Handling

- Custom error classes (AppError)
- Error codes for programmatic handling
- No stack traces in production responses

### 7. Security Headers & CORS

- CORS configured with credentials support
- Environment-based configurations

---

## API Endpoints Summary

### Auth Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login (with optional MFA) |
| POST | `/api/v1/auth/verify/email` | Verify email address |
| POST | `/api/v1/auth/password/forgot` | Request password reset |
| POST | `/api/v1/auth/password/reset` | Reset password |
| GET | `/api/v1/auth/refresh` | Refresh access token |

### Auth Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/logout` | Logout (delete session) |

### MFA Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/mfa/setup` | Generate MFA secret + QR |
| POST | `/api/v1/mfa/verify` | Verify and enable MFA |
| PUT | `/api/v1/mfa/revoke` | Disable MFA |

### MFA Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/mfa/verify-login` | Verify MFA during login |

### Session Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/session` | Get current user |
| GET | `/api/v1/session/all` | Get all sessions |
| DELETE | `/api/v1/session/:id` | Delete specific session |

---

## Frontend Architecture

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **State Management**: React Context + TanStack Query
- **Styling**: Tailwind CSS + shadcn/ui
- **HTTP Client**: Axios

### Key Components

#### Authentication Context (`client/context/auth-provider.tsx`)

```typescript
// Provides user data, loading states, refetch function
// Wraps entire app
// Uses useAuth hook for data fetching
```

#### API Client (`client/lib/api.ts`)

```typescript
// Axios instance with interceptors
// Automatic cookie handling
// Request/response transformations
```

#### Custom Hooks

- `useAuth()` - Fetch current user session
- `useToast()` - Toast notifications

### Route Structure

```
client/app/
├── (auth)/                 # Auth pages (redirect if logged in)
│   ├── login/
│   ├── signup/
│   ├── confirm-account/    # Email verification
│   ├── forgot-password/
│   ├── reset-password/
│   └── verify-mfa/         # MFA verification during login
│
├── (main)/                 # Protected pages (require auth)
│   ├── home/               # Dashboard
│   └── sessions/           # Session management
│
└── layout.tsx              # Root layout with providers
```

### Authentication Flow (Frontend)

1. **Initial Load**: Check if user is authenticated
2. **No Token**: Redirect to login
3. **Has Token**: Fetch user data via `useAuth`
4. **User Loading**: Show loading skeleton
5. **User Loaded**: Show protected content
6. **Token Expired**: Auto-refresh via interceptor

---

## Key Interview Points

### 1. Why use both Access and Refresh tokens?

- **Access token**: Short-lived (15 min) - limits damage if compromised
- **Refresh token**: Long-lived (30 days) - provides seamless UX
- If access token stolen, attacker has limited time
- Refresh token can be rotated/disabled

### 2. Why store sessions in MongoDB?

- Can revoke sessions remotely
- Track login history
- Force logout from all devices
- Prevent token reuse after logout

### 3. Why HTTP-only cookies?

- Prevents XSS attacks (JavaScript cannot read cookies)
- CSRF protection (same-site policy)
- More secure than localStorage

### 4. Why MFA?

- Second layer of defense
- Password compromise doesn't equal account compromise
- TOTP is time-based and single-use

### 5. Password reset security

- Rate limiting prevents abuse
- One-time codes (deleted after use)
- Invalidate all sessions on password change
- Silent failure (same response whether user exists)

### 6. JWT verification process

1. Extract token from cookie
2. Verify signature using JWT_SECRET
3. Verify expiration
4. Verify audience
5. Extract userId and sessionId
6. Validate session exists in DB

### 7. Error handling strategy

- Custom error classes with HTTP status codes
- Error codes for programmatic handling
- User-friendly messages (not technical details)
- Global error handler middleware

### 8. Database indexing

- User: email (unique index)
- Session: userId (index for fast lookups)
- Verification: code + type + expiresAt (compound index)

### 9. Why Nodemailer over a third-party email API?

- No external API dependency or cost
- Full control over email transport (SMTP)
- In development, Ethereal intercepts emails locally with no real sending
- Easy to swap SMTP provider by changing environment variables

---

## Complete Flow Diagrams

### Registration → Email Verification → Login

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │    │ Frontend │    │  Backend │    │ MongoDB  │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │
     │ 1. Submit     │               │               │
     │ registration  │               │               │
     │──────────────>│               │               │
     │               │ 2. POST        │               │
     │               │ /register      │               │
     │               │──────────────>│               │
     │               │               │ 3. Create     │
     │               │               │ user + hash   │
     │               │               │ password      │
     │               │               │──────────────>│
     │               │               │               │
     │               │               │ 4. Generate   │
     │               │               │ verification  │
     │               │               │ code          │
     │               │               │──────────────>│
     │               │               │               │
     │               │               │ 5. Send        │
     │               │               │ verification   │
     │               │               │ email          │
     │               │               │──────────────>│
     │               │               │               │
     │ 6. Success    │               │               │
     │<──────────────│               │               │
     │               │               │               │
     │ 7. Click      │               │               │
     │ verification  │               │               │
     │ link          │               │               │
     │──────────────>│               │               │
     │               │ 8. POST       │               │
     │               │ /verify/email │               │
     │               │──────────────>│               │
     │               │               │ 9. Validate   │
     │               │               │ code + update │
     │               │               │ user          │
     │               │               │──────────────>│
     │               │               │               │
     │ 10. Success  │               │               │
     │<──────────────│               │               │
     │               │               │               │
     │ 11. Login    │               │               │
     │──────────────>│               │               │
     │               │ 12. POST      │               │
     │               │ /login        │               │
     │               │──────────────>│               │
     │               │               │ 13. Validate  │
     │               │               │ credentials   │
     │               │               │──────────────>│
     │               │               │               │
     │               │               │ 14. Create    │
     │               │               │ session       │
     │               │               │──────────────>│
     │               │               │               │
     │               │               │ 15. Generate  │
     │               │               │ JWT tokens    │
     │               │               │<──────────────│
     │               │               │               │
     │               │ 16. Set       │               │
     │               │ cookies       │               │
     │<──────────────│               │               │
     │               │               │               │
     │ 17. Access    │               │               │
     │ granted        │               │               │
```

### Login with MFA

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │    │ Frontend │    │  Backend │    │ MongoDB  │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │
     │ 1. Enter      │               │               │
     │ email +       │               │               │
     │ password      │               │               │
     │──────────────>│               │               │
     │               │ 2. POST       │               │
     │               │ /login        │               │
     │               │──────────────>│               │
     │               │               │ 3. Validate   │
     │               │               │ credentials   │
     │               │               │──────────────>│
     │               │               │               │
     │               │ 4. MFA        │               │
     │               │ required      │               │
     │<──────────────│               │               │
     │               │               │               │
     │ 5. Enter      │               │               │
     │ TOTP code     │               │               │
     │──────────────>│               │               │
     │               │ 6. POST       │               │
     │               │ /mfa/          │               │
     │               │ verify-login  │               │
     │               │──────────────>│               │
     │               │               │ 7. Verify     │
     │               │               │ TOTP code     │
     │               │               │──────────────>│
     │               │               │               │
     │               │               │ 8. Create     │
     │               │               │ session       │
     │               │               │──────────────>│
     │               │               │               │
     │               │               │ 9. Generate   │
     │               │               │ JWT tokens    │
     │               │               │<──────────────│
     │               │               │               │
     │               │ 10. Set      │               │
     │               │ cookies       │               │
     │<──────────────│               │               │
     │               │               │               │
     │ 11. Access    │               │               │
     │ granted        │               │               │
```

---

## Environment Variables

### Server (.env)

```env
PORT=8000
NODE_ENV=development
MONGO_URI=mongodb+srv://...
APP_ORIGIN=http://localhost:3000

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=30d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_16_char_app_password
```

### Client (.env)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## Development Commands

### Server

```bash
cd server
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Run production build
```

### Client

```bash
cd client
npm run dev          # Start development server
npm run build        # Build for production
```

### Root

```bash
npm run lint         # Lint all
npm run format       # Format all
```

---

## Interview Questions Preparation

### Common Questions & Answers

**Q: How do you handle JWT token expiration?**
A: We use short-lived access tokens (15 min) with longer-lived refresh tokens (30 days). The frontend automatically calls the refresh endpoint when the access token expires. The refresh endpoint validates the refresh token, checks the session is still valid, and issues a new access token.

**Q: How do you prevent brute force attacks on login?**
A: While we don't have explicit rate limiting on login, we use secure password hashing (bcrypt) which is computationally expensive. For password reset, we implement rate limiting (3 attempts per 10 minutes).

**Q: How does MFA enhance security?**
A: MFA requires something you know (password) plus something you have (authenticator app). Even if a password is compromised, attackers cannot access the account without the TOTP code.

**Q: What happens when a user forgets their password?**
A: We send a password reset email with a unique verification code. The code expires in 1 hour and can only be used once. Upon password reset, we invalidate all existing sessions for security.

**Q: How do you handle sessions across multiple devices?**
A: Each login creates a new session in MongoDB. Users can view and manage all their sessions from the sessions page, including revoking sessions from other devices.

**Q: Why use HTTP-only cookies instead of localStorage?**
A: HTTP-only cookies cannot be accessed by JavaScript, preventing XSS attacks from stealing tokens. They also automatically get sent with requests, simplifying the code.

**Q: What is the purpose of the verification code system?**
A: Verification codes confirm user ownership of the email address. They have short expiration times (45 min - 1 hour) and can only be used once, providing a secure way to verify identity for email and password reset flows.

**Q: Why did you choose Nodemailer over a third-party email service like Resend?**
A: For a personal project, Nodemailer with Gmail SMTP avoids any external API dependency or cost. In development, Ethereal intercepts all emails locally so no real emails are sent during testing. In production, switching SMTP providers only requires changing environment variables — no code changes needed.

---

*Last Updated: February 2026*
*For Secure Auth v1.0*
