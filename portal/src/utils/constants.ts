export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  REFRESH: '/api/auth/refresh',
  LOGOUT: '/api/auth/logout',
  USER_PARAMS: '/api/user/params',
  SUBMIT_VOTE: '/api/user/vote',
  CANDIDATES: '/api/user/candidates',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'voting_auth_token',
  REFRESH_TOKEN: 'voting_refresh_token',
  USER_DATA: 'voting_user_data',
  REMEMBER_ME: 'voting_remember_me',
  ELECTION_PARAMS: 'voting_election_params',
} as const;

export const VALIDATION_RULES = {
  VOTER_ID: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 20,
    PATTERN: /^[A-Z0-9]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128,
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z\s]+$/,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PHONE: {
    PATTERN: /^\+?[\d\s-()]+$/,
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
  },
} as const;

export const UI_CONSTANTS = {
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 3000,
  INACTIVITY_TIMEOUT: 15 * 60 * 1000, // 15 minutes
  VOTE_CONFIRMATION_DELAY: 2000,
  LOADING_SKELETON_COUNT: 4,
} as const;

export const CANDIDATE_CONFIG = {
  TOTAL_CANDIDATES: 4,
  DEFAULT_PHOTO: '/assets/default-candidate.jpg',
} as const;

export const THEME_COLORS = {
  PRIMARY: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  DARK: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  ACCENT: {
    ELECTRIC_BLUE: '#00d4ff',
    PURPLE: '#8b5cf6',
    SUCCESS: '#10b981',
    ERROR: '#ef4444',
    WARNING: '#f59e0b',
  },
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  VOTING: '/voting',
  LOGOUT: '/logout',
  HELP: '/help',
  VERIFY: '/verify',
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Invalid credentials. Please try again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  WASM_LOAD_ERROR: 'Failed to load encryption module.',
  ENCRYPTION_ERROR: 'Failed to encrypt vote.',
  VOTE_SUBMISSION_ERROR: 'Failed to submit vote.',
  ALREADY_VOTED: 'You have already voted in this election.',
  ELECTION_NOT_ACTIVE: 'Election is not currently active.',
} as const;

export const DEMO_CREDENTIALS = {
  VOTER_ID: 'DEMO123',
  PASSWORD: 'test123',
  DEMO_USERS: [
    { voterId: 'DEMO123', password: 'test123', name: 'Demo User 1' },
    { voterId: 'TEST456', password: 'test456', name: 'Test User 2' },
    { voterId: 'VOTER789', password: 'vote789', name: 'Sample Voter' },
  ]
} as const;
