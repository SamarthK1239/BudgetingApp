# GitHub Copilot Instructions for BudgetingApp

## Project Overview

BudgetingApp is a cross-platform desktop budgeting application with a Python FastAPI backend and Electron + React + TypeScript frontend. The app provides personal finance management with accounts, transactions, budgets, categories, and reporting features.

## Architecture & Technology Stack

### Backend (Python)
- **Framework**: FastAPI 0.115+ with automatic OpenAPI docs
- **Database**: SQLite with SQLAlchemy 2.0+ ORM
- **Migrations**: Alembic for database version control
- **Validation**: Pydantic 2.10+ schemas with type hints
- **Server**: Uvicorn ASGI server
- **Special Libraries**: ofxparse (bank imports), pandas (data processing), reportlab/weasyprint (PDF reports)

### Frontend (TypeScript + React)
- **Desktop**: Electron 28+ (main process, renderer process, preload script)
- **UI Framework**: React 18 with functional components and hooks
- **UI Library**: Ant Design 5.12+ components
- **State Management**: Redux Toolkit 2.0+ for global state
- **Server State**: React Query 5.17+ for API data caching
- **Routing**: React Router 6+
- **Charts**: Recharts 2.10+ for data visualization
- **HTTP Client**: Axios with TypeScript types

## Code Style & Conventions

### Backend (Python)
- Use **Python 3.9+ syntax** with type hints on all functions
- Follow **FastAPI conventions**: dependency injection with `Depends()`, Pydantic schemas for validation
- **SQLAlchemy patterns**: Use relationship loaders, avoid N+1 queries
- **File naming**: snake_case for all Python files
- **Class naming**: PascalCase for models and schemas
- **Function naming**: snake_case for all functions
- **Docstrings**: Use triple-quoted strings for functions/classes
- **Error handling**: Raise `HTTPException` with appropriate status codes
- **Async**: Use async/await where applicable (database operations are sync with SQLAlchemy)

### Frontend (TypeScript)
- Use **TypeScript strict mode** - all variables and function parameters must be typed
- **Component style**: Functional components with React hooks only (no class components)
- **File naming**: PascalCase for components (e.g., `Dashboard.tsx`), camelCase for utilities
- **Props typing**: Define explicit interfaces for all component props
- **State management**: 
  - Local state: `useState` for component-specific state
  - Global state: Redux Toolkit slices in `store/slices/`
  - Server state: React Query hooks for API data
- **Styling**: Use Ant Design components and theme, CSS modules for custom styles
- **Imports**: Use absolute imports from `src/` where configured

## Project Structure Patterns

### Backend API Endpoints
```
backend/app/api/
├── setup.py       # /api/setup/* - First-run wizard
├── accounts.py    # /api/accounts/* - Account CRUD
├── transactions.py # /api/transactions/* - Transaction management
├── categories.py  # /api/categories/* - Category management
├── budgets.py     # /api/budgets/* - Budget CRUD
├── keywords.py    # /api/keywords/* - Auto-categorization rules
├── imports.py     # /api/import/* - Bank file imports
└── reports.py     # /api/reports/* - Analytics
```

**Pattern**: Each file exports a `router = APIRouter()` and defines endpoints with:
- Clear response models (Pydantic schemas)
- Dependency injection for database sessions: `db: Session = Depends(get_db)`
- HTTP status codes: 200 (success), 201 (created), 404 (not found), etc.

### Frontend Page Structure
```
frontend/src/renderer/pages/
├── SetupWizard.tsx   # First-run multi-step setup
├── Dashboard.tsx     # Main overview with stats
├── Accounts.tsx      # Account list and management
├── Transactions.tsx  # Transaction list with filters
├── Budgets.tsx       # Budget management
├── Categories.tsx    # Category configuration
└── Reports.tsx       # Analytics and charts
```

**Pattern**: Pages are full-page components that:
- Use `MainLayout` wrapper for consistent navigation
- Fetch data with React Query hooks
- Dispatch Redux actions for global state
- Use Ant Design components (Table, Form, Modal, etc.)

## Database Models & Relationships

### Key Models
1. **Account** - Financial accounts with types (checking, savings, credit_card, cash, investment, loan)
2. **Category** - Two-level hierarchy (parent_id for subcategories), supports income and expense types
3. **Transaction** - Income/expense/transfer with automatic account balance updates
4. **Budget** - Time-based budgets with periods (weekly, monthly, quarterly, annual)
5. **CategoryKeyword** - User-defined rules for auto-categorization

