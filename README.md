# BudgetingApp

A cross-platform budgeting application built with **Electron + React + TypeScript** (frontend) and **FastAPI + SQLAlchemy** (backend).

It runs in two modes:

- **Desktop app** — Electron starts a local backend; everything stays on one machine.
- **Self-hosted server** — one always-on server publishes a **web UI** that any
  device on your network or tailnet can use, protected by username/password
  authentication. See **[DEPLOYMENT.md](DEPLOYMENT.md)**.

```bash
# Self-hosted in one command
docker compose up -d --build   # then open http://<server>:8000
```

## Features

### Core Features ✅
- **Account Management**: Multiple accounts (checking, savings, credit cards, cash, investment, loan) with balance tracking
- **Transaction Management**: Income, expenses, and transfers with automatic balance updates
- **Budget Planning**: Flexible budgets (weekly, monthly, quarterly, annual) with rollover support and progress tracking
- **Category System**: Two-level hierarchy with 11 parent categories and 60+ preset subcategories
- **Smart Categorization**: User-defined keyword rules for automatic transaction categorization
- **Bank Import**: Import transactions from CSV, OFX, QFX, and QIF formats with auto-categorization
- **Reports**: Spending by category, income vs expenses, account balances, and balance trends over time
- **Setup Wizard**: Multi-step first-run wizard for easy onboarding
- **Dark Mode**: System-default theme switching with smooth transitions
- **Multi-User Access**: Username/password authentication with administrator and member roles
- **Web UI**: Serve the app from one machine and use it from any browser on your network or tailnet
- **Data Privacy**: All data stored in a local SQLite database you control

### Technical Features
- RESTful API with automatic OpenAPI documentation
- Database migrations with Alembic
- Transaction deduplication via import_id tracking
- Soft delete for accounts and categories with transaction history
- Session-based authentication with bcrypt password hashing and revocable server-side tokens
- Single-process deployment: FastAPI serves both the REST API and the built web UI
- Docker image and Compose file for self-hosting
- CORS middleware for secure Electron-backend communication
- Background backend process management in Electron

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database operations
- **Alembic**: Database migrations
- **SQLite**: Embedded database
- **Pydantic**: Data validation

### Frontend
- **Electron**: Cross-platform desktop framework
- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **Ant Design**: UI component library
- **Redux Toolkit**: State management
- **React Query**: Server state management
- **Recharts**: Data visualization

## Project Structure

```
BudgetingApp/
├── backend/                   # Python FastAPI application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI app entry, auth gating & web UI serving
│   │   ├── config.py         # Environment-driven settings (BUDGET_* variables)
│   │   ├── auth.py           # Password hashing, session tokens & dependencies
│   │   ├── cli.py            # User administration CLI
│   │   ├── database.py       # SQLAlchemy database connection
│   │   ├── models/           # SQLAlchemy ORM models
│   │   │   ├── account.py    # Account model with types
│   │   │   ├── category.py   # Two-level category hierarchy
│   │   │   ├── transaction.py # Transaction with type enum
│   │   │   ├── budget.py     # Budget with period types
│   │   │   ├── user.py       # User & session models
│   │   │   └── category_keyword.py # Auto-categorization rules
│   │   ├── schemas/          # Pydantic validation schemas
│   │   │   ├── account.py
│   │   │   ├── category.py
│   │   │   ├── transaction.py
│   │   │   ├── budget.py
│   │   │   ├── category_keyword.py
│   │   │   └── setup.py
│   │   ├── api/              # API route handlers
│   │   │   ├── setup.py      # Setup wizard endpoints
│   │   │   ├── accounts.py   # Account CRUD
│   │   │   ├── transactions.py # Transaction management
│   │   │   ├── categories.py # Category management
│   │   │   ├── budgets.py    # Budget CRUD & progress
│   │   │   ├── keywords.py   # Categorization keywords
│   │   │   ├── imports.py    # Bank file import (CSV/OFX/QFX/QIF)
│   │   │   └── reports.py    # Analytics endpoints
│   │   └── seed/             # Seed data
│   │       └── categories.py # 60+ preset categories
│   ├── alembic/              # Database migrations
│   │   ├── env.py
│   │   └── versions/         # Migration files
│   │       └── 001_add_category_keywords.py
│   ├── requirements.txt      # Python dependencies
│   ├── backend_entry.py      # Production entry point
│   ├── build_backend.py      # PyInstaller build script
│   └── backend.spec          # PyInstaller spec file
├── frontend/                  # Electron + React application
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── main/             # Electron main process
│   │   │   ├── main.js       # Window & lifecycle management
│   │   │   ├── preload.js    # Secure IPC bridge
│   │   │   ├── config.js     # Persisted remote server URL
│   │   │   └── backend.js    # Backend process manager
│   │   ├── renderer/         # React application
│   │   │   ├── components/   # Reusable components
│   │   │   │   ├── ServerSettings.tsx
│   │   │   │   └── Layout/
│   │   │   │       └── MainLayout.tsx
│   │   │   ├── contexts/     # React contexts
│   │   │   │   └── AuthContext.tsx
│   │   │   ├── pages/        # Page components
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── CreateAdmin.tsx
│   │   │   │   ├── Users.tsx
│   │   │   │   ├── SetupWizard.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Accounts.tsx
│   │   │   │   ├── Transactions.tsx
│   │   │   │   ├── Budgets.tsx
│   │   │   │   ├── Categories.tsx
│   │   │   │   └── Reports.tsx
│   │   │   ├── store/        # Redux Toolkit
│   │   │   │   ├── index.ts
│   │   │   │   └── slices/   # Redux slices
│   │   │   ├── api/          # API client (Axios)
│   │   │   │   └── client.ts
│   │   │   ├── App.tsx
│   │   │   └── index.tsx
│   │   └── shared/           # Shared TypeScript types
│   │       └── types.ts
│   ├── build/                # Production React build
│   ├── assets/               # Icons & images
│   ├── package.json          # Node dependencies & scripts
│   └── tsconfig.json         # TypeScript configuration
├── Dockerfile                # Multi-stage image (web UI build + API runtime)
├── docker-compose.yml        # Self-hosted deployment
├── .env.example              # Annotated server configuration
├── BUILD.md                  # Production build guide
├── DEPLOYMENT.md             # Self-hosting, Tailscale & authentication
├── DEVELOPMENT.md            # Development setup & architecture
├── QUICKSTART.md             # Quick start guide
└── README.md                 # This file
```

