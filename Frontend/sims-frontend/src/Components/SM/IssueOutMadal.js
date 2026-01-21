import React from 'react';
import api from "../../Utils/api";

const IssueOutModal = ({
  selectedIssue,
  isEditing,
  setIsEditing,
  setSelectedIssue,
  handleSaveChanges,
  closeModal,
  refreshRecords
}) => {
  if (!selectedIssue) return null;

  // Get fuel quantity from items
  const getFuelQuantity = () => {
    if (selectedIssue.items && selectedIssue.items.length > 0) {
      const fuelItem = selectedIssue.items.find(item => 
        item.item?.category === 'fuel' || (item.item_name && item.item_name.toLowerCase().includes('fuel'))
      );
      if (fuelItem) {
        return `${fuelItem.quantity_issued}${fuelItem.unit || 'L'}`;
      }
    }
    
    // Fallback
    return selectedIssue.fuel_litres ? `${selectedIssue.fuel_litres}L` : 'N/A';
  };

  // Get vehicle information if it's vehicle fuel
  const getVehicleInfo = () => {
    if (selectedIssue.issue_type === 'fuel' && selectedIssue.fuel_type === 'vehicle') {
      return selectedIssue.vehicle_plate || (selectedIssue.vehicle && selectedIssue.vehicle.plate_number) || 'No vehicle';
    }
    return null;
  };

  // 🔹 Store Manager issues out
  const handleIssueOut = async () => {
    try {
      await api.post(`/item_issuance/issuerecords/${selectedIssue.id}/issue_out/`);
      alert("✅ Items issued successfully");
      refreshRecords();
      closeModal();
    } catch (err) {
      console.error("❌ Error issuing out:", err.response?.data || err.message);
      alert("Failed to issue out ❌");
    }
  };

  // 🔹 Store Manager cancels issue
  const handleCancelIssue = async () => {
    try {
      await api.post(`/item_issuance/issuerecords/${selectedIssue.id}/cancel/`);
      alert("❌ Issue cancelled successfully");
      refreshRecords();
      closeModal();
    } catch (err) {
      console.error("❌ Error cancelling issue:", err.response?.data || err.message);
      alert("Failed to cancel issue ❌");
    }
  };

  // Determine if issue out button should be enabled
  const canIssueOut = () => {
    if (selectedIssue.status === 'Issued' || selectedIssue.status === 'Cancelled') {
      return false;
    }
    
    if (selectedIssue.issue_type === 'fuel' && selectedIssue.fuel_type === 'vehicle') {
      return selectedIssue.approval_status === 'Approved';
    }
    
    if (selectedIssue.issue_type === 'material' || selectedIssue.issue_type === 'fuel') {
      return selectedIssue.approval_status === 'Approved';
    }
    
    // Tools don't need MD approval
    if (selectedIssue.issue_type === 'tool') {
      // Check if tool uses fuel
      const toolUsesFuel = selectedIssue.items && selectedIssue.items.some(item => 
        item.item?.category === 'tool' && item.item?.tool?.uses_fuel
      );
      if (toolUsesFuel) {
        return selectedIssue.approval_status === 'Approved';
      }
      return true; // Non-fuel tools are auto-approved
    }
    
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Issue Details</h3>

        <div className="mb-4 space-y-2">
          <p><strong>Type:</strong> {selectedIssue.issue_type}</p>
          {selectedIssue.issue_type === 'fuel' && selectedIssue.fuel_type && (
            <p><strong>Fuel Type:</strong> {selectedIssue.fuel_type === 'vehicle' ? 'Vehicle Fuel' : 'Machine Fuel'}</p>
          )}
          <p><strong>Issued To:</strong> {selectedIssue.issued_to_name || 'Unknown'}</p>
          <p><strong>Status:</strong> {selectedIssue.status}</p>
          <p><strong>Approval:</strong> {selectedIssue.approval_status}</p>
          <p><strong>Reason:</strong> {selectedIssue.reason || 'No reason provided'}</p>
          
          {/* Show items */}
          {selectedIssue.items && selectedIssue.items.length > 0 && (
            <div className="mt-3">
              <strong>Items:</strong>
              <ul className="list-disc pl-5 mt-1">
                {selectedIssue.items.map((item, index) => (
                  <li key={index}>
                    {item.item_name || 'Item'} - {item.quantity_issued} {item.unit || ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Show vehicle info for vehicle fuel */}
          {selectedIssue.issue_type === 'fuel' && selectedIssue.fuel_type === 'vehicle' && (
            <p><strong>Vehicle:</strong> {getVehicleInfo()}</p>
          )}

          {/* Show fuel quantity */}
          {(selectedIssue.issue_type === 'fuel' || selectedIssue.fuel_litres) && (
            <p><strong>Fuel Quantity:</strong> {getFuelQuantity()}</p>
          )}
        </div>

        {/* 🔹 Action buttons */}
        {canIssueOut() && (
          <div className="flex justify-between mt-6">
            <button
              onClick={handleIssueOut}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              ✅ Issue Out
            </button>
            <button
              onClick={handleCancelIssue}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              ❌ Cancel Issue
            </button>
          </div>
        )}

        {/* 🔹 Message for non-issueable items */}
        {!canIssueOut() && selectedIssue.status !== 'Issued' && selectedIssue.status !== 'Cancelled' && (
          <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded">
            {selectedIssue.status === 'Pending' && selectedIssue.approval_status !== 'Approved' 
              ? 'Waiting for MD approval'
              : 'Cannot issue this item'
            }
          </div>
        )}

        {/* 🔹 Edit and close buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveChanges}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
              >
                Cancel Edit
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className={`px-4 py-2 rounded text-white ${
                selectedIssue.status === 'Cancelled' || selectedIssue.status === 'Issued'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={selectedIssue.status === 'Cancelled' || selectedIssue.status === 'Issued'}
            >
              Edit
            </button>
          )}
          <button
            onClick={closeModal}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default IssueOutModal;