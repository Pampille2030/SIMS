import React, { useEffect, useState } from "react";
import api from "../../Utils/api";

const VehicleFuelApprovalPage = () => {
  const [fuelIssues, setFuelIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [loadingActionId, setLoadingActionId] = useState(null);

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
      setFilteredIssues(response.data);
    } catch (error) {
      console.error("Error fetching vehicle fuel issues:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (date = selectedDate, status = selectedStatus) => {
    let filtered = [...fuelIssues];

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
    applyFilters(date, selectedStatus);
  };

  const handleStatusChangeFilter = (e) => {
    const status = e.target.value;
    setSelectedStatus(status);
    applyFilters(selectedDate, status);
  };

  const handleAction = async (issueId, action) => {
    try {
      setLoadingActionId(issueId);
      await api.post(`/item_issuance/issuerecords/${issueId}/${action}/`);
      const { data: updatedIssue } = await api.get(
        `/item_issuance/issuerecords/${issueId}/`
      );
      setFuelIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId ? { ...issue, ...updatedIssue } : issue
        )
      );
      applyFilters(selectedDate, selectedStatus);
    } catch (error) {
      console.error(`Error ${action}:`, error.response?.data || error.message);
      alert(`Failed to ${action} request`);
    } finally {
      setLoadingActionId(null);
    }
  };

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

  const getVehicleDetails = (issue) =>
    issue.vehicle_plate || issue.vehicle?.plate_number || "No Plate";

  const getFuelDetails = (issue) => {
    if (Array.isArray(issue.items) && issue.items.length > 0) {
      const fuelItem = issue.items.find((item) => item.item_category === "fuel");
      if (fuelItem) return `${fuelItem.quantity_issued ?? 0}${fuelItem.unit || "L"}`;
    }
    return `${issue.fuel_litres ?? 0}L`;
  };

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

  const today = new Date().toISOString().split("T")[0];

  if (loading) return <p className="mt-24 text-center text-gray-600">Loading...</p>;
  if (filteredIssues.length === 0)
    return <p className="mt-24 text-center text-gray-600">No vehicle fuel issues found.</p>;

  return (
    <div className="p-4 mt-24">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Vehicle Fuel Approval</h2>

      {/* Filters */}
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
            onChange={handleStatusChangeFilter}
            className="border px-2 py-1 rounded"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity Issued</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issued To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredIssues.map((issue) => {
              const canAct = issue.approval_status?.toLowerCase() === "pending";

              return (
                <tr key={issue.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{formatDateTime(issue.issue_date)}</td>
                  <td className="px-6 py-4">{getVehicleDetails(issue)}</td>
                  <td className="px-6 py-4">{getFuelDetails(issue)}</td>
                  <td className="px-6 py-4">{getIssuedToInfo(issue)}</td>
                  <td className="px-6 py-4">{issue.reason || "--"}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <button
                      onClick={() => handleAction(issue.id, "approve")}
                      disabled={!canAct || loadingActionId === issue.id}
                      className={`px-3 py-1 rounded text-white ${
                        !canAct ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {loadingActionId === issue.id ? "Processing..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleAction(issue.id, "reject")}
                      disabled={!canAct || loadingActionId === issue.id}
                      className={`px-3 py-1 rounded text-white ${
                        !canAct ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {loadingActionId === issue.id ? "Processing..." : "Reject"}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(issue.approval_status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VehicleFuelApprovalPage;
