import React, { createContext, useReducer, useEffect } from "react";
import { auth } from "../firebase/config";
import { onAuthStateChanged, type User } from "firebase/auth";

// 1. Define the type for your authentication state
interface AuthState {
  user: User | null;
  authIsReady: boolean;
}

// 2. Define the types for your actions
type AuthAction =
  | { type: "LOGIN"; payload: User }
  | { type: "LOGOUT" }
  | { type: "AUTH_IS_READY"; payload: User | null };

// 3. Define the type for the AuthContext value
interface AuthContextType extends AuthState {
  dispatch: React.Dispatch<AuthAction>;
}

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
    // This listener stays active to fire whenever auth state changes.
    // This is the correct way to use onAuthStateChanged for persistent login.
    const unsub = onAuthStateChanged(auth, (user) => {
      // Dispatch AUTH_IS_READY with the current user object (or null).
      // The user object contains the `emailVerified` property.
      dispatch({ type: "AUTH_IS_READY", payload: user });
    });

    // Cleanup: Unsubscribe when the component unmounts.
    return () => unsub();
  }, []); // The empty dependency array ensures this effect runs only once on mount.

  console.log("AuthContext state:", state);

  return (
    <AuthContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};
