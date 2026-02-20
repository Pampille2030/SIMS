// src/Pages/AccountsM/ACPurchaseOrderApproval.js
import React, { useEffect, useState } from 'react';
import ItemDetailsModal from '../../Components/AccountsM/PurchaseOrderPaymenentModal';
import api from '../../Utils/api';

const ACPurchaseOrderApproval = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/purchase-orders/?payment_status=pending');
      const sortedOrders = res.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setOrders(sortedOrders);
      setMessage('');
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setMessage('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  // STATUS DISPLAY FUNCTIONS
  const getApprovalText = (status) => {
    if (status === 'approved') return <span className="text-green-600 font-semibold">Approved</span>;
    if (status === 'rejected') return <span className="text-red-600 font-semibold">Rejected</span>;
    return <span className="text-gray-700 font-semibold">Pending</span>;
  };

  const getPaymentText = (status, approvalStatus) => {
    if (approvalStatus === 'rejected') return <span className="text-gray-500 font-semibold">N/A</span>;
    if (status === 'paid') return <span className="text-green-600 font-semibold">Paid</span>;
    return <span className="text-gray-700 font-semibold">Pending</span>;
  };

  const getDeliveryText = (status, deliveryDate, approvalStatus) => {
    if (approvalStatus === 'rejected') return <span className="text-gray-500 font-semibold">N/A</span>;
    if (status === 'delivered') {
      return deliveryDate ? (
        <span className="text-green-600 font-semibold">{new Date(deliveryDate).toLocaleDateString()}</span>
      ) : (
        <span className="text-green-600 font-semibold">Delivered</span>
      );
    }
    return <span className="text-gray-700 font-semibold">Pending</span>;
  };

  const getStatusDisplay = (status, type, approvalStatus = null, deliveryDate = null) => {
    if (type === 'approval') return getApprovalText(status);
    if (type === 'payment') return getPaymentText(status, approvalStatus);
    if (type === 'delivery') return getDeliveryText(status, deliveryDate, approvalStatus);
    return <span className="text-gray-700">{status}</span>;
  };

  if (loading) {
    return (
      <div className="p-4 mt-24 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 mt-24">
      <h2 className="text-2xl font-bold mb-4">Accounts Manager - Purchase Order Approval</h2>

      {message && (
        <div className={`p-3 mb-4 rounded ${
          message.includes('Failed') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {message}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No pending purchase orders
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead className="bg-gray-100 text-sm font-semibold">
              <tr>
                <th className="px-4 py-2 border">Date</th>
                <th className="px-4 py-2 border">Order Type</th>
                <th className="px-4 py-2 border">Item Details</th>
                <th className="px-4 py-2 border">MD Approval</th>
                <th className="px-4 py-2 border">Payment Status</th>
                <th className="px-4 py-2 border">Delivery Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="text-sm text-center border-b hover:bg-gray-50">
                  <td className="px-4 py-2 border">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 border capitalize">{order.order_type}</td>
                  <td className="px-4 py-2 border">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </button>
                  </td>
                  <td className="px-4 py-2 border">{getStatusDisplay(order.approval_status, 'approval')}</td>
                  <td className="px-4 py-2 border">
                    {getStatusDisplay(order.payment_status, 'payment', order.approval_status)}
                  </td>
                  <td className="px-4 py-2 border">
                    {getStatusDisplay(order.delivery_status, 'delivery', order.approval_status, order.delivery_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <ItemDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

export default ACPurchaseOrderApproval;
