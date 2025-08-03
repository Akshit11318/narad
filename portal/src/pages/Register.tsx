import { motion } from "framer-motion";
import { Layout } from "../components/layout";
import { RegisterForm } from "../components/auth";

export function Register() {
  const handleSwitchToLogin = () => {
    // Could navigate to login page
    console.log("Switch to login - feature to be implemented");
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
          >
            <h1 className="text-3xl font-bold text-white mb-2">
              Join{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                NARAD
              </span>
            </h1>
            <p className="text-gray-400">
              Register to participate in secure voting
            </p>
          </motion.div>

          {/* Register Form */}
          <RegisterForm onSwitchToLogin={handleSwitchToLogin} />

          {/* Footer Info */}
          <motion.div
            className="text-center mt-8 text-sm text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <p>Your registration is secure and encrypted</p>
            <p className="mt-1">Contact administrator if you need assistance</p>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
