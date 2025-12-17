/**
 * Shared TypeScript types and interfaces
 */

// Account types
export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT_CARD = 'credit_card',
  CASH = 'cash',
  INVESTMENT = 'investment',
  LOAN = 'loan',
  OTHER = 'other',
}

export interface Account {
  id: number;
  name: string;
  account_type: AccountType;
  currency: string;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

// Category types
export enum CategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export interface Category {
  id: number;
  name: string;
  category_type: CategoryType;
  parent_id?: number;
  color?: string;
  icon?: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  subcategories?: Category[];
}

// Category Keyword types for auto-categorization rules
export type MatchMode = 'contains' | 'starts_with' | 'exact';

export interface CategoryKeyword {
  id: number;
  keyword: string;
  category_id: number;
  priority: number;
  match_mode: MatchMode;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CategoryKeywordWithCategory extends CategoryKeyword {
  category_name: string;
  parent_category_name?: string;
}

export interface CategoryKeywordCreate {
  keyword: string;
  category_id: number;
  priority?: number;
  match_mode?: MatchMode;
}

export interface CategoryKeywordUpdate {
  keyword?: string;
  category_id?: number;
  priority?: number;
  match_mode?: MatchMode;
  is_active?: boolean;
}

export interface KeywordTestResult {
  text: string;
  matched: boolean;
  matched_keyword?: string;
  category_id?: number;
  category_name?: string;
  match_source?: 'user' | 'builtin';
}

export interface BuiltinKeyword {
  keyword: string;
  parent_category: string;
  category: string;
  category_id?: number;
  full_name: string;
}

export interface KeywordSuggestion {
  keyword: string;
  occurrence_count: number;
  example_payee: string;
}

// Transaction types
export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
}

export interface Transaction {
  id: number;
  transaction_type: TransactionType;
  account_id?: number;
  category_id?: number;
  from_account_id?: number;
  to_account_id?: number;
  amount: number;
  transaction_date: string;
  payee?: string;
  description?: string;
  is_reconciled: boolean;
  reconciled_date?: string;
  created_at: string;
  updated_at?: string;
}

// Budget types
export enum BudgetPeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
}

export interface Budget {
  id: number;
  name: string;
  category_ids: number[];
  amount: number;
  period_type: BudgetPeriod;
  start_date: string;
  end_date?: string;
  allow_rollover: boolean;
  rollover_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface BudgetWithProgress extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
  period_start: string;
  period_end: string;
}

// Setup types
export interface SetupStatus {
  is_setup_complete: boolean;
  has_accounts: boolean;
  has_categories: boolean;
  database_initialized: boolean;
}

export interface InitialAccount {
  name: string;
  account_type: string;
  currency: string;
  initial_balance: number;
}

export interface AppSetup {
  accounts: InitialAccount[];
  currency: string;
  fiscal_year_start_month: number;
  date_format: string;
  budget_period_preference: string;
  allow_budget_rollover: boolean;
  use_preset_categories: boolean;
  enable_multi_currency: boolean;
}

// Income Schedule types
export enum IncomeFrequency {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  SEMIMONTHLY = 'semimonthly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
}

export interface IncomeSchedule {
  id: number;
  name: string;
  description?: string;
  amount: number;
  frequency: IncomeFrequency;
  account_id?: number;
  category_id?: number;
  start_date: string;
  end_date?: string;
  next_expected_date: string;
  semimonthly_day1?: number;
  semimonthly_day2?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UpcomingIncome {
  schedule_id: number;
  schedule_name: string;
  amount: number;
  expected_date: string;
  days_until: number;
  account_name?: string;
  category_name?: string;
}

export interface IncomeSummary {
  period: string;
  start_date: string;
  end_date: string;
  total_expected_income: number;
  expected_payment_count: number;
  active_schedules: number;
}

// Goal types
export enum GoalStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

export interface Goal {
  id: number;
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  account_id?: number;
  start_date: string;
  target_date: string;
  completed_date?: string;
  status: GoalStatus;
  priority: number;
  color?: string;
  created_at: string;
  updated_at?: string;
}

export interface GoalWithProgress extends Goal {
  progress_percentage: number;
  remaining_amount: number;
  days_remaining: number;
  days_elapsed: number;
}

export interface GoalSummary {
  total_goals: number;
  active_goals: number;
  completed_goals: number;
  total_target_amount: number;
  total_saved_amount: number;
  total_remaining_amount: number;
  average_progress: number;
}

// Report types
export interface SpendingByCategory {
  start_date: string;
  end_date: string;
  total_spending: number;
  categories: {
    name: string;
    color?: string;
    amount: number;
    percentage: number;
  }[];
}

export interface IncomeVsExpenses {
  start_date: string;
  end_date: string;
  income: number;
  expenses: number;
  net: number;
  savings_rate: number;
}

export interface AccountBalances {
  accounts: {
    id: number;
    name: string;
    type: string;
    balance: number;
    currency: string;
  }[];
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
}
