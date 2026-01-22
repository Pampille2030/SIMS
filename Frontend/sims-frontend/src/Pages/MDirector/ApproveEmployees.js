import React, { useEffect, useState } from "react";
import api from "../../Utils/api";

const ApproveEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get("employees/");
      setEmployees(res.data);
      setFilteredEmployees(res.data);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // Filters: Date & Status
  // ======================
  const applyFilters = (date = selectedDate, status = selectedStatus) => {
    let filtered = [...employees];

    if (date) {
      filtered = filtered.filter((emp) => {
        const empDate = new Date(emp.date_joined || emp.created_at);
        const yyyy = empDate.getFullYear();
        const mm = String(empDate.getMonth() + 1).padStart(2, "0");
        const dd = String(empDate.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}` === date;
      });
    }

    if (status !== "all") {
      filtered = filtered.filter(
        (emp) => (emp.approval_status || "PENDING").toLowerCase() === status
      );
    }

    setFilteredEmployees(filtered);
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    applyFilters(date, selectedStatus);
  };

  const handleStatusChange = (e) => {
    const status = e.target.value;
    setSelectedStatus(status);
    applyFilters(selectedDate, status);
  };

  // ======================
  // Approve / Reject Action
  // ======================
  const handleAction = async (id, action) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      if (action === "approve") {
        await api.post(`employees/${id}/approve/`);
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.id === id ? { ...emp, approval_status: "APPROVED" } : emp
          )
        );
      } else if (action === "reject") {
        const reason = prompt("Enter rejection reason:");
        if (!reason) return;

        await api.post(`employees/${id}/reject/`, { reason });
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.id === id ? { ...emp, approval_status: "REJECTED" } : emp
          )
        );
      }
      applyFilters(selectedDate, selectedStatus);
    } catch (err) {
      console.error(err);
      alert("Action failed. Check console for details.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const today = new Date().toISOString().split("T")[0];

  // ======================
  // Status badge component
  // ======================
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

  if (loading) return <p className="mt-24 text-center text-gray-600">Loading...</p>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow rounded mt-6">
      <h1 className="text-3xl font-bold mb-6">Employee Approvals</h1>

      {/* Filters Row */}
      <div
        className="flex flex-wrap gap-4 mb-4 items-center p-4 rounded"
        style={{ backgroundColor: "#4a533b" }}
      >
        <div>
          <label className="mr-2 font-semibold text-white">Filter by Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            max={today}
            className="border px-2 py-1 rounded"
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

      {/* Employee Table */}
      <table className="w-full border-collapse border border-gray-300 font-sans">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Job Number</th>
            <th className="border p-2">Full Name</th>
            <th className="border p-2">Department</th>
            <th className="border p-2">Occupation</th>
            <th className="border p-2">Approval Status</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredEmployees.length === 0 ? (
            <tr>
              <td colSpan="6" className="text-center p-4">
                No employees found
              </td>
            </tr>
          ) : (
            filteredEmployees.map((emp) => (
              <tr key={emp.id}>
                <td className="border p-2">{emp.job_number}</td>
                <td className="border p-2">
                  {emp.first_name} {emp.middle_name} {emp.last_name}
                </td>
                <td className="border p-2">{emp.department}</td>
                <td className="border p-2">{emp.occupation}</td>
                <td className="border p-2">{getStatusBadge(emp.approval_status)}</td>
                <td className="border p-2 flex gap-2">
                  {emp.approval_status === "PENDING" ? (
                    <>
                      <button
                        disabled={actionLoading[emp.id]}
                        className="text-white px-3 py-1 rounded bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        onClick={() => handleAction(emp.id, "approve")}
                      >
                        {actionLoading[emp.id] ? "Processing..." : "Approve"}
                      </button>
                      <button
                        disabled={actionLoading[emp.id]}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded disabled:opacity-50"
                        onClick={() => handleAction(emp.id, "reject")}
                      >
                        {actionLoading[emp.id] ? "Processing..." : "Reject"}
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-500 px-2">No actions</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ApproveEmployees;
