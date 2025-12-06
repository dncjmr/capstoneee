import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import axios from "axios";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    delete axios.defaults.headers.common["Authorization"];
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="flex h-screen w-screen">
      {/* Pass it down here 👇 */}
      <Sidebar onLogout={handleLogout} />

      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to Dashboard</h1>
          <p className="text-lg text-gray-700">
            Here you can manage queues, orders, menu, and analytics.
          </p>
        </div>
      </div>
    </div>
  );
}