### Important Relationships
- **Categories**: Self-referencing with `parent_id` for two-level hierarchy
- **Transactions**: 
  - One-to-one with Account for income/expense (via `account_id`)
  - Two accounts for transfers (via `from_account_id` and `to_account_id`)
  - Optional Category link (via `category_id`)
- **Budgets**: Linked to Category (via `category_id`)
- **CategoryKeywords**: Linked to Category for auto-categorization

### Important Business Logic
- **Balance Updates**: When creating/updating/deleting transactions, account balances must be updated accordingly
- **Soft Deletes**: Accounts and categories with transaction history are soft-deleted (`is_active=False`)
- **Transaction Types**: 
  - `income`: increases account balance
  - `expense`: decreases account balance
  - `transfer`: moves money between two accounts
- **Import Deduplication**: Use `import_id` field to prevent duplicate imports

## Common Tasks & Patterns

### Adding a New API Endpoint

1. **Define Pydantic schema** in `backend/app/schemas/`:
```python
# schemas/example.py
from pydantic import BaseModel
from datetime import datetime

class ExampleCreate(BaseModel):
    name: str
    amount: float

class ExampleResponse(BaseModel):
    id: int
    name: str
    amount: float
    created_at: datetime
    
    class Config:
        from_attributes = True
```

2. **Create SQLAlchemy model** in `backend/app/models/`:
```python
# models/example.py
from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Example(Base):
    __tablename__ = "examples"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

3. **Add API route** in `backend/app/api/`:
```python
# api/examples.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.example import ExampleCreate, ExampleResponse
from app.models.example import Example

router = APIRouter()

@router.post("", response_model=ExampleResponse, status_code=201)
def create_example(example: ExampleCreate, db: Session = Depends(get_db)):
    db_example = Example(**example.dict())
    db.add(db_example)
    db.commit()
    db.refresh(db_example)
    return db_example
```

4. **Register router** in `backend/app/main.py`:
```python
from app.api import examples
app.include_router(examples.router, prefix="/api/examples", tags=["examples"])
```

### Adding a New Frontend Page

1. **Create page component** in `frontend/src/renderer/pages/`:
```typescript
// pages/NewPage.tsx
import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const NewPage: React.FC = () => {
  return (
    <Card>
      <Title level={2}>New Page</Title>
      {/* Page content */}
    </Card>
  );
};

export default NewPage;
```

2. **Add route** in `frontend/src/renderer/App.tsx`:
```typescript
import NewPage from './pages/NewPage';

// In routes array:
<Route path="/new-page" element={<NewPage />} />
```

3. **Add navigation item** in `frontend/src/renderer/components/Layout/MainLayout.tsx`

### Working with Redux

1. **Create slice** in `frontend/src/renderer/store/slices/`:
```typescript
// slices/exampleSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ExampleState {
  items: any[];
  loading: boolean;
}

const initialState: ExampleState = {
  items: [],
  loading: false,
};

