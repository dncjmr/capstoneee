// src/pages/customer/Queue.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import Logo from "../../assets/logo.png";

export default function Queue() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [pax, setPax] = useState("");
  const [queueNumber, setQueueNumber] = useState(null);
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [socket, setSocket] = useState(null);

  // -------------------- Join Queue --------------------
  const handleJoinQueue = async () => {
    if (!name.trim() || !pax) {
      setError("Please enter your name and number of people.");
      return;
    }

    const n = parseInt(pax, 10);
    if (Number.isNaN(n) || n < 1 || n > 20) {
      setError("Party size must be between 1 and 20 people.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await axios.post("/api/queue", { name, pax: n });
      const qn = res?.data?.queueNumber;
      if (typeof qn !== "number") throw new Error("Backend did not return queueNumber");
      setQueueNumber(qn);
    } catch (err) {
      console.error("Queue join error:", err);
      setError("Failed to join queue. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------- Setup Socket.IO --------------------
  useEffect(() => {
    if (!queueNumber) return;

    const newSocket = io("http://localhost:5000");
    setSocket(newSocket);

    // Join queue room
    newSocket.emit("joinQueue", queueNumber);

    // Listen for staff event to show menu
    newSocket.on("showMenu", () => {
      navigate("/menu", {
        state: { customerInfo: { name, pax, table: queueNumber } },
      });
    });

    return () => newSocket.disconnect();
  }, [queueNumber, navigate, name, pax]);

  // -------------------- Poll Queue Position --------------------
  useEffect(() => {
    if (!queueNumber) return;

    let interval;
    const checkQueue = async () => {
      try {
        const res = await axios.get("/api/queue");
        const waitingQueue = Array.isArray(res.data) ? res.data : [];

        const pos = waitingQueue.findIndex(
          (item) => Number(item.queue_number) === queueNumber
        ) + 1;

        setPosition(pos > 0 ? pos : null);
      } catch (err) {
        console.error("Queue polling error:", err);
      }
    };

    checkQueue(); // initial check
    interval = setInterval(checkQueue, 2000);

    return () => clearInterval(interval);
  }, [queueNumber]);

  // -------------------- Render --------------------
  return (
    <div className="w-screen h-screen flex items-center justify-center px-4 py-12 font-sans relative overflow-hidden bg-gray-900 text-gray-100">
      <div className="fixed inset-0 -z-20 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 animate-gradient-x"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/40 p-8 flex flex-col items-center justify-center"
      >
        {/* Logo */}
        <div className="flex justify-center items-center gap-3 mb-6">
          <img src={Logo} alt="Logo" className="w-8 h-8 object-contain" />
          <h1 className="text-2xl font-bold text-gray-200 tracking-wider">Seoul Gui 199</h1>
        </div>

        {!queueNumber ? (
          <>
            {error && (
              <div className="mb-6 p-4 bg-red-900/40 border border-red-700 rounded-xl shadow-sm">
                <p className="text-red-300 text-center font-semibold">{error}</p>
              </div>
            )}

            <div className="space-y-6 mb-8 w-full">
              <input
                className="w-full px-5 py-3 rounded-xl border border-gray-600 bg-gray-700 text-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-500"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
              <input
                className="w-full px-5 py-3 rounded-xl border border-gray-600 bg-gray-700 text-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-500"
                placeholder="Number of people"
                type="number"
                min="1"
                max="20"
                value={pax}
                onChange={(e) => setPax(e.target.value)}
                disabled={loading}
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              className="w-full py-4 bg-green-500 text-gray-900 font-bold rounded-2xl shadow-lg hover:shadow-2xl transition disabled:opacity-60"
              disabled={loading}
              onClick={handleJoinQueue}
            >
              {loading ? "Joining..." : "Join Queue"}
            </motion.button>
          </>
        ) : (
          <div className="text-center w-full">
            <h2 className="text-3xl font-bold text-green-400 mb-6 animate-pulse">
              You’re in the queue!
            </h2>
            <div className="bg-gray-700 border border-gray-600 rounded-2xl p-8 shadow-inner">
              <p className="text-4xl font-extrabold text-green-400 mb-3">#{queueNumber}</p>
              <p className="text-gray-300 text-lg">{name} • Party of {pax}</p>
              <p className="text-gray-300 mt-2">Current position: {position ?? "…"}</p>
              <p className="text-gray-400 mt-4 text-sm italic">Please wait until it’s your turn...</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
