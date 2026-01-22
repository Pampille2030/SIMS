import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";

const InventoryStockPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("all");

  axios.defaults.baseURL = "http://localhost:8000";

  // ---------------- Fetch stock ----------------
  const fetchStock = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/stockquantity/", {
        params: { category: category === "all" ? null : category },
      });
      setItems(response.data);
    } catch (error) {
      console.error("Error fetching inventory stock:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  // ---------------- PDF download ----------------
  const downloadPDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();

    doc.setFontSize(16);
    doc.setFont("times", "bold");
    doc.text("SOLIO RANCH LTD", 105, 15, { align: "center" });

    doc.setFontSize(13);
    doc.setFont("times", "normal");
    doc.text(`OPENING BALANCE AS AT ${today}`, 105, 23, { align: "center" });

    const tableColumn = ["#", "Item Name", "Reorder Level", "Quantity in Stock", "Unit"];
    const tableRows = items.map((item, index) => [
      index + 1,
      item.item_name,
      item.reorder_level ?? "null",
      item.quantity_in_stock,
      item.unit || "-",
    ]);

    autoTable(doc, {
      startY: 35,
      head: [tableColumn],
      body: tableRows,
      styles: { fontSize: 9, font: "times" },
      headStyles: { fillColor: [74, 83, 58], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        3: { halign: "left", fontStyle: "bold" },
      },
    });

    doc.save(`InventoryStock_${category}.pdf`);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen pb-32">
      <h2 className="text-2xl font-bold mb-6">Current Stock Balance</h2>

      {/* Filter + Generate */}
      <div className="mb-4 flex flex-wrap gap-4 items-end bg-[#4a533b] p-3 rounded">
        <div>
          <label htmlFor="category" className="block mb-1 text-sm text-white font-semibold">
            Filter by Category:
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border px-3 py-2 rounded w-60"
          >
            <option value="all">All</option>
            <option value="material">Material</option>
            <option value="tool">Tool</option>
            <option value="fuel">Fuel</option>
          </select>
        </div>
        <button
          onClick={fetchStock}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Generate
        </button>
      </div>

{/* Table */}

<div className="bg-white p-4 rounded shadow overflow-x-auto">
  {!loading && items.length === 0 ? (
    <p className="text-gray-500">
      No items to display. Select a category and generate the table.
    </p>
  ) : (
    <table className="min-w-full border border-gray-300">
      <thead className="bg-gray-200">
        <tr>
          <th className="border px-3 py-2 text-left">#</th>
          <th className="border px-3 py-2 text-left">Item Name</th>
          <th className="border px-3 py-2 text-left">Reorder Level</th>
          <th className="border px-3 py-2 text-left">Current Stock Balance</th>
          <th className="border px-3 py-2 text-left">Unit</th>
        </tr>
      </thead>
      <tbody className="text-sm"> {/* use default system font */}
        {items.map((item, index) => (
          <tr key={index} className="hover:bg-gray-50">
            <td className="border px-3 py-2">{index + 1}</td>
            <td className="border px-3 py-2">{item.item_name}</td>
            <td className="border px-3 py-2">{item.reorder_level ?? "null"}</td>
            <td
              className={`border px-3 py-2 text-left ${
                item.quantity_in_stock < (item.reorder_level ?? Infinity)
                  ? "font-bold text-red-600"
                  : ""
              }`}
            >
              {item.quantity_in_stock}
            </td>
            <td className="border px-3 py-2">{item.unit || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
</div>

      {items.length > 0 && (
        <div className="flex justify-end mt-6">
          <button
            onClick={downloadPDF}
            className="bg-[#4a533b] hover:bg-[#3d462f] text-white px-6 py-2 rounded font-medium"
          >
            Download PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default InventoryStockPage;
