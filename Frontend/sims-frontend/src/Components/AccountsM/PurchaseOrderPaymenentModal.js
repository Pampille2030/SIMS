// src/Components/AccountsM/PurchaseOrderPaymentModal.js
import React, { useState } from 'react';
import api from '../../Utils/api';

const ItemDetailsModal = ({ order, onClose, onPay }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleDownloadInvoice = (supplier) => {
    if (!supplier.invoice) {
      alert("No invoice available for this supplier.");
      return;
    }
    const link = document.createElement('a');
    link.href = supplier.invoice; // relative URL from backend
    link.setAttribute('download', supplier.invoice.split('/').pop());
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handlePayOrder = async () => {
    if (order.payment_status === 'paid' || order.approval_status !== 'approved') return;
    try {
      setLoading(true);
      await api.post(`/purchase-orders/${order.id}/mark_paid/`);
      setMessage('✅ Payment marked successfully');
      if (onPay) onPay(order.id);
    } catch (err) {
      console.error(err);
      setMessage('❌ Failed to mark payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl mt-20 max-h-[80vh] overflow-y-auto">
        
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

        {/* Items Loop */}
        {order.items?.map((item, itemIndex) => (
          <div key={item.id || itemIndex} className="mb-6 border-b pb-4">

            {/* Item Info */}
            <div className="mb-3 space-y-1">
              <p><strong>Item:</strong> {item.item_name}</p>
              <p><strong>Quantity:</strong> {item.quantity} ({item.item_unit})</p>
              <p>
                <strong>MD Approval:</strong>{" "}
                {order.approval_status === 'approved' ? (
                  <span className="text-green-600 font-semibold">APPROVED</span>
                ) : (
                  <span className={`px-2 py-1 rounded text-xs ${
                    order.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.approval_status?.replace(/_/g, ' ').toUpperCase()}
                  </span>
                )}
              </p>
              <p>
                <strong>Payment Status:</strong>{" "}
                <span className={`px-2 py-1 rounded text-xs ${
                  order.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-600 text-white font-semibold'
                }`}>
                  {order.payment_status?.replace(/_/g, ' ').toUpperCase()}
                </span>
              </p>
            </div>

            {/* Supplier Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2 text-left">Supplier Name</th>
                    <th className="border px-3 py-2 text-left">Amount per Unit</th>
                    <th className="border px-3 py-2 text-left">Invoice</th>
                    <th className="border px-3 py-2 text-left">Approved Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  {item.suppliers?.map((supplier, sIndex) => (
                    <tr key={supplier.id || sIndex} className="hover:bg-gray-50">
                      <td className="border px-3 py-2">{supplier.supplier_name}</td>
                      <td className="border px-3 py-2">KES {supplier.amount_per_unit}</td>
                      <td className="border px-3 py-2 text-center">
                        {supplier.invoice ? (
                          <button
                            onClick={() => handleDownloadInvoice(supplier)}
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                          >
                            Download
                          </button>
                        ) : <span className="text-gray-400 text-xs">No invoice</span>}
                      </td>
                      <td className="border px-3 py-2 text-center">
                        {supplier.approved_by_md ? (
                          <span className="text-green-600 dark:text-green-500 font-bold text-lg">✔</span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Footer Actions */}
        <div className="flex justify-end items-center mt-6 pt-4 border-t space-x-3">
          <button onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg">
            Close
          </button>

          <button
            onClick={handlePayOrder}
            disabled={order.payment_status === 'paid' || order.approval_status !== 'approved' || loading}
            className={`px-6 py-2 rounded-lg text-white ${
              order.payment_status === 'paid' || order.approval_status !== 'approved'
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {order.payment_status === 'paid' ? 'Paid' : loading ? 'Processing...' : 'Mark as Paid'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailsModal;
