import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks';
import { ROUTES } from '../utils/constants';

export function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout();
        toast.success('Successfully logged out');
        navigate(ROUTES.LOGIN);
      } catch (error) {
        console.error('Logout error:', error);
        toast.error('Error during logout');
        navigate(ROUTES.LOGIN);
      }
    };

    performLogout();
  }, [logout, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-xl p-8">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Logging out...</h2>
          <p className="text-gray-400">
            Please wait while we securely log you out of the system.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
