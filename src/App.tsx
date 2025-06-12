import React, { useContext, useState } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthContext } from "./pages/context/AuthContext";

// Import your page components
import LoginPage from "./pages/publicPages/LoginPage";
import RegisterPage from "./pages/publicPages/RegisterPage";
import IdeationHomePage from "./pages/privatePages/IdeationHomePage";
// Corrected the import path by adding the file extension
import LoginVerifyReminderPage from "./pages/publicPages/LoginPageVerify.tsx";

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

  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};

function App() {
  const context = useContext(AuthContext);

  // State for the IdeationHomePage component
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

          {/* --- CORRECTED VERIFY EMAIL ROUTE --- */}
          <Route
            path="/verify-email"
            element={
              !user ? (
                <Navigate to="/" /> // If not logged in, go to login
              ) : user.emailVerified ? (
                <Navigate to="/homepage" /> // If already verified, go to home
              ) : (
                <LoginVerifyReminderPage />
              ) // Otherwise, show the reminder page
            }
          />

          {/* --- Private Route --- */}
          <Route
            path="/homepage"
            element={
              <ProtectedRoute>
                <IdeationHomePage
                  customTheme={customTheme}
                  menuActive={menuActive}
                  setMenuActive={setMenuActive}
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
