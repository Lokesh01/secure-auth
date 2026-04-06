# Architecture.md - Secure Auth Application Flow Guide

This comprehensive guide covers the entire authentication system flow from top to bottom. Perfect for interview revision.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Models](#database-models)
3. [Authentication Flow](#authentication-flow)
4. [OAuth Authentication](#oauth-authentication)
5. [Multi-Factor Authentication (MFA)](#multi-factor-authentication-mfa)
6. [Session Management](#session-management)
7. [Password Management](#password-management)
8. [Token Management](#token-management)
9. [Security Features](#security-features)
10. [API Endpoints Summary](#api-endpoints-summary)
11. [Frontend Architecture](#frontend-architecture)
12. [Key Interview Points](#key-interview-points)

---

## Architecture Overview

### Tech Stack

- **Backend**: Node.js, Express, TypeScript, MongoDB (Mongoose)
- **Frontend**: Next.js 14 (App Router), React, TanStack Query
- **Authentication**: JWT (Access + Refresh tokens), TOTP for MFA, OAuth 2.0 (Google + GitHub)
- **Email**: Nodemailer (Brevo in production, Ethereal in development)
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
  name: string;                    // Required
  email: string;                   // Required, Unique
  password?: string;               // Optional — null for OAuth users
  googleId?: string;               // Google OAuth ID
  githubId?: string;               // GitHub OAuth ID
  avatar?: string;                 // Profile picture from OAuth provider
  authProvider: 'local' | 'google' | 'github';  // How user signed up
  isEmailVerified: boolean;        // Always true for OAuth users
  userPreferences: {
    enable2FA: boolean;            // Default: false
    emailNotifications: boolean;  // Default: true
    twoFactorSecret?: string;      // TOTP secret (hidden in responses)
  }
  createdAt: Date;
  updatedAt: Date;
}
```

**Key Features:**

- Password hashing via Mongoose pre-save hook (only runs if password exists)
- `comparePassword()` method for authentication
- `toJSON` transform removes sensitive fields (password, 2FA secret)
- OAuth users have no password — `authProvider` tracks how they signed up
- `isEmailVerified` automatically true for OAuth users (provider already verified)

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
- Deleting session revokes the associated refresh token

**Note:** Deleting a session immediately invalidates the associated refresh token since refresh token validation requires a DB session lookup.

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
Start MongoDB transaction
↓
Create user (password hashed automatically via pre-save hook)
↓
Generate verification code (UUID)
↓
Send verification email via Nodemailer
↓
If email fails → abortTransaction() → rollback user + verification code
↓
If email succeeds → commitTransaction()
↓
Return success response (201)
```

**Key Points:**

- Password is hashed before saving (Mongoose pre-save middleware)
- Verification code expires in 45 minutes
- Email verification is mandatory before full account access
- MongoDB transaction ensures no partial writes if email fails
- In production, emails are sent via Brevo SMTP API
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
Check if user signed up with OAuth → return helpful error if true
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
- MFA works for both local and OAuth users

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

## OAuth Authentication

### OAuth 2.0 Overview

This app implements **OAuth 2.0 Authorization Code Flow** with **OpenID Connect (OIDC)** for Google and GitHub login.

OAuth 2.0 roles in this app:
Resource Owner     → the user (person logging in)
Client             → Secure Auth (your Express backend)
Authorization Server → Google/GitHub (handles login + issues tokens)
Resource Server    → Google/GitHub API (holds user profile data)

### 1. Google/GitHub Login Flow

```
User clicks "Login with Google/GitHub"
↓
GET /api/v1/auth/google (or /github)
↓
Passport builds OAuth redirect URL with:

client_id
redirect_uri
scope (profile, email)
state (random CSRF token)
response_type=code
↓
Browser redirects to Google/GitHub consent screen
↓
User approves
↓
Google/GitHub redirects to callback with auth code + state
↓
GET /api/v1/auth/google/callback
↓
Passport verifies state (CSRF check)
↓
Passport exchanges auth code for access token (server side)
↓
Passport fetches user profile from Google/GitHub API
↓
Your strategy callback fires with profile
↓
Find or create user in MongoDB
↓
oauthCallback controller fires
↓
oauthLogin service creates session + signs JWT tokens
↓
setAuthenticationCookies sets httpOnly cookies
↓
Redirect to frontend /home ✅
```

### 2. Find or Create User Logic (Strategy Callback)

```
Strategy receives profile from Google/GitHub
↓
Step 1: Search by googleId/githubId first
(handles email change case)
↓
Found → return existing user ✅
Step 2: Search by email
(auto-link case — user already has local account)
↓
Found → link OAuth ID to existing account
update avatar if not set
set isEmailVerified = true
save → return user ✅
Step 3: No user found anywhere
↓
Create new user:

name, email, avatar from OAuth profile
googleId/githubId set
authProvider: 'google' or 'github'
isEmailVerified: true (provider already verified)
password: null
↓
Return new user ✅
```

### 3. OAuth Edge Cases Handled

**OAuth user tries email/password login:**
```
user.password === null
↓
throw BadRequestException:
"This account was created using Google/GitHub.
Please login with Google/GitHub instead."
errorCode: AUTH_WRONG_PROVIDER
```

**Same email exists on OAuth signup (auto-link):**
```
User has local account with <lokesh@gmail.com>
Tries "Login with Google" using same email
↓
Strategy finds user by email
Links googleId to existing account
User can now login with BOTH email/password AND Google ✅
```

**OAuth user tries forgot password:**
```
user.authProvider !== 'local'
↓
throw BadRequestException:
"This account uses Google/GitHub to login.
Password reset is not available."
errorCode: AUTH_WRONG_PROVIDER
```

**GitHub email is private/null:**
```
profile.emails?.[0]?.value === undefined
↓
return done(null, false, {
message: 'Please make your GitHub email public to continue'
})
↓
failureRedirect → /login?error=oauth_failed
```

**User changes their OAuth email:**
```
Strategy searches by googleId/githubId FIRST
↓
Found by ID even if email changed ✅
Email change doesn't create duplicate account
```

**OAuth provider is down:**
```
passport.authenticate failureRedirect fires
↓
Redirect to /login?error=oauth_failed
↓
Frontend shows error message to user
```

### 4. OAuth API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/google` | Initiate Google OAuth |
| GET | `/api/v1/auth/google/callback` | Google OAuth callback |
| GET | `/api/v1/auth/github` | Initiate GitHub OAuth |
| GET | `/api/v1/auth/github/callback` | GitHub OAuth callback |

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
Find user by email
↓
Check if user signed up with OAuth → return error if true
↓
Check rate limit: max 3 requests per 10 minutes
↓
Generate verification code (1 hour expiry)
↓
Send password reset email via Nodemailer
↓
If email fails → delete verification code (rollback)
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
  secure: true,
  sameSite: 'none',    // required for cross-origin (Vercel + Render)
  maxAge: 15 * 60 * 1000
}

// Refresh Token Cookie
{
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  maxAge: 30 * 24 * 60 * 60 * 1000
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

### How Deleting Session Revokes Refresh Token

```
refreshToken JWT contains sessionId: "abc123"
↓
User deletes session "abc123" from MongoDB
↓
Hacker tries to use refreshToken
↓
Server verifies JWT signature ✅ (still cryptographically valid)
↓
Server looks up sessionId "abc123" in MongoDB
↓
session = null (deleted)
↓
throw UnauthorizedException('Session does not exist') ✅
↓
Hacker cannot get new accessTokens ✅
```
This is why storing sessions in MongoDB matters — it makes refresh tokens revocable even though they are JWTs.

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

### 8. OAuth Security

- **Authorization Code Flow** — auth code exchanged server-side, client_secret never exposed
- **State parameter** — prevents CSRF attacks during OAuth flow
- **session: false** — Passport does not use its own session system
- **Provider ID first** — searches by googleId/githubId before email to handle email changes
- **failureRedirect** — graceful handling when OAuth provider is down

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
| GET | `/api/v1/auth/google` | Initiate Google OAuth |
| GET | `/api/v1/auth/google/callback` | Google OAuth callback |
| GET | `/api/v1/auth/github` | Initiate GitHub OAuth |
| GET | `/api/v1/auth/github/callback` | GitHub OAuth callback |

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
// withCredentials: true for cross-origin cookies
// Auto-refresh on 401 AUTH_TOKEN_NOT_FOUND
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

### OAuth Frontend Flow

```
User clicks "Login with Google/GitHub" button
       ↓
window.location.href = `${API_URL}/auth/google`
       ↓
Full browser redirect (not axios — OAuth requires real redirect)
       ↓
Google/GitHub handles auth
       ↓
Backend sets cookies + redirects to /home
       ↓
Frontend useAuth fires → user loaded ✅
```

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

- Acts as a universal email client that works with any transport
- In development, Ethereal intercepts emails locally with no real sending
- In production, uses Brevo's API transport since free hosting platforms
  like Render block outbound SMTP ports
- Keeps the sendEmail interface consistent across environments — only the
  underlying transport changes, no application code changes needed when
  switching email providers

### 10. How do you handle partial database writes when email sending fails?

In the register flow we use MongoDB transactions — if the email fails,
abortTransaction() automatically rolls back both the user and verification
code creation. In the forgotPassword flow we manually delete the verification
code if the email fails since only one document is involved and a full
transaction would be unnecessary overhead

**Q: How does deleting a session revoke the refresh token?**
A: The refresh token JWT contains a sessionId. Every call to /auth/refresh looks up that sessionId in MongoDB. If the session is deleted, the lookup returns null and the request is rejected. The JWT itself is still cryptographically valid but is useless without the corresponding DB session.

### 12. What is OAuth 2.0 and how did you implement it?

- OAuth 2.0 is an authorization framework that allows users to grant apps
  limited access to their accounts on other services without sharing passwords
- Implemented Authorization Code Flow — the most secure flow where the
  auth code is exchanged server-side using the client secret
- Used OpenID Connect (OIDC) on top of OAuth 2.0 to get user identity
  (name, email, avatar) via the id_token
- Passport.js abstracts the OAuth handshake — your strategy callback just
  receives the final user profile
- Your own JWT session system sits on top — OAuth just verifies identity,
  your app manages its own sessions

### 13. What OAuth edge cases did you handle?

- **OAuth user tries email/password login**: Detected via null password, returns provider-specific error
- **Same email on OAuth signup**: Auto-links OAuth provider to existing account
- **OAuth user tries forgot password**: Blocked with helpful error message
- **GitHub private email**: Returns error asking user to make email public
- **User changes OAuth email**: Strategy searches by provider ID first, not email
- **OAuth provider down**: failureRedirect sends user to login with error query param

### 14. What is the difference between OAuth 2.0 and OpenID Connect?

- OAuth 2.0 is about authorization — "what can this app do on your behalf"
- OpenID Connect (OIDC) is about authentication — "who is this user"
- OIDC is a layer on top of OAuth 2.0 that adds an id_token (JWT) containing user info
- When you use "Login with Google" you are using OIDC, not just OAuth 2.0
- The scope: ['profile', 'email'] you pass is an OIDC scope

### 15. Why session: false in Passport OAuth strategies?

- By default Passport tries to serialize/deserialize user into HTTP session
- Your app has its own session system (MongoDB + JWT cookies)
- session: false tells Passport to skip its built-in session management entirely
- Without it you'd get "Failed to serialize user into session" error since
  serializeUser() was never defined

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

SMTP_USER=your@gmail.com
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your@gmail.com

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

GITHUB_CLIENT_ID=your_dev_github_client_id
GITHUB_CLIENT_SECRET=your_dev_github_client_secret
GITHUB_CLIENT_ID_PROD=your_prod_github_client_id
GITHUB_CLIENT_SECRET_PROD=your_prod_github_client_secret
```

### Client (.env)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
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
A: We send a password reset email with a unique verification code. The code expires in 1 hour and can only be used once. Upon password reset, we invalidate all existing sessions for security. OAuth users are blocked from this flow since they have no password.

**Q: How do you handle sessions across multiple devices?**
A: Each login creates a new session in MongoDB. Users can view and manage all their sessions from the sessions page, including revoking sessions from other devices.

**Q: Why use HTTP-only cookies instead of localStorage?**
A: HTTP-only cookies cannot be accessed by JavaScript, preventing XSS attacks from stealing tokens. They also automatically get sent with requests, simplifying the code.

**Q: What is the purpose of the verification code system?**
A: Verification codes confirm user ownership of the email address. They have short expiration times (45 min - 1 hour) and can only be used once, providing a secure way to verify identity for email and password reset flows.

**Q: Why did you choose Nodemailer over a third-party email service like Resend?**
A: Nodemailer acts as a universal email client that works with any transport —
in development it uses Ethereal to intercept emails locally with no real sending,
and in production it uses Brevo's API transport since free hosting platforms like
Render block outbound SMTP ports. This approach keeps the sendEmail interface
consistent across environments while swapping only the underlying transport,
meaning no application code changes are needed when switching email providers.

**Q: If a hacker gets the access token can they stay logged in forever?**
A: No. The access token expires in 15 minutes and the hacker cannot refresh it because the refresh token is stored in an httpOnly cookie which JavaScript cannot read. Only the legitimate user's browser can send the refresh token. After 15 minutes the hacker is locked out automatically.

**Q: How did you implement OAuth and what edge cases did you handle?**
A: Implemented OAuth 2.0 Authorization Code Flow with OpenID Connect for Google and GitHub using Passport.js. Edge cases handled include: OAuth users trying email/password login (detected via null password), same email existing on OAuth signup (auto-linked to existing account), OAuth users trying forgot password (blocked with helpful error), GitHub private email (user prompted to make email public), user changing their OAuth email (search by provider ID first not email), and OAuth provider being down (graceful failureRedirect).

---

*Last Updated: April 2026*
*For Secure Auth v2.0*
