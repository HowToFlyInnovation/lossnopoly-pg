// src/pages/publicPages/RegisterPage.tsx
import React, { useState, useEffect } from "react";
import { FaEye, FaEyeSlash, FaSpinner } from "react-icons/fa";
import LoginLogo from "@/assets/LoginLogo.png";
import LoginBackground from "@/assets/LoginBackground.jpg";
import { auth, db } from "../firebase/config";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  type ActionCodeSettings,
} from "firebase/auth";
import {
  getDocs,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const RegisterPage: React.FC = () => {
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [confirmPassword, setConfirmPassword] = React.useState<string>("");
  const [codename, setCodename] = React.useState<string>("");
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRegistrationClosed, setIsRegistrationClosed] = useState(false);
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const checkRegistrationDate = async () => {
      const docRef = doc(db, "closingDates", "CloseRegistrationDate");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const closeDate = docSnap.data().date.toDate();
        if (new Date() > closeDate) {
          setIsRegistrationClosed(true);
        }
      }
    };
    checkRegistrationDate();
  }, []);

  const handlePasswordToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShowPassword(!showPassword);
  };

  const handleConfirmPasswordToggle = (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isRegistrationClosed) {
      setError("Registration is now closed.");
      return;
    }
    setError(null);
    setIsLoading(true);

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

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      await logFailedRegistration("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    const numberRegex = /\d/;

    if (password.length < 8) {
      const errorMessage = "Password must be at least 8 characters long.";
      setError(errorMessage);
      await logFailedRegistration(errorMessage);
      setIsLoading(false);
      return;
    }

    if (!numberRegex.test(password)) {
      const errorMessage = "Password must include at least one number.";
      setError(errorMessage);
      await logFailedRegistration(errorMessage);
      setIsLoading(false);
      return;
    }

    if (!specialCharRegex.test(password)) {
      const errorMessage =
        "Password must include at least one special character (e.g., !@#$%).";
      setError(errorMessage);
      await logFailedRegistration(errorMessage);
      setIsLoading(false);
      return;
    }

    try {
      const inviteListRef = collection(db, "inviteList");
      const q = query(inviteListRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Your email address is not on the invitation list.");
        await logFailedRegistration(
          "Attempted registration with a non-invited email: " + email
        );
        setIsLoading(false);
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
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log("Registered user:", user);

      if (user) {
        await updateProfile(user, { displayName: codename });

        // **FIXED**: The URL is now dynamic and will work on localhost and your live domains.
        const actionCodeSettings: ActionCodeSettings = {
          url: `${window.location.origin}/`,
          handleCodeInApp: true,
        };

        await sendEmailVerification(user, actionCodeSettings);

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
      setIsLoading(false);
    }
  };

  const backgroundUrl = LoginBackground;

  return (
    <div
      className={`flex items-center justify-center min-h-screen w-screen ${
        isMobile ? "bg-monopoly-green-light" : "bg-center bg-fixed"
      }`}
      style={{
        backgroundImage: isMobile ? "none" : `url(${backgroundUrl})`,
        backgroundSize: "cover",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        className={
          isMobile
            ? "w-screen h-screen bg-monopoly-green-light flex flex-col justify-center p-8"
            : "w-full max-w-sm p-8 space-y-6 bg-[#AEDEAA]/80 backdrop-blur-lg rounded-xl shadow-lg"
        }
      >
        <div className="flex justify-center">
          <img src={LoginLogo} alt="Logo" className="w-[80%] rounded-lg" />
        </div>
        <form className="space-y-6" onSubmit={handleRegister}>
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
            <p className="text-xs text-gray-700 mt-1">
              Use 8 or more characters with a mix of letters, numbers & symbols.
            </p>
          </div>
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

          <button
            type="submit"
            disabled={isLoading || isRegistrationClosed}
            className="w-full py-2 px-4 bg-monopoly-red hover:bg-monopoly-red-darker text-white font-bold rounded-lg transition duration-300 cursor-pointer mt-6 disabled:opacity-75 disabled:cursor-not-allowed"
            style={{ background: "#E7262E" }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <FaSpinner className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                Processing...
              </div>
            ) : isRegistrationClosed ? (
              "Registration Closed"
            ) : (
              "Register"
            )}
          </button>

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
