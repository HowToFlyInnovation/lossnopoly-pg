import React from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import LoginLogo from "@/assets/LoginLogo.png";
import LoginBackground from "@/assets/LoginBackground.png";

// Define the component as a Functional Component with React.FC
const LoginPage: React.FC = () => {
  // Type the state variables
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [showPassword, setShowPassword] = React.useState<boolean>(false);

  // Type the event for the password toggle button
  const handlePasswordToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent form submission on button click
    setShowPassword(!showPassword);
  };

  // Type the event for the form submission
  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Handle login logic here, for example:
    console.log("Logging in with:", { email, password });
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
        <form className="space-y-6" onSubmit={handleLogin}>
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
              // Type the change event
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              className="w-full p-2 mt-1 text-gray-100 bg-transparent border-b-2 border-gray-300 focus:outline-none focus:border-blue-400"
              placeholder="you@example.com"
              required
            />
          </div>
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
              // Type the change event
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPassword(e.target.value)
              }
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

export default LoginPage;
