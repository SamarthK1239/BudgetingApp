import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IncomeSchedule, UpcomingIncome } from '../../../shared/types';

interface IncomeSchedulesState {
  schedules: IncomeSchedule[];
  upcomingIncome: UpcomingIncome[];
  selectedScheduleId: number | null;
  loading: boolean;
  error: string | null;
}

const initialState: IncomeSchedulesState = {
  schedules: [],
  upcomingIncome: [],
  selectedScheduleId: null,
  loading: false,
  error: null,
};

const incomeSchedulesSlice = createSlice({
  name: 'incomeSchedules',
  initialState,
  reducers: {
    setSchedules: (state, action: PayloadAction<IncomeSchedule[]>) => {
      state.schedules = action.payload;
    },
    setUpcomingIncome: (state, action: PayloadAction<UpcomingIncome[]>) => {
      state.upcomingIncome = action.payload;
    },
    setSelectedScheduleId: (state, action: PayloadAction<number | null>) => {
      state.selectedScheduleId = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    addSchedule: (state, action: PayloadAction<IncomeSchedule>) => {
      state.schedules.push(action.payload);
    },
    updateSchedule: (state, action: PayloadAction<IncomeSchedule>) => {
      const index = state.schedules.findIndex((s) => s.id === action.payload.id);
      if (index !== -1) {
        state.schedules[index] = action.payload;
      }
    },
    removeSchedule: (state, action: PayloadAction<number>) => {
      state.schedules = state.schedules.filter((s) => s.id !== action.payload);
    },
  },
});

export const {
  setSchedules,
  setUpcomingIncome,
  setSelectedScheduleId,
  setLoading,
  setError,
  addSchedule,
  updateSchedule,
  removeSchedule,
} = incomeSchedulesSlice.actions;

export default incomeSchedulesSlice.reducer;
