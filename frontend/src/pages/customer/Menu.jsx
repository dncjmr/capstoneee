import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { FaFire, FaLeaf, FaShoppingCart, FaTrash, FaReceipt } from "react-icons/fa";

export default function Menu() {
  const location = useLocation();
  const customerInfo = location.state?.customerInfo || { name: "Guest", table: "N/A" };

  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  const [lastOrder, setLastOrder] = useState(null);
  const [allOrdersTotal, setAllOrdersTotal] = useState(0);

  // Fetch menu items from backend
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await axios.get("/api/menu_items"); // relative URL for Vite proxy
        if (res.data.success) {
          setMenuItems(res.data.menu);
        } else {
          console.error("Failed to fetch menu:", res.data.message);
        }
      } catch (err) {
        console.error("Error fetching menu:", err.response ? err.response.data : err.message);
      }
    };
    fetchMenu();
  }, []);

  const addToCart = (item) => {
    const exists = cart.find((c) => c.id === item.id);
    if (exists) {
      setCart(cart.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c)));
    } else {
      setCart([...cart, { ...item, qty: 1, cartId: Date.now() + Math.random() }]);
    }
  };

  const removeFromCart = (cartId) => setCart(cart.filter((item) => item.cartId !== cartId));
  const getTotalPrice = () => cart.reduce((total, item) => total + item.price * (item.qty || 1), 0);

  const mainDishes = Array.isArray(menuItems) ? menuItems.filter((i) => i.category === "Meat") : [];
  const sideDishes = Array.isArray(menuItems) ? menuItems.filter((i) => i.category === "Sides") : [];

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    const total = getTotalPrice();
    const orderPayload = {
      queue_number: customerInfo.table,
      items: cart.map((item) => ({ id: item.id, name: item.name, price: item.price, qty: item.qty || 1 })),
      total_price: total,
    };

    try {
      const res = await axios.post("/api/orders", orderPayload);
      if (res.data.success) {
        setLastOrder({ items: cart, total });
        setAllOrdersTotal((prev) => prev + total);
        setOrderTotal(total);
        setShowModal(true);
        setCart([]);
      } else {
        console.error("Backend returned error:", res.data);
        alert("Failed to place order. Please try again.");
      }
    } catch (err) {
      console.error("POST error:", err.response ? err.response.data : err.message);
      alert("Failed to place order. Please try again.");
    }
  };

  const handleCloseModal = () => setShowModal(false);

  const handleBilling = () => {
    if (!lastOrder && allOrdersTotal === 0) return;
    setShowReceipt(true);
  };

  const handlePrintReceipt = () => {
    const printContent = document.getElementById("receipt-content").innerHTML;
    const newWindow = window.open("", "_blank");
    newWindow.document.write(`
      <html>
        <head><title>Receipt</title></head>
        <body>${printContent}</body>
      </html>
    `);
    newWindow.document.close();
    newWindow.print();
  };

  return (
    <div className="h-screen w-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Header */}
      <div className="text-center py-6 border-b border-gray-700">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-2">Korean BBQ Menu</h1>
        <p className="text-gray-300 text-lg">
          Welcome, <span className="font-semibold">{customerInfo.name}</span> | Table:{" "}
          <span className="font-semibold">{customerInfo.table}</span>
        </p>
      </div>

      {/* Menu + Cart Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 p-4 overflow-hidden">
        {/* Menu Items */}
        <div className="lg:col-span-3 overflow-y-auto space-y-10 pr-2">
          {/* Main Dishes */}
          <div>
            <h2 className="flex items-center text-2xl font-bold mb-4 border-b-2 border-red-500 pb-2 gap-2">
              <FaFire /> Main Dishes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {mainDishes.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-gray-800/90 p-4 rounded-2xl shadow-lg hover:scale-105 hover:shadow-2xl transition-transform duration-300"
                >
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-40 object-cover rounded-xl mb-2" />
                  ) : (
                    <div className="text-center text-4xl mb-2"><FaFire /></div>
                  )}
                  <h3 className="text-xl font-semibold mb-1 text-center">{item.name}</h3>
                  <p className="text-gray-300 text-sm text-center mb-3 leading-relaxed">{item.description}</p>
                  <div className="text-red-500 font-bold text-center text-lg mb-3">
                    {item.price > 0 ? `₱${item.price}` : "Included"}
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-2 rounded-xl hover:from-red-700 hover:to-red-600 transition"
                  >
                    Add to Order
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Side Dishes */}
          <div>
            <h2 className="flex items-center text-2xl font-bold mb-4 border-b-2 border-orange-500 pb-2 gap-2">
              <FaLeaf /> Side Dishes
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {sideDishes.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-gray-800/90 p-4 rounded-2xl shadow-lg hover:scale-105 hover:shadow-2xl transition-transform duration-300"
                >
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-32 object-cover rounded-xl mb-2" />
                  ) : (
                    <div className="text-center text-3xl mb-2"><FaLeaf /></div>
                  )}
                  <h3 className="font-semibold text-center mb-1">{item.name}</h3>
                  <div className="text-orange-400 font-bold text-center mb-2">
                    {item.price > 0 ? `₱${item.price}` : "Included"}
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-400 text-white py-1 rounded-xl hover:from-orange-600 hover:to-orange-500 transition"
                  >
                    Add
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Cart */}
        <div className="lg:col-span-1 bg-gray-800/90 p-4 rounded-2xl shadow-lg sticky top-4 flex flex-col">
          <h3 className="flex items-center text-xl font-bold mb-4 border-b pb-2 gap-2">
            <FaShoppingCart /> Your Order ({cart.length})
          </h3>

          <div className="flex-1 overflow-y-auto mb-4">
            {cart.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No items in cart</p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.cartId}
                  className="flex justify-between items-center mb-2 p-2 bg-gray-700 rounded-xl hover:bg-gray-700/80 transition"
                >
                  <div>
                    <div className="font-semibold text-sm">{item.name} {item.qty > 1 && `(x${item.qty})`}</div>
                    <div className="text-red-500 font-bold">₱{item.price * item.qty}</div>
                  </div>
                  <button onClick={() => removeFromCart(item.cartId)} className="text-red-500 font-bold text-lg">
                    <FaTrash />
                  </button>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t border-gray-600 pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xl font-bold">Total:</span>
                <span className="text-2xl font-bold text-red-500">₱{getTotalPrice()}</span>
              </div>
              <button
                onClick={handlePlaceOrder}
                className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-xl hover:from-red-700 hover:to-red-600 mb-2 transition"
              >
                Place Order
              </button>
            </div>
          )}

          {(lastOrder || allOrdersTotal > 0) && (
            <button
              onClick={handleBilling}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl mt-2 transition"
            >
              <FaReceipt /> Billing / Print Receipt
            </button>
          )}
        </div>
      </div>

      {/* Order Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-gray-900 text-gray-100 rounded-xl p-8 max-w-sm w-full text-center shadow-2xl">
            <h2 className="text-2xl font-bold mb-4">🎉 Order Placed!</h2>
            <p className="mb-4">
              Thank you, <span className="font-semibold">{customerInfo.name}</span>!<br />
              Your order total is <span className="text-red-500 font-bold">₱{orderTotal}</span>.
            </p>
            <button
              onClick={handleCloseModal}
              className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl transition"
            >
              Continue Ordering
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-gray-900 text-gray-100 rounded-xl p-6 max-w-md w-full text-left shadow-2xl">
            <div id="receipt-content">
              <h2 className="text-2xl font-bold mb-2 text-center">🧾 Receipt</h2>
              <p className="mb-2"><strong>Customer:</strong> {customerInfo.name}</p>
              <p className="mb-2"><strong>Table:</strong> {customerInfo.table}</p>

              {lastOrder && (
                <>
                  <h3 className="font-semibold mt-4">Last Order:</h3>
                  {lastOrder.items.map((item) => (
                    <div key={item.cartId} className="flex justify-between text-sm mb-1">
                      <span>{item.name} {item.qty > 1 && `(x${item.qty})`}</span>
                      <span>₱{item.price * item.qty}</span>
                    </div>
                  ))}
                  <div className="text-right font-bold mt-1">Total: ₱{lastOrder.total}</div>
                </>
              )}

              {allOrdersTotal > 0 && (
                <div className="mt-4 border-t border-gray-600 pt-2">
                  <h3 className="font-semibold text-yellow-400">All Orders Total</h3>
                  <div className="text-right font-bold">₱{allOrdersTotal}</div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl transition"
              >
                Print / Save
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
