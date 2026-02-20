import React, { useState, useEffect } from "react";
import api from "../../Utils/api";

const RegisterEmployee = () => {
  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    job_number: "",
    department: "",
    occupation: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [employees, setEmployees] = useState([]);
  const [tableLoading, setTableLoading] = useState(true);

  const fetchEmployees = async () => {
    setTableLoading(true);
    try {
      const res = await api.get("employees/");
      setEmployees(res.data);
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const cleanedForm = { ...form };

      for (const key in cleanedForm) {
        if (cleanedForm[key] === "") cleanedForm[key] = null;
      }

      await api.post("employees/", cleanedForm);

      setSuccess("Employee submitted successfully. Awaiting MD approval.");

      setForm({
        first_name: "",
        middle_name: "",
        last_name: "",
        job_number: "",
        department: "",
        occupation: ""
      });

      fetchEmployees();
    } catch (err) {
      console.error("Registration error:", err);

      if (err.response?.data) {
        const data = err.response.data;

        if (typeof data === "string") {
          setError(data);
        } else if (data.detail) {
          setError(data.detail);
        } else {
          setError(Object.values(data).flat().join(" | "));
        }
      } else {
        setError("Failed to register employee");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-6">

      {/* FORM SECTION */}
      <div
        className="p-6 shadow rounded text-white"
        style={{ backgroundColor: "#4a533b" }}
      >
        <h1 className="text-3xl font-bold mb-6">
          Register New Employee
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
        >
          {Object.keys(form).map((key) => (
            <div key={key} className="flex flex-col">
              <label className="font-semibold mb-1 capitalize">
                {key.replace(/_/g, " ")}
              </label>

              <input
                type="text"
                name={key}
                value={form[key]}
                onChange={handleChange}
                className="border border-gray-300 rounded px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder={`Enter ${key.replace(/_/g, " ")}`}
              />
            </div>
          ))}

          <div className="md:col-span-4 flex justify-start mt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded text-sm transition"
            >
              {loading ? "Saving..." : "Register Employee"}
            </button>
          </div>
        </form>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white p-6 shadow rounded mt-6">
        <h2 className="text-2xl font-bold mb-4">
          Employee Approval Status
        </h2>

        {tableLoading ? (
          <p>Loading employees...</p>
        ) : (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Job Number</th>
                <th className="border p-2">Full Name</th>
                <th className="border p-2">Department</th>
                <th className="border p-2">Occupation</th>
                <th className="border p-2">Approval Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center p-4">
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
                          : "text-yellow-600"
                      }`}
                    >
                      {emp.approval_status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};

export default RegisterEmployee;
