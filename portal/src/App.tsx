import * as React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SessionTimeoutWarning, useSessionTimeout } from "./components/auth";
import { Login, Register, Dashboard, Voting, Logout, Help, AdminPanel } from "./pages";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { VotingProvider } from "./store/votingStore";
import { ROUTES } from "./utils/constants";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (adminOnly && role !== "admin") {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <>{children}</>;
}

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

function PublicRoute({ children, redirectTo = ROUTES.DASHBOARD }: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

function DefaultRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN} replace />;
}

function AppContent() {
  const { showWarning, remainingTime, onExtendSession, onLogout } =
    useSessionTimeout();

  return (
    <>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<PublicRoute><Login /></PublicRoute>} />
        <Route path={ROUTES.REGISTER} element={<PublicRoute redirectTo={ROUTES.LOGIN}><Register /></PublicRoute>} />
        <Route path={ROUTES.DASHBOARD} element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path={ROUTES.VOTING} element={<ProtectedRoute><Voting /></ProtectedRoute>} />
        <Route path={ROUTES.HELP} element={<ProtectedRoute><Help /></ProtectedRoute>} />
        <Route path={ROUTES.ADMIN} element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />
        <Route path={ROUTES.LOGOUT} element={<Logout />} />
        <Route path="/" element={<DefaultRoute />} />
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-white mb-4">404</h1>
                <p className="text-xl text-gray-400 mb-8">Page not found</p>
                <a href={ROUTES.DASHBOARD} className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200">Go to Dashboard</a>
              </div>
            </div>
          }
        />
      </Routes>

      <SessionTimeoutWarning
        isOpen={showWarning}
        onExtendSession={onExtendSession}
        onLogout={onLogout}
        remainingTime={remainingTime}
      />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: "#1f2937", color: "#f3f4f6", border: "1px solid #374151" },
          success: { iconTheme: { primary: "#10b981", secondary: "#f3f4f6" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#f3f4f6" } },
        }}
      />
    </>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <VotingProvider>
            <AppContent />
          </VotingProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
