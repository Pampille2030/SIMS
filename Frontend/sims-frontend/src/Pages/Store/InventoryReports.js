import React, { useState } from 'react';

const ReportsPage = () => {
  const [filterType, setFilterType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleCheck = () => {
    alert(`Type: ${filterType || 'None'} | From: ${dateFrom || 'N/A'} | To: ${dateTo || 'N/A'}`);
    // Later: Fetch data using these filters
  };

  return (
    <div className="p-6 mt-20">
      <h2 className="text-2xl font-semibold mb-6">Reports</h2>

      {/* Hero Filter Section */}
      <div className="bg-white p-4 rounded shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block mb-1 font-medium text-gray-700">Report Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">-- Select Type --</option>
            <option value="issueout">Issue Out</option>
            <option value="purchaseorder">Purchase Order</option>
            <option value="stockin">Stock In</option>
            <option value="returned">Returned Items</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleCheck}
            className="w-full bg-[#4B553A] text-white px-4 py-2 rounded hover:bg-[#3d462f]"
          >
            Check
          </button>
        </div>
      </div>

      {/* Placeholder */}
      <div className="bg-white p-4 rounded shadow">
        <p className="text-gray-500 text-center py-10">
          Report data will appear here based on your filter.
        </p>
      </div>
    </div>
  );
};

export default ReportsPage;
