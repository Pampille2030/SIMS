import React from 'react';
import api from "../../Utils/api"; // ✅ axios helper

const IssueOutModal = ({
  selectedIssue,
  isEditing,
  setIsEditing,
  setSelectedIssue,
  handleSaveChanges,
  closeModal,
  refreshRecords // ✅ call parent to refresh after update
}) => {
  if (!selectedIssue) return null;

  // 🔹 Store Manager issues out
  const handleIssueOut = async () => {
    try {
      await api.post(`/item_issuance/issuerecords/${selectedIssue.id}/issue/`);
      alert("✅ Issue successfully marked as Issued");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Issue Details</h3>

        <div className="mb-4 space-y-2">
          <p><strong>Type:</strong> {selectedIssue.issue_type}</p>
          <p><strong>Issued To:</strong> {selectedIssue.issued_to_name || 'Unknown'}</p>
          <p><strong>Status:</strong> {selectedIssue.status}</p>
          <p><strong>Approval:</strong> {selectedIssue.approval_status}</p>
          <p><strong>Reason:</strong> {selectedIssue.reason}</p>
        </div>

        {/* 🔹 Only show action buttons if MD approved and not already Issued/Cancelled */}
        {selectedIssue.approval_status === "approved" && 
         selectedIssue.status === "pending" && (
          <div className="flex justify-between mt-6">
            <button
              onClick={handleIssueOut}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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

        {/* 🔹 Default footer */}
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
                className="bg-yellow-500 text-white px-4 py-2 rounded"
              >
                Cancel Edit
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className={`px-4 py-2 rounded text-white ${
                selectedIssue.status === 'cancelled'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={selectedIssue.status === 'cancelled'}
            >
              Edit
            </button>
          )}
          <button
            onClick={closeModal}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default IssueOutModal;
