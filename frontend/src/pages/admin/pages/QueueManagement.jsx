// src/pages/admin/QueueManagement.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { io } from "socket.io-client";

export default function QueueManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("staff"); // staff | admin

  // ---------------- STATES ----------------
  const [queues, setQueues] = useState([]); // for staff view
  const [socket, setSocket] = useState(null);

  const [overview, setOverview] = useState(null);
  const [stuckQueues, setStuckQueues] = useState([]);
  const [queueHistory, setQueueHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [historyFilter, setHistoryFilter] = useState("today"); // "today" | "all"

  // ---------------- AUTH ----------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/auth/login", { replace: true });
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    const newSocket = io("http://localhost:5000");
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [navigate]);

  // ---------------- FETCH QUEUES (STAFF) ----------------
  const fetchQueues = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/queue");
      setQueues(res.data.filter(q => q.status === "waiting"));
    } catch (err) {
      console.error("Error fetching queues:", err.message);
    }
  };

  // ---------------- FETCH ADMIN DATA ----------------
  const fetchAllAdmin = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/queue");
      const allData = res.data;

      const todayStr = new Date().toISOString().split("T")[0];
      const todayQueues = allData.filter(q => q.created_at.startsWith(todayStr));

      const overviewData = {
        total_today: todayQueues.length,
        total_all: allData.length,
        waiting_today: todayQueues.filter(q => q.status === "waiting").length,
        seated_today: todayQueues.filter(q => q.status === "Seated").length,
      };
      setOverview(overviewData);

      // Stuck queues >15 mins
      const stuck = todayQueues
        .filter(q => q.status === "waiting")
        .map(q => ({
          ...q,
          waitingMinutes: Math.floor((new Date() - new Date(q.created_at)) / 60000),
        }))
        .filter(q => q.waitingMinutes >= 15);
      setStuckQueues(stuck);

      // Queue history (waiting or seated)
      const historyAll = allData
        .filter(q => q.status === "waiting" || q.status === "Seated")
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setQueueHistory(historyAll);
    } catch (err) {
      console.error("❌ Error fetching admin data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- POLLING & SOCKET ----------------
  useEffect(() => {
    fetchQueues();
    fetchAllAdmin();

    const interval = setInterval(() => {
      fetchQueues();
      fetchAllAdmin();
    }, 10000);

    if (socket) {
      socket.on("showMenu", fetchQueues);
      socket.on("queueUpdate", fetchAllAdmin);
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off("showMenu");
        socket.off("queueUpdate");
      }
    };
  }, [socket]);

  // ---------------- STAFF UPDATE ----------------
  const updateQueueStatus = async (queueNumber, status) => {
    try {
      await axios.put(`http://localhost:5000/api/queue/${queueNumber}`, { status });
      setQueues(prev => prev.filter(q => q.queue_number !== queueNumber));
    } catch (err) {
      console.error("Error updating queue:", err.response?.data || err.message);
    }
  };

  // ---------------- ADMIN ACTIONS ----------------
  const handleStopQueue = async () => {
    if (!window.confirm("Are you sure you want to stop the queue?")) return;
    try {
      setActionLoading(true);
      await axios.post("http://localhost:5000/api/admin/queue/stop");
    } catch (err) {
      console.error("❌ Stop queue error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetQueue = async () => {
    if (!window.confirm("Are you sure you want to reset the queue? This cannot be undone.")) return;
    try {
      setActionLoading(true);
      await axios.post("http://localhost:5000/api/admin/queue/reset");
    } catch (err) {
      console.error("❌ Reset queue error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // ---------------- UI HELPERS ----------------
  const statusColors = {
    waiting: "bg-yellow-600 text-yellow-100",
    Seated: "bg-green-600 text-green-100",
  };

  if (loading) return <p className="text-center mt-10 text-gray-300">Loading queue data...</p>;

  // ---------------- RENDER ----------------
  return (
    <div className="h-screen w-screen bg-[#1a1a1a] text-white flex flex-col">
      {/* Navbar */}
      <header className="bg-red-600 px-6 py-4 flex justify-between items-center shadow-lg">
        <h1 className="text-xl font-bold">🍽️ Admin Queue Management</h1>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
        >
          ← Back
        </button>
      </header>

      {/* Tabs */}
      <div className="flex justify-center mt-4 space-x-4">
        <button
          onClick={() => setActiveTab("staff")}
          className={`px-6 py-2 rounded-lg font-medium transition ${
            activeTab === "staff" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Staff Management
        </button>
        <button
          onClick={() => setActiveTab("admin")}
          className={`px-6 py-2 rounded-lg font-medium transition ${
            activeTab === "admin" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Admin Overview
        </button>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex justify-center items-start p-6 overflow-auto"
      >
        <div className="w-full bg-[#2a2a2a] shadow-lg p-6">
          {/* STAFF VIEW */}
          {activeTab === "staff" && (
            <>
              <h2 className="text-xl font-bold mb-6">Queue List</h2>
              <div className="overflow-x-auto mb-10">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#444] text-gray-200">
                      <th className="p-3 text-left">Queue No.</th>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Pax</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queues.map(q => (
                      <tr key={q.queue_number} className="border-b border-gray-700 hover:bg-[#3a3a3a] transition">
                        <td className="p-3">{q.queue_number}</td>
                        <td className="p-3">{q.name}</td>
                        <td className="p-3">{q.pax}</td>
                        <td className="p-3">{q.status}</td>
                        <td className="p-3 space-x-2">
                          <button
                            onClick={() => updateQueueStatus(q.queue_number, "Seated")}
                            className="bg-green-600 px-3 py-1 rounded-lg hover:bg-green-700 transition"
                            disabled={q.status === "Seated"}
                          >
                            Mark as Seated
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ADMIN VIEW */}
          {activeTab === "admin" && overview && (
            <>
              <h2 className="text-xl font-bold mb-6">Admin Overview</h2>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#3a3a3a] p-4 rounded-lg text-center">
                  <p className="text-lg font-bold">{overview.total_today}</p>
                  <p className="text-sm text-gray-400">Total Today</p>
                </div>
                <div className="bg-[#3a3a3a] p-4 rounded-lg text-center">
                  <p className="text-lg font-bold">{overview.total_all}</p>
                  <p className="text-sm text-gray-400">Total All</p>
                </div>
                <div className="bg-[#3a3a3a] p-4 rounded-lg text-center">
                  <p className="text-lg font-bold">{overview.waiting_today}</p>
                  <p className="text-sm text-gray-400">Waiting</p>
                </div>
                <div className="bg-[#3a3a3a] p-4 rounded-lg text-center">
                  <p className="text-lg font-bold">{overview.seated_today}</p>
                  <p className="text-sm text-gray-400">Seated</p>
                </div>
              </div>

              {/* Stuck Queues */}
              <div className="mb-10">
                <h3 className="text-lg font-semibold mb-2">⚠️ Stuck Queues (15+ mins waiting)</h3>
                {stuckQueues.length === 0 ? (
                  <p className="text-gray-400">No stuck queues 🚀</p>
                ) : (
                  <ul className="space-y-2">
                    {stuckQueues.map(q => (
                      <li
                        key={q.queue_number}
                        className="bg-yellow-800/40 border border-yellow-700 rounded-lg p-3 flex justify-between"
                      >
                        <span>#{q.queue_number} – {q.name} ({q.pax} pax)</span>
                        <span className="text-sm text-gray-400">{q.waitingMinutes} mins</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* History Filter Toggle */}
              <div className="flex mb-4 space-x-2">
                <button
                  onClick={() => setHistoryFilter("today")}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    historyFilter === "today"
                      ? "bg-red-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setHistoryFilter("all")}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    historyFilter === "all"
                      ? "bg-red-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  All History
                </button>
              </div>

              {/* Queue History Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#444] text-gray-200">
                      <th className="p-3 text-left">Queue No.</th>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Pax</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(historyFilter === "today"
                      ? queueHistory.filter(q => q.created_at.startsWith(new Date().toISOString().split("T")[0]))
                      : queueHistory
                    ).map(q => (
                      <tr key={q.queue_number} className="border-b border-gray-700 hover:bg-[#3a3a3a] transition">
                        <td className="p-3">{q.queue_number}</td>
                        <td className="p-3">{q.name}</td>
                        <td className="p-3">{q.pax}</td>
                        <td className={`p-3 font-medium ${statusColors[q.status]}`}>{q.status}</td>
                        <td className="p-3 text-gray-400">{new Date(q.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Admin Controls */}
              <div className="mt-6 flex space-x-4">
                <button
                  onClick={handleStopQueue}
                  className="bg-yellow-600 px-4 py-2 rounded-lg hover:bg-yellow-700 transition"
                  disabled={actionLoading}
                >
                  ⏸ Stop Queue
                </button>
                <button
                  onClick={handleResetQueue}
                  className="bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 transition"
                  disabled={actionLoading}
                >
                  🔄 Reset Queue
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}