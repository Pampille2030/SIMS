import React, { useEffect, useState } from "react";
import api from "../../Utils/api";

const MDPORequestPage = () => {
  const [requests, setRequests] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [comment, setComment] = useState("");

  // ============================
  // Fetch PO Requests
  // ============================
  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get("/porequests/md/list/");
      setRequests(res.data);
    } catch (err) {
      console.error("Failed to fetch PO requests", err);
    }
  };

  // ============================
  // Open View Modal
  // ============================
  const handleView = (request) => {
    setActiveRequest(request);
    setComment(request.approval_comment || "");
    setModalOpen(true);
  };

  // ============================
  // Approve / Reject
  // ============================
  const handleApproval = async (status) => {
    try {
      await api.patch(`/porequests/md/approve/${activeRequest.id}/`, {
        approval_status: status,
        approval_comment: comment,
      });

      setModalOpen(false);
      setActiveRequest(null);
      setComment("");
      fetchRequests();
    } catch (err) {
      console.error("Approval failed", err);
    }
  };

  // ============================
  // Status Styling
  // ============================
  const statusColor = (status) => {
    if (status === "APPROVED") return "text-green-600 font-semibold";
    if (status === "REJECTED") return "text-red-600 font-semibold";
    if (status === "PENDING") return "text-black font-semibold"; // text only
    return "text-gray-600 font-semibold";
  };

  // ============================
  // Format Date Helper
  // ============================
  const formatDate = (isoString) => {
    const d = new Date(isoString);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 => 12
    return `${dd}/${mm}/${yy}, ${hours}:${minutes} ${ampm}`;
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Purchase Request Approvals</h1>

      {/* TABLE */}
      <div className="bg-white p-4 rounded shadow-md max-w-7xl overflow-x-auto">
        <table className="min-w-full border border-gray-300 border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-3 py-2">Date</th>
              <th className="border px-3 py-2">Item Name</th>
              <th className="border px-3 py-2">Quantity Requested</th>
              <th className="border px-3 py-2">Quantity in Stock</th>
              <th className="border px-3 py-2">Employee</th>
              <th className="border px-3 py-2">View</th>
              <th className="border px-3 py-2">Approve / Reject</th>
              <th className="border px-3 py-2">Approval Status</th>
            </tr>
          </thead>

          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-6">
                  No purchase requests found
                </td>
              </tr>
            ) : (
              requests.map((req) => {
                const isFinal =
                  req.approval_status === "APPROVED" ||
                  req.approval_status === "REJECTED";

                return (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="border px-3 py-2">{formatDate(req.created_at)}</td>
                    <td className="border px-3 py-2">{req.item_name}</td>
                    <td className="border px-3 py-2">{req.requested_quantity ?? req.requested_qty}</td>
                    <td className="border px-3 py-2">{req.quantity_in_stock}</td>
                    <td className="border px-3 py-2">{req.employee_name}</td>

                    {/* ✅ View Button */}
                    <td className="border px-3 py-2">
                      <button
                        onClick={() => handleView(req)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        View
                      </button>
                    </td>

                    <td className="border px-3 py-2 flex gap-2">
                      <button
                        disabled={isFinal}
                        onClick={() => {
                          setActiveRequest(req);
                          setModalOpen(true);
                        }}
                        className={`px-3 py-1 rounded text-white ${
                          isFinal
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        Approve
                      </button>

                      <button
                        disabled={isFinal}
                        onClick={() => {
                          setActiveRequest(req);
                          setModalOpen(true);
                        }}
                        className={`px-3 py-1 rounded text-white ${
                          isFinal
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        Reject
                      </button>
                    </td>

                    {/* Status */}
                    <td className={`border px-3 py-2 ${statusColor(req.approval_status)}`}>
                      {req.approval_status}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modalOpen && activeRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-3">Request Details</h2>

            <p><strong>Date:</strong> {formatDate(activeRequest.created_at)}</p>
            <p><strong>Item:</strong> {activeRequest.item_name}</p>
            <p><strong>Requested:</strong> {activeRequest.requested_quantity ?? activeRequest.requested_qty}</p>
            <p><strong>In Stock:</strong> {activeRequest.quantity_in_stock}</p>
            <p><strong>Employee:</strong> {activeRequest.employee_name}</p>

            {/* Status */}
            <p className={`mt-2 ${statusColor(activeRequest.approval_status)}`}>
              <strong>Status:</strong> {activeRequest.approval_status}
            </p>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="MD comment..."
              rows={4}
              className="w-full border rounded px-3 py-2 mt-4"
              disabled={activeRequest.approval_status !== "PENDING"} // ✅ disable if approved/rejected
            />

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setModalOpen(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Close
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => handleApproval("APPROVED")}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  disabled={activeRequest.approval_status !== "PENDING"} // ✅ disable if approved/rejected
                >
                  Approve
                </button>
                <button
                  onClick={() => handleApproval("REJECTED")}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  disabled={activeRequest.approval_status !== "PENDING"} // ✅ disable if approved/rejected
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MDPORequestPage;
