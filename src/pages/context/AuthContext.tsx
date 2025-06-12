// src/pages/context/AuthContext.tsx
import React, { createContext, useReducer, useEffect } from "react";
import { auth } from "../firebase/config"; // Ensure this path is correct
import { onAuthStateChanged } from "firebase/auth"; // Import onAuthStateChanged
import type { User } from "firebase/auth"; // Changed to import type

// 1. Define the type for your authentication state
interface AuthState {
  user: User | null; // Firebase User object or null if not logged in
  authIsReady: boolean;
}

// 2. Define the types for your actions
type AuthAction =
  | { type: "LOGIN"; payload: User }
  | { type: "LOGOUT" }
  | { type: "AUTH_IS_READY"; payload: User | null };

// 3. Define the type for the AuthContext value
// This is what will be provided by the context and consumed by useContext
interface AuthContextType extends AuthState {
  dispatch: React.Dispatch<AuthAction>;
}

// Create context with a default value that matches AuthContextType or null
// The non-null assertion `as AuthContextType` tells TypeScript it will be provided correctly
export const AuthContext = createContext<AuthContextType | null>(null);

export const authReducer = (
  state: AuthState,
  action: AuthAction
): AuthState => {
  switch (action.type) {
    case "LOGIN":
      return { ...state, user: action.payload };
    case "LOGOUT":
      return { ...state, user: null };
    case "AUTH_IS_READY":
      return { user: action.payload, authIsReady: true };
    default:
      return state;
  }
};

export const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    authIsReady: false,
  });

  useEffect(() => {
    // This listener will fire when the auth state changes (e.g., user logs in/out)
    const unsub = onAuthStateChanged(auth, (user) => {
      // Dispatch AUTH_IS_READY with the current user (or null)
      dispatch({ type: "AUTH_IS_READY", payload: user });
      unsub(); // Unsubscribe after the initial check
    });

    // Cleanup function for the effect
    return () => unsub(); // Ensure unsub is called if component unmounts earlier
  }, []);

  console.log("AuthContext state:", state);

  return (
    // Provide the state and dispatch to the context consumers
    <AuthContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};
