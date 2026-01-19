import React, { useState, useEffect } from "react";
import axios from "axios";

const PAGE_SIZE = 10;
const formatDate = (date) => date.toISOString().split('T')[0];

const AttendanceMark = () => {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  // ---------------- Fetch employees & attendance from backend ----------------
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        // Replace with your backend API call
        // const res = await axios.get(`/api/employees?date=${selectedDate}`);
        // setEmployees(res.data.employees || []);
        // setAttendance(res.data.attendance || {});
        setEmployees([]); // placeholder
        setAttendance({});
      } catch (err) {
        console.error(err);
        setErrorMsg("Failed to load data from backend.");
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [selectedDate]);

  // ---------------- Date Handling ----------------
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    const today = new Date();
    const selected = new Date(newDate);

    if (selected > today) {
      setErrorMsg("Cannot mark attendance for future dates");
      return;
    }
    setSelectedDate(newDate);
    setLoading(true);
    setTimeout(() => setLoading(false), 300);
  };

  const navigateDate = (direction) => {
    const current = new Date(selectedDate);
    const today = new Date();
    let newDate = new Date(current);

    if (direction === 'prev') newDate.setDate(current.getDate() - 1);
    else if (direction === 'next') newDate.setDate(current.getDate() + 1);
    else if (direction === 'today') newDate = today;

    if (newDate > today) return; // block future dates
    setSelectedDate(formatDate(newDate));
  };

  // ---------------- Attendance ----------------
  const handleAttendanceChange = (empId, status) => {
    setAttendance((prev) => ({ ...prev, [empId]: status }));
  };

  const handleSave = async () => {
    setErrorMsg(""); setSuccessMsg("");
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const currentEmployees = employees.slice(startIndex, startIndex + PAGE_SIZE);

    const payload = {
      date: selectedDate,
      attendance: currentEmployees.map(emp => ({ employee_id: emp.id, status: attendance[emp.id] || "Present" }))
    };

    try {
      // Replace with your backend API call
      // await axios.post("/api/attendance", payload);
      console.log("Attendance payload:", payload);
      setSuccessMsg(`Attendance saved for ${currentEmployees.length} employees.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save attendance.");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  // ---------------- Pagination ----------------
  const totalPages = Math.ceil(employees.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const currentEmployees = employees.slice(startIndex, startIndex + PAGE_SIZE);

  // ---------------- Render ----------------
  if (loading) return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Mark Attendance</h1>
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4B553A]"></div>
        <span className="ml-3 text-lg">Loading employee data...</span>
      </div>
    </div>
  );

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Mark Attendance</h1>

      {errorMsg && <div className="mb-2 p-2 bg-red-100 text-red-700 border border-red-300 rounded">{errorMsg}</div>}
      {successMsg && <div className="mb-2 p-2 bg-green-100 text-green-700 border border-green-300 rounded">{successMsg}</div>}

      {/* Date Selection */}
      <div className="mb-6 p-4 bg-white border border-gray-300 rounded shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Select Date</h2>
          <p className="text-sm text-gray-600 mt-1">Choose the date to mark attendance for</p>
        </div>
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <span className="text-sm font-medium text-gray-700">{new Date(selectedDate).toDateString()}</span>
        </div>

        <div className="flex space-x-2 mt-2 sm:mt-0">
          <button onClick={() => navigateDate('prev')} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded border">Previous Day</button>
          <button onClick={() => navigateDate('today')} className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200">Today</button>
          <button onClick={() => navigateDate('next')} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded border">Next Day</button>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#4B553A]"
          max={formatDate(new Date())} // can't pick future
        />
      </div>

      {/* Employee Table */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <span className="font-medium">Total Employees: {employees.length}</span>
          <span className="ml-4 text-gray-600">Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, employees.length)} of {employees.length}</span>
        </div>
        <button onClick={handleSave} className="bg-[#4B553A] text-white py-2 px-4 rounded hover:bg-[#3a442e] transition">Save Current Page</button>
      </div>

      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Employee</th>
            <th className="border px-2 py-1">Present</th>
            <th className="border px-2 py-1">Absent</th>
            <th className="border px-2 py-1">Sick</th>
            <th className="border px-2 py-1">Leave</th>
          </tr>
        </thead>
        <tbody>
          {currentEmployees.map(emp => (
            <tr key={emp.id} className="hover:bg-gray-50">
              <td className="border px-2 py-1">
                <div className="font-medium">{emp.full_name}</div>
                <div className="text-sm text-gray-500">{emp.job_number} • {emp.department}</div>
              </td>
              {["Present", "Absent", "Sick", "Leave"].map(status => (
                <td key={status} className="border px-2 py-1 text-center">
                  <input
                    type="radio"
                    name={`attendance-${emp.id}`}
                    checked={attendance[emp.id] === status}
                    onChange={() => handleAttendanceChange(emp.id, status)}
                    className="cursor-pointer transform scale-125"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceMark;
