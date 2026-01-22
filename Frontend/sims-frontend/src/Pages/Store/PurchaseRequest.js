import React, { useEffect, useState } from "react";
import api from "../../Utils/api";

const PurchaseOrderRequestPage = () => {
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);

  const [selectedItem, setSelectedItem] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [quantityRequested, setQuantityRequested] = useState("");
  const [remarks, setRemarks] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  // ====== IMPORTANT ======
  const employeeId = 1; // Replace with actual logged-in employee ID

  // ===========================
  // Initial load
  // ===========================
  useEffect(() => {
    fetchItems();
    fetchRequests();
  }, []);

  // ===========================
  // Fetch inventory items
  // ===========================
  const fetchItems = async () => {
    try {
      const res = await api.get("/inventory/items/");
      setItems(res.data);
    } catch (err) {
      console.error("Failed to fetch items", err);
    }
  };

  // ===========================
  // Fetch submitted PO requests
  // ===========================
  const fetchRequests = async () => {
    try {
      const res = await api.get("/porequests/list/");
      setRequests(res.data);
    } catch (err) {
      console.error("Failed to fetch requests", err);
    }
  };

  // ===========================
  // Update current stock when item changes
  // ===========================
  useEffect(() => {
    const item = items.find((i) => i.id === Number(selectedItem));
    setCurrentStock(item ? item.quantity_in_stock : "");
  }, [selectedItem, items]);

  // ===========================
  // Submit PO request
  // ===========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedItem || !quantityRequested) {
      setError("Please fill all required fields.");
      setSuccess("");
      return;
    }

    try {
      await api.post("/porequests/create/", {
        item: Number(selectedItem),
        requested_quantity: Number(quantityRequested),
        remarks: remarks || "",
        employee: Number(employeeId),
      });

      setSuccess("Purchase request submitted successfully");
      setError("");

      setSelectedItem("");
      setQuantityRequested("");
      setRemarks("");
      setCurrentStock("");

      fetchRequests();
    } catch (err) {
      console.error(err.response?.data || err);
      setError(err.response?.data?.detail || "Failed to submit request");
      setSuccess("");
    }
  };

  // ===========================
  // Approval status color
  // ===========================
  const statusColor = (status) => {
    if (status === "APPROVED") return "text-green-600 font-semibold";
    if (status === "REJECTED") return "text-red-600 font-semibold";
    if (status === "PENDING") return "text-black font-semibold";
    return "text-gray-600 font-semibold";
  };

  // ===========================
  // Open modal with request details
  // ===========================
  const openModal = (req) => {
    setModalData(req);
    setModalOpen(true);
  };

  // ===========================
  // Close modal
  // ===========================
  const closeModal = () => {
    setModalData(null);
    setModalOpen(false);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Purchase Order Request</h1>

      {/* ================= FORM ================= */}
      <form
        onSubmit={handleSubmit}
        className="p-6 rounded shadow-md max-w-6xl space-y-4"
        style={{ backgroundColor: "#4a533b" }}
      >
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[160px]">
            <label className="block mb-1 font-semibold text-white">Item</label>
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">-- Select Item --</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block mb-1 font-semibold text-white">
              Quantity in Stock
            </label>
            <input
              type="number"
              value={currentStock}
              readOnly
              className="w-full border px-3 py-2 rounded bg-gray-100"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block mb-1 font-semibold text-white">
              Quantity Requested
            </label>
            <input
              type="number"
              min="1"
              value={quantityRequested}
              onChange={(e) => setQuantityRequested(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block mb-1 font-semibold text-white">Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
        </div>

        {error && <p className="text-red-300">{error}</p>}
        {success && <p className="text-green-300">{success}</p>}

        <button
          type="submit"
          className="bg-green-700 text-white px-5 py-2 rounded hover:bg-green-800"
        >
          Submit Request
        </button>
      </form>

      {/* ================= TABLE ================= */}
      <div className="mt-8 bg-white p-4 rounded shadow-md max-w-6xl overflow-x-auto">
        <h2 className="text-xl font-bold mb-4">Submitted Requests</h2>

        <table className="min-w-full border border-gray-300 border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-3 py-2">Date</th>
              <th className="border px-3 py-2">Item</th>
              <th className="border px-3 py-2">Quantity Requested</th>
              <th className="border px-3 py-2">Quantity in Stock</th>
              <th className="border px-3 py-2">Employee</th>
              <th className="border px-3 py-2">Remarks</th>
              <th className="border px-3 py-2">Approval Status</th>
              <th className="border px-3 py-2">View</th>
            </tr>
          </thead>

          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-4">
                  No requests yet
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="border px-3 py-2">
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                  <td className="border px-3 py-2">{req.item_name}</td>
                  <td className="border px-3 py-2">{req.requested_quantity}</td>
                  <td className="border px-3 py-2">{req.quantity_in_stock}</td>
                  <td className="border px-3 py-2">{req.employee_name}</td>
                  <td className="border px-3 py-2">{req.remarks || "-"}</td>
                  <td className={`border px-3 py-2 ${statusColor(req.approval_status)}`}>
                    {req.approval_status}
                  </td>
                  <td className="border px-3 py-2 text-center">
                    <button
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      onClick={() => openModal(req)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL ================= */}
      {modalOpen && modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md max-w-lg w-full relative flex flex-col">
            <h2 className="text-xl font-bold mb-4">Request Details</h2>

            <p><strong>Item:</strong> {modalData.item_name}</p>
            <p><strong>Quantity Requested:</strong> {modalData.requested_quantity}</p>
            <p><strong>Quantity in Stock:</strong> {modalData.quantity_in_stock}</p>
            <p><strong>Remarks:</strong> {modalData.remarks || "-"}</p>
            <p>
              <strong>Approval Status:</strong>{" "}
              <span className={statusColor(modalData.approval_status)}>
                {modalData.approval_status}
              </span>
            </p>
            <p>
              <strong>MD Comments:</strong> {modalData.approval_comment || "-"}
            </p>

          {/* Close button at left bottom */}
          <div className="mt-6 flex justify-start">
            <button
              className="bg-gray-200 text-black px-4 py-2 rounded hover:bg-gray-300"
              onClick={closeModal}
            >
              Close
            </button>
          </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderRequestPage;
