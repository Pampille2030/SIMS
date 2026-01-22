import React, { useState } from "react";
import api from "../../Utils/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ReportsPage = () => {
  const [reportType, setReportType] = useState("purchase-orders");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reportEndpoints = {
    "purchase-orders": "purchase-orders",
    "issue-out": "issue-out",
    "stock-in": "stock-in",
  };

  const today = new Date().toISOString().split("T")[0];

  const handleGenerate = async () => {
    if (!fromDate || !toDate) {
      setError("Please select both From and To dates.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const endpoint = reportEndpoints[reportType];
      const res = await api.get(`/reports/${endpoint}/`, {
        params: { from: fromDate, to: toDate },
      });
      setData(res.data || []);
    } catch (err) {
      console.error("Report fetch error:", err);
      setError(err.response?.data?.error || "Failed to fetch report data.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("SOLIO RANCH LTD", 105, 15, { align: "center" });

    doc.setFontSize(13);
    doc.text("INVENTORY REPORT", 105, 23, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text(
      `Report Type: ${reportType.replace("-", " ").toUpperCase()}`,
      14,
      32
    );
    doc.text(`From: ${fromDate}   To: ${toDate}`, 14, 38);

    const headers =
      reportType === "purchase-orders"
        ? ["PO Number", "Date", "Items", "Quantity", "Total", "Payment", "Delivery"]
        : reportType === "issue-out"
        ? ["Date", "Item", "Issued To", "Quantity", "Reason", "Approval", "Status"]
        : Object.keys(data[0] || {}).filter((k) => k !== "report_type");

    const rows = data.map((row) => {
      if (reportType === "purchase-orders") {
        return [
          row.po_number,
          row.created_at_formatted || row.created_at, // use formatted if exists
          row.items?.map((i) => `${i.item_name} (${i.quantity} ${i.item_unit})`).join(", "),
          row.items?.reduce((a, i) => a + i.quantity, 0),
          row.total_order_amount,
          row.payment_status,
          row.delivery_status,
        ];
      }

      if (reportType === "issue-out") {
        return [
          row.issue_date,
          row.item_name,
          row.issued_to_name,
          row.quantity_issued,
          row.reason,
          row.approval_status,
          row.status,
        ];
      }

      return headers.map((h) => row[h] ?? "");
    });

    autoTable(doc, {
      startY: 45,
      head: [headers],
      body: rows,
      styles: { fontSize: 9, font: "times" },
      headStyles: { fillColor: [74, 83, 58], textColor: 255 },
    });

    doc.save(`${reportType}_${fromDate}_to_${toDate}.pdf`);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen pb-32">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4 items-end bg-[#4a533b] p-3 rounded">
        <div>
          <label className="block mb-1 text-sm text-white">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="border px-3 py-2 rounded w-60"
          >
            <option value="purchase-orders">Purchase Orders</option>
            <option value="issue-out">Issue Out</option>
            <option value="stock-in">Stock In</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 text-sm text-white">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            max={today}
            className="border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm text-white">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            max={today}
            className="border px-3 py-2 rounded"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* Table */}
      <div className="bg-white p-4 rounded shadow overflow-x-auto">
        {!loading && data.length === 0 ? (
          <p className="text-gray-500">
            No data to display. Select a date range and generate a report.
          </p>
        ) : (
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                {reportType === "purchase-orders"
                  ? ["po_number", "created_at_formatted", "items", "total_order_amount", "payment_status", "delivery_status"].map((key) => (
                      <th key={key} className="border px-3 py-2 text-left">
                        {key === "po_number"
                          ? "PO NUMBER"
                          : key === "created_at_formatted"
                          ? "DATE"
                          : key === "items"
                          ? "ITEMS"
                          : key === "total_order_amount"
                          ? "AMOUNT"
                          : key === "payment_status"
                          ? "PAYMENT STATUS"
                          : "DELIVERY"}
                      </th>
                    ))
                  : Object.keys(data[0] || {})
                      .filter((k) => k !== "report_type")
                      .map((key) => (
                        <th key={key} className="border px-3 py-2 text-left">
                          {key.replace(/_/g, " ").toUpperCase()}
                        </th>
                      ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {reportType === "purchase-orders"
                    ? [
                        row.po_number,
                        row.created_at_formatted || row.created_at,
                        row.items?.map((i) => `${i.item_name} (${i.quantity} ${i.item_unit})`).join(", "),
                        row.total_order_amount,
                        row.payment_status,
                        row.delivery_status,
                      ].map((val, idx) => (
                        <td key={idx} className="border px-3 py-2">{val}</td>
                      ))
                    : Object.keys(row)
                        .filter((k) => k !== "report_type")
                        .map((k) => (
                          <td key={k} className="border px-3 py-2">
                            {k === "items" && Array.isArray(row[k])
                              ? row[k]
                                  .map((item) => `${item.item_name} (${item.quantity} ${item.item_unit})`)
                                  .join(", ")
                              : row[k] ?? ""}
                          </td>
                        ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PDF Button */}
      {data.length > 0 && (
        <div className="flex justify-end mt-6">
          <button
            onClick={handleDownloadPDF}
            className="bg-[#4a533b] hover:bg-[#3d462f] text-white px-6 py-2 rounded font-medium"
          >
            Download PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
