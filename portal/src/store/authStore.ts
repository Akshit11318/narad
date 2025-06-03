import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthState, LoginCredentials, RegisterData } from '../types';
import { STORAGE_KEYS, API_ENDPOINTS, ERROR_MESSAGES, DEMO_CREDENTIALS } from '../utils/constants';

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
}

const getBackendUrl = () => {
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      token: null,      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });

        try {
          // Use demo credentials only (skip backend authentication)
          const demoUser = DEMO_CREDENTIALS.DEMO_USERS.find(
            user => user.voterId === credentials.voterId && user.password === credentials.password
          );

          if (demoUser) {
            console.log('Using demo credentials for login');
            const mockToken = `demo_token_${Date.now()}`;
            
            set({
              user: {
                id: demoUser.voterId,
                voterId: demoUser.voterId,
                name: demoUser.name,
                email: `${demoUser.voterId.toLowerCase()}@demo.com`,
                hasVoted: false,
              },
              token: mockToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            
            console.log('Demo user logged in successfully:', demoUser.name);
            return;
          }

          // If credentials don't match demo users, show error
          set({
            isLoading: false,
            error: 'Invalid credentials. Please use demo credentials.',
            isAuthenticated: false,
            user: null,
            token: null,
          });
          throw new Error('Invalid credentials');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            token: null,
          });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${getBackendUrl()}${API_ENDPOINTS.REGISTER}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: data.name,
              email: data.email,
              phone: data.phone,
              voterId: data.voterId,
              password: data.password,
            }),
          });

          if (!response.ok) {
            if (response.status === 409) {
              throw new Error('Voter ID or email already exists');
            }
            throw new Error(ERROR_MESSAGES.SERVER_ERROR);
          }

          const result = await response.json();
          
          set({
            user: result.user,
            token: result.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          console.log('User registered successfully:', result.user.voterId);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.NETWORK_ERROR;
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            token: null,
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          token: null,
          error: null,
        });

        // Clear additional storage
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.ELECTION_PARAMS);
        
        console.log('User logged out');
      },      refreshToken: async () => {
        // For demo mode, no need to refresh tokens
        // Just keep the existing token valid
        const currentState = get();
        if (currentState.isAuthenticated && currentState.token) {
          console.log('Demo mode: Token refresh skipped');
          return;
        }
        
        // If not authenticated, logout
        get().logout();
      },

      clearError: () => {
        set({ error: null });
      },

      setUser: (user: User) => {
        set({ user });
      },

      setToken: (token: string) => {
        set({ token });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Auto-refresh token on store initialization
if (typeof window !== 'undefined') {
  const store = useAuthStore.getState();
  if (store.isAuthenticated && store.token) {
    // Check token validity on app start
    store.refreshToken().catch(() => {
      console.log('Token refresh failed on app start');
    });
  }
}
