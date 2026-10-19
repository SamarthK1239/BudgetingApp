/**
 * API Client
 * Centralized HTTP client for backend communication
 */

import axios from 'axios';

// Extend Window interface for Electron API
declare global {
  interface Window {
    electronAPI?: {
      getBackendUrl: () => Promise<string>;
      setBackendUrl?: (url: string) => Promise<string>;
      isRemoteMode?: () => Promise<boolean>;
    };
  }
}

const TOKEN_STORAGE_KEY = 'budgetapp-token';

export interface AuthUser {
  id: number;
  username: string;
  display_name: string | null;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface LoginResult {
  access_token: string;
  token_type: string;
  expires_at: string;
  user: AuthUser;
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Your session has expired. Please sign in again.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

class ApiClient {
  private baseURL: string | null = null;
  private client: any = null;
  private token: string | null = null;
  private onUnauthorized: (() => void) | null = null;

  async initialize(): Promise<void> {
    // Get backend URL from Electron
    if (window.electronAPI) {
      this.baseURL = await window.electronAPI.getBackendUrl();
    } else if (window.location.protocol.startsWith('http')) {
      // Served by the backend itself: use the same origin so cookies apply.
      this.baseURL = window.location.origin;
    } else {
      // Fallback for local dev outside Electron
      this.baseURL = 'http://localhost:8000';
    }

    this.token = localStorage.getItem(TOKEN_STORAGE_KEY);

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      // Send the session cookie when the UI is served from the backend origin.
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor: attach the bearer token for non-browser clients
    this.client.interceptors.request.use(
      (config: any) => {
        if (this.token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: any) => response.data,
      (error: any) => {
        const status = error.response?.status;
        const message = error.response?.data?.detail || error.message || 'An error occurred';

        if (status === 401) {
          const url: string = error.config?.url || '';
          // A failed sign-in should surface its own message, not a session-expiry reset.
          const isLoginAttempt = url.includes('/api/auth/login') || url.includes('/api/auth/bootstrap');
          if (!isLoginAttempt) {
            this.clearToken();
            if (this.onUnauthorized) {
              this.onUnauthorized();
            }
            return Promise.reject(new UnauthorizedError());
          }
        }

        return Promise.reject(new Error(message));
      }
    );
  }

  /** Current backend base URL, once initialized */
  getBaseUrl(): string | null {
    return this.baseURL;
  }

  /** Point the client at a different backend without a full page reload */
  async setBaseUrl(url: string): Promise<void> {
    const normalized = url.replace(/\/+$/, '');
    if (window.electronAPI?.setBackendUrl) {
      await window.electronAPI.setBackendUrl(normalized);
    }
    this.baseURL = normalized;
    if (this.client) {
      this.client.defaults.baseURL = normalized;
    }
  }

  /** Register a callback invoked when the server rejects our session */
  setUnauthorizedHandler(handler: (() => void) | null): void {
    this.onUnauthorized = handler;
  }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  hasToken(): boolean {
    return Boolean(this.token);
  }

  // Auth endpoints
  async getBootstrapStatus(): Promise<{ needs_bootstrap: boolean; user_count: number }> {
    return this.client!.get('/api/auth/bootstrap-status');
  }

  async bootstrapAdmin(data: {
    username: string;
    password: string;
    display_name?: string;
  }): Promise<LoginResult> {
    const result: LoginResult = await this.client!.post('/api/auth/bootstrap', data);
    this.setToken(result.access_token);
    return result;
  }

  async login(username: string, password: string): Promise<LoginResult> {
    const result: LoginResult = await this.client!.post('/api/auth/login', { username, password });
    this.setToken(result.access_token);
    return result;
  }

  async logout(): Promise<void> {
    try {
      await this.client!.post('/api/auth/logout');
    } finally {
      this.clearToken();
    }
  }

  async getCurrentUser(): Promise<AuthUser> {
    return this.client!.get('/api/auth/me');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<any> {
    return this.client!.post('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  async getUsers(): Promise<AuthUser[]> {
    return this.client!.get('/api/auth/users');
  }

  async createUser(data: {
    username: string;
    password: string;
    display_name?: string;
    is_admin?: boolean;
  }): Promise<AuthUser> {
    return this.client!.post('/api/auth/users', data);
  }

  async updateUser(id: number, data: {
    display_name?: string;
    is_admin?: boolean;
    is_active?: boolean;
    password?: string;
  }): Promise<AuthUser> {
    return this.client!.patch(`/api/auth/users/${id}`, data);
  }

  async deleteUser(id: number): Promise<any> {
    return this.client!.delete(`/api/auth/users/${id}`);
  }

  async getSessions(): Promise<any[]> {
    return this.client!.get('/api/auth/sessions');
  }

  async revokeSession(id: number): Promise<any> {
    return this.client!.delete(`/api/auth/sessions/${id}`);
  }

  // Setup endpoints
  async getSetupStatus(): Promise<any> {
    return this.client!.get('/api/setup/status');
  }

  async initializeApp(setupData: any): Promise<any> {
    return this.client!.post('/api/setup/initialize', setupData);
  }

  // Account endpoints
  async getAccounts(params: any = {}): Promise<any> {
    return this.client!.get('/api/accounts', { params });
  }

  async getAccount(id: number | string): Promise<any> {
    return this.client!.get(`/api/accounts/${id}`);
  }

  async createAccount(data: any): Promise<any> {
    return this.client!.post('/api/accounts', data);
  }

  async updateAccount(id: number | string, data: any): Promise<any> {
    return this.client!.put(`/api/accounts/${id}`, data);
  }

  async deleteAccount(id: number | string): Promise<any> {
    return this.client!.delete(`/api/accounts/${id}`);
  }

  // Category endpoints
  async getCategories(params: any = {}): Promise<any> {
    return this.client!.get('/api/categories', { params });
  }

  async getCategory(id: number | string): Promise<any> {
    return this.client!.get(`/api/categories/${id}`);
  }

  async createCategory(data: any): Promise<any> {
    return this.client!.post('/api/categories', data);
  }

  async updateCategory(id: number | string, data: any): Promise<any> {
    return this.client!.put(`/api/categories/${id}`, data);
  }

  async deleteCategory(id: number | string): Promise<any> {
    return this.client!.delete(`/api/categories/${id}`);
  }

  async resetCategories(): Promise<any> {
    return this.client!.post('/api/categories/reset');
  }

  async deleteAllCategories(): Promise<any> {
    return this.client!.delete('/api/categories/all');
  }

  async deleteCategoriesByType(categoryType: 'income' | 'expense'): Promise<any> {
    return this.client!.delete(`/api/categories/type/${categoryType}`);
  }

  // Category Keyword endpoints (auto-categorization rules)
  async getKeywords(params: {
    category_id?: number;
    is_active?: boolean;
    search?: string;
    skip?: number;
    limit?: number;
  } = {}): Promise<any> {
    return this.client!.get('/api/keywords', { params });
  }

  async getKeyword(id: number | string): Promise<any> {
    return this.client!.get(`/api/keywords/${id}`);
  }

  async getKeywordsCount(): Promise<any> {
    return this.client!.get('/api/keywords/count');
  }

  async getBuiltinKeywords(params: { search?: string; limit?: number } = {}): Promise<any> {
    return this.client!.get('/api/keywords/builtin', { params });
  }

  async createKeyword(data: {
    keyword: string;
    category_id: number;
    priority?: number;
    match_mode?: 'contains' | 'starts_with' | 'exact';
  }): Promise<any> {
    return this.client!.post('/api/keywords', data);
  }

  async bulkCreateKeywords(keywords: Array<{
    keyword: string;
    category_id: number;
    priority?: number;
    match_mode?: 'contains' | 'starts_with' | 'exact';
  }>): Promise<any> {
    return this.client!.post('/api/keywords/bulk', { keywords });
  }

  async updateKeyword(id: number | string, data: {
    keyword?: string;
    category_id?: number;
    priority?: number;
    match_mode?: 'contains' | 'starts_with' | 'exact';
    is_active?: boolean;
  }): Promise<any> {
    return this.client!.put(`/api/keywords/${id}`, data);
  }

  async deleteKeyword(id: number | string): Promise<any> {
    return this.client!.delete(`/api/keywords/${id}`);
  }

  async deleteAllKeywords(): Promise<any> {
    return this.client!.delete('/api/keywords');
  }

  async testKeyword(text: string): Promise<any> {
    return this.client!.post('/api/keywords/test', { text });
  }

  async suggestKeywords(limit: number = 50): Promise<any> {
    return this.client!.post('/api/keywords/suggest', null, { params: { limit } });
  }

  async recategorizeTransactions(options: {
    onlyUncategorized?: boolean;
    dryRun?: boolean;
  } = {}): Promise<any> {
    return this.client!.post('/api/keywords/recategorize', null, {
      params: {
        only_uncategorized: options.onlyUncategorized !== false,
        dry_run: options.dryRun || false,
      },
    });
  }

  // Transaction endpoints
  async getTransactions(params: any = {}): Promise<any> {
    return this.client!.get('/api/transactions', { params });
  }

  async getTransaction(id: number | string): Promise<any> {
    return this.client!.get(`/api/transactions/${id}`);
  }

  async createTransaction(data: any): Promise<any> {
    return this.client!.post('/api/transactions', data);
  }

  async updateTransaction(id: number | string, data: any): Promise<any> {
    return this.client!.put(`/api/transactions/${id}`, data);
  }

  async deleteTransaction(id: number | string): Promise<any> {
    return this.client!.delete(`/api/transactions/${id}`);
  }

  // Budget endpoints
  async getBudgets(params: any = {}): Promise<any> {
    return this.client!.get('/api/budgets', { params });
  }

  async getBudgetsWithProgress(params: any = {}): Promise<any> {
    return this.client!.get('/api/budgets/progress', { params });
  }

  async getBudget(id: number | string): Promise<any> {
    return this.client!.get(`/api/budgets/${id}`);
  }

  async createBudget(data: any): Promise<any> {
    return this.client!.post('/api/budgets', data);
  }

  async updateBudget(id: number | string, data: any): Promise<any> {
    return this.client!.put(`/api/budgets/${id}`, data);
  }

  async deleteBudget(id: number | string): Promise<any> {
    return this.client!.delete(`/api/budgets/${id}`);
  }

  // Goal endpoints
  async getGoals(params: any = {}): Promise<any> {
    return this.client!.get('/api/goals', { params });
  }

  async getGoalsWithProgress(params: any = {}): Promise<any> {
    return this.client!.get('/api/goals/progress', { params });
  }

  async getGoalsSummary(): Promise<any> {
    return this.client!.get('/api/goals/summary');
  }

  async getGoal(id: number | string): Promise<any> {
    return this.client!.get(`/api/goals/${id}`);
  }

  async createGoal(data: any): Promise<any> {
    return this.client!.post('/api/goals', data);
  }

  async updateGoal(id: number | string, data: any): Promise<any> {
    return this.client!.put(`/api/goals/${id}`, data);
  }

  async contributeToGoal(id: number | string, amount: number): Promise<any> {
    return this.client!.patch(`/api/goals/${id}/contribute`, null, {
      params: { amount }
    });
  }

  async deleteGoal(id: number | string): Promise<any> {
    return this.client!.delete(`/api/goals/${id}`);
  }

  // Income Schedule endpoints
  async getIncomeSchedules(params: any = {}): Promise<any> {
    return this.client!.get('/api/income-schedules', { params });
  }

  async getUpcomingIncome(days: number = 30): Promise<any> {
    return this.client!.get('/api/income-schedules/upcoming', { params: { days } });
  }

  async getIncomeSummary(period: string = 'month'): Promise<any> {
    return this.client!.get('/api/income-schedules/summary', { params: { period } });
  }

  async getIncomeSchedule(id: number | string): Promise<any> {
    return this.client!.get(`/api/income-schedules/${id}`);
  }

  async createIncomeSchedule(data: any): Promise<any> {
    return this.client!.post('/api/income-schedules', data);
  }

  async updateIncomeSchedule(id: number | string, data: any): Promise<any> {
    return this.client!.put(`/api/income-schedules/${id}`, data);
  }

  async advanceIncomeSchedule(id: number | string): Promise<any> {
    return this.client!.patch(`/api/income-schedules/${id}/advance`);
  }

  async deleteIncomeSchedule(id: number | string): Promise<any> {
    return this.client!.delete(`/api/income-schedules/${id}`);
  }

  // Reports endpoints
  async getSpendingByCategory(params: any): Promise<any> {
    return this.client!.get('/api/reports/spending-by-category', { params });
  }

  async getIncomeVsExpenses(params: any): Promise<any> {
    return this.client!.get('/api/reports/income-vs-expenses', { params });
  }

  async getAccountBalances(): Promise<any> {
    return this.client!.get('/api/reports/account-balances');
  }

  async getBalanceTrend(params: any): Promise<any> {
    return this.client!.get('/api/reports/balance-trend', { params });
  }

  async getMoneyFlow(params: any): Promise<any> {
    return this.client!.get('/api/reports/money-flow', { params });
  }

  // Import endpoints
  async previewImport(
    file: File, 
    accountId: number, 
    dateFormat: string = '%m/%d/%Y',
    flipTypes?: boolean
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('account_id', accountId.toString());
    formData.append('date_format', dateFormat);
    
    // Only include flip_types if explicitly set (not undefined)
    if (flipTypes !== undefined) {
      formData.append('flip_types', flipTypes.toString());
    }
    
    return this.client!.post('/api/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async executeImport(
    file: File,
    accountId: number,
    options: {
      defaultCategoryId?: number;
      skipDuplicates?: boolean;
      dateFormat?: string;
      autoCategorize?: boolean;
      flipTypes?: boolean;
    } = {}
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('account_id', accountId.toString());
    formData.append('skip_duplicates', (options.skipDuplicates !== false).toString());
    formData.append('date_format', options.dateFormat || '%m/%d/%Y');
    formData.append('auto_categorize', (options.autoCategorize !== false).toString());
    
    if (options.defaultCategoryId) {
      formData.append('default_category_id', options.defaultCategoryId.toString());
    }
    
    // Only include flip_types if explicitly set (not undefined)
    if (options.flipTypes !== undefined) {
      formData.append('flip_types', options.flipTypes.toString());
    }
    
    return this.client!.post('/api/import/execute', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async getImportFormats(): Promise<any> {
    return this.client!.get('/api/import/formats');
  }

  // Health check
  async checkHealth(): Promise<any> {
    return this.client!.get('/health');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
