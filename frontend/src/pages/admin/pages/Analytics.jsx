
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    waiting: 0,
    waitingPax: 0,
    served: 0,
    servedPax: 0,
    activeOrders: 0,
    daily: {
      totalCustomers: 0,
      totalPax: 0,
      waiting: 0,
      served: 0,
    },
    weekly: [], // array of 7 days with queues & pax
    monthly: {
      queues: 0,
      pax: 0,
      dailyQueues: [],
    },
  });

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // auto-refresh
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/queue/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const dailyChartData = [
    { name: "Waiting", value: stats.daily?.waiting || 0 },
    { name: "Served", value: stats.daily?.served || 0 },
  ];

  const weeklyChartData = stats.weekly || [];
  const monthlyChartData = stats.monthly?.dailyQueues || [];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    delete axios.defaults.headers.common["Authorization"];
    window.location.href = "/auth/login";
  };

  const handleBack = () => {
    navigate("/admin/dashboard"); // 👈 Back to homepage/dashboard
  };

  return (
    <div className="h-screen w-screen bg-[#1a1a1a] text-white flex flex-col">
      {/* Navbar */}
      <header className="bg-red-600 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition"
          >
            ⬅ Back
          </button>
          <h1 className="text-xl font-bold">🍽️ Queue Dashboard</h1>
        </div>
        <button
          onClick={handleLogout}
          className="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition"
        >
          Logout
        </button>
      </header>

      {/* Analytics */}
      <motion.div
        key="analytics"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex flex-col justify-start items-center p-6 overflow-auto space-y-8"
      >
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <div className="bg-blue-600 text-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold">Total Queues</h2>
            <p className="text-3xl font-bold">{stats.total || 0}</p>
          </div>

          <div className="bg-yellow-600 text-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold">Waiting</h2>
            <p className="text-2xl font-bold">{stats.waiting || 0} customers</p>
            <p className="text-md">👥 {stats.waitingPax || 0} pax</p>
          </div>

          <div className="bg-gray-600 text-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold">Served</h2>
            <p className="text-2xl font-bold">{stats.served || 0} customers</p>
            <p className="text-md">👥 {stats.servedPax || 0} pax</p>
          </div>
        </div>

        {/* Daily Queues Analytics */}
        <div className="bg-purple-600 text-white p-6 rounded-lg shadow w-full">
          <h2 className="text-lg font-semibold mb-2">Today's Queues</h2>
          <p className="text-2xl font-bold">{stats.daily?.totalCustomers || 0} customers</p>
          <p className="text-md mb-2">👥 {stats.daily?.totalPax || 0} pax</p>
          <p className="text-sm">Waiting: {stats.daily?.waiting || 0}</p>
          <p className="text-sm">Served: {stats.daily?.served || 0}</p>

          {/* Daily Pax Chart */}
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#fff" />
              <YAxis allowDecimals={false} stroke="#fff" />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "none" }}
                itemStyle={{ color: "#fff" }}
              />
              <Bar dataKey="value" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Queues Analytics */}
        <div className="bg-indigo-600 text-white p-6 rounded-lg shadow w-full">
          <h2 className="text-lg font-semibold mb-2">Weekly Queues Overview</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="day" stroke="#fff" />
              <YAxis allowDecimals={false} stroke="#fff" />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "none" }}
                itemStyle={{ color: "#fff" }}
              />
              <Bar dataKey="queues" fill="#f59e0b" name="Queues" />
              <Bar dataKey="pax" fill="#10b981" name="Pax" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Queues Chart */}
        <div className="bg-[#2a2a2a] p-6 rounded-lg shadow w-full">
          <h2 className="text-lg font-semibold mb-4">Monthly Queue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="date" stroke="#fff" />
              <YAxis allowDecimals={false} stroke="#fff" />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "none" }}
                itemStyle={{ color: "#fff" }}
              />
              <Line type="monotone" dataKey="queues" stroke="#facc15" strokeWidth={3} />
              <Line type="monotone" dataKey="pax" stroke="#10b981" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}