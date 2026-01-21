import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";

const InventoryStockPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("all");

  // Set base URL if backend is on different port
  axios.defaults.baseURL = "http://localhost:8000";

  // ---------------- Fetch stock from backend ----------------
  const fetchStock = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/stockquantity/", {
        params: { category: category === "all" ? null : category },
      });
      console.log("Stock fetched:", response.data); // debug
      setItems(response.data);
    } catch (error) {
      console.error("Error fetching inventory stock:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock(); // load all stock on mount
  }, []);

  // ---------------- PDF download ----------------
  const downloadPDF = () => {
    const doc = new jsPDF();

    // ------------------ Title ------------------
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("SOLIO RANCH LTD, INVENTORY LIST", 14, 20);

    // ------------------ Generated date ------------------
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    // ------------------ Table ------------------
    const tableColumn = ["#", "Item Name", "Reorder Level", "Quantity in Stock", "Unit"];
    const tableRows = items.map((item, index) => [
      index + 1,
      item.item_name,
      item.reorder_level,
      item.quantity_in_stock,
      item.unit || "-",
    ]);

    autoTable(doc, {
      startY: 35,
      head: [tableColumn],
      body: tableRows,
      styles: { cellPadding: 3, fontSize: 10 },
      headStyles: { fillColor: [220, 220, 220], fontStyle: "bold" }, // bold headers
      columnStyles: {
        3: {
          halign: "right",
          fontStyle: "bold", // make quantity bold
          // optional: conditional bold for low stock
          // textColor: (row) => row.raw[3] < row.raw[2] ? [255,0,0] : [0,0,0]
        },
      },
    });

    doc.save(`InventoryStock_${category}.pdf`);
  };

  return (
    <div className="page-container p-6">
      <h2 className="text-2xl font-bold mb-4">Inventory Items in Stock</h2>

      {/* Filter + Generate */}
      <div className="flex items-center mb-4 space-x-2">
        <label htmlFor="category" className="font-semibold">Filter by Category:</label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="all">All</option>
          <option value="material">Material</option>
          <option value="tool">Tool</option>
          <option value="fuel">Fuel</option>
        </select>
        <button
          onClick={fetchStock}
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
        >
          Generate
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading inventory...</p>
      ) : (
        <table className="table-auto w-full border-collapse border border-gray-300 mb-4">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-4 py-2">#</th>
              <th className="border px-4 py-2">Item Name</th>
              <th className="border px-4 py-2">Reorder Level</th>
              <th className="border px-4 py-2 text-right">Quantity in Stock</th>
              <th className="border px-4 py-2">Unit</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-4">No items in stock</td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={index}>
                  <td className="border px-4 py-2">{index + 1}</td>
                  <td className="border px-4 py-2">{item.item_name}</td>
                  <td className="border px-4 py-2">{item.reorder_level}</td>
                  <td
                    className={`border px-4 py-2 text-right ${
                      item.quantity_in_stock < item.reorder_level ? "font-bold text-red-600" : ""
                    }`}
                  >
                    {item.quantity_in_stock}
                  </td>
                  <td className="border px-4 py-2">{item.unit || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {items.length > 0 && (
        <button
          onClick={downloadPDF}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Download PDF
        </button>
      )}
    </div>
  );
};

export default InventoryStockPage;
