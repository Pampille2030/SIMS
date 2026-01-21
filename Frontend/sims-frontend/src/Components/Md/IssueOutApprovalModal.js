import React, { useState } from "react";
import api from "../../Utils/api";

const MDIssueOutModal = ({ issue, onClose, onStatusChange }) => {
  const [loadingAction, setLoadingAction] = useState(null);

  if (!issue) return null;

  const canMDAct = issue.approval_status?.toLowerCase() === "pending";

  const formatStatus = (s) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

  const formatQty = (item) =>
    `${item.quantity_issued}${item.unit ? ` ${item.unit}` : ""}`;

  const handleAction = async (type) => {
    try {
      setLoadingAction(type);

      await api.post(`/item_issuance/issuerecords/${issue.id}/${type}/`);

      const { data: updatedIssue } = await api.get(
        `/item_issuance/issuerecords/${issue.id}/`
      );

      onStatusChange(updatedIssue);
      onClose();
    } catch (error) {
      console.error(
        `❌ Error ${type} issue:`,
        error.response?.data || error.message
      );
      alert(`Failed to ${type} issue ❌`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed top-24 left-0 right-0 bottom-0 z-50 flex items-start justify-center bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-lg mt-4">
        <h3 className="text-xl font-bold mb-3 text-gray-800">
          Issue Out Details
        </h3>

        {/* Items first */}
        <div className="mt-3">
          <h4 className="font-semibold text-md">Items:</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">
            {issue.items && issue.items.length > 0 ? (
              issue.items.map((item, i) => (
                <li key={i}>
                  {item.item_name} — Qty: {formatQty(item)}
                </li>
              ))
            ) : (
              <li>No items listed</li>
            )}
          </ul>
        </div>

        {/* Employee */}
        <div className="space-y-2 text-gray-700 mt-3">
          <p><strong>Employee:</strong> {issue.issued_to_name || "Unknown"}</p>
          <p><strong>Reason:</strong> {issue.reason || "N/A"}</p>
          <p>
            <strong>Approval Status:</strong> {formatStatus(issue.approval_status)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex justify-between">
          <button
            onClick={onClose}
            disabled={loadingAction !== null}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1.5 rounded disabled:opacity-50"
          >
            Close
          </button>

          {canMDAct && (
            <div className="space-x-2">
              <button
                onClick={() => handleAction("approve")}
                disabled={loadingAction !== null}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded disabled:opacity-50"
              >
                {loadingAction === "approve" ? "Processing..." : "Approve"}
              </button>

              <button
                onClick={() => handleAction("reject")}
                disabled={loadingAction !== null}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded disabled:opacity-50"
              >
                {loadingAction === "reject" ? "Processing..." : "Reject"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MDIssueOutModal;
