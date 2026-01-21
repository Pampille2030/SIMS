import React, { useEffect, useState } from "react";
import VehicleFuelModal from "../../Components/Md/VehicleFuelModal";
import api from "../../Utils/api";

const VehicleFuelApprovalPage = () => {
  const [fuelIssues, setFuelIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch vehicle fuel issues
  useEffect(() => {
    fetchVehicleFuelIssues();
  }, []);

  const fetchVehicleFuelIssues = async () => {
    try {
      setLoading(true);
      const response = await api.get("/item_issuance/issuerecords/", {
        params: { issue_type: "fuel", fuel_type: "vehicle" },
      });
      setFuelIssues(response.data);
    } catch (error) {
      console.error("Error fetching vehicle fuel issues:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update issue after approval/rejection
  const handleStatusChange = (updatedIssue) => {
    setFuelIssues((prev) =>
      prev.map((issue) =>
        issue.id === updatedIssue.id ? { ...issue, ...updatedIssue } : issue
      )
    );
    if (selectedIssue && selectedIssue.id === updatedIssue.id) {
      setSelectedIssue({ ...selectedIssue, ...updatedIssue });
    }
  };

  // Open modal
  const handleView = (issue) => {
    setSelectedIssue(issue);
    setShowModal(true);
  };

  // Format date
  const formatDateTime = (dateString) => {
    if (!dateString) return "--";
    const date = new Date(dateString);
    return (
      <div className="flex flex-col">
        <span>{date.toLocaleDateString()}</span>
        <span className="text-xs text-gray-500">
          {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    );
  };

  // Vehicle plate
  const getVehicleDetails = (issue) => {
    return issue.vehicle_plate || issue.vehicle?.plate_number || "No Plate";
  };

  // Fuel quantity issued ✅
  const getFuelDetails = (issue) => {
    // Check items array first
    if (Array.isArray(issue.items) && issue.items.length > 0) {
      const fuelItem = issue.items.find(
        (item) => item.item_category === "fuel"
      );
      if (fuelItem) {
        const quantity = fuelItem.quantity_issued ?? 0;
        const unit = fuelItem.unit || "L";
        return `${quantity}${unit}`;
      }
    }
    // Fallback to fuel_litres
    const litres = issue.fuel_litres ?? 0;
    return `${litres}L`;
  };

  // Issued to info
  const getIssuedToInfo = (issue) => {
    if (issue.issued_to_name) return issue.issued_to_name;
    if (typeof issue.issued_to === "object" && issue.issued_to !== null) {
      const firstName = issue.issued_to.first_name || "";
      const lastName = issue.issued_to.last_name || "";
      const jobNumber = issue.issued_to.job_number || "";
      const fullName = `${firstName} ${lastName}`.trim();
      return jobNumber ? `${fullName} (${jobNumber})` : fullName || "Unknown Employee";
    }
    if (typeof issue.issued_to === "number") return `Employee #${issue.issued_to}`;
    return "Unknown Employee";
  };

  // View button
  const getViewButton = (issue) => (
    <button
      onClick={() => handleView(issue)}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
    >
      View
    </button>
  );

  // Status badge
  const getStatusBadge = (status) => {
    const lower = (status || "").toLowerCase();
    const map = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      issued: "bg-blue-100 text-blue-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
          map[lower] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status || "Unknown"}
      </span>
    );
  };

  if (loading) return <p className="mt-24 text-center text-gray-600">Loading...</p>;
  if (fuelIssues.length === 0)
    return <p className="mt-24 text-center text-gray-600">No vehicle fuel issues found.</p>;

  return (
    <div className="p-4 mt-24">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Vehicle Fuel Approval</h2>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity Issued</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issued To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fuelIssues.map((issue) => (
              <tr key={issue.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">{formatDateTime(issue.issue_date)}</td>
                <td className="px-6 py-4">{getVehicleDetails(issue)}</td>
                <td className="px-6 py-4">{getFuelDetails(issue)}</td>
                <td className="px-6 py-4">{getIssuedToInfo(issue)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getViewButton(issue)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(issue.approval_status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && selectedIssue && (
        <VehicleFuelModal
          issue={selectedIssue}
          onClose={() => setShowModal(false)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};

export default VehicleFuelApprovalPage;
