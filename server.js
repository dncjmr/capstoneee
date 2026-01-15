// backend/server.js (ES module)
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import http from "http";
import { Server as IOServer } from "socket.io";


const PORT = 5000;
const app = express();
// --------------------
// Middleware
// --------------------
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// --------------------
// HTTP + Socket.IO
// --------------------
const server = http.createServer(app);
const io = new IOServer(server, { cors: { origin: "http://localhost:5173" } });

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.on("joinQueue", (queueNumber) => {
    socket.join(`queue_${queueNumber}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// --------------------
// JWT Secret
// --------------------
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// --------------------
// MySQL connection pool
// --------------------
let db;
(async () => {
  try {
    db = await mysql.createPool({
      host: "localhost",
      user: "capstone_user",
      password: "123456",
      database: "capstone_db",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    console.log("✅ Connected to MySQL/MariaDB (Pool)!");
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
})();

// --------------------
// Auth Middleware
// --------------------
function authMiddleware(roles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (roles.length && !roles.includes(decoded.role))
        return res.status(403).json({ error: "Forbidden: wrong role" });

      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

// --------------------
// Test Route
// --------------------
app.get("/", (req, res) => res.send("Backend is running 🚀"));

// --------------------
// Auth Routes
// --------------------
app.post("/api/auth/signup", async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role)
    return res.status(400).json({ error: "Email, password, and role are required" });

  try {
    const [rows] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (rows.length > 0) return res.status(400).json({ error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", [
      email,
      hashedPassword,
      role,
    ]);

    res.json({ success: true, message: `${role} account created successfully!` });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    const user = rows[0];
    if (!user) return res.status(400).json({ error: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid email or password" });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ success: true, token, role: user.role, message: "Login successful" });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --------------------
// Queue Routes
// --------------------
app.post("/api/queue", async (req, res) => {
  const { name, pax } = req.body;
  if (!name || !pax) return res.status(400).json({ error: "Name and pax required" });

  try {
    const [rows] = await db.query("SELECT MAX(queue_number) AS max FROM queue");
    const nextQueueNumber = (rows[0].max || 0) + 1;

    await db.query(
      "INSERT INTO queue (name, pax, queue_number, status) VALUES (?, ?, ?, 'waiting')",
      [name, pax, nextQueueNumber]
    );

    res.json({ queueNumber: nextQueueNumber });
  } catch (err) {
    console.error("❌ Queue insert error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/queue", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM queue WHERE status = 'waiting' ORDER BY created_at ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching queues:", err);
    res.status(500).json({ error: "Failed to fetch queues" });
  }
});

app.put("/api/queue/:queueNumber", async (req, res) => {
  try {
    const { queueNumber } = req.params;
    const { status } = req.body;

    // Update queue status
    await db.query("UPDATE queue SET status = ? WHERE queue_number = ?", [status, queueNumber]);

    // Mark completion timestamp for Served/Canceled
    if (["Served", "Canceled", "No-show"].includes(status)) {
      await db.query("UPDATE queue SET completed_at = NOW() WHERE queue_number = ?", [queueNumber]);
    }

    if (status === "Seated") {
      io.to(`queue_${queueNumber}`).emit("showMenu");
    }

    io.emit("queueUpdate");
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to update queue:", err);
    res.status(500).json({ error: "Failed to update queue" });
  }
});

// --------------------
// Orders Routes
// --------------------
app.post("/api/orders", async (req, res) => {
  try {
    const { queue_number, items, total_price } = req.body;

    await db.query(
      "INSERT INTO orders (queue_number, items, total_price, status) VALUES (?, ?, ?, 'Pending')",
      [queue_number, JSON.stringify(items), total_price]
    );

    io.emit("orderUpdate");
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to create order:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM orders WHERE status != 'Served' ORDER BY created_at ASC"
    );

    const normalized = rows.map((o) => {
      let items = [];
      if (Array.isArray(o.items)) items = o.items;
      else if (typeof o.items === "string") {
        try { items = JSON.parse(o.items); } catch { items = []; }
      }
      return { ...o, items };
    });

    res.json(normalized);
  } catch (err) {
    console.error("❌ Failed to fetch orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.put("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await db.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
    io.emit("orderUpdate");

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to update order:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});
// --------------------
// Orders Routes
// --------------------

// Create a new order
app.post("/api/orders", async (req, res) => {
  try {
    const { queue_number, items, total_price } = req.body;

    if (!queue_number || !items || total_price == null)
      return res.status(400).json({ error: "Missing fields" });

    await db.query(
      "INSERT INTO orders (queue_number, items, total_price, status) VALUES (?, ?, ?, 'Pending')",
      [queue_number, JSON.stringify(items), total_price]
    );

    io.emit("orderUpdate");
    res.json({ success: true, message: "Order created successfully" });
  } catch (err) {
    console.error("❌ Failed to create order:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// Get active orders (for staff)
app.get("/api/orders", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM orders WHERE status != 'Served' ORDER BY created_at ASC"
    );

    const normalized = rows.map((o) => {
      let items = [];
      if (Array.isArray(o.items)) items = o.items;
      else if (typeof o.items === "string") {
        try { items = JSON.parse(o.items); } catch { items = []; }
      }
      return { ...o, items };
    });

    res.json(normalized);
  } catch (err) {
    console.error("❌ Failed to fetch orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Update order status (for staff/admin)
app.put("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: "Status is required" });

    const [result] = await db.query(
      "UPDATE orders SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Order not found" });

    io.emit("orderUpdate"); // Notify clients
    res.json({ success: true, message: `Order ${id} updated to ${status}` });
  } catch (err) {
    console.error("❌ Failed to update order:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// --------------------
// Admin Orders
// --------------------

// Get all orders for admin (active and served)
app.get("/api/admin/orders/all", authMiddleware(["admin"]), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT o.id, o.queue_number, o.items, o.total_price, o.status, o.created_at,
             q.name AS customer_name, q.pax
      FROM orders o
      LEFT JOIN queue q ON o.queue_number = q.queue_number
      ORDER BY o.created_at DESC
    `);

    const normalized = rows.map((o) => {
      let items = [];
      if (Array.isArray(o.items)) items = o.items;
      else if (typeof o.items === "string") {
        try { items = JSON.parse(o.items); } catch { items = []; }
      }
      return { ...o, items };
    });

    res.json(normalized);
  } catch (err) {
    console.error("❌ Failed to fetch all orders:", err);
    res.status(500).json({ error: "Failed to fetch all orders" });
  }
});

