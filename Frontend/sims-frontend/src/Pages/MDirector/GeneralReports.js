import React, { useState } from 'react';

const GeneralReports = () => {
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [filteredReports, setFilteredReports] = useState([]);

  const reports = [
    {
      id: 1,
      date: '2025-06-30',
      content: 'Inspected inventory, all accounted for. Routine maintenance completed.',
      role: 'MD',
    },
    {
      id: 2,
      date: '2025-06-29',
      content: 'Issued cement to contractors, no damages reported.',
      role: 'AM',
    },
    {
      id: 3,
      date: '2025-06-30',
      content: 'Delivery of tools received and logged in system.',
      role: 'AM',
    },
    {
      id: 4,
      date: '2025-06-30',
      content: 'Finalized report with system backup confirmation.',
      role: 'MD',
    },
  ];

  const handleCheckReports = () => {
    const filtered = reports.filter(
      (report) =>
        report.role === selectedRole && report.date === selectedDate
    );
    setFilteredReports(filtered);
  };

  return (
    <div className="p-6 mt-20">
      <h1 className="text-3xl font-bold mb-6 text-[#4B553A]">View Daily Reports</h1>

      {/* Filters on One Row */}
      <div className="mb-6 flex flex-wrap gap-4 items-end">
        {/* Role Dropdown */}
        <div>
          <label className="block text-gray-700 font-medium mb-1">Select Role:</label>
          <select
            className="p-2 border rounded w-48 focus:outline-none focus:ring-2 focus:ring-[#4B553A]"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="">-- Choose Role --</option>
            <option value="MD">Store Manager (SM)</option>
            <option value="AM">Accounts Manager (AM)</option>
          </select>
        </div>

        {/* Date Input */}
        <div>
          <label className="block text-gray-700 font-medium mb-1">Select Date:</label>
          <input
            type="date"
            className="p-2 border rounded w-48 focus:outline-none focus:ring-2 focus:ring-[#4B553A]"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {/* Button */}
        <div>
          <button
            onClick={handleCheckReports}
            className="mt-6 bg-[#4B553A] text-white px-6 py-2 rounded hover:bg-[#3a432e] transition-colors"
          >
            Check Reports
          </button>
        </div>
      </div>

      {/* Report Results */}
      {filteredReports.length > 0 ? (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-white p-4 border rounded shadow">
              <p className="text-gray-600 mb-2 text-sm">
                <strong>Date:</strong> {report.date} | <strong>Role:</strong> {report.role}
              </p>
              <p className="text-gray-800 whitespace-pre-line">{report.content}</p>
            </div>
          ))}
        </div>
      ) : (
        selectedRole &&
        selectedDate && (
          <p className="text-red-600">No reports found for selected role and date.</p>
        )
      )}
    </div>
  );
};

export default GeneralReports;
