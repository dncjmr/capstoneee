// src/pages/admin/auth/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [type, setType] = useState("error");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await axios.post("http://localhost:5000/api/auth/login", { email, password });
      const { success, token, role, message } = response.data;

      if (success && token) {
        localStorage.setItem("token", token);
        localStorage.setItem("role", role);

        setType("success");
        setMessage("Welcome back! Redirecting...");

        setTimeout(() => {
          if (role === "admin") navigate("/admin/dashboard");
          else if (role === "staff") navigate("/staff/staffdashboard");
          else setMessage("Unknown role returned from server.");
        }, 1000);
      } else {
        setType("error");
        setMessage(message || "Invalid email or password.");
      }
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      setType("error");
      setMessage(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-900 text-gray-100 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 animate-gradient-x"></div>

      {/* Animated Alert */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className={`absolute top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg font-semibold 
              ${type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/40 p-8"
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold tracking-wide text-white">Login</h1>
          <p className="text-gray-300 text-sm mt-1">Enter your credentials to access the dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-5 py-3 rounded-xl border border-gray-600 bg-gray-700 shadow-sm placeholder-gray-400 text-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-500 transition"
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-5 py-3 rounded-xl border border-gray-600 bg-gray-700 shadow-sm placeholder-gray-400 text-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-500 transition"
            required
            disabled={loading}
          />

          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl shadow-lg hover:from-red-700 hover:to-red-600 transition disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </motion.button>
        </form>

        <p className="mt-6 text-center text-gray-400 text-sm">
          Don&apos;t have a staff account?{" "}
          <Link to="/signup" className="text-red-500 font-semibold hover:underline">
            Sign Up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
