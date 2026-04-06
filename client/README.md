# Secure Auth - Client

The frontend application for Secure Auth, built with Next.js 14 and modern React patterns.

## 🛠️ Tech Stack

### Core

- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript

### Styling

- **TailwindCSS** - Utility-first CSS framework
- **tailwindcss-animate** - Animation utilities
- **class-variance-authority** - Component variant management
- **clsx & tailwind-merge** - Conditional class utilities

### UI Components

- **shadcn/ui** - Beautiful, accessible components built on Radix UI (new-york style)
  - Button, Input, Dialog, Dropdown Menu, Toast, Tooltip, Avatar, Label, Form, Sheet, Sidebar, Skeleton
- **Lucide React** - Icon library (integrated with shadcn/ui)
- **input-otp** - OTP input component for MFA

### State & Data

- **TanStack React Query** - Server state management
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Axios** - HTTP client

### Utilities

- **date-fns** - Date manipulation
- **ua-parser-js** - User agent parsing for session info
- **next-themes** - Dark mode support

## 📁 Project Structure

```
client/
├── app/
│   ├── (auth)/                    # Auth pages (public)
│   │   ├── page.tsx               # Login page
│   │   ├── signup/                # Registration
│   │   ├── confirm-account/       # Email verification
│   │   ├── forgot-password/       # Password reset request
│   │   ├── reset-password/        # Password reset form
│   │   └── verify-mfa/            # MFA verification during login
│   ├── (main)/                    # Protected pages
│   │   ├── home/                  # Dashboard
│   │   ├── sessions/              # Session management
│   │   └── _components/           # Shared components
│   │       ├── Asidebar.tsx       # Sidebar navigation
│   │       ├── EnableMFA.tsx      # MFA setup component
│   │       ├── Sessions.tsx       # Sessions list
│   │       └── _common/           # Common components
│   ├── layout.tsx                 # Root layout
│   └── globals.css                # Global styles
├── components/                    # Shared UI components
│   └── ui/                        # shadcn/ui components
├── context/                       # React contexts
├── hooks/                         # Custom hooks
├── lib/                           # Utility functions
├── middleware.ts                  # Next.js middleware (auth protection)
└── package.json
```

## ✨ Features

### Authentication

- User registration with email verification
- Login with email/password
- **OAuth 2.0 login with Google and GitHub**
- **Account auto-linking** — existing accounts are linked when OAuth email matches
- JWT-based authentication with HTTP-only cookies
- Automatic token refresh
- Protected routes via middleware

### Two-Factor Authentication

- TOTP-based 2FA setup
- QR code generation for authenticator apps
- 6-digit code verification
- Enable/disable MFA from dashboard

### Session Management

- View all active sessions
- Session details (device, browser, location)
- Current session indicator
- Revoke individual sessions

### User Experience

- Responsive design
- Dark mode support
- Toast notifications
- Form validation with helpful error messages
- Loading states
- **OAuth error handling** — graceful fallback if Google/GitHub login fails

## 🚀 Getting Started

### Prerequisites

- Node.js 21.0.0
- Backend server running

### Installation

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment**

```bash
cp .env.example .env
```

Update `.env`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

**3. Start development server**

```bash
npm run dev
```

**4. Open browser**

Navigate to <http://localhost:3000>

## 📜 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🔗 Related

- [Server Documentation](../server/README.md)
- [Project Overview](../README.md)
