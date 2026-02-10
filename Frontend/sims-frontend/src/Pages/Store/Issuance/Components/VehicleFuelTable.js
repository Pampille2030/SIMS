import React from 'react';

const VehicleFuelTable = ({
  records = [],
  handleConfirmIssue,
  handleCancelIssue,
  newRecordId
}) => {

  const vehicleFuelRecords = records.filter(
    r =>
      r.issue_type === 'fuel' &&
      r.fuel_type === 'vehicle' &&
      r.vehicle_plate 
  );

  const renderApprovalStatus = (status) => {
    const styles = {
      Approved: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
      Pending: 'bg-yellow-100 text-yellow-800',
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-semibold ${
          styles[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
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
      <span
        className={`px-2 py-1 rounded text-xs font-semibold ${
          styles[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status || 'Pending'}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto mt-8">
      <h3 className="text-xl font-semibold mb-4">Vehicle Fuel Issuance</h3>

      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-3 py-2">Date</th>
            <th className="border px-3 py-2">Vehicle</th>
            <th className="border px-3 py-2">Fuel (L)</th>
            <th className="border px-3 py-2">Fuel Efficiency (km/L)</th>
            <th className="border px-3 py-2">Issued To</th>
            <th className="border px-3 py-2">Approval Status</th>
            <th className="border px-3 py-2">Issue Status</th>
            <th className="border px-3 py-2">Actions</th>
          </tr>
        </thead>

        <tbody>
          {vehicleFuelRecords.map(record => (
            <tr
              key={record.id}
              className={record.id === newRecordId ? 'bg-green-100' : ''}
            >
              <td className="border px-3 py-2">
                {record.issue_date ? new Date(record.issue_date).toLocaleDateString() : '-'}
              </td>

              <td className="border px-3 py-2">
                {record.vehicle_plate
                  ? `${record.vehicle_name || 'Vehicle'} (${record.vehicle_plate})`
                  : record.vehicle_name || 'N/A'}
              </td>

              <td className="border px-3 py-2">
                {record.items?.[0]?.quantity_issued ?? record.fuel_litres ?? 0} L
              </td>

              <td className="border px-3 py-2">
                {record.items?.[0]?.efficiency !== null && record.items?.[0]?.efficiency !== undefined
                  ? record.items[0].efficiency.toFixed(2)
                  : 'N/A'}
              </td>

              <td className="border px-3 py-2">
                {record.issued_to_name}
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
                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm disabled:opacity-50"
                >
                  Issue
                </button>

                <button
                  onClick={() => handleCancelIssue(record.id)}
                  disabled={record.status !== 'Pending'}
                  className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
              </td>
            </tr>
          ))}

          {vehicleFuelRecords.length === 0 && (
            <tr>
              <td colSpan="8" className="text-center py-4">
                No vehicle fuel records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default VehicleFuelTable;
