// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthContextProvider } from "./pages/context/AuthContext.tsx";

// --- START: MODIFICATION ---
import { auth } from "./pages/firebase/config"; // Import the auth instance
import { setPersistence, browserSessionPersistence } from "firebase/auth";

// Set persistence to 'session' right at the application's start.
// This ensures that any subsequent auth state check will obey this rule.
setPersistence(auth, browserSessionPersistence)
  .then(() => {
    // Once persistence is set, render the rest of the application.
    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <AuthContextProvider>
          <App />
        </AuthContextProvider>
      </React.StrictMode>
    );
  })
  .catch((error) => {
    // If setting persistence fails, log the error.
    // You might want to show a message to the user here.
    console.error("Firebase Auth Persistence Error:", error);
  });
