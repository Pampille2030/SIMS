import React from 'react';
import { FaCheck } from 'react-icons/fa';

const PurchaseOrderModal = ({
  show,
  selectedOrder,
  onClose,
  onConfirmDelivery,
  onDownloadInvoice
}) => {
  if (!show || !selectedOrder) return null;

  const items = Array.isArray(selectedOrder.items) ? selectedOrder.items : [];

  const canDeliver = selectedOrder.can_approve_order;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 text-black overflow-y-auto max-h-[90vh]">

        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold">Purchase Order Details</h2>
          <button
            onClick={onClose}
            className="text-red-500 font-semibold hover:text-red-700"
          >
            ✕
          </button>
        </div>

        {/* Order Info */}
        <div className="mb-4 text-sm text-gray-600 grid grid-cols-2 gap-4">
          <p><strong>Approval Status:</strong> {selectedOrder.approval_status}</p>
          <p><strong>Payment Status:</strong> {selectedOrder.payment_status}</p>
          <p><strong>Delivery Status:</strong> {selectedOrder.delivery_status}</p>
          <p><strong>Date:</strong> {new Date(selectedOrder.created_at).toLocaleDateString()}</p>
        </div>

        {/* Items */}
        {items.map((item, index) => (
          <div key={index} className="mb-4 p-4 border rounded-lg bg-gray-50">
            <p className="font-semibold text-[#4B553A]">
              Item: {item.item_name} - {item.quantity} {item.item_unit}
            </p>

            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2 text-left">Supplier</th>
                    <th className="border px-3 py-2 text-left">Amount per unit (KES)</th>
                    <th className="border px-3 py-2 text-left">Invoice</th>
                    <th className="border px-3 py-2 text-left">Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {item.suppliers?.map((sup, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border px-3 py-2">{sup.supplier_name}</td>
                      <td className="border px-3 py-2">{sup.amount_per_unit}</td>
                      <td className="border px-3 py-2">
                        {sup.invoice_url ? (
                          <button
                            onClick={() => onDownloadInvoice(sup)}
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                          >
                            Download
                          </button>
                        ) : (
                          "No invoice"
                        )}
                      </td>
                      <td className="border px-3 py-2 text-center">
                        {sup.approved_by_md && <FaCheck className="text-green-500 text-lg mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Footer Actions */}
        <div className="mt-6 flex justify-end gap-3 border-t pt-3">
          <button
            onClick={() => canDeliver && onConfirmDelivery(selectedOrder.id)}
            className={`px-4 py-2 rounded text-white ${
              canDeliver ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"
            }`}
            disabled={!canDeliver}
          >
            Confirm Delivery
          </button>

          <button
            onClick={onClose}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderModal;