const exampleSlice = createSlice({
  name: 'example',
  initialState,
  reducers: {
    setItems: (state, action: PayloadAction<any[]>) => {
      state.items = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setItems, setLoading } = exampleSlice.actions;
export default exampleSlice.reducer;
```

2. **Register reducer** in `frontend/src/renderer/store/index.ts`

3. **Use in components**:
```typescript
import { useSelector, useDispatch } from 'react-redux';
import { setItems } from '../store/slices/exampleSlice';

const dispatch = useDispatch();
const items = useSelector((state: RootState) => state.example.items);
```

### Making API Calls

Use the centralized API client in `frontend/src/renderer/api/client.ts`:

```typescript
import api from '../api/client';

// In component or custom hook:
const fetchData = async () => {
  try {
    const response = await api.get('/api/endpoint');
    return response.data;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};
```

For React Query:
```typescript
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

const useExample = () => {
  return useQuery({
    queryKey: ['examples'],
    queryFn: async () => {
      const response = await api.get('/api/examples');
      return response.data;
    },
  });
};
```

## Special Features & Considerations

### Auto-Categorization System
- **Built-in keywords**: Defined in `backend/app/api/imports.py` as `CATEGORY_KEYWORDS`
- **User keywords**: Stored in `category_keywords` table with priority and match modes
- **Match modes**: 'contains', 'starts_with', 'exact'
- **Priority**: Higher priority keywords are checked first

### Bank Import Flow
1. User uploads file (CSV, OFX, QFX, or QIF)
2. Backend parses file and extracts transactions
3. Auto-categorization runs (user keywords → built-in keywords)
4. Preview shown to user for review
5. User confirms and transactions are imported
6. Duplicates prevented via `import_id` field

### Budget Progress Calculation
- Budgets have period types: weekly, monthly, quarterly, annual
- Progress calculated by summing transactions in category within period
- Rollover support for unused budget amounts

### Transaction Balance Updates
When creating/updating/deleting transactions:
- **Income**: `account.current_balance += amount`
- **Expense**: `account.current_balance -= amount`
- **Transfer**: `from_account.current_balance -= amount`, `to_account.current_balance += amount`
- Always update both old and new accounts when changing transaction details

## Development Workflow

### Running in Development
1. **Backend**: `cd backend && uvicorn app.main:app --reload`
2. **Frontend**: `cd frontend && npm run electron-dev`
3. API docs available at: http://localhost:8000/docs

### Database Migrations
- Create migration: `cd backend && alembic revision --autogenerate -m "description"`
- Apply migrations: `alembic upgrade head`
- Rollback: `alembic downgrade -1`

### Building for Production
- Full build: `cd frontend && npm run dist`
- Platform-specific: `npm run dist-win`, `npm run dist-mac`, `npm run dist-linux`

## Testing Guidelines

### Backend Tests (pytest)
```python
# tests/test_accounts.py
def test_create_account(client):
    response = client.post("/api/accounts", json={
        "name": "Test Account",
        "account_type": "checking",
        "initial_balance": 1000.0
    })
    assert response.status_code == 201
    assert response.json()["name"] == "Test Account"
```

### Frontend Tests (Jest + React Testing Library)
```typescript
// __tests__/Dashboard.test.tsx
import { render, screen } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';

test('renders dashboard title', () => {
  render(<Dashboard />);
  expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
});
```

## Security Considerations

- **Electron IPC**: Use context isolation and preload script for secure communication
- **CORS**: Backend configured to allow Electron renderer origins
- **SQL Injection**: Protected by SQLAlchemy parameterized queries
- **XSS**: React automatically escapes content
- **File uploads**: Validate file types and sizes before processing

## Performance Tips

- **Database**: Use eager loading with `joinedload()` for relationships to avoid N+1 queries
- **React**: Use `React.memo()` for expensive components, `useMemo()` for heavy computations
- **API calls**: Leverage React Query caching, set appropriate stale times
- **Large lists**: Use Ant Design's virtual scrolling for tables with many rows

## Common Issues & Solutions

### Backend won't start
- Check Python version (3.9+)
- Verify virtual environment is activated
- Run `pip install -r requirements.txt`
- Check if port 8000 is available

### Frontend build errors
- Run `npm install` to ensure dependencies are installed
- Clear build cache: `rm -rf node_modules/.cache`
- Check TypeScript errors: `npm run build`

### Database migration conflicts
- Check Alembic version table: `alembic current`
- If stuck, can reset: delete `budget.db` and run `alembic upgrade head`

### Electron app won't launch
- Ensure React dev server is running (http://localhost:3000)
- Check Electron console for errors (View → Toggle Developer Tools)
- Verify backend is accessible at http://localhost:8000/health

## Resources

- **FastAPI docs**: https://fastapi.tiangolo.com/
- **SQLAlchemy docs**: https://docs.sqlalchemy.org/
- **Electron docs**: https://www.electronjs.org/docs
- **React docs**: https://react.dev/
- **Ant Design**: https://ant.design/components/overview/
- **Redux Toolkit**: https://redux-toolkit.js.org/
- **React Query**: https://tanstack.com/query/latest

## When Generating Code

1. **Always use TypeScript** - Never generate plain JavaScript for frontend
2. **Type everything** - Add explicit types to all variables, parameters, and returns
3. **Follow existing patterns** - Match the code style of similar existing files
4. **Use Ant Design components** - Don't create custom UI components when Ant Design provides them
5. **Include error handling** - Add try-catch blocks and user-friendly error messages
6. **Add comments for complex logic** - Especially for business rules and calculations
7. **Test considerations** - Write code that's easy to test with clear separation of concerns
8. **Accessibility** - Use semantic HTML and ARIA attributes where appropriate
