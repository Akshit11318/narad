import { motion } from 'framer-motion';
import { useAuth } from '../../hooks';

interface HeaderProps {
  showUserInfo?: boolean;
  onHelpClick?: () => void;
}

export function Header({ showUserInfo = true, onHelpClick }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <motion.header
      className="bg-gray-900/95 backdrop-blur-xl border-b border-gray-700 sticky top-0 z-40"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Election Name */}
          <div className="flex items-center space-x-4">
            <motion.div
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">NARAD</h1>
                <p className="text-xs text-gray-400">Secure Voting Portal</p>
              </div>
            </motion.div>

            {/* Election Info */}
            <div className="hidden md:block pl-4 border-l border-gray-700">
              <h2 className="text-sm font-medium text-white">General Election 2025</h2>
              <p className="text-xs text-gray-400">Cast your vote securely</p>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Help Button */}
            {onHelpClick && (
              <motion.button
                onClick={onHelpClick}
                className="p-2 text-gray-400 hover:text-white transition-colors duration-200 rounded-lg hover:bg-gray-800"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </motion.button>
            )}

            {/* User Info and Logout */}
            {showUserInfo && user && (
              <div className="flex items-center space-x-3">
                {/* User Avatar and Info */}
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-gray-400">ID: {user.voterId}</p>
                </div>

                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Logout Button */}
                <motion.button
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors duration-200 rounded-lg hover:bg-gray-800"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  title="Logout"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile User Info */}
      {showUserInfo && user && (
        <div className="sm:hidden px-4 pb-3 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-gray-400">Voter ID: {user.voterId}</p>
            </div>
            <div className="flex items-center space-x-2">
              {user.hasVoted && (
                <span className="px-2 py-1 bg-green-900 text-green-400 text-xs rounded-full">
                  Voted
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 pointer-events-none" />
    </motion.header>
  );
}
