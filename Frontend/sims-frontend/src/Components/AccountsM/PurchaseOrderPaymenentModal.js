import React, { useState, useEffect } from 'react';
import api from '../../Utils/api';

const PAYMENT_ACCOUNTS = [
  { value: "petty_cash", label: "Petty Cash" },
  { value: "hay_money", label: "Hay Money" },
  { value: "steers_money", label: "Steers Money" },
  { value: "afes", label: "AFEs" },
  { value: "donors_money", label: "Donors Money" },
];

const ItemDetailsModal = ({ order, onClose, onPay, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [amountPaid, setAmountPaid] = useState({});

  useEffect(() => {
    if (order.accounts_with_money) setSelectedAccounts(order.accounts_with_money);

    // Initialize per-supplier amounts
    const initialAmounts = {};
    order.items?.forEach(item => {
      item.suppliers?.forEach(s => {
        initialAmounts[s.id] = s.amount_paid || '';
      });
    });
    setAmountPaid(initialAmounts);
  }, [order]);

  // Toggle account selection
  const handleAccountChange = (accountValue) => {
    if (order.approval_status === 'approved') return;
    setSelectedAccounts(prev =>
      prev.includes(accountValue)
        ? prev.filter(acc => acc !== accountValue)
        : [...prev, accountValue]
    );
  };

  // Save Accounts
  const handleSaveAccounts = async () => {
    try {
      setLoading(true);
      await api.patch(`/purchase-orders/${order.id}/`, { accounts_with_money: selectedAccounts });
      setMessage("✅ Accounts updated successfully");
      onUpdate?.();
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to update accounts");
    } finally {
      setLoading(false);
    }
  };

  // Handle per-supplier amount change
  const handleChangePaidAmount = (supplierId, value) => {
    setAmountPaid(prev => ({ ...prev, [supplierId]: value }));
  };

  // Save per-supplier amounts
  const handleSaveAmounts = async () => {
    try {
      setLoading(true);
      const payload = Object.entries(amountPaid).map(([supplier_id, amt]) => ({
        supplier_id,
        amount_paid: parseFloat(amt) || 0
      }));
      await api.patch(`/purchase-orders/${order.id}/`, { paid_suppliers: payload });
      setMessage("✅ Paid amounts saved successfully");
      onUpdate?.();
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to save paid amounts");
    } finally {
      setLoading(false);
    }
  };

  // Download invoice
  const handleDownloadInvoice = (supplier) => {
    if (!supplier.invoice) return alert("No invoice available.");
    const link = document.createElement('a');
    link.href = supplier.invoice;
    link.setAttribute('download', supplier.invoice.split('/').pop());
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Mark order as paid
  const handlePayOrder = async () => {
    const totalPaid = Object.values(amountPaid).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    if (totalPaid <= 0) {
      setMessage("❌ Enter valid amounts before marking as paid");
      return;
    }

    try {
      setLoading(true);
      await api.post(`/purchase-orders/${order.id}/mark_paid/`, { amount_paid: totalPaid });
      setMessage("✅ Payment marked successfully");
      onPay?.(order.id);
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to mark payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl mt-20 max-h-[85vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-xl font-bold text-[#4B553A]">Purchase Order Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-2 mb-4 rounded ${message.includes('❌') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {message}
          </div>
        )}

        {/* Items Table */}
        {order.items?.map((item) => (
          <div key={item.id} className="mb-6 border-b pb-4">
            <p><strong>Item:</strong> {item.item_name}</p>
            <p><strong>Quantity:</strong> {item.quantity} ({item.item_unit})</p>

            <div className="overflow-x-auto mt-3">
              <table className="min-w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2 text-left">Supplier</th>
                    <th className="border px-3 py-2 text-left">Amount</th>
                    <th className="border px-3 py-2 text-left">Invoice</th>
                    <th className="border px-3 py-2 text-left">Approved</th>
                    <th className="border px-3 py-2 text-left">Paid Amount (KES)</th>
                  </tr>
                </thead>
                <tbody>
                  {item.suppliers?.map((supplier) => {
                    const isReadOnly = order.payment_status === 'paid' || !supplier.approved_by_md;
                    return (
                      <tr key={supplier.id}>
                        <td className="border px-3 py-2">{supplier.supplier_name}</td>
                        <td className="border px-3 py-2">KES {supplier.amount_per_unit}</td>
                        <td className="border px-3 py-2 text-center">
                          {supplier.invoice ? (
                            <button
                              onClick={() => handleDownloadInvoice(supplier)}
                              className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                            >
                              Download
                            </button>
                          ) : <span className="text-gray-400 text-xs">No invoice</span>}
                        </td>
                        <td className="border px-3 py-2 text-center">
                          {supplier.approved_by_md ? <span className="text-green-600 font-bold">✔</span> : "-"}
                        </td>
                        <td className="border px-3 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Enter amount"
                            value={amountPaid[supplier.id] || ''}
                            disabled={isReadOnly}
                            onChange={(e) => handleChangePaidAmount(supplier.id, e.target.value)}
                            className={`border px-2 py-1 rounded w-24 text-right ${
                              isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                            }`}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Accounts Section */}
        <div className="mb-6 border p-4 rounded bg-gray-50">
          <h4 className="font-semibold mb-3 text-[#4B553A]">Available Payment Accounts</h4>

          <div className="flex flex-wrap gap-3">
            {PAYMENT_ACCOUNTS.map(account => {
              const isSelected = selectedAccounts.includes(account.value);
              const isApprovedByMD = order.approved_account === account.value;

              return (
                <div
                  key={account.value}
                  onClick={() => !isApprovedByMD && handleAccountChange(account.value)}
                  className={`px-4 py-2 rounded-lg border cursor-pointer transition-all whitespace-nowrap select-none
                    ${isApprovedByMD
                      ? "bg-green-600 text-white border-green-600"
                      : isSelected
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white border-gray-300 hover:bg-gray-100"}
                    ${order.approval_status === 'approved' ? "cursor-not-allowed opacity-70" : ""}
                  `}
                >
                  {account.label.toUpperCase()}
                </div>
              );
            })}
          </div>

          {/* Save Accounts Button */}
          {order.approval_status !== 'approved' && (
            <button
              onClick={handleSaveAccounts}
              disabled={loading}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {loading ? "Saving..." : "Save Accounts"}
            </button>
          )}

          {/* Approved Account */}
          {order.approved_account && (
            <div className="mt-4 p-2 bg-green-100 text-green-800 rounded">
              <strong>Approved Account:</strong> {order.approved_account.replace(/_/g, ' ').toUpperCase()}
            </div>
          )}

          {/* Paid Amounts Summary */}
          {order.payment_status === 'paid' && order.paid_suppliers?.length > 0 && (
            <div className="mt-4 p-2 bg-green-50 text-green-800 rounded space-y-1">
              <h5 className="font-semibold">Amount Paid:</h5>
              {PAYMENT_ACCOUNTS.map(account => {
                const total = order.paid_suppliers
                  .filter(s => s.account === account.value)
                  .reduce((sum, s) => sum + (s.amount_paid || 0), 0);
                if (total > 0) {
                  return (
                    <div key={account.value}>
                      <strong>{account.label.toUpperCase()}:</strong> KES {total.toLocaleString()}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* Save Paid Amounts Button only if NOT paid */}
          {order.payment_status !== 'paid' && order.approval_status === 'approved' && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleSaveAmounts}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                {loading ? "Saving..." : "Save Paid Amounts"}
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end mt-6 space-x-3 border-t pt-4">
          <button onClick={onClose} className="bg-gray-300 px-6 py-2 rounded">
            Close
          </button>

          {order.approval_status === 'approved' && (
            <button
              onClick={handlePayOrder}
              disabled={Object.values(amountPaid).reduce((sum, val) => sum + (parseFloat(val)||0), 0) <= 0 || order.payment_status === 'paid'}
              className={`px-6 py-2 rounded text-white ${
                Object.values(amountPaid).reduce((sum, val) => sum + (parseFloat(val)||0), 0) <= 0 || order.payment_status === 'paid'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {order.payment_status === 'paid' ? 'Paid' : 'Mark as Paid'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default ItemDetailsModal;