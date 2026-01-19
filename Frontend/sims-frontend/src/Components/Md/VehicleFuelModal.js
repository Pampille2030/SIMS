import React, { useState } from "react";
import api from "../../Utils/api";

const VehicleFuelModal = ({ issue, onClose, onStatusChange }) => {
  const [loadingAction, setLoadingAction] = useState(null);

  if (!issue) return null;

  const canMDAct = issue.approval_status?.toLowerCase() === "pending";

  // Format status with proper capitalization
  const formatStatus = (s) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

  // Get vehicle plate number
  const getVehiclePlate = () => {
    if (issue.vehicle_plate) return issue.vehicle_plate;
    if (issue.vehicle?.plate_number) return issue.vehicle.plate_number;
    return "No Plate";
  };

  // Get employee display information
  const getEmployeeInfo = () => {
    if (issue.issued_to_name) return issue.issued_to_name;
    if (issue.issued_to && typeof issue.issued_to === "object") {
      const firstName = issue.issued_to.first_name || "";
      const lastName = issue.issued_to.last_name || "";
      const jobNumber = issue.issued_to.job_number || "";
      const name = `${firstName} ${lastName}`.trim();
      return jobNumber ? `${name} (${jobNumber})` : name || "Unknown Employee";
    }
    return "Unknown Employee";
  };

  // Handle approve/reject actions
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
        `Error ${type} vehicle fuel issue:`,
        error.response?.data || error.message
      );
      alert(`Failed to ${type} vehicle fuel request`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Use distance_traveled from backend
  const getDistanceTraveled = () => {
    if (issue.distance_traveled != null) {
      return `${issue.distance_traveled} km`;
    }
    
    if (issue.current_mileage && issue.previous_mileage) {
      return `${issue.current_mileage - issue.previous_mileage} km`;
    }
    
    return "--";
  };

  // Get fuel efficiency from backend
  const getFuelEfficiencyDisplay = () => {
    const efficiency = issue.fuel_efficiency;
    
    if (!efficiency || efficiency === 0) {
      return "N/A";
    }
    
    const efficiencyValue = Number(efficiency);
    return `${efficiencyValue.toFixed(2)} km/L`;
  };

  return (
    <div className="fixed top-24 left-0 right-0 bottom-0 z-50 flex items-start justify-center bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-lg mt-4">
        <h3 className="text-xl font-bold mb-3 text-gray-800">
          Vehicle Fuel Request Details
        </h3>

        <div className="space-y-2 text-gray-700">
          <p><strong>Employee:</strong> {getEmployeeInfo()}</p>
          <p><strong>Vehicle Plate:</strong> {getVehiclePlate()}</p>
          <p><strong>Fuel Quantity:</strong> {issue.fuel_litres || "0"} L</p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <strong className="block">Previous Mileage:</strong>
              <span>{issue.previous_mileage ?? "--"} km</span>
            </div>
            <div>
              <strong className="block">Current Mileage:</strong>
              <span>{issue.current_mileage ?? "--"} km</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <strong className="block">Distance Traveled:</strong>
              <span>{getDistanceTraveled()}</span>
            </div>
            <div>
              <strong className="block">Fuel Efficiency:</strong>
              <span>{getFuelEfficiencyDisplay()}</span>
            </div>
          </div>

          {/* Reason field */}
          {!(canMDAct && loadingAction === "reject") && (
            <p><strong>Reason:</strong> {issue.reason || "N/A"}</p>
          )}

          <p><strong>Approval Status:</strong> {formatStatus(issue.approval_status)}</p>
        </div>

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

export default VehicleFuelModal;