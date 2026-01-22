import React, { useEffect, useState } from "react";
import api from "../../Utils/api";

const MDPORequestPage = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [comment, setComment] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get("/porequests/md/list/");
      setRequests(res.data);
      setFilteredRequests(res.data);
    } catch (err) {
      console.error("Failed to fetch PO requests", err);
    }
  };

  const filterRequests = (date = selectedDate, status = selectedStatus) => {
    let filtered = [...requests];

    if (date) {
      filtered = filtered.filter((req) => {
        const reqDate = new Date(req.created_at);
        const yyyy = reqDate.getFullYear();
        const mm = String(reqDate.getMonth() + 1).padStart(2, "0");
        const dd = String(reqDate.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}` === date;
      });
    }

    if (status !== "all") {
      filtered = filtered.filter((req) => req.approval_status === status.toUpperCase());
    }

    setFilteredRequests(filtered);
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    filterRequests(date, selectedStatus);
  };

  const handleStatusChange = (e) => {
    const status = e.target.value;
    setSelectedStatus(status);
    filterRequests(selectedDate, status);
  };

  const handleView = (request) => {
    setActiveRequest(request);
    setComment(request.approval_comment || "");
    setModalOpen(true);
  };

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

  const statusBadge = (status) => (
    <span className="inline-flex px-3 py-1 rounded-full text-white bg-[#4a533b]">
      {status || "PENDING"}
    </span>
  );

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${dd}/${mm}/${yy}, ${hours}:${minutes} ${ampm}`;
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Purchase Request Approvals</h1>

      {/* FILTERS */}
      <div
        className="mb-4 flex flex-wrap gap-4 items-center p-4 rounded"
        style={{ backgroundColor: "#4a533b" }}
      >
        <div>
          <label className="mr-2 font-semibold text-white">Filter by Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="border px-2 py-1 rounded"
            max={today}
          />
        </div>

        <div>
          <label className="mr-2 font-semibold text-white">Filter by Status:</label>
          <select
            value={selectedStatus}
            onChange={handleStatusChange}
            className="border px-2 py-1 rounded"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

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
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-6">
                  No purchase requests found
                </td>
              </tr>
            ) : (
              filteredRequests.map((req) => {
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

                    <td className="border px-3 py-2">
                      <button
                        onClick={() => handleView(req)}
                        className="bg-[#4a533b] text-white px-3 py-1 rounded hover:bg-[#3c452f]"
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
                          isFinal ? "bg-gray-400 cursor-not-allowed" : "bg-[#4a533b] hover:bg-[#3c452f]"
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
                          isFinal ? "bg-gray-400 cursor-not-allowed" : "bg-[#4a533b] hover:bg-[#3c452f]"
                        }`}
                      >
                        Reject
                      </button>
                    </td>

                    <td className="border px-3 py-2">{statusBadge(req.approval_status)}</td>
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

            <p className="mt-2">
              <strong>Status:</strong> {statusBadge(activeRequest.approval_status)}
            </p>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="MD comment..."
              rows={4}
              className="w-full border rounded px-3 py-2 mt-4"
              disabled={activeRequest.approval_status !== "PENDING"}
            />

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setModalOpen(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Close
              </button>

              {activeRequest.approval_status === "PENDING" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproval("APPROVED")}
                    className="bg-[#4a533b] text-white px-4 py-2 rounded hover:bg-[#3c452f]"
                  >
                    Approve
                  </button>

                  <button
                    onClick={() => handleApproval("REJECTED")}
                    className="bg-[#4a533b] text-white px-4 py-2 rounded hover:bg-[#3c452f]"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MDPORequestPage;
