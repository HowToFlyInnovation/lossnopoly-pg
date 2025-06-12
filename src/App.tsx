// src/App.tsx
import React, { useState, useContext } from "react"; // Import useContext
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// Update import path to .tsx
import {
  AuthContext,
  AuthContextProvider,
} from "./pages/context/AuthContext.tsx";

import LoginPage from "./pages/publicPages/LoginPage.tsx";
import LoginVerifyReminderPage from "./pages/publicPages/LoginVerifyReminderPage.tsx";
import RegisterPage from "./pages/publicPages/RegisterPage.tsx";
import IdeationHomePage from "./pages/privatePages/IdeationHomePage.tsx";

const App: React.FC = () => {
  const [menuActive, setMenuActive] = useState<boolean>(false);
  const [, setVisibleContent] = useState<string>("some-default-view");
  const customTheme = true;

  return (
    <div className="App">
      <BrowserRouter>
        <AuthContextProvider>
          {" "}
          {/* Wrap your routes with AuthContextProvider*/}
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/loginverifyreminderpage"
              element={<LoginVerifyReminderPage />}
            />
            <Route
              path="/homepage"
              element={
                <AuthRoute>
                  {" "}
                  {/* Protect the IdeationHomePage route */}
                  <IdeationHomePage
                    customTheme={customTheme}
                    menuActive={menuActive}
                    setMenuActive={setMenuActive}
                    setVisibleContent={setVisibleContent}
                  />
                </AuthRoute>
              }
            />
          </Routes>
        </AuthContextProvider>
      </BrowserRouter>
    </div>
  );
};

// Component to protect routes based on authentication state
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Explicitly type the context consumption
  const authContext = useContext(AuthContext);

  // Handle the case where authContext is null (e.g., AuthContextProvider not rendered)
  if (!authContext) {
    console.error(
      "AuthContext is not provided. Is AuthContextProvider rendered?"
    );
    // You might want to render an error message or throw an error here
    // For production, you might want a more user-friendly fallback
    return (
      <div>
        Error: Authentication context not available. Please ensure
        AuthContextProvider is rendered.
      </div>
    );
  }

  // Destructure from the now-typed authContext
  const { user, authIsReady } = authContext;

  // If auth is not ready, you might want to show a loading spinner
  if (!authIsReady) {
    return <div>Loading authentication...</div>;
  }

  // If user is logged in, render the children (protected component)
  // Otherwise, redirect to the login page
  return user ? <>{children}</> : <Navigate to="/" />;
};

export default App;
