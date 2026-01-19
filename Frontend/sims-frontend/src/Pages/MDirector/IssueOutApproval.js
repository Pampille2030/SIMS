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
      
      // Filter out vehicle fuel issues (fuel issued to vehicles)
      const filteredIssues = response.data.filter(issue => {
        // Keep only material and tool issues
        // Exclude fuel issues that have vehicle attached (vehicle fuel)
        // Keep fuel that is issued as a tool (without vehicle)
        if (issue.issue_type === 'fuel') {
          // If it has a vehicle, it's vehicle fuel - exclude it
          // If no vehicle, it's tool fuel - keep it
          return !issue.vehicle;
        }
        // Keep all other issue types (material, tool)
        return true;
      });
      
      setIssues(filteredIssues);
    } catch (error) {
      console.error("❌ Error fetching issues:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (updatedIssue) => {
    // Spread old issue and updatedIssue to ensure React sees the change
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === updatedIssue.id ? { ...issue, ...updatedIssue } : issue
      )
    );
    // Also update modal state if open
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

  // 🔴 CHANGE 1: Remove colored badge, show plain text for Type column
  const getIssueTypeDisplay = (issueType) => {
    const typeMap = {
      'material': 'Material',
      'tool': 'Tool',
      'fuel': 'Tool Fuel'
    };
    return typeMap[issueType] || issueType;
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
          Materials and Tools only (Vehicle Fuel has separate approval page)
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
                  No material or tool issuance requests found
                </td>
              </tr>
            ) : (
              issues.map((issue) => (
                <tr key={issue.id} className="border-b hover:bg-gray-50 text-sm">
                  <td className="p-3">{formatDateTime(issue.issue_date)}</td>
                  {/* 🔴 CHANGE 1: Plain text instead of colored badge */}
                  <td className="p-3 text-gray-700">
                    {getIssueTypeDisplay(issue.issue_type)}
                  </td>
                  <td className="p-3">{getItemNamesWithUnit(issue.items)}</td>
                  <td className="p-3">{issue.issued_to_name || "Unknown"}</td>
                  <td className="p-3">
                    <div className="max-w-xs truncate" title={issue.reason}>
                      {issue.reason || "--"}
                    </div>
                  </td>
                  <td className="p-3">
                    {/* 🔴 CHANGE 2: Remove disabled state, always allow viewing */}
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