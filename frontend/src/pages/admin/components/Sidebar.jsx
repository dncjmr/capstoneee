// src/pages/admin/components/Sidebar.jsx
import { Link, useLocation } from "react-router-dom";

export default function Sidebar({ onLogout }) {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Queue Management", path: "/admin/queue" },
    { name: "Orders Management", path: "/admin/orders" },
    { name: "Menu Management", path: "/admin/menu" },
    { name: "Analytics", path: "/admin/analytics" },
    { name: "Settings", path: "/admin/settings" },
  ];

  return (
    <div className="flex flex-col w-64 bg-gray-800 text-white">
      {/* Sidebar header */}
      <div className="p-4 text-2xl font-bold border-b border-gray-700">
        Admin Panel
      </div>

      {/* Navigation links */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`block px-3 py-2 rounded transition ${
              location.pathname === item.path
                ? "bg-red-600 text-white"
                : "hover:bg-gray-700"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      {/* Logout button */}
      <button
        onClick={onLogout}
        className="m-4 p-2 rounded bg-red-600 hover:bg-red-500 transition"
      >
        Logout
      </button>
    </div>
  );
}