// Redirect admin orders route to "all"
app.get("/api/admin/orders", authMiddleware(["admin"]), (req, res) => {
  res.redirect("/api/admin/orders/all");
});

// Total revenue (all orders except canceled)
app.get("/api/admin/orders/total-revenue", authMiddleware(["admin"]), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT COALESCE(SUM(total_price), 0) AS totalRevenue 
      FROM orders 
      WHERE status != 'Canceled'
    `);
    res.json({ totalRevenue: rows[0].totalRevenue });
  } catch (err) {
    console.error("❌ Failed to fetch total revenue:", err);
    res.status(500).json({ error: "Failed to fetch total revenue" });
  }
});

// Reset all orders (admin)
app.post("/api/admin/orders/reset", authMiddleware(["admin"]), async (req, res) => {
  try {
    await db.query("DELETE FROM orders");
    io.emit("orderUpdate");
    res.json({ success: true, message: "All orders have been reset." });
  } catch (err) {
    console.error("❌ Failed to reset orders:", err);
    res.status(500).json({ error: "Failed to reset orders" });
  }
});


// Queue statistics for analytics //
app.get("/api/queue/stats", authMiddleware(["admin"]), async (req, res) => {
  try {
    const [total] = await db.query("SELECT COUNT(*) AS total FROM queue");
    const [waiting] = await db.query("SELECT COUNT(*) AS waiting FROM queue WHERE status='waiting'");
    const [seated] = await db.query("SELECT COUNT(*) AS seated FROM queue WHERE status='Seated'");
    const [served] = await db.query("SELECT COUNT(*) AS served FROM queue WHERE status='Served'");
    const [canceled] = await db.query("SELECT COUNT(*) AS canceled FROM queue WHERE status='Canceled'");

    res.json({
      total: total[0].total,
      waiting: waiting[0].waiting,
      seated: seated[0].seated,
      served: served[0].served,
      canceled: canceled[0].canceled,
    });
  } catch (err) {
    console.error("❌ Error fetching queue stats:", err);
    res.status(500).json({ error: "Failed to fetch queue stats" });
  }
});


// --------------------
// Menu Item Routes
// --------------------

// Get all menu items
app.get("/api/menu_items", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM menu_items");
    res.json({ success: true, menu: rows });
  } catch (err) {
    console.error("❌ Menu fetch error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Add menu item
app.post("/api/menu_items/add", async (req, res) => {
  const { name, category, price } = req.body;
  if (!name || !category || price == null)
    return res.status(400).json({ success: false, message: "Missing fields" });

  try {
    await db.query("INSERT INTO menu_items (name, category, price) VALUES (?, ?, ?)", [
      name,
      category,
      price,
    ]);
    const [rows] = await db.query("SELECT * FROM menu_items");
    io.emit("menuUpdated", rows); // broadcast to clients
    res.json({ success: true, menu: rows });
  } catch (err) {
    console.error("❌ Menu add error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// Update menu item
app.post("/api/menu_items/update", async (req, res) => {
  const { id, name, category, price } = req.body;
  if (!id || !name || !category || price == null)
    return res.status(400).json({ success: false, message: "Missing fields" });

  try {
    await db.query("UPDATE menu_items SET name = ?, category = ?, price = ? WHERE id = ?", [
      name,
      category,
      price,
      id,
    ]);
    const [rows] = await db.query("SELECT * FROM menu_items");
    io.emit("menuUpdated", rows);
    res.json({ success: true, menu: rows });
  } catch (err) {
    console.error("❌ Menu update error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delete menu item
app.post("/api/menu_items/delete", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, message: "Missing ID" });

  try {
    await db.query("DELETE FROM menu_items WHERE id = ?", [id]);
    const [rows] = await db.query("SELECT * FROM menu_items");
    io.emit("menuUpdated", rows);
    res.json({ success: true, menu: rows });
  } catch (err) {
    console.error("❌ Menu delete error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --------------------
// Admin Queue Routes
// --------------------
app.get("/api/admin/queue/overview", authMiddleware(["admin"]), async (req, res) => {
  try {
    const [total] = await db.query("SELECT COUNT(*) AS total FROM queue");
    const [served] = await db.query("SELECT COUNT(*) AS served FROM queue WHERE status IN ('Seated','Served')");
    const [waiting] = await db.query("SELECT COUNT(*) AS waiting FROM queue WHERE status='waiting'");
    const [canceled] = await db.query("SELECT COUNT(*) AS canceled FROM queue WHERE status='Canceled'");

    res.json({
      total: total[0].total,
      served: served[0].served,
      waiting: waiting[0].waiting,
      canceled: canceled[0].canceled,
    });
  } catch (err) {
    console.error("❌ Error fetching queue overview:", err);
    res.status(500).json({ error: "Failed to fetch queue overview" });
  }
});

// Archive queues instead of deleting
app.post("/api/admin/queue/reset", authMiddleware(["admin"]), async (req, res) => {
  try {
    await db.query("UPDATE queue SET status='Archived' WHERE status IN ('Served','Canceled','No-show')");
    io.emit("queueUpdate");
    res.json({ success: true, message: "Queues archived successfully (not deleted)." });
  } catch (err) {
    console.error("❌ Failed to archive queues:", err);
    res.status(500).json({ error: "Failed to archive queues" });
  }
});

// Queue history - full record
app.get("/api/admin/queue/history", authMiddleware(["admin"]), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, queue_number, name, pax, status, created_at, completed_at
      FROM queue
      WHERE status IN ('Served','Canceled','No-show','Seated','Archived')
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching queue history:", err);
    res.status(500).json({ error: "Failed to fetch queue history" });
  }
});

// Filtered history
app.get("/api/admin/queue/history/filter", authMiddleware(["admin"]), async (req, res) => {
  try {
    const { status, from, to } = req.query;
    let query = "SELECT * FROM queue WHERE 1=1";
    const params = [];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    if (from && to) {
      query += " AND DATE(created_at) BETWEEN ? AND ?";
      params.push(from, to);
    }

    query += " ORDER BY created_at DESC";

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Failed to filter history:", err);
    res.status(500).json({ error: "Failed to filter history" });
  }
});

// --------------------
// Socket.io
// --------------------
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

// Get current logged-in user
app.get("/api/user/me", authMiddleware(), async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      "SELECT id, email, role FROM users WHERE id = ?",
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ User fetch error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});


// --------------------
// Start Server
// --------------------
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));