import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import electionReducer from './slices/electionSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    election: electionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;