## Quick Start

See [QUICKSTART.md](QUICKSTART.md) for a detailed 5-minute setup guide, or
[DEPLOYMENT.md](DEPLOYMENT.md) to self-host the server with a web UI.

### Self-Hosted Server (web UI)

```bash
docker compose up -d --build
```

Open `http://<server>:8000`, create the first administrator account, and you are
done. For tailnet-only access and HTTPS via `tailscale serve`, see
[DEPLOYMENT.md](DEPLOYMENT.md).

### Prerequisites
- **Python 3.9+** (3.11+ recommended)
- **Node.js 18+**
- **npm** (comes with Node.js)

### Development Setup

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run electron-dev
```

The Electron app will launch automatically and connect to the backend at `http://localhost:8000`. On first run, you'll see the account creation screen, then the Setup Wizard.

To point the desktop app at a self-hosted server instead of a local backend, use
**Server settings** on the sign-in screen, or launch it with
`BUDGETAPP_SERVER_URL=https://budget.your-tailnet.ts.net npm run electron`.

### API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## Building for Production

See [BUILD.md](BUILD.md) for detailed build instructions.

**Quick Build:**
```bash
cd frontend

# Build backend + frontend + package for current platform
npm run dist

# Platform-specific builds
npm run dist-win    # Windows installer
npm run dist-mac    # macOS DMG
npm run dist-linux  # Linux AppImage & .deb
```

Output will be in `frontend/dist/`:
- **Windows**: `BudgetingApp Setup x.x.x.exe`
- **macOS**: `BudgetingApp-x.x.x.dmg`
- **Linux**: `BudgetingApp-x.x.x.AppImage`

## Database Schema

### Tables
- **accounts**: Financial accounts with types (checking, savings, credit card, cash, investment, loan)
- **categories**: Two-level hierarchy (parent → child) for income and expenses
- **category_keywords**: User-defined rules for automatic transaction categorization
- **transactions**: Income, expense, and transfer transactions with automatic balance updates
- **budgets**: Budget tracking with multiple period types and rollover support

### Database Location
- **Development**: `backend/budget.db`
- **Production**:
  - Windows: `%APPDATA%\BudgetingApp\budget.db`
  - macOS: `~/Library/Application Support/BudgetingApp/budget.db`
  - Linux: `~/.config/BudgetingApp/budget.db`

## API Endpoints

All `/api/*` endpoints require authentication except those under `/api/auth`.
Browsers authenticate with the session cookie; other clients send
`Authorization: Bearer <token>`.

