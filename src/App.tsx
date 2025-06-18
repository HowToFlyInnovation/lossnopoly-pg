// src/App.tsx
import React, { useContext, useState, useEffect } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthContext } from "./pages/context/AuthContext";
import { db } from "./pages/firebase/config"; // Import db
import { doc, getDoc } from "firebase/firestore"; // Import doc and getDoc
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
    return <div>Error: AuthContext not found.</div>; // Handle context not found
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
  const [playerLoginCount, setPlayerLoginCount] = useState<number | null>(null); // New state for login count
  const [isLoadingLoginCount, setIsLoadingLoginCount] = useState(true); // New state for loading

  if (!context) {
    return (
      <div>
        Error: AuthContext not found. Ensure App is wrapped in
        AuthContextProvider.
      </div>
    );
  }

  const { user, authIsReady } = context;

  useEffect(() => {
    const fetchLoginCount = async () => {
      if (user && authIsReady) {
        try {
          const playerDocRef = doc(db, "players", user.uid);
          const playerDocSnap = await getDoc(playerDocRef);
          if (playerDocSnap.exists()) {
            setPlayerLoginCount(playerDocSnap.data().loginCount);
          } else {
            // This case should ideally not happen if login page properly creates the doc
            setPlayerLoginCount(0); // Treat as 0 or handle error appropriately
          }
        } catch (error) {
          console.error("Error fetching login count:", error);
          setPlayerLoginCount(0); // Fallback in case of error
        } finally {
          setIsLoadingLoginCount(false);
        }
      } else if (authIsReady && !user) {
        setIsLoadingLoginCount(false); // No user, so no login count to fetch
      }
    };

    fetchLoginCount();
  }, [user, authIsReady]);

  let initialRedirectPath = "/";

  if (user && user.emailVerified && !isLoadingLoginCount) {
    if (playerLoginCount === 1) {
      initialRedirectPath = "/homepage";
    } else if (playerLoginCount && playerLoginCount > 1) {
      initialRedirectPath = "/ideationspace";
    }
    // If playerLoginCount is null or 0, it means it's not the first successful login yet,
    // or an error occurred, so we'll let the LoginPage handle the display.
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* --- Public Routes --- */}
          <Route
            path="/"
            element={
              user && user.emailVerified && !isLoadingLoginCount ? (
                <Navigate to={initialRedirectPath} replace />
              ) : (
                <LoginPage />
              )
            }
          />
          <Route
            path="/register"
            element={
              user && user.emailVerified && !isLoadingLoginCount ? (
                <Navigate to={initialRedirectPath} replace />
              ) : (
                <RegisterPage />
              )
            }
          />

          {/* --- Private Routes --- */}
          <Route
            path="/homepage"
            element={
              <ProtectedRoute>
                <IdeationPlatform
                  customTheme={customTheme}
                  menuActive={menuActive}
                  setMenuActive={setMenuActive}
                  visibleContent="HomePage" // Ensure HomePageView is displayed
                  setVisibleContent={setVisibleContent}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ideationspace"
            element={
              <ProtectedRoute>
                <IdeationPlatform
                  customTheme={customTheme}
                  menuActive={menuActive}
                  setMenuActive={setMenuActive}
                  visibleContent="IdeationSpace" // Ensure IdeationSpaceView is displayed
                  setVisibleContent={setVisibleContent}
                />
              </ProtectedRoute>
            }
          />
          {/* Default route for any other private content if not explicitly handled */}
          <Route
            path="/private/*"
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
