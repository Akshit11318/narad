import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import Layout from './components/Layout';
import ManagerLogin from './components/ManagerLogin';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import Login from './pages/Login';
import VoterDashboard from './pages/voter/VoterDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import VoterSignup from './components/VoterSignup';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/login" replace />} />
            <Route path="login" element={<Login />} />
            <Route path="voter/signup" element={<VoterSignup />} />
            <Route path="/manager/login" element={<ManagerLogin />} />
            <Route 
              path="/manager/dashboard" 
              element={
                <ProtectedRoute role="manager">
                  <ManagerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/voter/dashboard"
              element={
                <ProtectedRoute role="voter">
                  <VoterDashboard />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;