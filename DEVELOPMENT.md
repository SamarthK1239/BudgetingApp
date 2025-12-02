# BudgetingApp - Development Guide

## 🚀 Getting Started

### Initial Setup

1. **Install Python Dependencies**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

2. **Install Frontend Dependencies**
```powershell
cd frontend
npm install
```

3. **Initialize Database**
```powershell
cd backend
.\venv\Scripts\activate
alembic upgrade head
```

### Development Workflow

#### Running the Backend (Development Mode)
```powershell
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API will be available at: http://127.0.0.1:8000
API Documentation (Swagger): http://127.0.0.1:8000/docs

#### Running the Frontend (Development Mode)
```powershell
cd frontend
npm run electron-dev
```

This command will:
- Start the React development server on http://localhost:3000
- Launch Electron with hot-reload enabled
- Connect to the Python backend

#### Running the Complete Application
```powershell
# Terminal 1 - Backend
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload

# Terminal 2 - Frontend + Electron
cd frontend
npm run electron-dev
```

## 📁 Project Structure Explained

### Backend Structure

```
backend/
├── app/
│   ├── __init__.py              # Package initialization
│   ├── main.py                  # FastAPI application entry point
│   ├── database.py              # Database configuration and session management
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── account.py           # Account model with AccountType enum
│   │   ├── category.py          # Category model (2-level hierarchy)
│   │   ├── transaction.py       # Transaction model (income/expense/transfer)
│   │   └── budget.py            # Budget model with period types
│   ├── schemas/                 # Pydantic schemas for validation
│   │   ├── __init__.py
│   │   ├── account.py           # Account request/response schemas
│   │   ├── category.py          # Category schemas
│   │   ├── transaction.py       # Transaction schemas with validators
│   │   ├── budget.py            # Budget schemas
│   │   └── setup.py             # Setup wizard schemas
│   ├── api/                     # API route handlers
│   │   ├── __init__.py
│   │   ├── setup.py             # /api/setup/* - App initialization
│   │   ├── accounts.py          # /api/accounts/* - CRUD operations
│   │   ├── categories.py        # /api/categories/* - Category management
│   │   ├── transactions.py      # /api/transactions/* - Transaction management
│   │   ├── budgets.py           # /api/budgets/* - Budget management
│   │   └── reports.py           # /api/reports/* - Report generation
│   └── seed/                    # Seed data
│       └── categories.py        # Preset categories (Income/Housing/Food/etc.)
├── alembic/                     # Database migrations
│   ├── env.py                   # Alembic environment configuration
│   ├── script.py.mako           # Migration script template
│   └── versions/                # Migration files (auto-generated)
├── requirements.txt             # Python dependencies
└── alembic.ini                  # Alembic configuration

```

### Frontend Structure

```
frontend/
├── public/
│   └── index.html               # HTML template
├── src/
│   ├── main/                    # Electron Main Process
│   │   ├── main.js              # Main entry, window management, IPC handlers
│   │   ├── backend.js           # Python backend process manager
│   │   └── preload.js           # Preload script, secure IPC bridge
│   ├── renderer/                # React Application
│   │   ├── api/
│   │   │   └── client.ts        # Axios-based API client
│   │   ├── components/
│   │   │   └── Layout/
│   │   │       └── MainLayout.tsx  # Main app layout with sidebar
│   │   ├── pages/               # Page components
│   │   │   ├── SetupWizard.tsx  # First-run setup wizard
│   │   │   ├── Dashboard.tsx    # Dashboard with statistics
│   │   │   ├── Accounts.tsx     # Account management (placeholder)
│   │   │   ├── Transactions.tsx # Transaction list/form (placeholder)
│   │   │   ├── Budgets.tsx      # Budget management (placeholder)
│   │   │   ├── Categories.tsx   # Category management (placeholder)
│   │   │   └── Reports.tsx      # Reports & analytics (placeholder)
│   │   ├── store/               # Redux state management
│   │   │   ├── index.ts         # Store configuration
│   │   │   └── slices/
│   │   │       ├── appSlice.ts       # Global app state
│   │   │       ├── accountsSlice.ts  # Accounts state
│   │   │       └── categoriesSlice.ts  # Categories state
│   │   ├── App.tsx              # Main React component
│   │   ├── App.css              # Global styles
│   │   └── index.tsx            # React entry point
│   └── shared/
│       └── types.ts             # TypeScript type definitions
├── package.json                 # Node dependencies and scripts
├── tsconfig.json                # TypeScript configuration
└── electron-builder.yml         # (To be created) Electron Builder config
```

## 🔧 Key Technologies

### Backend Stack
- **FastAPI**: Modern Python web framework with automatic OpenAPI docs
- **SQLAlchemy**: SQL toolkit and ORM
- **Alembic**: Database migration tool
- **Pydantic**: Data validation using Python type annotations
- **SQLite**: Embedded database (file-based)
- **Uvicorn**: Lightning-fast ASGI server

### Frontend Stack
- **Electron**: Cross-platform desktop framework
- **React 18**: UI library with hooks
- **TypeScript**: Type-safe JavaScript
- **Ant Design**: Professional UI component library
- **Redux Toolkit**: State management
- **React Query**: Server state management & caching
- **React Router**: Client-side routing
- **Axios**: Promise-based HTTP client
- **Recharts**: Composable charting library

## 🗄️ Database Schema

### Tables

**accounts**
- id (PK)
- name
- account_type (enum: checking, savings, credit_card, cash, investment, loan)
- currency (default: USD)
- initial_balance
- current_balance
- is_active
- notes
- created_at, updated_at

**categories**
- id (PK)
- name
- category_type (enum: income, expense)
- parent_id (FK to categories, nullable) - 2-level hierarchy
- is_system (boolean - prevents deletion)
- is_active
- color, icon (for UI)
- created_at, updated_at

**transactions**
- id (PK)
- transaction_type (enum: income, expense, transfer)
- account_id (FK to accounts) - for income/expense
- from_account_id (FK to accounts) - for transfers
- to_account_id (FK to accounts) - for transfers
- amount
- transaction_date
- payee
- description
- category_id (FK to categories, nullable for transfers)
- import_id (for deduplication)
- is_reconciled, reconciled_date
- created_at, updated_at

**budgets**
- id (PK)
- name
- category_id (FK to categories)
- amount
- period_type (enum: weekly, monthly, quarterly, annual)
- start_date, end_date
- allow_rollover, rollover_amount
- is_active
- created_at, updated_at

## 📡 API Endpoints

### Setup Endpoints
- `GET /api/setup/status` - Check if app is initialized
- `POST /api/setup/initialize` - Initialize app with setup data

### Account Endpoints
- `GET /api/accounts` - List all accounts
- `GET /api/accounts/{id}` - Get account details
- `POST /api/accounts` - Create account
- `PUT /api/accounts/{id}` - Update account
- `DELETE /api/accounts/{id}` - Delete account (soft delete if has transactions)

### Category Endpoints
- `GET /api/categories` - List categories (with hierarchy)
- `GET /api/categories/{id}` - Get category details
- `POST /api/categories` - Create category
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Delete category (soft delete if used)

### Transaction Endpoints
- `GET /api/transactions` - List transactions (with filters)
- `GET /api/transactions/{id}` - Get transaction details
- `POST /api/transactions` - Create transaction (updates account balances)
- `PUT /api/transactions/{id}` - Update transaction
- `DELETE /api/transactions/{id}` - Delete transaction (reverses balance changes)

### Budget Endpoints
- `GET /api/budgets` - List budgets
- `GET /api/budgets/progress` - Get budgets with spending progress
- `GET /api/budgets/{id}` - Get budget details
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/{id}` - Update budget
- `DELETE /api/budgets/{id}` - Delete budget

