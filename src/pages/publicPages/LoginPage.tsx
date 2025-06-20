import React, { useContext } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import LoginLogo from "@/assets/LoginLogo.png";
import LoginBackground from "@/assets/LoginBackground.png";
import { auth, db } from "../firebase/config";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { AuthContext, type AuthContextType } from "../context/AuthContext";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useLocation } from "react-router-dom";

const LoginPage: React.FC = () => {
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const { dispatch } = useContext(AuthContext) as AuthContextType;
  const location = useLocation();
  const showVerificationMessage = location.state?.showVerificationMessage;

  const handlePasswordToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Prepare common data for logging
    let locationInfo = {};
    try {
      const response = await fetch("https://ip-api.com/json");
      if (response.ok) {
        const data = await response.json();
        locationInfo = {
          country: data.country,
          city: data.city,
          ip: data.query,
        };
      }
    } catch (locationError) {
      console.error("Could not fetch location", locationError);
      locationInfo = { error: "Location could not be fetched." };
    }

    const commonLogData = {
      Time: serverTimestamp(),
      Email: email,
      browser: navigator.userAgent,
      location: locationInfo,
    };

    // --- [MODIFIED] Check if email is in the inviteList ---
    try {
      const inviteListRef = collection(db, "inviteList");
      const q = query(inviteListRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Your email address is not authorized for access.");
        const failedLoginData = {
          ...commonLogData,
          loginError: "Attempted login with a non-invited email: " + email,
        };
        await addDoc(collection(db, "failedLogins"), failedLoginData);
        return;
      }
    } catch (checkError: any) {
      console.error("Error checking invitation list:", checkError);
      setError(
        "An error occurred while verifying your email. Please try again."
      );
      const failedLoginData = {
        ...commonLogData,
        loginError: `Server error during invitation list check: ${checkError.message}`,
      };
      await addDoc(collection(db, "failedLogins"), failedLoginData);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Check if email is verified
      if (user && !user.emailVerified) {
        setError(
          "Your email has not been verified. Please check your inbox for the verification link."
        );

        // Log the unverified login attempt
        const failedLoginData = {
          ...commonLogData,
          loginError: "Attempted login with unverified email.",
        };
        await addDoc(collection(db, "failedLogins"), failedLoginData);

        // Sign the user out because their email is not yet verified
        await signOut(auth);
        return;
      }

      if (user) {
        // Log successful login
        const successfulLoginData = {
          ...commonLogData,
          DisplayName: user.displayName || "Anonymous",
        };
        await addDoc(collection(db, "successfulLogins"), successfulLoginData);

        // Continue with app logic
        await user.reload();
        if (auth.currentUser) {
          dispatch({ type: "LOGIN", payload: auth.currentUser });
        }
        const playerDocRef = doc(db, "players", user.uid);
        const playerDocSnap = await getDoc(playerDocRef);
        if (playerDocSnap.exists()) {
          await updateDoc(playerDocRef, {
            lastLogin: serverTimestamp(),
            loginCount: increment(1),
          });
        } else {
          await setDoc(playerDocRef, {
            userId: user.uid,
            email: user.email || "",
            displayName: user.displayName || "Anonymous",
            profilePic:
              "https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/20250620_0625_Missing%20Profile%20Picture_remix_01jy5s96pwf6ys44f43035e1jj.jpg?alt=media&token=5365d680-5f3b-4474-81af-b455271590ae",
            lastLogin: serverTimestamp(),
            loginCount: 1,
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (err: any) {
      // Log general failed login (e.g., wrong password)
      console.error("Login error:", err.message);
      setError(err.message);
      const failedLoginData = {
        ...commonLogData,
        loginError: err.message,
      };
      await addDoc(collection(db, "failedLogins"), failedLoginData);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen w-screen bg-center bg-fixed"
      style={{ background: `url(${LoginBackground})`, backgroundSize: "cover" }}
    >
      <div className="w-full max-w-sm p-8 space-y-6 bg-[#AEDEAA]/80 backdrop-blur-lg rounded-xl shadow-lg">
        <div className="flex justify-center">
          <img src={LoginLogo} alt="Logo" className="w-[80%]" />
        </div>
        {showVerificationMessage && (
          <p className="text-green-700 mb-8 text-center">
            Thanks for registering. We've sent an email to the provided address.{" "}
            <b>Before login</b>, please{" "}
            <b>click on the verification link in your email</b> to verify it's
            really your email address.
          </p>
        )}
        <form className="space-y-6" onSubmit={handleLogin}>
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="text-sm font-bold text-gray-200 block"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 mt-1 text-gray-100 bg-transparent border-b-2 border-gray-300 focus:outline-none focus:border-blue-400"
              placeholder="you@example.com"
              required
            />
          </div>
          {/* Password */}
          <div className="relative">
            <label
              htmlFor="password"
              className="text-sm font-bold text-gray-200 block"
            >
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 mt-1 text-gray-100 bg-transparent border-b-2 border-gray-300 focus:outline-none focus:border-blue-400"
              placeholder="********"
              required
            />
            <button
              type="button"
              onClick={handlePasswordToggle}
              className="absolute inset-y-0 right-0 top-7 flex items-center px-2 text-gray-300 hover:text-blue-400 h-[50%]"
              style={{ background: "rgba(0,0,0,0)", border: "none" }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full py-2 px-4 bg-monopoly-red hover:bg-monopoly-red-darker text-white font-bold rounded-lg transition duration-300 cursor-pointer"
          >
            Login
          </button>
          <div className="text-center">
            <a href="#" className="text-sm" style={{ color: "black" }}>
              Forgot your password/reset
            </a>
          </div>
          <div className="text-center">
            <a href="./register" className="text-sm">
              Not yet registered? Register
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
