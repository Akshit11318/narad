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
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
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

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem("auth_token");

    if (token) {
      try {
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to parse stored user data:", error);
        localStorage.removeItem("auth_token");
      }
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
          throw new Error(
            errorData.error || ERROR_MESSAGES.AUTHENTICATION_ERROR
          );
        }

        const result = await response.json();

        // Store in localStorage
        localStorage.setItem("auth_token", result.token);

        // Update state
        setIsAuthenticated(true);
        setIsLoading(false);
        setError(null);

        navigate(ROUTES.DASHBOARD);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : ERROR_MESSAGES.NETWORK_ERROR;
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
            body: JSON.stringify({
              email: data.email,
              password: data.password,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || ERROR_MESSAGES.SERVER_ERROR);
        }

        const result = await response.json();

        if (result.message === "Voter registered successfully") {
          // After successful registration, automatically log in
          setIsAuthenticated(true);
          setIsLoading(false);
          setError(null);
          navigate(ROUTES.DASHBOARD);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : ERROR_MESSAGES.SERVER_ERROR;
        setError(errorMessage);
        setIsLoading(false);
        setIsAuthenticated(false);

        throw error;
      }
    },
    [navigate]
  );

  const logout = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem("auth_token");

    // Clear state

    setIsAuthenticated(false);
    setError(null);

    console.log("User logged out");
    navigate(ROUTES.LOGIN);
  }, [navigate]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    // State

    isAuthenticated,
    isLoading,
    error,

    // Actions
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
