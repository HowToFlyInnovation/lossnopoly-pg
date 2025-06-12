// src/pages/context/AuthContext.tsx

import { createContext, useReducer, useEffect, type Dispatch } from "react"; // 👈 FIX: Added 'type' keyword
import { auth } from "../firebase/config";
import { onAuthStateChanged, type User } from "firebase/auth"; // 👈 FIX: Added 'type' keyword

// Define the shape of the state
export interface AuthState {
  user: User | null;
  authIsReady: boolean;
}

// Define the shape of the actions
export type AuthAction =
  | { type: "LOGIN"; payload: User | null }
  | { type: "LOGOUT" }
  | { type: "AUTH_IS_READY"; payload: User | null };

// Define and export the shape of the context value
export interface AuthContextType extends AuthState {
  dispatch: Dispatch<AuthAction>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const authReducer = (
  state: AuthState,
  action: AuthAction
): AuthState => {
  switch (action.type) {
    case "LOGIN":
      return { ...state, user: action.payload as User };
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
    const unsub = onAuthStateChanged(auth, (user) => {
      dispatch({ type: "AUTH_IS_READY", payload: user });
    });

    return () => unsub();
  }, []);

  console.log("AuthContext state:", state);

  return (
    <AuthContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};
