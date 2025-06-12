import React, { useContext, useState } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthContext } from "./pages/context/AuthContext";
import type { Dispatch, SetStateAction } from "react"; // Good practice to import these types

// Import your page components
import LoginPage from "./pages/publicPages/LoginPage";
import RegisterPage from "./pages/publicPages/RegisterPage";
import IdeationPlatform from "./pages/privatePages/IdeationPlatform"; // .tsx extension is not needed here
import LoginVerifyReminderPage from "./pages/publicPages/LoginPageVerify"; // .tsx extension is not needed here

/**
 * A component to protect routes that require authentication.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const context = useContext(AuthContext);

  // This check is crucial if the context provider might not be available
  if (!context) {
    // This could redirect to an error page or the login page
    return <Navigate to="/" replace />;
  }

  const { user, authIsReady } = context;

  // Show a loading indicator while auth state is being determined
  if (!authIsReady) {
    return <div>Loading...</div>;
  }

  // If auth is ready but there's no user, redirect to login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If user exists but their email is not verified, redirect to verification page
  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  // If all checks pass, render the child components
  return <>{children}</>;
};

function App() {
  const context = useContext(AuthContext);

  // State is now the single source of truth in the App component
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
            element={user ? <Navigate to="/homepage" /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/homepage" /> : <RegisterPage />}
          />

          {/* --- Verify Email Route --- */}
          <Route
            path="/verify-email"
            element={
              !user ? (
                <Navigate to="/" /> // If not logged in, go to login
              ) : user.emailVerified ? (
                <Navigate to="/homepage" /> // If already verified, go to home
              ) : (
                <LoginVerifyReminderPage />
              )
            }
          />

          {/* --- Private Route --- */}
          <Route
            path="/homepage"
            element={
              // FIX: ProtectedRoute is now active, securing this page
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
