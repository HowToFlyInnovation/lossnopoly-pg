// src/pages/publicPages/RegisterPage.tsx
import React from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import LoginLogo from "@/assets/LoginLogo.png";
import LoginBackground from "@/assets/LoginBackground.png";
import { auth, db } from "../firebase/config"; // Import auth and db instances
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  type ActionCodeSettings, // Corrected: Use 'type' for type-only imports
} from "firebase/auth"; // Import Firebase auth functions
import {
  getDocs,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore"; // Import Firestore functions
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

    // --- Prepare common data for logging ---
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

    const logFailedRegistration = async (errorMessage: string) => {
      const failedRegistrationData = {
        ...commonLogData,
        registrationError: errorMessage,
      };
      await addDoc(
        collection(db, "failedRegistrations"),
        failedRegistrationData
      );
    };
    // --- End of logging logic ---

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      await logFailedRegistration("Passwords do not match.");
      return;
    }

    // --- [NEW] Password Validation Logic ---
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    const numberRegex = /\d/;

    if (password.length < 8) {
      const errorMessage = "Password must be at least 8 characters long.";
      setError(errorMessage);
      await logFailedRegistration(errorMessage);
      return;
    }

    if (!numberRegex.test(password)) {
      const errorMessage = "Password must include at least one number.";
      setError(errorMessage);
      await logFailedRegistration(errorMessage);
      return;
    }

    if (!specialCharRegex.test(password)) {
      const errorMessage =
        "Password must include at least one special character (e.g., !@#$%).";
      setError(errorMessage);
      await logFailedRegistration(errorMessage);
      return;
    }

    // --- Check if email is in the inviteList ---
    try {
      const inviteListRef = collection(db, "inviteList");
      const q = query(inviteListRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Your email address is not on the invitation list.");
        await logFailedRegistration(
          "Attempted registration with a non-invited email: " + email
        );
        return;
      }
    } catch (checkError: any) {
      console.error("Error checking invitation list:", checkError);
      setError(
        "An error occurred while verifying your email. Please try again."
      );
      await logFailedRegistration(
        `Server error during invitation list check: ${checkError.message}`
      );
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

        // --- ADDED: actionCodeSettings ---
        // This tells Firebase where to redirect the user AFTER they click the email link.
        const actionCodeSettings: ActionCodeSettings = {
          url: `${window.location.origin}/`, // Redirect to the login page (root)
          handleCodeInApp: true,
        };

        // Send email verification WITH the settings
        await sendEmailVerification(user, actionCodeSettings);

        // Redirect user to the login page to show the "check your email" message
        navigate("/", {
          replace: true,
          state: { showVerificationMessage: true },
        });
      }
    } catch (err: any) {
      console.error("Registration error:", err.message);
      const friendlyError =
        err.code === "auth/email-already-in-use"
          ? "This email address is already registered."
          : "An unexpected error occurred during registration.";
      setError(friendlyError);
      await logFailedRegistration(err.message);
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
          <div>
            <label
              htmlFor="password"
              className="text-sm font-bold text-gray-800 block"
            >
              Choose Password
            </label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                className="w-full p-2 text-gray-800 bg-transparent border-b-2 border-gray-300 focus:outline-none focus:border-blue-400 rounded-md"
                placeholder="********"
                required
              />
              <button
                type="button"
                onClick={handlePasswordToggle}
                className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-600 hover:text-blue-400"
                style={{ background: "rgba(0,0,0,0)", border: "none" }}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <p className="text-[9px] text-gray-700 mt-1">
              Use 8 or more characters with a mix of letters, numbers & symbols.
            </p>
          </div>
          {/* Confirm Password Input */}
          <div>
            <label
              htmlFor="confirm-password"
              className="text-sm font-bold text-gray-800 block"
            >
              Confirm Password
            </label>
            <div className="relative mt-1">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirm-password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfirmPassword(e.target.value)
                }
                className="w-full p-2 text-gray-800 bg-transparent border-b-2 border-gray-300 focus:outline-none focus:border-blue-400 rounded-md"
                placeholder="********"
                required
              />
              <button
                type="button"
                onClick={handleConfirmPasswordToggle}
                className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-600 hover:text-blue-400"
                style={{ background: "rgba(0,0,0,0)", border: "none" }}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
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

          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

          {/* Register Button */}
          <button
            type="submit"
            className="w-full py-2 px-4 bg-monopoly-red hover:bg-monopoly-red-darker text-white font-bold rounded-lg transition duration-300 cursor-pointer mt-6"
            style={{ background: "#E7262E" }}
          >
            Register
          </button>

          {/* Already registered link */}
          <div className="text-center mt-4">
            <a href="/" className="text-sm" style={{ color: "black" }}>
              Already registered? Login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
