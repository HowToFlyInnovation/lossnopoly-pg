import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// 1. Import the AuthContextProvider from your context file
import { AuthContextProvider } from "./pages/context/AuthContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* 2. Wrap your entire App component with the provider */}
    {/* This makes the authentication state available to all components */}
    <AuthContextProvider>
      <App />
    </AuthContextProvider>
  </React.StrictMode>
);
