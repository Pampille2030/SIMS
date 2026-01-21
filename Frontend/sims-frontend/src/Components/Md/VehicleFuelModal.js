import React, { useState } from "react";
import api from "../../Utils/api";

const VehicleFuelModal = ({ issue, onClose, onStatusChange }) => {
  const [loadingAction, setLoadingAction] = useState(null);

  if (!issue) return null;

  const canMDAct = issue.approval_status?.toLowerCase() === "pending";

  const formatStatus = (status) =>
    status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : "";

  const getVehiclePlate = () =>
    issue.vehicle_plate || (issue.vehicle?.plate_number ?? "No Plate");

  const getEmployeeInfo = () =>
    issue.issued_to_name ||
    (issue.issued_to?.first_name && issue.issued_to?.last_name
      ? `${issue.issued_to.first_name} ${issue.issued_to.last_name} (${issue.issued_to.job_number || ""})`
      : "Unknown Employee");

  const getItemDisplay = () => {
    if (issue.items && issue.items.length > 0) {
      const item = issue.items[0];
      return `${item.item_name || "Fuel"} (${item.quantity_issued} ${item.unit || "L"})`;
    }
    return issue.fuel_litres ? `Diesel (${issue.fuel_litres} L)` : "No Item";
  };

  const handleAction = async (action) => {
    try {
      setLoadingAction(action);
      await api.post(`/item_issuance/issuerecords/${issue.id}/${action}/`);
      const { data: updatedIssue } = await api.get(
        `/item_issuance/issuerecords/${issue.id}/`
      );
      onStatusChange(updatedIssue);
      onClose();
    } catch (error) {
      console.error(`Error ${action}:`, error.response?.data || error.message);
      alert(`Failed to ${action} request`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed top-24 left-0 right-0 bottom-0 z-50 flex items-start justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-lg mt-4">
        <h3 className="text-xl font-bold mb-4 text-gray-800">
          Vehicle Fuel Request
        </h3>

        <div className="space-y-4 text-gray-700">

          {/* Vehicle */}
          <div>
            <span className="font-semibold">Vehicle :</span>{" "}
            <span>{getVehiclePlate()}</span>
          </div>

          {/* Item */}
          <div>
            <span className="font-semibold">Item :</span>{" "}
            <span>{getItemDisplay()}</span>
          </div>

          {/* Employee */}
          <div>
            <span className="font-semibold">Employee :</span>{" "}
            <span>{getEmployeeInfo()}</span>
          </div>

          {/* Reason */}
          <div>
            <span className="font-semibold">Reason :</span>{" "}
            <span>{issue.reason || "—"}</span>
          </div>

          {/* Approval Status */}
          <div>
            <span className="font-semibold">Approval status :</span>{" "}
            <span
              className={`px-2 py-1 rounded text-sm font-medium ${
                issue.approval_status?.toLowerCase() === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : issue.approval_status?.toLowerCase() === "approved"
                  ? "bg-green-100 text-green-800"
                  : issue.approval_status?.toLowerCase() === "rejected"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {formatStatus(issue.approval_status)}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={onClose}
            disabled={loadingAction !== null}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Close
          </button>

          {canMDAct && (
            <div className="space-x-3">
              <button
                onClick={() => handleAction("approve")}
                disabled={loadingAction !== null}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {loadingAction === "approve" ? "Processing..." : "Approve"}
              </button>

              <button
                onClick={() => handleAction("reject")}
                disabled={loadingAction !== null}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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

export default VehicleFuelModal;
