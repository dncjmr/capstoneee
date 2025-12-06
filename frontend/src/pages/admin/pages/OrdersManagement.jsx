// src/pages/admin/OrdersManagement.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { io } from "socket.io-client";

// 🔹 Normalize items to always return array
function normalizeItems(items) {
  if (Array.isArray(items)) return items;
  if (typeof items === "string") {
    try {
      return JSON.parse(items);
    } catch {
      console.error("Invalid items JSON:", items);
      return [];
    }
  }
  return [];
}

export default function OrdersManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("staff"); // staff | admin | allOrders
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [stuckOrders, setStuckOrders] = useState([]);
  const [summary, setSummary] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pending: 0,
    preparing: 0,
    served: 0,
    totalItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  // ---------------- AUTH & SOCKET ----------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth/login", { replace: true });
      return;
    }

    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    // Socket
    const newSocket = io("http://localhost:5000", { auth: { token } });
    setSocket(newSocket);

    newSocket.on("orderUpdate", () => {
      fetchOrders(token);
      fetchAdminData(token);
    });

    // Initial fetch + polling
    fetchOrders(token);
    fetchAdminData(token);
    const interval = setInterval(() => {
      fetchOrders(token);
      fetchAdminData(token);
    }, 10000);

    return () => {
      clearInterval(interval);
      newSocket.disconnect();
    };
  }, [navigate]);

  // ---------------- FETCH STAFF ORDERS ----------------
  const fetchOrders = async (token) => {
    if (!token) return;
    try {
      const res = await axios.get("http://localhost:5000/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const normalized = res.data
        .filter((o) => o.status.toLowerCase() !== "served")
        .map((o) => ({ ...o, items: normalizeItems(o.items) }));

      setOrders(normalized);
    } catch (err) {
      console.error("❌ Error fetching staff orders:", err.message);
    }
  };

  // ---------------- FETCH ADMIN ORDERS ----------------
  const fetchAdminData = async (token) => {
    if (!token) return;
    try {
      // ✅ Updated route to match backend
      const res = await axios.get("http://localhost:5000/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const all = res.data.map((o) => ({ ...o, items: normalizeItems(o.items) }));
      setAllOrders(all);

      // Summary stats
      const totalOrders = all.length;
      const totalRevenue = all.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
      const pending = all.filter((o) => o.status?.toLowerCase() === "pending").length;
      const preparing = all.filter((o) => o.status?.toLowerCase() === "preparing").length;
      const served = all.filter((o) => o.status?.toLowerCase() === "served").length;
      const totalItems = all.reduce(
        (sum, o) =>
          sum + normalizeItems(o.items).reduce((s, i) => s + (Number(i.quantity || i.qty) || 1), 0),
        0
      );

      setSummary({ totalOrders, totalRevenue, pending, preparing, served, totalItems });

      // Stuck orders (>15 mins pending)
      const now = new Date();
      const stuck = all.filter((o) => {
        if (o.status?.toLowerCase() !== "pending") return false;
        const created = new Date(o.created_at);
        return (now - created) / 1000 / 60 > 15;
      });
      setStuckOrders(stuck);
    } catch (err) {
      console.error("❌ Error fetching admin orders:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- UPDATE ORDER STATUS ----------------
  const updateOrderStatus = async (orderId, status) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await axios.put(
        `http://localhost:5000/api/orders/${orderId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setAllOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
      fetchAdminData(token);
    } catch (err) {
      console.error("❌ Error updating order:", err.response?.data || err.message);
    }
  };

  // ---------------- ADMIN RESET ORDERS ----------------
  const handleResetOrders = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!window.confirm("Are you sure you want to reset ALL orders? This cannot be undone.")) return;

    try {
      setActionLoading(true);
      await axios.post(
        "http://localhost:5000/api/admin/orders/reset",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAdminData(token);
    } catch (err) {
      console.error("❌ Reset orders error:", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <p className="text-center mt-10 text-gray-300">Loading orders...</p>;

  return (
    <div className="h-screen w-screen bg-[#1a1a1a] text-white flex flex-col">
      {/* Navbar */}
      <header className="bg-red-600 px-6 py-4 flex justify-between items-center shadow-lg">
        <h1 className="text-xl font-bold">🍽️ Orders Management</h1>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
        >
          ← Back
        </button>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center mt-4 space-x-2 md:space-x-4">
        {["staff", "admin", "allOrders"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 md:px-6 py-2 rounded-lg font-medium transition ${
              activeTab === tab
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {tab === "staff" && "Staff Management"}
            {tab === "admin" && "Admin Dashboard"}
            {tab === "allOrders" && "📝 All Orders"}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex justify-center items-start p-6 overflow-auto"
      >
        <div className="w-full bg-[#2a2a2a] shadow-lg p-6 rounded-lg">
          {/* ================= STAFF TAB ================= */}
          {activeTab === "staff" && (
            <>
              <h2 className="text-xl font-bold mb-6">Active Orders</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#444] text-gray-200">
                      <th className="p-3 text-left">Order ID</th>
                      <th className="p-3 text-left">Queue No.</th>
                      <th className="p-3 text-left">Items</th>
                      <th className="p-3 text-left">Total Price</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b border-gray-700 hover:bg-[#3a3a3a] transition">
                        <td className="p-3">{o.id}</td>
                        <td className="p-3">{o.queue_number}</td>
                        <td className="p-3">
                          {o.items.map((item, idx) => (
                            <span key={idx} className="block">
                              {item.name} × {item.quantity || item.qty}
                            </span>
                          ))}
                        </td>
                        <td className="p-3">₱{o.total_price}</td>
                        <td className="p-3">{o.status}</td>
                        <td className="p-3 space-x-2">
                          <button
                            onClick={() => updateOrderStatus(o.id, "Preparing")}
                            className={`px-3 py-1 rounded-lg transition ${
                              o.status === "Preparing"
                                ? "bg-gray-500 cursor-not-allowed"
                                : "bg-yellow-600 hover:bg-yellow-700"
                            }`}
                            disabled={o.status === "Preparing"}
                          >
                            Preparing
                          </button>
                          <button
                            onClick={() => updateOrderStatus(o.id, "Served")}
                            className="bg-green-600 px-3 py-1 rounded-lg hover:bg-green-700 transition"
                          >
                            Served
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ================= ADMIN DASHBOARD ================= */}
          {activeTab === "admin" && (
            <div>
              <h2 className="text-2xl font-bold mb-6">📊 Admin Dashboard</h2>

              {/* High-level Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-[#3a3a3a] p-4 rounded-lg text-center">
                  <p className="text-lg font-bold">{summary.totalOrders}</p>
                  <p className="text-sm text-gray-400">Total Orders</p>
                </div>
                <div className="bg-[#3a3a3a] p-4 rounded-lg text-center">
                  <p className="text-lg font-bold">{summary.pending}</p>
                  <p className="text-sm text-gray-400">Pending</p>
                </div>
                <div className="bg-[#3a3a3a] p-4 rounded-lg text-center">
                  <p className="text-lg font-bold">{summary.preparing}</p>
                  <p className="text-sm text-gray-400">Preparing</p>
                </div>
                <div className="bg-[#3a3a3a] p-4 rounded-lg text-center">
                  <p className="text-lg font-bold">{summary.served}</p>
                  <p className="text-sm text-gray-400">Served</p>
                </div>
                <div className="bg-[#3a3a3a] p-4 rounded-lg text-center">
                  <p className="text-lg font-bold">₱{summary.totalRevenue}</p>
                  <p className="text-sm text-gray-400">Revenue</p>
                </div>
              </div>

              {/* Total Items Sold */}
              <div className="mb-6">
                <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700 w-fit">
                  <h3 className="text-lg font-semibold mb-2">Total Items Sold</h3>
                  <p className="text-3xl font-bold">{summary.totalItems}</p>
                </div>
              </div>

              {/* Stuck Orders */}
              <div className="mb-10">
                <h3 className="text-lg font-semibold mb-2">
                  ⚠️ Stuck Orders (Pending 15+ mins)
                </h3>
                {stuckOrders.length === 0 ? (
                  <p className="text-gray-400">No stuck orders 🚀</p>
                ) : (
                  <ul className="space-y-2">
                    {stuckOrders.map((o) => (
                      <li
                        key={o.id}
                        className="bg-yellow-800/40 border border-yellow-700 rounded-lg p-3 flex justify-between"
                      >
                        <span>
                          #{o.id} – Queue {o.queue_number} ({o.items.length} items)
                        </span>
                        <span className="text-sm text-gray-400">Pending...</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Controls */}
              <div className="mt-6 flex space-x-4">
                <button
                  onClick={handleResetOrders}
                  className="bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 transition"
                  disabled={actionLoading}
                >
                  🔄 Reset Orders
                </button>
              </div>
            </div>
          )}

          {/* ================= ALL ORDERS TAB ================= */}
          {activeTab === "allOrders" && (
            <div>
              <h2 className="text-2xl font-bold mb-6">📝 All Orders</h2>
              {allOrders.length === 0 ? (
                <p className="text-gray-400">No orders found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-700 rounded-lg overflow-hidden">
                    <thead className="bg-gray-800 text-gray-300">
                      <tr>
                        <th className="px-4 py-3 text-left">Order ID</th>
                        <th className="px-4 py-3 text-left">Queue No.</th>
                        <th className="px-4 py-3 text-left">Items</th>
                        <th className="px-4 py-3 text-left">Total Price</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="border-t border-gray-700 hover:bg-gray-700/50 transition"
                        >
                          <td className="px-4 py-3">{order.id}</td>
                          <td className="px-4 py-3">{order.queue_number}</td>
                          <td className="px-4 py-3">
                            {order.items.map((item, idx) => (
                              <span key={idx} className="block">
                                {item.name} × {item.quantity || item.qty}
                              </span>
                            ))}
                          </td>
                          <td className="px-4 py-3">₱{order.total_price}</td>
                          <td className="px-4 py-3">{order.status}</td>
                          <td className="px-4 py-3 text-gray-400">
                            {new Date(order.created_at || order.updated_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
