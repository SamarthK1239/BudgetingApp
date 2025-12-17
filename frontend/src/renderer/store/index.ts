/**
 * Redux Store Configuration
 */

import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import accountsReducer from './slices/accountsSlice';
import categoriesReducer from './slices/categoriesSlice';
import transactionsReducer from './slices/transactionsSlice';
import budgetsReducer from './slices/budgetsSlice';
import goalsReducer from './slices/goalsSlice';
import incomeSchedulesReducer from './slices/incomeSchedulesSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    accounts: accountsReducer,
    categories: categoriesReducer,
    transactions: transactionsReducer,
    budgets: budgetsReducer,
    goals: goalsReducer,
    incomeSchedules: incomeSchedulesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
