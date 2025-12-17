import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Goal, GoalWithProgress } from '../../../shared/types';

interface GoalsState {
  goals: Goal[];
  goalsWithProgress: GoalWithProgress[];
  selectedGoalId: number | null;
  loading: boolean;
  error: string | null;
}

const initialState: GoalsState = {
  goals: [],
  goalsWithProgress: [],
  selectedGoalId: null,
  loading: false,
  error: null,
};

const goalsSlice = createSlice({
  name: 'goals',
  initialState,
  reducers: {
    setGoals: (state, action: PayloadAction<Goal[]>) => {
      state.goals = action.payload;
    },
    setGoalsWithProgress: (state, action: PayloadAction<GoalWithProgress[]>) => {
      state.goalsWithProgress = action.payload;
    },
    setSelectedGoalId: (state, action: PayloadAction<number | null>) => {
      state.selectedGoalId = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    addGoal: (state, action: PayloadAction<Goal>) => {
      state.goals.push(action.payload);
    },
    updateGoal: (state, action: PayloadAction<Goal>) => {
      const index = state.goals.findIndex((g) => g.id === action.payload.id);
      if (index !== -1) {
        state.goals[index] = action.payload;
      }
      const progressIndex = state.goalsWithProgress.findIndex((g) => g.id === action.payload.id);
      if (progressIndex !== -1) {
        state.goalsWithProgress[progressIndex] = {
          ...state.goalsWithProgress[progressIndex],
          ...action.payload,
        };
      }
    },
    removeGoal: (state, action: PayloadAction<number>) => {
      state.goals = state.goals.filter((g) => g.id !== action.payload);
      state.goalsWithProgress = state.goalsWithProgress.filter((g) => g.id !== action.payload);
    },
  },
});

export const {
  setGoals,
  setGoalsWithProgress,
  setSelectedGoalId,
  setLoading,
  setError,
  addGoal,
  updateGoal,
  removeGoal,
} = goalsSlice.actions;

export default goalsSlice.reducer;
