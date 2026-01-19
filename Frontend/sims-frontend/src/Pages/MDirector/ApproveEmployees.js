import React, { useEffect, useState } from "react";
import api from "../../Utils/api";

const ApproveEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({}); // Track per-row action loading

  // Fetch all employees
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get("employees/");
      setEmployees(res.data);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

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
    } catch (err) {
      console.error(err);
      alert("Action failed. Check console for details.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow rounded mt-6">
      <h1 className="text-3xl font-bold mb-6">Employee Approvals</h1>

      <table className="w-full border-collapse border border-gray-300">
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
          {employees.length === 0 ? (
            <tr>
              <td colSpan="6" className="text-center p-4">
                No employees found
              </td>
            </tr>
          ) : (
            employees.map((emp) => (
              <tr key={emp.id}>
                <td className="border p-2">{emp.job_number}</td>
                <td className="border p-2">
                  {emp.first_name} {emp.middle_name} {emp.last_name}
                </td>
                <td className="border p-2">{emp.department}</td>
                <td className="border p-2">{emp.occupation}</td>
                <td
                  className={`border p-2 font-semibold ${
                    emp.approval_status === "APPROVED"
                      ? "text-green-600"
                      : emp.approval_status === "REJECTED"
                      ? "text-red-600"
                      : ""
                  }`}
                >
                  {emp.approval_status}
                </td>
                <td className="border p-2 flex gap-2">
                  {emp.approval_status === "PENDING" ? (
                    <>
                      <button
                        disabled={actionLoading[emp.id]}
                        className="text-white px-3 py-1 rounded disabled:opacity-50"
                        style={{
                          backgroundColor: "#4a533b",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.backgroundColor = "#3a422d")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.backgroundColor = "#4a533b")
                        }
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
