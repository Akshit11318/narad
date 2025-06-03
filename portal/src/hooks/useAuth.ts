import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { ROUTES, UI_CONSTANTS } from '../utils/constants';
import type { LoginCredentials, RegisterData } from '../types';

export function useAuth() {
  const authStore = useAuthStore();
  const navigate = useNavigate();

  // Auto-logout on inactivity
  useEffect(() => {
    if (!authStore.isAuthenticated) return;

    let inactivityTimer: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.log('Auto-logout due to inactivity');
        authStore.logout();
        navigate(ROUTES.LOGIN);
      }, UI_CONSTANTS.INACTIVITY_TIMEOUT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    // Reset timer on user activity
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    // Initialize timer
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
    };
  }, [authStore.isAuthenticated, authStore.logout, navigate]);

  // Token refresh interval
  useEffect(() => {
    if (!authStore.isAuthenticated || !authStore.token) return;

    const refreshInterval = setInterval(() => {
      authStore.refreshToken().catch((error) => {
        console.error('Token refresh failed:', error);
        authStore.logout();
        navigate(ROUTES.LOGIN);
      });
    }, 14 * 60 * 1000); // Refresh every 14 minutes

    return () => clearInterval(refreshInterval);
  }, [authStore.isAuthenticated, authStore.token, authStore.refreshToken, authStore.logout, navigate]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      await authStore.login(credentials);
      navigate(ROUTES.DASHBOARD);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [authStore.login, navigate]);

  const register = useCallback(async (data: RegisterData) => {
    try {
      await authStore.register(data);
      navigate(ROUTES.DASHBOARD);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }, [authStore.register, navigate]);

  const logout = useCallback(() => {
    authStore.logout();
    navigate(ROUTES.LOGIN);
  }, [authStore.logout, navigate]);

  return {
    // State
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    error: authStore.error,
    
    // Actions
    login,
    register,
    logout,
    clearError: authStore.clearError,
  };
}
