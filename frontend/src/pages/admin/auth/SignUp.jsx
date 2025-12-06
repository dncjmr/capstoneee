// src/pages/admin/auth/SignUp.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) return setError("Passwords do not match!");

    setLoading(true);
    try {
      // Always use role = "staff"
      const response = await axios.post("http://localhost:5000/api/auth/signup", {
        email,
        password,
        role: "staff",
      });

      if (response.data.success) {
        setSuccess("Staff account created successfully!");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setError(response.data.message || "Sign up failed");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during sign up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-gray-100 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 animate-gradient-x"></div>

      {/* Fullscreen Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-2xl bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/40 p-12"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white">Staff Sign Up</h1>
          <p className="text-gray-300 text-sm mt-2">Create your staff account</p>
        </div>

        {/* Error/Success Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="mb-4 rounded-xl bg-red-600/20 border border-red-600/40 text-red-400 px-4 py-2 text-sm text-center"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="mb-4 rounded-xl bg-green-600/20 border border-green-600/40 text-green-400 px-4 py-2 text-sm text-center"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSignUp} className="space-y-6">
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

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-5 py-3 rounded-xl border border-gray-600 bg-gray-700 shadow-sm placeholder-gray-400 text-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-500 transition"
            required
            disabled={loading}
          />
          {password !== confirmPassword && confirmPassword && (
            <p className="text-red-400 text-sm -mt-4">Passwords do not match</p>
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl shadow-lg hover:from-red-700 hover:to-red-600 hover:shadow-red-500/30 transition disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Sign Up as Staff"}
          </motion.button>
        </form>

        {/* Login Link */}
        <p className="mt-8 text-center text-gray-400 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-red-500 font-semibold hover:underline">
            Login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
