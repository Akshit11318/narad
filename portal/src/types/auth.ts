export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  voterId: string;
  hasVoted: boolean;
}

export interface LoginCredentials {
  voterId: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  voterId: string;
  password: string;
  confirmPassword: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface LoginFormData {
  voterId: string;
  password: string;
  rememberMe: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface AuthContextType {
  authState: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}
