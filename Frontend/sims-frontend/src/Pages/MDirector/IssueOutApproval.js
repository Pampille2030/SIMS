import React, { useEffect, useState } from "react";
import MDIssueOutModal from "../../Components/Md/IssueOutApprovalModal";
import api from "../../Utils/api";

const IssueOutApprovalPage = () => {
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await api.get("/item_issuance/issuerecords/");

      // Filter out vehicle fuel issues
      const filtered = response.data.filter(
        (issue) => !(issue.issue_type === "fuel" && issue.fuel_type === "vehicle")
      );

      setIssues(filtered);
      setFilteredIssues(filtered);
    } catch (error) {
      console.error("❌ Error fetching issues:", error);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // Filter issues by date and status
  // =========================
  const filterIssues = (date = selectedDate, status = selectedStatus) => {
    let filtered = [...issues];

    if (date) {
      filtered = filtered.filter((issue) => {
        const issueDate = new Date(issue.issue_date);
        const yyyy = issueDate.getFullYear();
        const mm = String(issueDate.getMonth() + 1).padStart(2, "0");
        const dd = String(issueDate.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}` === date;
      });
    }

    if (status !== "all") {
      filtered = filtered.filter(
        (issue) => issue.approval_status?.toLowerCase() === status
      );
    }

    setFilteredIssues(filtered);
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    filterIssues(date, selectedStatus);
  };

  const handleStatusChange = (e) => {
    const status = e.target.value;
    setSelectedStatus(status);
    filterIssues(selectedDate, status);
  };

  const handleStatusUpdate = (updatedIssue) => {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === updatedIssue.id ? { ...issue, ...updatedIssue } : issue
      )
    );
    if (selectedIssue && selectedIssue.id === updatedIssue.id) {
      setSelectedIssue({ ...selectedIssue, ...updatedIssue });
    }
    filterIssues(selectedDate, selectedStatus);
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

  const today = new Date().toISOString().split("T")[0];

  const getStatusBadge = (status) => {
    const lower = (status || "PENDING").toLowerCase();
    const map = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-[#4a533b] text-white",
      rejected: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
          map[lower] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status || "PENDING"}
      </span>
    );
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

      {/* Filters Row */}
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
            {filteredIssues.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500">
                  No issuance requests found
                </td>
              </tr>
            ) : (
              filteredIssues.map((issue) => (
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
                      className="px-3 py-1 bg-[#4a533b] text-white rounded hover:bg-[#3c452f] transition-colors"
                    >
                      View
                    </button>
                  </td>
                  <td className="p-3">{getStatusBadge(issue.approval_status)}</td>
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
          onStatusChange={handleStatusUpdate}
        />
      )}
    </div>
  );
};

export default IssueOutApprovalPage;
