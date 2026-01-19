// src/Pages/StoreManager/StockInPage.js
import React, { useState, useEffect } from "react";
import api from "../../Utils/api";

const StockInPage = () => {
  const [items, setItems] = useState([]);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [remarks, setRemarks] = useState("");
  const [stockInList, setStockInList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  useEffect(() => {
    fetchItems();
    fetchStockIn();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get("/inventory/items/");
      setItems(res.data);
    } catch (err) {
      console.error("❌ Error fetching items:", err);
      setNotification({ show: true, message: "Failed to fetch items", type: "error" });
    }
  };

  const fetchStockIn = async () => {
    try {
      const res = await api.get("/stockin/");
      setStockInList(res.data);
    } catch (err) {
      console.error("❌ Error fetching stock-in:", err);
      setNotification({ show: true, message: "Failed to fetch stock-in records", type: "error" });
    }
  };

  const handleAdd = async () => {
    if (!itemId || !quantity) {
      setNotification({ show: true, message: "Item and quantity are required", type: "error" });
      return;
    }

    const payload = {
      stock_in_no: `SI-${Date.now().toString().slice(-5)}`,
      item: itemId, // send ID
      quantity: Number(quantity),
      remarks,
    };

    try {
      setIsSubmitting(true);
      await api.post("/stockin/", payload);
      fetchStockIn();
      setItemId("");
      setQuantity("");
      setRemarks("");
      setNotification({ show: true, message: "Stock-in added successfully", type: "success" });
    } catch (err) {
      console.error("❌ Error adding stock-in:", err.response?.data || err.message);
      setNotification({ show: true, message: "Failed to add stock-in", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 mt-20">
      <h2 className="text-2xl font-semibold mb-6">Stock In</h2>

      {/* Notification */}
      {notification.show && (
        <div
          className={`mb-4 p-3 rounded ${
            notification.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Form Section */}
      <div className="bg-[#4B553A] text-white p-6 rounded shadow max-w-3xl mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block mb-1 font-medium">Item</label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full px-3 py-2 rounded text-black"
              required
            >
              <option value="">-- Select Item --</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.quantity_in_stock} {item.unit} in stock)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Quantity</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 rounded text-black"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 rounded text-black"
            />
          </div>
        </div>

        <button
          onClick={handleAdd}
          disabled={isSubmitting}
          className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-white"
        >
          {isSubmitting ? "Adding..." : "Add"}
        </button>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded shadow text-sm">
          <thead>
            <tr className="bg-gray-200 text-gray-700">
              <th className="px-4 py-2 border">Date Added</th>
              <th className="px-4 py-2 border">StockIn No</th>
              <th className="px-4 py-2 border">Item</th>
              <th className="px-4 py-2 border">Quantity</th>
              <th className="px-4 py-2 border">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {stockInList.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-4 text-gray-500">
                  No stock-in records yet.
                </td>
              </tr>
            ) : (
              stockInList.map((record) => (
                <tr key={record.id} className="hover:bg-gray-100">
                  <td className="px-4 py-2 border">{record.date_added}</td>
                  <td className="px-4 py-2 border">{record.stock_in_no}</td>
                  <td className="px-4 py-2 border">{record.item_display}</td>
                  <td className="px-4 py-2 border">{record.quantity}</td>
                  <td className="px-4 py-2 border">{record.remarks}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockInPage;
