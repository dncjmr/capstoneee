import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Customer pages
import EntranceQRCode from "./pages/customer/EntranceQRCode";
import Queue from "./pages/customer/Queue";
import Menu from "./pages/customer/Menu";

// Admin Auth
import Login from "./pages/admin/auth/Login";
import SignUp from "./pages/admin/auth/SignUp";

// Admin pages
import Dashboard from "./pages/admin/pages/Dashboard";
import QueueManagement from "./pages/admin/pages/QueueManagement";
import OrdersManagement from "./pages/admin/pages/OrdersManagement";
import MenuManagement from "./pages/admin/pages/MenuManagement";
import Analytics from "./pages/admin/pages/Analytics";
import Settings from "./pages/admin/pages/Settings";

// Staff pages
import StaffDashboard from "./pages/staff/StaffDashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* Customer Routes */}
        <Route path="/" element={<EntranceQRCode />} />   {/* Entrance QR page */}
        <Route path="/queue" element={<Queue />} />       {/* Queue page */}
        <Route path="/menu" element={<Menu />} />         {/* Menu page */}

        {/* Admin Auth Routes */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin/signup" element={<SignUp />} />

        {/* Shortcuts (redirects) */}
        <Route path="/login" element={<Navigate to="/admin/login" replace />} />
        <Route path="/signup" element={<Navigate to="/admin/signup" replace />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/queue" element={<QueueManagement />} />
        <Route path="/admin/orders" element={<OrdersManagement />} />
        <Route path="/admin/menu" element={<MenuManagement />} />
        <Route path="/admin/analytics" element={<Analytics />} />
        <Route path="/admin/settings" element={<Settings />} />

        {/* Staff Routes */}
        <Route path="/staff/StaffDashboard" element={<StaffDashboard />} />

        {/* Fallback (optional, points old /auth/login to admin login) */}
        <Route path="/auth/login" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
