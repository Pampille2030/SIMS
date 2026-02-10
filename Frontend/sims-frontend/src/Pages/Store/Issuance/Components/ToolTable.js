// src/Pages/Store/Issuance/Components/ToolTable.js
import React from 'react';

const ToolTable = ({ issuedRecords, newRecordId }) => {

  const toolRecords = issuedRecords.filter(
    record => record.issue_type === 'tool'
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="overflow-x-auto mt-8">
      <h3 className="text-xl font-semibold mb-4">Tool Issuance</h3>

      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-3 py-2">Date</th>
            <th className="border px-3 py-2">Tool</th>
            <th className="border px-3 py-2">Quantity</th>
            <th className="border px-3 py-2">Issued To</th>
            <th className="border px-3 py-2">Reason</th>
          </tr>
        </thead>

        <tbody>
          {toolRecords.map(record => (
            <tr
              key={record.id}
              className={record.id === newRecordId ? 'bg-green-100' : ''}
            >
              {/* Date */}
              <td className="border px-3 py-2">
                {formatDate(record.issue_date)}
              </td>

              {/* Tools */}
              <td className="border px-3 py-2">
                {record.items.map((item, idx) => (
                  <div key={idx}>{item.item_name}</div>
                ))}
              </td>

              {/* Quantities */}
              <td className="border px-3 py-2">
                {record.items.map((item, idx) => (
                  <div key={idx}>{item.quantity_issued}</div>
                ))}
              </td>

              {/* Issued To */}
              <td className="border px-3 py-2">
                {record.issued_to_name}
              </td>

              {/* Reason */}
              <td className="border px-3 py-2">
                {record.reason}
              </td>
            </tr>
          ))}

          {toolRecords.length === 0 && (
            <tr>
              <td colSpan="5" className="text-center py-4">
                No tool issuance records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ToolTable;
