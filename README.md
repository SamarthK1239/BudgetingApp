# BudgetingApp

A cross-platform desktop budgeting application built with **Electron + React + TypeScript** (frontend) and **FastAPI + SQLAlchemy** (backend).

## Features

- **Account Management**: Multiple accounts (checking, savings, credit cards, cash) with balance tracking
- **Transaction Management**: Income, expenses, and transfers with categories and search
- **Budget Planning**: Flexible budgets (weekly, monthly, quarterly, annual) with rollover support
- **Bank Import**: Import transactions from CSV, OFX, QFX, and QIF formats
- **Reports**: Spending analysis, income vs expenses, budget variance with PDF/Excel/CSV export
- **Dark Mode**: System-default theme switching
- **Data Privacy**: All data stored locally in SQLite database

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
│   │   ├── main.py           # FastAPI app entry
│   │   ├── database.py       # Database connection
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── api/              # API route handlers
│   │   ├── services/         # Business logic
│   │   └── seed/             # Seed data (preset categories)
│   ├── alembic/              # Database migrations
│   ├── requirements.txt      # Python dependencies
│   └── tests/
├── frontend/                  # Electron + React application
│   ├── public/
│   ├── src/
│   │   ├── main/             # Electron main process
│   │   │   ├── main.js       # Main entry
│   │   │   ├── preload.js    # Preload script
│   │   │   └── backend.js    # Python backend manager
│   │   ├── renderer/         # React app
│   │   │   ├── components/   # Reusable components
│   │   │   ├── pages/        # Page components
│   │   │   ├── store/        # Redux store
│   │   │   ├── api/          # API client
│   │   │   ├── App.tsx
│   │   │   └── index.tsx
│   │   └── shared/           # Shared types/utilities
│   ├── package.json
│   ├── tsconfig.json
│   └── electron-builder.yml
├── .gitignore
└── README.md
```

## Development Setup

### Prerequisites
- **Python 3.11+**
- **Node.js 18+**
- **npm or yarn**

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Initialize database and run migrations
alembic upgrade head

# Run development server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install

# Run in development mode
npm run dev
```

### Run Complete Application

```bash
cd frontend
npm run electron-dev
```

## Building for Production

```bash
cd frontend
npm run build
npm run electron-build
```

This creates installers in `frontend/dist/` for Windows, macOS, and Linux.

## License

MIT License

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
