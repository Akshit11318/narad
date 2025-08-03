import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/auth';
import { Layout } from '../components/layout';
import { ROUTES } from '../utils/constants';

export function Login() {
  const navigate = useNavigate();

  const handleSwitchToRegister = () => {
    navigate(ROUTES.REGISTER);
  };

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Welcome Message */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                NARAD
              </span>
            </h1>
            <p className="text-gray-400">Secure • Transparent • Democratic</p>
          </motion.div>

          {/* Login Form */}
          <LoginForm onSwitchToRegister={handleSwitchToRegister} />

          {/* Footer Info */}
          <motion.div
            className="text-center mt-8 text-sm text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <p>Powered by blockchain technology</p>
            <p className="mt-1">Your vote is encrypted and secure</p>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
