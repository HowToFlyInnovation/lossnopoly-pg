/*
This is an altered file: src/App.tsx
*/
// src/App.tsx
import React, { useContext, useState, useEffect } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthContext } from "./pages/context/AuthContext";
import { db } from "./pages/firebase/config"; // Import db
import { doc, getDoc } from "firebase/firestore"; // Import doc and getDoc

// Import your page components
import LoginPage from "./pages/publicPages/LoginPage";
import RegisterPage from "./pages/publicPages/RegisterPage";
import ForgotPasswordPage from "./pages/publicPages/ForgotPasswordPage"; // Import the new page
import IdeationPlatform from "./pages/privatePages/IdeationPlatform";
import AdminView from "./pages/privatePages/views/AdminView";

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

  const [menuActive, setMenuActive] = useState(window.innerWidth > 768);
  // Initialize visibleContent. This state will now control the view.
  const [visibleContent, setVisibleContent] = useState("Default");
  const [customTheme] = useState(false);
  const [playerLoginCount, setPlayerLoginCount] = useState<number | null>(null);
  const [isLoadingLoginCount, setIsLoadingLoginCount] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setMenuActive(window.innerWidth > 768);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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
    const fetchLoginCountAndSetInitialContent = async () => {
      if (user && authIsReady) {
        try {
          const playerDocRef = doc(db, "players", user.uid);
          const playerDocSnap = await getDoc(playerDocRef);
          if (playerDocSnap.exists()) {
            const loginCount = playerDocSnap.data().loginCount;
            setPlayerLoginCount(loginCount);
            // Set initial content based on login count
            if (loginCount === 1) {
              setVisibleContent("HomePage");
            } else if (loginCount && loginCount > 1) {
              setVisibleContent("IdeationSpace");
            } else {
              setVisibleContent("Default"); // Fallback for unexpected count
            }
          } else {
            // New user, potentially first login, set to homepage
            setPlayerLoginCount(0);
            setVisibleContent("HomePage");
          }
        } catch (error) {
          console.error("Error fetching login count:", error);
          setPlayerLoginCount(0); // Fallback in case of error
          setVisibleContent("Default"); // Fallback content on error
        } finally {
          setIsLoadingLoginCount(false);
        }
      } else if (authIsReady && !user) {
        setIsLoadingLoginCount(false);
        setVisibleContent("Default"); // No user, reset to public page default
      }
    };

    fetchLoginCountAndSetInitialContent();
  }, [user, authIsReady]);

  // Determine the redirection path after login/auth ready
  // This logic is for the initial URL navigation, not to hardcode IdeationPlatform's visibleContent prop
  let redirectPath = "/";
  if (user && user.emailVerified && !isLoadingLoginCount) {
    if (playerLoginCount === 1) {
      redirectPath = "/homepage";
    } else if (playerLoginCount && playerLoginCount > 1) {
      redirectPath = "/ideationspace";
    } else {
      // If visibleContent is already set by useEffect, navigate to it.
      // Otherwise, default to homepage or a specific default if needed.
      if (visibleContent !== "Default") {
        redirectPath = `/${visibleContent.toLowerCase()}`;
      } else {
        redirectPath = "/homepage"; // Default redirect if no specific content is set by login count
      }
    }
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
                <Navigate to={redirectPath} replace />
              ) : (
                <LoginPage />
              )
            }
          />
          <Route
            path="/register"
            element={
              user && user.emailVerified && !isLoadingLoginCount ? (
                <Navigate to={redirectPath} replace />
              ) : (
                <RegisterPage />
              )
            }
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          {/* --- Private Routes --- */}
          {/* All private routes should now render IdeationPlatform with the shared visibleContent state */}
          <Route
            path="/homepage"
            element={
              <ProtectedRoute>
                <IdeationPlatform
                  customTheme={customTheme}
                  menuActive={menuActive}
                  setMenuActive={setMenuActive}
                  visibleContent={visibleContent} // Pass the state directly
                  setVisibleContent={setVisibleContent} // Pass the state setter
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
                  visibleContent={visibleContent} // Pass the state directly
                  setVisibleContent={setVisibleContent} // Pass the state setter
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dhfjdhfjhufdvspiopzindfoiezubsdkslkhd"
            element={
              <ProtectedRoute>
                <AdminView />
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
                  visibleContent={visibleContent} // Pass the state directly
                  setVisibleContent={setVisibleContent} // Pass the state setter
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
