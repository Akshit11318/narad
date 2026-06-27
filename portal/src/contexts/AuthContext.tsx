import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import type { LoginCredentials, RegisterData } from "../types";
import { API_ENDPOINTS, ERROR_MESSAGES, ROUTES } from "../utils/constants";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  role: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getBackendUrl = () => {
  return import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const storedRole = localStorage.getItem("user_role");
    if (token) {
      setIsAuthenticated(true);
      setRole(storedRole);
    }
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${getBackendUrl()}${API_ENDPOINTS.LOGIN}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || ERROR_MESSAGES.AUTHENTICATION_ERROR);
        }

        const result = await response.json();

        // Clear ALL previous user state before setting new
        localStorage.clear();
        sessionStorage.clear();

        localStorage.setItem("auth_token", result.token);
        if (result.role) {
          localStorage.setItem("user_role", result.role);
          setRole(result.role);
        }

        setIsAuthenticated(true);
        setIsLoading(false);
        setError(null);
        navigate(ROUTES.DASHBOARD);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.NETWORK_ERROR;
        setError(errorMessage);
        setIsLoading(false);
        setIsAuthenticated(false);
        throw error;
      }
    },
    [navigate]
  );

  const register = useCallback(
    async (data: RegisterData) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${getBackendUrl()}${API_ENDPOINTS.REGISTER}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: data.email, password: data.password }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || ERROR_MESSAGES.SERVER_ERROR);
        }

        setIsLoading(false);
        setError(null);
        navigate(ROUTES.LOGIN);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SERVER_ERROR;
        setError(errorMessage);
        setIsLoading(false);
        setIsAuthenticated(false);
        throw error;
      }
    },
    [navigate]
  );

  const logout = useCallback(() => {
    // Hard clear everything
    localStorage.clear();
    sessionStorage.clear();

    // Reset all state
    setIsAuthenticated(false);
    setRole(null);
    setError(null);
    setIsLoading(false);

    // Force full page reload to clear all React state (VotingProvider, etc)
    window.location.href = ROUTES.LOGIN;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    error,
    role,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
