import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Modal, Button } from "../ui";
import { useAuth } from "../../contexts/AuthContext";
import { UI_CONSTANTS } from "../../utils/constants";

interface SessionTimeoutWarningProps {
  isOpen: boolean;
  onExtendSession: () => void;
  onLogout: () => void;
  remainingTime: number;
}

export function SessionTimeoutWarning({
  isOpen,
  onExtendSession,
  onLogout,
  remainingTime,
}: SessionTimeoutWarningProps) {
  const [timeLeft, setTimeLeft] = useState(remainingTime);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onLogout]);

  useEffect(() => {
    setTimeLeft(remainingTime);
  }, [remainingTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onExtendSession}
      title="Session Timeout Warning"
      showCloseButton={false}
    >
      <div className="text-center py-4">
        {/* Warning Icon */}
        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-yellow-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <h3 className="text-xl font-semibold text-white mb-2">
          Your session is about to expire
        </h3>

        <p className="text-gray-400 mb-6">
          For security reasons, you will be automatically logged out in:
        </p>

        {/* Countdown Timer */}
        <motion.div
          className="text-3xl font-bold text-yellow-400 mb-6"
          animate={{ scale: timeLeft <= 10 ? [1, 1.1, 1] : 1 }}
          transition={{
            repeat: timeLeft <= 10 ? Infinity : 0,
            duration: 1,
            ease: "easeInOut",
          }}
        >
          {formatTime(timeLeft)}
        </motion.div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-6">
          <motion.div
            className={`h-2 rounded-full transition-colors ${
              timeLeft <= 30
                ? "bg-red-500"
                : timeLeft <= 60
                ? "bg-yellow-500"
                : "bg-blue-500"
            }`}
            style={{
              width: `${(timeLeft / remainingTime) * 100}%`,
            }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Click "Stay Signed In" to extend your session, or you will be
          automatically logged out.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onLogout} size="sm">
            Logout Now
          </Button>
          <Button variant="primary" onClick={onExtendSession} size="sm">
            Stay Signed In
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Hook to manage session timeout
export function useSessionTimeout() {
  const { logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [warningTime, setWarningTime] = useState(120); // 2 minutes warning
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, []);

  // Check for session timeout
  useEffect(() => {
    const checkTimeout = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;
      const timeUntilTimeout =
        UI_CONSTANTS.INACTIVITY_TIMEOUT - timeSinceActivity;

      if (timeUntilTimeout <= warningTime * 1000 && timeUntilTimeout > 0) {
        if (!showWarning) {
          setShowWarning(true);
        }
      } else if (timeUntilTimeout <= 0) {
        handleLogout();
      } else {
        setShowWarning(false);
      }
    };

    const interval = setInterval(checkTimeout, 1000);
    return () => clearInterval(interval);
  }, [lastActivity, showWarning, warningTime]);

  const handleExtendSession = async () => {
    try {
      // await refreshToken();
      setLastActivity(Date.now());
      setShowWarning(false);
    } catch (error) {
      console.error("Failed to refresh token:", error);
      handleLogout();
    }
  };

  const handleLogout = () => {
    setShowWarning(false);
    logout();
  };

  const getRemainingTime = () => {
    const now = Date.now();
    const timeSinceActivity = now - lastActivity;
    const timeUntilTimeout =
      UI_CONSTANTS.INACTIVITY_TIMEOUT - timeSinceActivity;
    return Math.max(0, Math.floor(timeUntilTimeout / 1000));
  };

  return {
    showWarning,
    remainingTime: getRemainingTime(),
    onExtendSession: handleExtendSession,
    onLogout: handleLogout,
  };
}
