import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { io } from "socket.io-client";

// 🔹 Helper to safely normalize items
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

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState("queue");
  const [queues, setQueues] = useState([]);
  const [orders, setOrders] = useState([]);
  const [socket, setSocket] = useState(null);
  const navigate = useNavigate();

  // ------------------------ Setup Axios Authorization & Socket ------------------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      navigate("/auth/login", { replace: true });
      return;
    }

    const newSocket = io("http://localhost:5000");
    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [navigate]);

  // ------------------------ Fetch Queues ------------------------
  const fetchQueues = async () => {
    try {
      const res = await axios.get("/api/queue");
      setQueues(res.data.filter((q) => q.status === "waiting"));
    } catch (err) {
      console.error("Error fetching queues:", err.message);
    }
  };

  // ------------------------ Fetch Orders ------------------------
  const fetchOrders = async () => {
    try {
      const res = await axios.get("/api/orders");
      // normalize items immediately
      const normalized = res.data
        .filter((o) => o.status !== "Served")
        .map((o) => ({
          ...o,
          items: normalizeItems(o.items),
        }));
      setOrders(normalized);
    } catch (err) {
      console.error("Error fetching orders:", err.message);
    }
  };

  // ------------------------ Polling & Socket Listener ------------------------
  useEffect(() => {
    fetchQueues();
    fetchOrders();

    const interval = setInterval(() => {
      fetchQueues();
      fetchOrders();
    }, 5000);

    if (socket) {
      socket.on("showMenu", () => {
        fetchQueues();
        fetchOrders();
      });
    }

    return () => {
      clearInterval(interval);
      if (socket) socket.off("showMenu");
    };
  }, [socket]);

  // ------------------------ Update Queue Status ------------------------
  const updateQueueStatus = async (queueNumber, status) => {
    try {
      await axios.put(`/api/queue/${queueNumber}`, { status });
      setQueues((prev) =>
        prev.filter((q) => q.queue_number !== queueNumber)
      );
    } catch (err) {
      console.error("Error updating queue:", err.response?.data || err.message);
    }
  };

  // ------------------------ Update Order Status ------------------------
  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`/api/orders/${orderId}`, { status });
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      console.error("Error updating order:", err.response?.data || err.message);
    }
  };

  // ------------------------ Logout ------------------------
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    delete axios.defaults.headers.common["Authorization"];
    navigate("/auth/login", { replace: true });
  };

  // ------------------------ Render ------------------------
  return (
    <div className="h-screen w-screen bg-[#1a1a1a] text-white flex flex-col">
      {/* Navbar */}
      <header className="bg-red-600 px-6 py-4 flex justify-between items-center shadow-lg">
        <h1 className="text-xl font-bold">🍽️ Staff Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition"
        >
          Logout
        </button>
      </header>

      {/* Tabs */}
      <div className="flex justify-center mt-4 space-x-4">
        <button
          onClick={() => setActiveTab("queue")}
          className={`px-6 py-2 rounded-lg font-medium transition ${
            activeTab === "queue"
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Queue Management
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-6 py-2 rounded-lg font-medium transition ${
            activeTab === "orders"
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Orders Management
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
          {/* Queue Management */}
          {activeTab === "queue" && (
            <>
              <h2 className="text-xl font-bold mb-6">Queue List</h2>
              <div className="overflow-x-auto">
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
                    {queues.map((q) => (
                      <tr
                        key={q.queue_number}
                        className="border-b border-gray-700 hover:bg-[#3a3a3a] transition"
                      >
                        <td className="p-3">{q.queue_number}</td>
                        <td className="p-3">{q.name}</td>
                        <td className="p-3">{q.pax}</td>
                        <td className="p-3">{q.status}</td>
                        <td className="p-3 space-x-2">
                          <button
                            onClick={() =>
                              updateQueueStatus(q.queue_number, "Seated")
                            }
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

          {/* Orders Management */}
          {activeTab === "orders" && (
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
                      <tr
                        key={o.id}
                        className={`border-b border-gray-700 transition ${
                          o.status === "Pending"
                            ? "bg-[#3a3a3a] hover:bg-[#4a4a4a]"
                            : o.status === "Preparing"
                            ? "bg-[#a16207] hover:bg-[#b8730b]"
                            : ""
                        }`}
                      >
                        <td className="p-3">{o.id}</td>
                        <td className="p-3">{o.queue_number}</td>
                        <td className="p-3">
                          {o.items.map((item, idx) => (
                            <span key={idx} className="block">
                              {item.name} × {item.quantity}
                            </span>
                          ))}
                        </td>
                        <td className="p-3">₱{o.total_price}</td>
                        <td className="p-3">{o.status}</td>
                        <td className="p-3 space-x-2">
                          <button
                            onClick={() =>
                              updateOrderStatus(o.id, "Preparing")
                            }
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
        </div>
      </motion.div>
    </div>
  );
}
