// src/Pages/Store/Issuance/Components/MaterialTable.js
import React from 'react';

const MaterialTable = ({
  issuedRecords = [],
  newRecordId,
  handleConfirmIssue,
  handleCancelIssue
}) => {

  // ✅ MATERIAL + MACHINE FUEL ONLY (EXCLUDE VEHICLE FUEL)
  const materialRecords = issuedRecords.filter(record =>
    record.issue_type === 'material' ||
    (record.issue_type === 'fuel' && !record.vehicle)
  );

  const renderApprovalStatus = (status) => {
    const styles = {
      Approved: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
      Pending: 'bg-yellow-100 text-yellow-800',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status || 'Pending'}
      </span>
    );
  };

  const renderIssueStatus = (status) => {
    const styles = {
      Issued: 'bg-green-100 text-green-800',
      Cancelled: 'bg-red-100 text-red-800',
      Pending: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status || 'Pending'}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  return (
    <div className="overflow-x-auto mt-8">
      <h3 className="text-xl font-semibold mb-4">
        Material & Machine Fuel Issuance
      </h3>

      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-3 py-2">Date</th>
            <th className="border px-3 py-2">Item</th>
            <th className="border px-3 py-2">Quantity</th>
            <th className="border px-3 py-2">Issued To</th>
            <th className="border px-3 py-2">Reason</th>
            <th className="border px-3 py-2">Md Approval</th>
            <th className="border px-3 py-2">Issue Status</th>
            <th className="border px-3 py-2">Actions</th>
          </tr>
        </thead>

        <tbody>
          {materialRecords.map(record => (
            <tr
              key={record.id}
              className={record.id === newRecordId ? 'bg-green-100' : ''}
            >
              <td className="border px-3 py-2">
                {formatDate(record.issue_date)}
              </td>

              <td className="border px-3 py-2">
                {record.items.map((i, idx) => (
                  <div key={idx}>{i.item_name}</div>
                ))}
              </td>

              <td className="border px-3 py-2">
                {record.items.map((i, idx) => (
                  <div key={idx}>{i.quantity_issued}</div>
                ))}
              </td>

              <td className="border px-3 py-2">
                {record.issued_to_name}
              </td>

              <td className="border px-3 py-2">
                {record.reason}
              </td>

              <td className="border px-3 py-2 text-center">
                {renderApprovalStatus(record.approval_status)}
              </td>

              <td className="border px-3 py-2 text-center">
                {renderIssueStatus(record.status)}
              </td>

              <td className="border px-3 py-2 flex gap-2 justify-center">
                <button
                  onClick={() => handleConfirmIssue(record.id)}
                  disabled={
                    record.status !== 'Pending' ||
                    record.approval_status !== 'Approved'
                  }
                  className="bg-green-600 text-white px-2 py-1 rounded disabled:opacity-50"
                >
                  Issue
                </button>

                <button
                  onClick={() => handleCancelIssue(record.id)}
                  disabled={record.status !== 'Pending'}
                  className="bg-red-600 text-white px-2 py-1 rounded disabled:opacity-50"
                >
                  Cancel
                </button>
              </td>
            </tr>
          ))}

          {materialRecords.length === 0 && (
            <tr>
              <td colSpan="8" className="text-center py-4">
                No material or machine fuel issues found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MaterialTable;
