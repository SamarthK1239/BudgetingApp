/**
 * Accounts Slice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Account } from '../../../shared/types';

interface AccountsState {
  accounts: Account[];
  selectedAccountId: number | null;
}

const initialState: AccountsState = {
  accounts: [],
  selectedAccountId: null,
};

const accountsSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    setAccounts(state, action: PayloadAction<Account[]>) {
      state.accounts = action.payload;
    },
    addAccount(state, action: PayloadAction<Account>) {
      state.accounts.push(action.payload);
    },
    updateAccount(state, action: PayloadAction<Account>) {
      const index = state.accounts.findIndex((acc) => acc.id === action.payload.id);
      if (index !== -1) {
        state.accounts[index] = action.payload;
      }
    },
    removeAccount(state, action: PayloadAction<number>) {
      state.accounts = state.accounts.filter((acc) => acc.id !== action.payload);
    },
    setSelectedAccount(state, action: PayloadAction<number | null>) {
      state.selectedAccountId = action.payload;
    },
  },
});

export const { setAccounts, addAccount, updateAccount, removeAccount, setSelectedAccount } =
  accountsSlice.actions;

export default accountsSlice.reducer;
