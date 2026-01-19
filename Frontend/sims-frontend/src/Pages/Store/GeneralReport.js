import React, { useState } from "react";
import api from "../../Utils/api";

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

  // Columns for Purchase Order table
  const poColumns = [
    "po_number",
    "created_at",
    "item_name",
    "quantity",
    "total_order_amount",
    "payment_status",
    "delivery_status",
  ];

  // Columns for Issue Out table
  const issueOutColumns = [
    "issue_date",
    "item_name",
    "issued_to_name",
    "quantity_issued",
    "reason",
    "approval_status",
    "status",
  ];

  const formatHeader = (header) => {
    switch (header) {
      case "status":
        return "Issued Status";
      case "quantity_issued":
        return "Quantity ";
      case "issued_to_name":
        return "Issued To";
      case "issue_date":
        return "Issue Date";
      default:
        return header.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-32">Reports</h1>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block mb-1 text-sm">Report Type</label>
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
          <label className="block mb-1 text-sm">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border px-3 py-2 rounded"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white px-4 py-2 rounded"
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
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                {reportType === "purchase-orders"
                  ? poColumns.map((key) => (
                      <th
                        key={key}
                        className="border border-gray-300 px-3 py-2 text-left"
                      >
                        {formatHeader(key)}
                      </th>
                    ))
                  : reportType === "issue-out"
                  ? issueOutColumns.map((key) => (
                      <th
                        key={key}
                        className="border border-gray-300 px-3 py-2 text-left"
                      >
                        {formatHeader(key)}
                      </th>
                    ))
                  : data.length > 0 &&
                    Object.keys(data[0])
                      .filter((k) => k !== "report_type")
                      .map((key) => (
                        <th
                          key={key}
                          className="border border-gray-300 px-3 py-2 text-left"
                        >
                          {formatHeader(key)}
                        </th>
                      ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  {reportType === "purchase-orders"
                    ? poColumns.map((col) => {
                        if (col === "item_name") {
                          const names = row.items?.map((i) => i.item_name).join(", ");
                          return <td key={col} className="border border-gray-300 px-3 py-2">{names}</td>;
                        }
                        if (col === "quantity") {
                          const qty = row.items?.reduce((acc, i) => acc + i.quantity, 0);
                          return <td key={col} className="border border-gray-300 px-3 py-2">{qty}</td>;
                        }
                        if (col === "total_order_amount") {
                          return <td key={col} className="border border-gray-300 px-3 py-2">{row.total_order_amount}</td>;
                        }
                        if (col === "payment_status") {
                          return <td key={col} className="border border-gray-300 px-3 py-2">{row.payment_status}</td>;
                        }
                        if (col === "delivery_status") {
                          return <td key={col} className="border border-gray-300 px-3 py-2">{row.delivery_status}</td>;
                        }
                        if (col === "created_at") {
                          return <td key={col} className="border border-gray-300 px-3 py-2">{row.created_at}</td>;
                        }
                        if (col === "po_number") {
                          return <td key={col} className="border border-gray-300 px-3 py-2">{row.po_number}</td>;
                        }
                        return null;
                      })
                    : reportType === "issue-out"
                    ? issueOutColumns.map((col) => (
                        <td key={col} className="border border-gray-300 px-3 py-2">
                          {col === "item_name"
                            ? row.item_name
                            : col === "issued_to_name"
                            ? row.issued_to_name
                            : col === "quantity_issued"
                            ? row.quantity_issued
                            : col === "approval_status"
                            ? row.approval_status
                            : col === "status"
                            ? row.status
                            : row[col] ?? ""}
                        </td>
                      ))
                    : Object.keys(row)
                        .filter((k) => k !== "report_type")
                        .map((col) => (
                          <td key={col} className="border border-gray-300 px-3 py-2">
                            {row[col] !== null && typeof row[col] === "object"
                              ? JSON.stringify(row[col])
                              : row[col] ?? ""}
                          </td>
                        ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
