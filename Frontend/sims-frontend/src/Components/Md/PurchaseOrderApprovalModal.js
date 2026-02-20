import React, { useState, useEffect } from 'react';

const MDApprovalModal = ({ order, onClose, onApprove, onReject, onToggleSupplier, onAccountSelect }) => {
  // Initialize account only once per order open
  const [selectedAccount, setSelectedAccount] = useState('');

  // Reset selectedAccount only when a *new order* is opened
  useEffect(() => {
    setSelectedAccount(''); // start with no account
    if (onAccountSelect) onAccountSelect('');
  }, [order?.id, onAccountSelect]); // ✅ reset only when order changes

  if (!order) return null;

  const availableAccounts = order.accounts_with_money || [];
  const isPending = order.approval_status.toLowerCase() === 'pending';

  const allItemsApproved = order.items.every(
    (item) => item.suppliers.some((s) => s.approved_by_md)
  );

  const handleDownloadInvoice = (supplier) => {
    if (!supplier.invoice) return alert("No invoice available.");
    const link = document.createElement("a");
    link.href = supplier.invoice;
    link.setAttribute("download", supplier.invoice.split("/").pop());
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleAccountChange = (account) => {
    setSelectedAccount(account);
    if (onAccountSelect) onAccountSelect(account);
  };

  return (
    <div className="fixed top-24 left-0 right-0 bottom-0 z-50 flex items-start justify-center bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl mt-4 max-h-[80vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-xl font-bold text-[#4B553A]">Order Review</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
        </div>

        {/* Order Info */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <p><strong>Order Type:</strong> {order.order_type}</p>
          <p><strong>Created:</strong> {new Date(order.created_at).toLocaleDateString()}</p>
          <p>
            <strong>Status:</strong>{" "}
            <span
              className={`ml-1 px-2 py-1 rounded text-xs ${
                order.approval_status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : order.approval_status === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : order.approval_status === 'rejected'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {order.approval_status?.toUpperCase()}
            </span>
          </p>
        </div>

        {/* Items Loop */}
        {order.items?.map((item, itemIndex) => (
          <div key={item.id || itemIndex} className="mb-6">
            <div className="mb-3">
              <p><strong>Item:</strong> {item.item_name}</p>
              <p><strong>Quantity:</strong> {item.quantity} ({item.item_unit})</p>
              {item.reason && <p><strong>Reason:</strong> {item.reason}</p>}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2 text-left">Supplier Name</th>
                    <th className="border px-3 py-2 text-left">Amount per Unit</th>
                    <th className="border px-3 py-2 text-left">Invoice</th>
                    <th className="border px-3 py-2 text-left">Approve</th>
                  </tr>
                </thead>
                <tbody>
                  {item.suppliers?.map((supplier, supplierIndex) => (
                    <tr key={supplier.id || supplierIndex} className="hover:bg-gray-50">
                      <td className="border px-3 py-2">{supplier.supplier_name}</td>
                      <td className="border px-3 py-2">KES {supplier.amount_per_unit}</td>
                      <td className="border px-3 py-2">
                        {supplier.invoice ? (
                          <button
                            onClick={() => handleDownloadInvoice(supplier)}
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                          >
                            Download
                          </button>
                        ) : "No invoice"}
                      </td>
                      <td className="border px-3 py-2 text-center">
                        {supplier.approved_by_md ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full border-2 border-green-700 text-green-700 font-bold">
                            ✓
                          </span>
                        ) : (
                          <input
                            type="radio"
                            name={`supplier-${item.id || itemIndex}`}
                            checked={supplier.approved_by_md || false}
                            disabled={!isPending || availableAccounts.length === 0} 
                            onChange={() => onToggleSupplier(order.id, item.id, supplier.id)}
                            className="h-6 w-6 cursor-pointer accent-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Accounts Section */}
        {availableAccounts.length > 0 && (
          <div className="mb-6 border-t pt-4">
            <p className="font-semibold mb-2 text-[#4B553A]">Select Account to Approve Payment:</p>
            <div className="flex flex-wrap gap-3">
              {availableAccounts.map((account) => (
                <label
                  key={account}
                  className={`cursor-pointer px-4 py-2 rounded border ${
                    selectedAccount === account
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-gray-100 text-gray-800 border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="approved-account"
                    value={account}
                    checked={selectedAccount === account}
                    onChange={() => handleAccountChange(account)}
                    className="hidden"
                  />
                  {account.replace(/_/g, ' ').toUpperCase()}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <button onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg transition-colors">Close</button>

          {isPending ? (
            <div className="space-x-3">
              <button onClick={() => onReject(order.id)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg">Reject</button>
              <button
                onClick={() => onApprove(order.id, selectedAccount)}
                className={`bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg ${!allItemsApproved || !selectedAccount ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!allItemsApproved || !selectedAccount}
              >
                Approve
              </button>
            </div>
          ) : (
            <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${order.approval_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              This order has been {order.approval_status}.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MDApprovalModal;