### Report Endpoints
- `GET /api/reports/spending-by-category` - Category breakdown
- `GET /api/reports/income-vs-expenses` - Income/expense comparison
- `GET /api/reports/account-balances` - Current balances & net worth
- `GET /api/reports/balance-trend` - Account balance over time

## 🎨 Features Implemented

### ✅ Core Features (Implemented)
- [x] Project structure setup
- [x] Database models (Account, Category, Transaction, Budget)
- [x] Alembic migrations
- [x] Preset categories (11 parent categories, ~60 subcategories)
- [x] FastAPI routes with CRUD operations
- [x] Electron main process with backend manager
- [x] React app structure with Ant Design
- [x] Redux state management
- [x] Setup wizard (multi-step form)
- [x] Basic page structure (Dashboard, Accounts, Transactions, etc.)
- [x] Dark mode support (system-default)
- [x] API client with error handling

### 🚧 Features To Implement (Next Steps)
- [ ] Complete UI pages (Accounts, Transactions, Budgets, Categories, Reports)
- [ ] Bank import functionality (CSV, OFX, QFX, QIF parsers)
- [ ] Transaction deduplication logic
- [ ] Category auto-mapping with learning
- [ ] Report visualizations with Recharts
- [ ] PDF/Excel/CSV export
- [ ] PyInstaller backend bundling
- [ ] Electron Builder packaging
- [ ] Auto-backup on app close
- [ ] Auto-update configuration

## 🧪 Testing

### Backend Testing
```powershell
cd backend
.\venv\Scripts\activate
pytest
```

### Frontend Testing
```powershell
cd frontend
npm test
```

## 📦 Building for Production

### 1. Bundle Python Backend
```powershell
cd backend
.\venv\Scripts\activate
pyinstaller --onefile --name backend app/main.py
```

### 2. Build Frontend & Package Electron
```powershell
cd frontend
npm run electron-build
```

This creates installers in `frontend/dist/`:
- Windows: `.exe` installer (NSIS)
- macOS: `.dmg` installer
- Linux: `.AppImage` and `.deb` packages

## 🔍 Troubleshooting

### Backend won't start
- Check if Python venv is activated
- Verify all dependencies are installed: `pip list`
- Check if port 8000 is available
- Review backend console output for errors

### Frontend won't connect to backend
- Ensure backend is running on port 8000
- Check browser console for errors
- Verify `electronAPI` is available in preload script

### Database errors
- Run migrations: `alembic upgrade head`
- Check database file permissions
- Delete `budget.db` and recreate for fresh start

### Electron won't launch
- Run `npm install` to ensure all dependencies are installed
- Check `main.js` console output for errors
- Try running React dev server separately: `npm start`

## 📚 Additional Resources

- FastAPI Documentation: https://fastapi.tiangolo.com/
- Electron Documentation: https://www.electronjs.org/docs
- Ant Design Components: https://ant.design/components/overview/
- SQLAlchemy Documentation: https://docs.sqlalchemy.org/
- React Query Documentation: https://tanstack.com/query/latest

## 🤝 Contributing

This is a personal project structure. To extend:
1. Follow existing code patterns
2. Add tests for new features
3. Update this documentation
4. Keep API endpoints RESTful

## 📄 License

MIT License
