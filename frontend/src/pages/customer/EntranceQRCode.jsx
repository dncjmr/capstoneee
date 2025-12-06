import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";


export default function EntranceQRCode() {
  const navigate = useNavigate();
  const [qrSize, setQrSize] = useState(200);

  // Read URL from .env file
  const queueUrl = import.meta.env.VITE_QUEUE_URL || "http://localhost:5173/queue";

  // Make QR code responsive
  useEffect(() => {
    const handleResize = () => {
      const size = Math.min(window.innerWidth * 0.6, 300);
      setQrSize(size);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-gray-100 px-4">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl font-bold mb-6 text-center"
      >
        Welcome to Seoul Gui 199
      </motion.h1>

      <QRCodeSVG
        value={queueUrl}
        size={qrSize}
        fgColor="#34D399"
        bgColor="#1F2937"
      />

      <p className="text-gray-300 mt-4 text-center text-lg">
        Scan this QR code to join the queue and reserve your table.
      </p>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate("/queue")}
        className="mt-8 px-6 py-3 bg-green-500 text-gray-900 font-bold rounded-xl shadow-lg hover:shadow-2xl transition"
      >
        Or click here to join queue
      </motion.button>
    </div>
  );
}
