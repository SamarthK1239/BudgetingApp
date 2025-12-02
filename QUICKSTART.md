# BudgetingApp - Quick Start Guide

## ⚡ Quick Start (5 Minutes)

### 1. Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
```

### 2. Frontend Setup
```powershell
cd frontend
npm install
```

### 3. Run the Application
```powershell
# Terminal 1: Start Backend
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload

# Terminal 2: Start Frontend
cd frontend
npm run electron-dev
```

The application will open automatically!

## 🎯 First Run Experience

1. **Setup Wizard** appears on first launch
2. **Step 1**: Welcome screen
3. **Step 2**: Add initial accounts (checking, savings, etc.)
4. **Step 3**: Configure preferences (currency, date format, budget periods)
5. **Step 4**: Complete setup - preset categories are automatically loaded

## 📱 Application Features

### Implemented ✅
- **Setup Wizard**: Multi-step initial configuration
- **Dashboard**: Overview with statistics
- **Account Management**: Create and manage financial accounts
- **Transaction Management**: Track income, expenses, and transfers
- **Budget Planning**: Set budgets with multiple period types (weekly/monthly/quarterly/annual)
- **Category System**: 11 parent categories with 60+ subcategories
- **Dark Mode**: Automatic system theme detection
- **Reports**: Spending analysis, income vs expenses, balance trends

### Page Structure (Placeholders Ready for Implementation)
- Dashboard (statistics and quick overview)
- Accounts (list, create, edit, delete)
- Transactions (list, search, filter, create, edit)
- Budgets (create, track progress, period-based)
- Categories (manage custom categories)
- Reports (visualizations and analytics)

## 🗂️ Project Highlights

### Architecture
- **Backend**: FastAPI (Python) + SQLAlchemy + SQLite
- **Frontend**: Electron + React + TypeScript + Ant Design
- **State Management**: Redux Toolkit + React Query
- **Database**: SQLite (file-based, portable)

### Key Design Decisions
1. **Transfer Transactions**: Single record with from/to accounts (simpler than paired transactions)
2. **Two-Level Categories**: Parent → Child (e.g., Housing → Rent, Housing → Utilities)
3. **Flexible Budget Periods**: Weekly, Monthly, Quarterly, Annual support
4. **System-Default Dark Mode**: Automatic theme switching based on OS preference
5. **Preset Categories**: 11 major categories with comprehensive subcategories

### Database Location
- **Development**: `backend/budget.db`
- **Production**: 
  - Windows: `%APPDATA%\BudgetingApp\budget.db`
  - macOS: `~/Library/Application Support/BudgetingApp/budget.db`
  - Linux: `~/.config/BudgetingApp/budget.db`

## 🔍 Testing the Setup

### Test Backend API
Open browser: http://127.0.0.1:8000/docs

Try these endpoints:
- `GET /health` - Check if backend is running
- `GET /api/setup/status` - Check setup status
- `GET /api/categories` - View preset categories (after setup)

### Test Frontend
The Electron app should:
1. Show setup wizard if first run
2. Initialize backend automatically
3. Display main interface after setup
4. Switch themes based on system preference

## 📋 Next Steps for Development

### Priority 1: Complete Core UI Pages
- Accounts page: Table with add/edit/delete functionality
- Transactions page: List with filters, search, and transaction forms
- Budget page: Budget creation and progress tracking

### Priority 2: Bank Import
- File upload interface
- CSV/OFX/QFX/QIF parsers
- Transaction preview and deduplication
- Auto-category mapping

### Priority 3: Reports & Visualizations
- Recharts integration for graphs
- Spending by category pie chart
- Income vs expenses bar chart
- Balance trend line chart
- PDF/Excel export functionality

### Priority 4: Production Packaging
- PyInstaller configuration for backend
- Electron Builder configuration
- Code signing setup
- Auto-update functionality
- Database backup on close

## 🐛 Common Issues

**Issue**: Backend fails to start
**Solution**: Make sure venv is activated and all dependencies installed

**Issue**: Electron shows blank screen
**Solution**: Check if React dev server is running on port 3000

**Issue**: Setup wizard doesn't appear
**Solution**: Delete `budget.db` file to reset the application

**Issue**: TypeScript errors in IDE
**Solution**: Run `npm install` and restart IDE (errors are expected before install)

## 📚 File Structure Summary

```
BudgetingApp/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── main.py         # Application entry
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── api/            # API routes
│   │   └── seed/           # Preset data
│   └── alembic/            # Migrations
│
├── frontend/                # Electron + React frontend
│   ├── src/
│   │   ├── main/           # Electron main process
│   │   └── renderer/       # React application
│   └── public/
│
├── README.md               # Project overview
├── DEVELOPMENT.md          # Detailed development guide
└── QUICKSTART.md          # This file
```

## 🎓 Learning Resources

- **FastAPI Tutorial**: https://fastapi.tiangolo.com/tutorial/
- **React Hooks**: https://react.dev/learn
- **Ant Design Components**: https://ant.design/components/
- **Electron Guide**: https://www.electronjs.org/docs/latest/tutorial/quick-start

## ✨ Feature Highlights

### Preset Categories Include:
- **Income**: Salary, Freelance, Business, Investments, Gifts, Refunds
- **Housing**: Rent/Mortgage, Property Tax, Insurance, Utilities, Maintenance
- **Transportation**: Gas, Car Payment, Insurance, Maintenance, Public Transit
- **Food**: Groceries, Dining Out, Takeout, Fast Food, Coffee Shops
- **Healthcare**: Insurance, Doctor, Prescriptions, Dental, Vision
- **Entertainment**: Streaming, Movies, Concerts, Hobbies, Games
- **Shopping**: Clothing, Electronics, Home Goods, Personal Care, Gifts
- **Personal**: Gym, Hair/Beauty, Education, Childcare, Pet Care, Phone, Internet
- **Financial**: Bank Fees, Loans, Credit Cards, Investments, Savings, Taxes
- **Travel**: Flights, Hotels, Rental Car, Vacation
- **Miscellaneous**: Charity, Legal Fees, Other

### Smart Features:
- Automatic account balance updates on transactions
- Budget period calculation (weekly/monthly/quarterly/annual)
- Spending progress tracking
- Category-based reporting
- Transaction deduplication (via import_id)
- Soft delete for accounts/categories with history

---

**Ready to start? Run the setup commands above and explore the application!** 🚀
