/**
 * Transactions Slice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Transaction, TransactionType } from '../../../shared/types';

interface TransactionsState {
  transactions: Transaction[];
  filters: {
    account_id?: number;
    category_id?: number;
    transaction_type?: TransactionType;
    start_date?: string;
    end_date?: string;
    search?: string;
  };
  selectedTransactionId: number | null;
}

const initialState: TransactionsState = {
  transactions: [],
  filters: {},
  selectedTransactionId: null,
};

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setTransactions(state, action: PayloadAction<Transaction[]>) {
      state.transactions = action.payload;
    },
    addTransaction(state, action: PayloadAction<Transaction>) {
      state.transactions.unshift(action.payload);
    },
    updateTransaction(state, action: PayloadAction<Transaction>) {
      const index = state.transactions.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.transactions[index] = action.payload;
      }
    },
    removeTransaction(state, action: PayloadAction<number>) {
      state.transactions = state.transactions.filter((t) => t.id !== action.payload);
    },
    setFilters(state, action: PayloadAction<TransactionsState['filters']>) {
      state.filters = action.payload;
    },
    clearFilters(state) {
      state.filters = {};
    },
    setSelectedTransaction(state, action: PayloadAction<number | null>) {
      state.selectedTransactionId = action.payload;
    },
  },
});

export const {
  setTransactions,
  addTransaction,
  updateTransaction,
  removeTransaction,
  setFilters,
  clearFilters,
  setSelectedTransaction,
} = transactionsSlice.actions;

export default transactionsSlice.reducer;
