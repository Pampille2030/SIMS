// src/Components/SM/IssueOutTable.js
import React from 'react';
import PropTypes from 'prop-types';

// --------------------
// Material/Fuel Table
// --------------------
const MaterialFuelTable = ({
  issuedRecords = [],
  items = [],
  newRecordId = null,
  handleConfirmIssue = () => {},
  handleCancelIssue = () => {}
}) => {
  const formatDateTime = (dateString) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getItemNamesWithQty = (recordItems, issueType, currentLitres) => {
    if (issueType === "petrol") {
      return `Petrol (${currentLitres ?? 0} L)`;
    }

    if (!recordItems || recordItems.length === 0) return '--';

    return recordItems
      .map((itemRecord) => {
        const item = items.find(i => i.id === itemRecord.item_id);
        const name = item ? item.name : itemRecord.item_name || 'Unknown';
        const qty = itemRecord.quantity_issued ?? 0;
        const unit = itemRecord.unit || (item ? item.unit : '');
        return `${name} (${qty}${unit ? ' ' + unit : ''})`;
      })
      .join(', ');
  };

  const getApprovalBadge = (status) => {
    const baseClass = 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full';
    if (!status) return <span className={`${baseClass} bg-gray-100 text-gray-800`}>--</span>;

    switch (status.toLowerCase()) {
      case 'pending':
        return <span className={`${baseClass} bg-yellow-100 text-yellow-800`}>Pending</span>;
      case 'approved':
        return <span className={`${baseClass} bg-green-100 text-green-800`}>Approved</span>;
      case 'rejected':
        return <span className={`${baseClass} bg-red-100 text-red-800`}>Rejected</span>;
      default:
        return <span className={`${baseClass} bg-gray-100 text-gray-800`}>{status}</span>;
    }
  };

  return (
    <div className="overflow-x-auto mt-6 shadow-sm rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Approval Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {issuedRecords
            .filter(record => record.issue_type !== 'tool') // ✅ show only material & fuel
            .map(record => {
              const isApproved = record.approval_status?.toLowerCase() === 'approved';
              const isProcessed = record.status?.toLowerCase() === 'issued' || record.status?.toLowerCase() === 'cancelled';

              return (
                <tr key={record.id} id={`record-${record.id}`} className={newRecordId === record.id ? 'bg-green-50' : ''}>
                  <td className="px-4 py-2">{formatDateTime(record.issue_date)}</td>
                  <td className="px-4 py-2">
                    {getItemNamesWithQty(record.items, record.issue_type, record.current_litres)}
                  </td>
                  <td className="px-4 py-2">{record.issued_to_name || 'Employee not found'}</td>
                  <td className="px-4 py-2">{record.reason || '--'}</td>
                  <td className="px-4 py-2">
                    {isApproved && !isProcessed ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConfirmIssue(record.id)}
                          className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition"
                        >
                          Issue
                        </button>
                        <button
                          onClick={() => handleCancelIssue(record.id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : !isApproved ? (
                      <span className="text-gray-500 italic">Wait for MD decision</span>
                    ) : (
                      <span className="font-semibold">{record.status}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{getApprovalBadge(record.approval_status)}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};

MaterialFuelTable.propTypes = {
  issuedRecords: PropTypes.array,
  items: PropTypes.array,
  newRecordId: PropTypes.number,
  handleConfirmIssue: PropTypes.func,
  handleCancelIssue: PropTypes.func,
};

// -------------
// Tool Table
// -------------
const ToolTable = ({ issuedRecords = [], items = [] }) => {
  const formatDateTime = (dateString) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="overflow-x-auto mt-6 shadow-sm rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tool</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Issued To</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {issuedRecords
            .filter(record => record.issue_type === 'tool' && record.status.toLowerCase() === 'issued')
            .map(record => {
              const toolItem = record.items?.[0];
              const tool = items.find(i => i.id === toolItem?.item_id);
              return (
                <tr key={record.id}>
                  <td className="px-4 py-2">{formatDateTime(record.issue_date)}</td>
                  <td className="px-4 py-2">{tool ? tool.name : toolItem?.item_name || 'Unknown'}</td>
                  <td className="px-4 py-2">{toolItem?.quantity_issued ?? 0}</td>
                  <td className="px-4 py-2">{record.issued_to_name || 'N/A'}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};

ToolTable.propTypes = {
  issuedRecords: PropTypes.array,
  items: PropTypes.array,
};

// Export both so IssueOutPage can choose which to render
export { MaterialFuelTable, ToolTable };
