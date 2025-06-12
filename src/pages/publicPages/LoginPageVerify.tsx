// src/pages/publicPages/LoginPage.tsx
import React from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import LoginLogo from "@/assets/LoginLogo.png";
import LoginBackground from "@/assets/LoginBackground.png";
import { auth, db } from "../firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
// Import the necessary Firestore functions
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";

const LoginPageVerify: React.FC = () => {
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();

  const handlePasswordToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (user) {
        // --- ✨ NEW FRONT-END LOGIC ✨ ---
        const playerDocRef = doc(db, "players", user.uid);
        const playerDocSnap = await getDoc(playerDocRef);

        if (playerDocSnap.exists()) {
          // Document exists: This is a returning user.
          // Update their last login time and increment login count.
          await updateDoc(playerDocRef, {
            lastLogin: serverTimestamp(),
            loginCount: increment(1),
          });
          console.log("Player stats updated for returning user:", user.uid);
        } else {
          // Document does not exist: This is a new user's first login.
          // Create the player document.
          await setDoc(playerDocRef, {
            userId: user.uid,
            email: user.email || "",
            displayName: user.displayName || "Anonymous", // Get displayName set during registration
            profilePic:
              "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
            lastLogin: serverTimestamp(),
            loginCount: 1, // First login
            createdAt: serverTimestamp(),
          });
          console.log("New player document created for user:", user.uid);
        }
        // --- END OF NEW LOGIC ---

        navigate("/homepage");
      }
    } catch (err: any) {
      console.error("Login error:", err.message);
      setError(err.message);
    }
  };

  // ... rest of your component JSX
  return (
    <div
      className="flex items-center justify-center min-h-screen w-screen bg-center bg-fixed"
      style={{ background: `url(${LoginBackground})`, backgroundSize: "cover" }}
    >
      <div className="w-full max-w-sm p-8 space-y-6 bg-[#AEDEAA]/80 backdrop-blur-lg rounded-xl shadow-lg">
        <div className="flex justify-center">
          <img src={LoginLogo} alt="Logo" className="w-[80%]" />
        </div>
        <p className="text-green-700 mb-8 text-center">
          Thanks for registering. We've sent an email to the provide address.{" "}
          <b>Before login</b>, please{" "}
          <b>click on the verification link in your email</b> to verify it's
          really your email address.
        </p>
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
            className="w-full py-2 px-4 bg-red-400 text-white font-bold rounded-lg transition duration-300"
            style={{ background: "#E7262E" }}
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

export default LoginPageVerify;
