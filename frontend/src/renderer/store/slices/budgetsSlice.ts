/**
 * Budgets Slice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BudgetWithProgress } from '../../../shared/types';

interface BudgetsState {
  budgets: BudgetWithProgress[];
  selectedBudgetId: number | null;
}

const initialState: BudgetsState = {
  budgets: [],
  selectedBudgetId: null,
};

const budgetsSlice = createSlice({
  name: 'budgets',
  initialState,
  reducers: {
    setBudgets(state, action: PayloadAction<BudgetWithProgress[]>) {
      state.budgets = action.payload;
    },
    addBudget(state, action: PayloadAction<BudgetWithProgress>) {
      state.budgets.push(action.payload);
    },
    updateBudget(state, action: PayloadAction<BudgetWithProgress>) {
      const index = state.budgets.findIndex((b) => b.id === action.payload.id);
      if (index !== -1) {
        state.budgets[index] = action.payload;
      }
    },
    removeBudget(state, action: PayloadAction<number>) {
      state.budgets = state.budgets.filter((b) => b.id !== action.payload);
    },
    setSelectedBudget(state, action: PayloadAction<number | null>) {
      state.selectedBudgetId = action.payload;
    },
  },
});

export const {
  setBudgets,
  addBudget,
  updateBudget,
  removeBudget,
  setSelectedBudget,
} = budgetsSlice.actions;

export default budgetsSlice.reducer;
