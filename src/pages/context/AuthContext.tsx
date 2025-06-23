// src/pages/context/AuthContext.tsx

import {
  createContext,
  useReducer,
  useEffect,
  type Dispatch,
  useCallback,
  useRef,
} from "react"; // 👈 FIX: Added 'type' keyword and other imports
import { auth } from "../firebase/config";
import { onAuthStateChanged, type User, signOut } from "firebase/auth"; // 👈 FIX: Added 'type' keyword and signOut

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

const INACTIVITY_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

export const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    authIsReady: false,
  });

  const inactivityTimer = useRef<number | null>(null);

  const logoutUser = useCallback(() => {
    signOut(auth).then(() => {
      dispatch({ type: "LOGOUT" });
    });
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    inactivityTimer.current = window.setTimeout(logoutUser, INACTIVITY_TIMEOUT);
  }, [logoutUser]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "scroll", "touchstart"];

    if (state.user) {
      resetInactivityTimer();
      events.forEach((event) => {
        window.addEventListener(event, resetInactivityTimer);
      });
    }

    return () => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [state.user, resetInactivityTimer]);

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
