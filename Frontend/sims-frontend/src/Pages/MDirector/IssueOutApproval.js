import React, { useEffect, useState } from "react";
import MDIssueOutModal from "../../Components/Md/IssueOutApprovalModal";
import api from "../../Utils/api";

const IssueOutApprovalPage = () => {
  const [issues, setIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await api.get("/item_issuance/issuerecords/");

      // Filter out vehicle fuel issues
      const filteredIssues = response.data.filter(
        (issue) => !(issue.issue_type === "fuel" && issue.fuel_type === "vehicle")
      );

      setIssues(filteredIssues);
    } catch (error) {
      console.error("❌ Error fetching issues:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update issue in table after approval/rejection
  const handleStatusChange = (updatedIssue) => {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === updatedIssue.id ? { ...issue, ...updatedIssue } : issue
      )
    );

    if (selectedIssue && selectedIssue.id === updatedIssue.id) {
      setSelectedIssue({ ...selectedIssue, ...updatedIssue });
    }
  };

  const handleView = (issue) => {
    setSelectedIssue(issue);
    setShowModal(true);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "--";
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const getItemNamesWithUnit = (items) => {
    if (!items || items.length === 0) return "No items";
    return items
      .map((i) => `${i.item_name} (${i.quantity_issued} ${i.unit || ""})`)
      .join(", ");
  };

  const getIssueTypeDisplay = (issueType, fuelType) => {
    const typeMap = {
      material: "Material",
      tool: "Tool",
      fuel: fuelType === "vehicle" ? "Vehicle Fuel" : "Machine Fuel",
    };
    return typeMap[issueType] || issueType;
  };

  const getVehicleInfo = (issue) => {
    if (issue.issue_type === "fuel" && issue.fuel_type === "vehicle" && issue.vehicle_plate) {
      return ` to ${issue.vehicle_plate}`;
    }
    return "";
  };

  if (loading) {
    return (
      <div className="p-4 mt-24 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-600">Loading requests...</p>
      </div>
    );
  }

  return (
    <div className="p-4 mt-24">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">MD Approval - Issue Out Requests</h2>
        <p className="text-sm text-gray-600 mt-1">
          Review and approve issuance requests (All types except vehicle fuel)
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow rounded">
          <thead>
            <tr className="bg-gray-100 text-left text-sm text-gray-700">
              <th className="p-3">Date & Time</th>
              <th className="p-3">Type</th>
              <th className="p-3">Item (Qty Unit)</th>
              <th className="p-3">Employee</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Approve</th>
              <th className="p-3">Approval Status</th>
            </tr>
          </thead>
          <tbody>
            {issues.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500">
                  No issuance requests found
                </td>
              </tr>
            ) : (
              issues.map((issue) => (
                <tr key={issue.id} className="border-b hover:bg-gray-50 text-sm">
                  <td className="p-3">{formatDateTime(issue.issue_date)}</td>
                  <td className="p-3 text-gray-700">
                    {getIssueTypeDisplay(issue.issue_type, issue.fuel_type)}
                    {getVehicleInfo(issue)}
                  </td>
                  <td className="p-3">{getItemNamesWithUnit(issue.items)}</td>
                  <td className="p-3">{issue.issued_to_name || "Unknown"}</td>
                  <td className="p-3">
                    <div className="max-w-xs truncate" title={issue.reason}>
                      {issue.reason || "--"}
                    </div>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleView(issue)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      View
                    </button>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-white ${
                        issue.approval_status?.toLowerCase() === "pending"
                          ? "bg-yellow-500"
                          : issue.approval_status?.toLowerCase() === "approved"
                          ? "bg-green-600"
                          : issue.approval_status?.toLowerCase() === "rejected"
                          ? "bg-red-500"
                          : "bg-gray-400"
                      }`}
                    >
                      {issue.approval_status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && selectedIssue && (
        <MDIssueOutModal
          issue={selectedIssue}
          onClose={() => setShowModal(false)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};

export default IssueOutApprovalPage;
