import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Auth from "./components/Auth";
import Election from "./components/Election";
import "./App.css";

function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );

  const handleSetToken = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            !token ? (
              <Auth setToken={handleSetToken} />
            ) : (
              <Navigate to="/election" replace />
            )
          }
        />
        <Route
          path="/election"
          element={token ? <Election /> : <Navigate to="/" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
