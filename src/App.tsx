// src/App.tsx
import React, { useContext, useState } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthContext } from "./pages/context/AuthContext";
import type { Dispatch, SetStateAction } from "react";

// Import your page components
import LoginPage from "./pages/publicPages/LoginPage";
import RegisterPage from "./pages/publicPages/RegisterPage";
import IdeationPlatform from "./pages/privatePages/IdeationPlatform";

/**
 * A component to protect routes that require authentication.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const context = useContext(AuthContext);

  if (!context) {
    return <Navigate to="/" replace />;
  }

  const { user, authIsReady } = context;

  if (!authIsReady) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If user exists but their email is not verified, redirect to login page with a message
  if (!user.emailVerified) {
    return (
      <Navigate to="/" state={{ showVerificationMessage: true }} replace />
    );
  }

  return <>{children}</>;
};

function App() {
  const context = useContext(AuthContext);

  const [menuActive, setMenuActive] = useState(false);
  const [visibleContent, setVisibleContent] = useState("Default");
  const [customTheme, setCustomTheme] = useState(false);

  if (!context) {
    return (
      <div>
        Error: AuthContext not found. Ensure App is wrapped in
        AuthContextProvider.
      </div>
    );
  }

  const { user } = context;

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* --- Public Routes --- */}
          <Route
            path="/"
            // FIX: Only navigate to homepage if user exists AND is verified.
            // Otherwise, show the LoginPage, which can handle the verification message.
            element={
              user && user.emailVerified ? (
                <Navigate to="/homepage" />
              ) : (
                <LoginPage />
              )
            }
          />
          <Route
            path="/register"
            element={
              user && user.emailVerified ? (
                <Navigate to="/homepage" />
              ) : (
                <RegisterPage />
              )
            }
          />

          {/* --- Private Route --- */}
          <Route
            path="/homepage"
            element={
              <ProtectedRoute>
                <IdeationPlatform
                  customTheme={customTheme}
                  menuActive={menuActive}
                  setMenuActive={setMenuActive}
                  visibleContent={visibleContent}
                  setVisibleContent={setVisibleContent}
                />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
