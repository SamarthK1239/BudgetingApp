/**
 * Categories Slice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Category } from '../../../shared/types';

interface CategoriesState {
  categories: Category[];
}

const initialState: CategoriesState = {
  categories: [],
};

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    setCategories(state, action: PayloadAction<Category[]>) {
      state.categories = action.payload;
    },
    addCategory(state, action: PayloadAction<Category>) {
      state.categories.push(action.payload);
    },
    updateCategory(state, action: PayloadAction<Category>) {
      const index = state.categories.findIndex((cat) => cat.id === action.payload.id);
      if (index !== -1) {
        state.categories[index] = action.payload;
      }
    },
    removeCategory(state, action: PayloadAction<number>) {
      state.categories = state.categories.filter((cat) => cat.id !== action.payload);
    },
  },
});

export const { setCategories, addCategory, updateCategory, removeCategory } =
  categoriesSlice.actions;

export default categoriesSlice.reducer;
