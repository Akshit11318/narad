export const API_ENDPOINTS = {
  LOGIN: "/api/voter/login",
  REGISTER: "/api/voter/register",
  ADD_VOTER: "/api/voter/add",
  PROFILE: "/api/voter/profile",
  ALL_VOTERS: "/api/voter/all",
  SUBMIT_VOTE: "/api/blockchain/elections",
  CANDIDATES: "/api/blockchain/elections",
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: "voting_auth_token",
  REFRESH_TOKEN: "voting_refresh_token",
  USER_DATA: "voting_user_data",
  REMEMBER_ME: "voting_remember_me",
  ELECTION_PARAMS: "voting_election_params",
} as const;

export const VALIDATION_RULES = {
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128,
  },
  VOTER_ID: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 128,
    PATTERN: /^[A-Za-z0-9]+$/,
  },
  ELECTION_ID: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 128,
    PATTERN: /^[A-Za-z0-9_-]+$/,
  },
} as const;

export const UI_CONSTANTS = {
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 3000,
  INACTIVITY_TIMEOUT: 15 * 60 * 1000, // 15 minutes
  VOTE_CONFIRMATION_DELAY: 2000,
  LOADING_SKELETON_COUNT: 4,
} as const;

export const THEME_COLORS = {
  PRIMARY: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },
  DARK: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  ACCENT: {
    ELECTRIC_BLUE: "#00d4ff",
    PURPLE: "#8b5cf6",
    SUCCESS: "#10b981",
    ERROR: "#ef4444",
    WARNING: "#f59e0b",
  },
} as const;

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  VOTING: "/voting",
  LOGOUT: "/logout",
  HELP: "/help",
  VERIFY: "/verify",
} as const;

export const ERROR_MESSAGES = {
  ALREADY_VOTED: "You have already voted in this election",
  WASM_LOAD_ERROR: "Failed to load cryptographic module",
  ENCRYPTION_ERROR: "Failed to encrypt vote",
  VOTE_SUBMISSION_ERROR: "Failed to submit vote",
  INVALID_CANDIDATE: "Invalid candidate selection",
  NETWORK_ERROR: "Network connection error",
  AUTHENTICATION_ERROR: "Authentication failed",
  INVALID_CREDENTIALS: "Invalid voter credentials",
  SERVER_ERROR: "Server error occurred",
  VALIDATION_ERROR: "Validation failed",
  VOTER_NOT_FOUND: "Voter not found. Please contact administrator.",
  EMAIL_ALREADY_REGISTERED: "Email already registered",
  VOTER_ALREADY_EXISTS: "Voter already exists for this election",
} as const;
