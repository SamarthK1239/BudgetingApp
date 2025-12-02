/**
 * App Slice
 * Global application state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppState {
  isSetupComplete: boolean;
  backendUrl: string | null;
  theme: 'light' | 'dark' | 'auto';
  currency: string;
  dateFormat: string;
}

const initialState: AppState = {
  isSetupComplete: false,
  backendUrl: null,
  theme: 'auto',
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setSetupComplete(state, action: PayloadAction<boolean>) {
      state.isSetupComplete = action.payload;
    },
    setBackendUrl(state, action: PayloadAction<string>) {
      state.backendUrl = action.payload;
    },
    setTheme(state, action: PayloadAction<'light' | 'dark' | 'auto'>) {
      state.theme = action.payload;
    },
    setCurrency(state, action: PayloadAction<string>) {
      state.currency = action.payload;
    },
    setDateFormat(state, action: PayloadAction<string>) {
      state.dateFormat = action.payload;
    },
  },
});

export const { setSetupComplete, setBackendUrl, setTheme, setCurrency, setDateFormat } =
  appSlice.actions;

export default appSlice.reducer;
