import React, { useEffect, useState } from "react";
import VehicleFuelModal from "../../Components/Md/VehicleFuelModal";
import api from "../../Utils/api";

const VehicleFuelApprovalPage = () => {
  const [fuelIssues, setFuelIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch vehicle fuel issues on component mount
  useEffect(() => {
    fetchVehicleFuelIssues();
  }, []);

  // Fetch vehicle fuel issues from API with fuel efficiency data
  const fetchVehicleFuelIssues = async () => {
    try {
      setLoading(true);
      const response = await api.get("/item_issuance/issuerecords/", {
        params: {
          issue_type: 'fuel',
          fuel_type: 'vehicle'
        }
      });
      
      setFuelIssues(response.data);
    } catch (error) {
      console.error("Error fetching vehicle fuel issues:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update issue status after approval/rejection
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

  // Open modal to view issue details
  const handleView = (issue) => {
    setSelectedIssue(issue);
    setShowModal(true);
  };

  // Format date and time with time below date
  const formatDateTime = (dateString) => {
    if (!dateString) return "--";
    const date = new Date(dateString);
    return (
      <div className="flex flex-col">
        <span>{date.toLocaleDateString()}</span>
        <span className="text-xs text-gray-500">
          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    );
  };

  // Get vehicle plate number only
  const getVehicleDetails = (issue) => {
    // Check if vehicle_plate is directly on the issue
    if (issue.vehicle_plate) {
      return issue.vehicle_plate;
    }
    
    // Check if vehicle is an object with plate_number
    if (issue.vehicle && issue.vehicle.plate_number) {
      return issue.vehicle.plate_number;
    }
    
    // Fallback
    return "No Plate";
  };

  // Get fuel details (quantity in litres)
  const getFuelDetails = (issue) => {
    if (issue.items && issue.items.length > 0) {
      const fuelItem = issue.items.find(item => 
        item.item?.category === 'fuel' || item.item_name?.toLowerCase().includes('fuel')
      );
      if (fuelItem) {
        return `${fuelItem.quantity_issued}${fuelItem.unit || 'L'}`;
      }
    }
    
    // Fallback to fuel_litres field
    const litres = issue.fuel_litres || 0;
    return `${litres}L`;
  };

  // Get employee information
  const getIssuedToInfo = (issue) => {
    // Check if issued_to_name exists (from serializer)
    if (issue.issued_to_name) {
      return issue.issued_to_name;
    }
    
    // Check if issued_to is an object with first_name and last_name
    if (issue.issued_to && typeof issue.issued_to === 'object') {
      const firstName = issue.issued_to.first_name || '';
      const lastName = issue.issued_to.last_name || '';
      const jobNumber = issue.issued_to.job_number || '';
      
      if (firstName || lastName) {
        const name = `${firstName} ${lastName}`.trim();
        return jobNumber ? `${name} (${jobNumber})` : name;
      }
    }
    
    // Check if issued_to is just an ID (number)
    if (issue.issued_to && typeof issue.issued_to === 'number') {
      return `Employee #${issue.issued_to}`;
    }
    
    // Fallback
    return "Unknown Employee";
  };

  // Show "View" button for all issues
  const getViewButton = (issue) => {
    return (
      <button
        onClick={() => handleView(issue)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        View
      </button>
    );
  };

  // Get status badge with appropriate color
  const getStatusBadge = (status) => {
    const statusText = status || "Unknown";
    const lowerStatus = statusText.toLowerCase();
    
    const map = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      issued: "bg-blue-100 text-blue-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    
    const classes = map[lowerStatus] || "bg-gray-100 text-gray-800";
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${classes}`}
      >
        {statusText}
      </span>
    );
  };

  // Show loading state
  if (loading) {
    return <p className="mt-24 text-center text-gray-600">Loading...</p>;
  }

  // Show empty state
  if (fuelIssues.length === 0) {
    return <p className="mt-24 text-center text-gray-600">No vehicle fuel issues found.</p>;
  }

  return (
    <div className="p-4 mt-24">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Vehicle Fuel Approval
      </h2>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fuel Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Issued To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fuelIssues.map((issue) => (
              <tr key={issue.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatDateTime(issue.issue_date)}
                </td>
                <td className="px-6 py-4">{getVehicleDetails(issue)}</td>
                <td className="px-6 py-4">{getFuelDetails(issue)}</td>
                <td className="px-6 py-4">{getIssuedToInfo(issue)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getViewButton(issue)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(issue.approval_status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show modal when an issue is selected */}
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