### Authentication
- `GET /api/auth/bootstrap-status` - Check whether the first admin still needs creating
- `POST /api/auth/bootstrap` - Create the first administrator (only while no users exist)
- `POST /api/auth/login` - Sign in with username and password
- `POST /api/auth/logout` - Revoke the current session
- `GET /api/auth/me` - Current user
- `POST /api/auth/change-password` - Change your own password
- `GET /api/auth/sessions` - List your active sessions
- `DELETE /api/auth/sessions/{id}` - Revoke one of your sessions
- `GET /api/auth/users` - List users (admin)
- `POST /api/auth/users` - Create user (admin)
- `PATCH /api/auth/users/{id}` - Update user (admin)
- `DELETE /api/auth/users/{id}` - Delete user (admin)

### Setup & Health
- `GET /health` - Backend health check (public)
- `GET /api/setup/status` - Check if app is initialized
- `POST /api/setup/initialize` - Initialize app with setup data

### Accounts
- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create account
- `GET /api/accounts/{id}` - Get account details
- `PUT /api/accounts/{id}` - Update account
- `DELETE /api/accounts/{id}` - Soft delete account

### Transactions
- `GET /api/transactions` - List with filters (account, category, date range, search)
- `POST /api/transactions` - Create transaction (auto-updates balances)
- `GET /api/transactions/{id}` - Get transaction details
- `PUT /api/transactions/{id}` - Update transaction
- `DELETE /api/transactions/{id}` - Delete transaction (reverses balances)

### Categories
- `GET /api/categories` - List with hierarchy (parent → children)
- `POST /api/categories` - Create custom category
- `GET /api/categories/{id}` - Get category details
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Soft delete category

### Keywords (Auto-Categorization)
- `GET /api/keywords` - List categorization rules
- `POST /api/keywords` - Create keyword rule
- `POST /api/keywords/bulk` - Create multiple rules
- `POST /api/keywords/test` - Test keyword against text
- `PUT /api/keywords/{id}` - Update rule
- `DELETE /api/keywords/{id}` - Delete rule

### Budgets
- `GET /api/budgets` - List budgets
- `GET /api/budgets/progress` - Get budgets with spending progress
- `POST /api/budgets` - Create budget
- `GET /api/budgets/{id}` - Get budget details
- `PUT /api/budgets/{id}` - Update budget
- `DELETE /api/budgets/{id}` - Delete budget

### Import
- `POST /api/import/preview` - Preview transactions from file (CSV/OFX/QFX/QIF)
- `POST /api/import/import` - Import transactions with auto-categorization
- `GET /api/import/formats` - Get supported file formats

### Reports
- `GET /api/reports/spending-by-category` - Category breakdown
- `GET /api/reports/income-vs-expenses` - Income/expense comparison
- `GET /api/reports/account-balances` - Current balances & net worth
- `GET /api/reports/balance-trend` - Account balance over time

## Project Documentation

- **[QUICKSTART.md](QUICKSTART.md)**: Quick 5-minute setup guide
- **[DEPLOYMENT.md](DEPLOYMENT.md)**: Self-hosting with Docker, Tailscale and authentication
- **[DEVELOPMENT.md](DEVELOPMENT.md)**: Detailed development guide with architecture
- **[BUILD.md](BUILD.md)**: Production build & distribution guide

## Technology Stack Highlights

### Backend Dependencies
- FastAPI 0.115+ - Modern async web framework
- SQLAlchemy 2.0+ - ORM with type hints
- Alembic 1.14+ - Database migrations
- Pydantic 2.10+ - Data validation
- ofxparse - OFX/QFX file parsing
- pandas - Data manipulation for imports
- reportlab & weasyprint - Report generation
- PyInstaller 6.11+ - Executable bundling

### Frontend Dependencies
- Electron 28+ - Desktop framework
- React 18 - UI library
- TypeScript 5.3+ - Type safety
- Ant Design 5.12+ - UI components
- Redux Toolkit 2.0+ - State management
- React Query 5.17+ - Server state
- Recharts 2.10+ - Data visualization
- Axios 1.6+ - HTTP client
- electron-builder 24+ - App packaging

## Contributing

This project follows standard contribution practices:
1. Fork the repository
2. Create a feature branch
3. Follow existing code patterns and conventions
4. Test changes thoroughly (backend and frontend)
5. Update documentation as needed
6. Submit a pull request

## License

MIT License
