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
    };
  }
}

class ApiClient {
  private baseURL: string | null = null;
  private client: any = null;

  async initialize(): Promise<void> {
    // Get backend URL from Electron
    if (window.electronAPI) {
      this.baseURL = await window.electronAPI.getBackendUrl();
    } else {
      // Fallback for web/dev
      this.baseURL = 'http://localhost:8000';
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config: any) => {
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
        const message = error.response?.data?.detail || error.message || 'An error occurred';
        return Promise.reject(new Error(message));
      }
    );
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
  async previewImport(file: File, accountId: number, dateFormat: string = '%m/%d/%Y'): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('account_id', accountId.toString());
    formData.append('date_format', dateFormat);
    
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
