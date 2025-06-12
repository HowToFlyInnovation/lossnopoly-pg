// src/pages/publicPages/RegisterPage.tsx
import React from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import LoginLogo from "@/assets/LoginLogo.png";
import LoginBackground from "@/assets/LoginBackground.png";
import { auth } from "../firebase/config"; // Import auth instance
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile, // Import updateProfile
} from "firebase/auth"; // Import Firebase auth functions
import { useNavigate } from "react-router-dom"; // Import useNavigate hook

// Define the component as a Functional Component with React.FC
const RegisterPage: React.FC = () => {
  // State variables for form fields
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [confirmPassword, setConfirmPassword] = React.useState<string>("");
  const [codename, setCodename] = React.useState<string>("");
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null); // State for error messages
  const [message, setMessage] = React.useState<string | null>(null); // State for success/info messages
  const navigate = useNavigate(); // Initialize navigate hook

  // Toggle visibility for the main password field
  const handlePasswordToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent form submission on button click
    setShowPassword(!showPassword);
  };

  // Toggle visibility for the confirm password field
  const handleConfirmPasswordToggle = (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault(); // Prevent form submission on button click
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Handle registration logic
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    setMessage(null); // Clear previous messages

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log("Registered user:", user);

      if (user) {
        // Update the user's profile with the codename as displayName
        await updateProfile(user, { displayName: codename });

        // Send email verification
        await sendEmailVerification(user);

        setMessage(
          "Registration successful! A verification email has been sent to your email address. Please verify to log in."
        );
        // Redirect user to the /loginVerifyReminderPage page after successful registration and email sent
        navigate("/loginVerifyReminderPage");
      }
    } catch (err: any) {
      console.error("Registration error:", err.message);
      setError(err.message); // Display Firebase error messages to the user
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen w-screen bg-center bg-fixed"
      style={{
        background: `url(${LoginBackground})`,
        backgroundSize: "cover",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div className="w-full max-w-sm p-8 space-y-6 bg-[#AEDEAA]/80 backdrop-blur-lg rounded-xl shadow-lg">
        <div className="flex justify-center">
          <img src={LoginLogo} alt="Logo" className="w-[80%] rounded-lg" />
        </div>
        <form className="space-y-6" onSubmit={handleRegister}>
          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="text-sm font-bold text-gray-800 block"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              className="w-full p-2 mt-1 text-gray-800 bg-transparent border-b-2 border-gray-300 focus:outline-none focus:border-blue-400 rounded-md"
              placeholder="you@example.com"
              required
            />
          </div>
          {/* Password Input */}
          <div className="relative">
            <label
              htmlFor="password"
              className="text-sm font-bold text-gray-800 block"
            >
              Choose Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPassword(e.target.value)
              }
              className="w-full p-2 mt-1 text-gray-800 bg-transparent border-b-2 border-gray-300 focus:outline-none focus:border-blue-400 rounded-md"
              placeholder="********"
              required
            />
            <button
              type="button"
              onClick={handlePasswordToggle}
              className="absolute inset-y-0 right-0 top-7 flex items-center px-2 text-gray-600 hover:text-blue-400 h-[50%]"
              style={{ background: "rgba(0,0,0,0)", border: "none" }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {/* Confirm Password Input */}
          <div className="relative">
            <label
              htmlFor="confirm-password"
              className="text-sm font-bold text-gray-800 block"
            >
              Confirm Password
            </label>
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirm-password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConfirmPassword(e.target.value)
              }
              className="w-full p-2 mt-1 text-gray-800 bg-transparent border-b-2 border-gray-300 focus:outline-none focus:border-blue-400 rounded-md"
              placeholder="********"
              required
            />
            <button
              type="button"
              onClick={handleConfirmPasswordToggle}
              className="absolute inset-y-0 right-0 top-7 flex items-center px-2 text-gray-600 hover:text-blue-400 h-[50%]"
              style={{ background: "rgba(0,0,0,0)", border: "none" }}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {/* Codename Input */}
          <div>
            <label
              htmlFor="codename"
              className="text-sm font-bold text-gray-800 block"
            >
              Codename (Anonymous)
            </label>
            <input
              type="text"
              id="codename"
              value={codename}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCodename(e.target.value)
              }
              className="w-full p-2 mt-1 text-gray-800 bg-transparent border-b-2 border-gray-300 focus:outline-none focus:border-blue-400 rounded-md"
              placeholder="e.g., Silent Shadow"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}{" "}
          {/* Display success message */}
          {/* Register Button */}
          <button
            type="submit"
            className="w-full py-2 px-4 bg-red-400 text-white font-bold rounded-lg transition duration-300"
            style={{ background: "#E7262E" }}
          >
            Register
          </button>
          {/* Already registered link */}
          <div className="text-center">
            <a href="./" className="text-sm" style={{ color: "black" }}>
              Already registered? Login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
