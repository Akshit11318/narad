import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { ElectionState } from '../../types';
import { api } from '../../api/axios';

const initialState: ElectionState = {
  currentElection: null,
  candidates: [],
  isLoading: false,
  error: null,
};

export const fetchElection = createAsyncThunk(
  'election/fetchElection',
  async (electionId: string) => {
    const response = await axios.get(`/election/${electionId}`);
    return {
      ...response.data,
      id: electionId
    };
  }
);

export const fetchCandidates = createAsyncThunk(
  'election/fetchCandidates',
  async (electionId: string) => {
    const response = await axios.get(`/election/${electionId}/candidates`);
    return response.data;
  }
);

export const fetchCurrentElection = createAsyncThunk(
  'election/fetchCurrentElection',
  async () => {
    const response = await api.get('/election/current');
    return response.data;
  }
);

const electionSlice = createSlice({
  name: 'election',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchElection.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchElection.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentElection = action.payload;
      })
      .addCase(fetchElection.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch election';
      })
      .addCase(fetchCandidates.fulfilled, (state, action) => {
        state.candidates = action.payload;
      });
  },
});

export default electionSlice.reducer;