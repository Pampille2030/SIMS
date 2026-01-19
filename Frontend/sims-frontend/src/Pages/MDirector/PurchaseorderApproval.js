// src/Pages/MDirector/PurchaseOrderApproval.js
import React, { useEffect, useState } from 'react';
import MDApprovalModal from '../../Components/Md/PurchaseOrderApprovalModal';
import api from '../../Utils/api';

const MDApprovalPage = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  // Fetch pending orders from backend
  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      // backend should filter orders with approval_status=pending
      const response = await api.get('/purchase-orders/?approval_status=pending');
      
      // Sort orders by creation date (newest first)
      const sortedOrders = response.data.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setOrders(sortedOrders);
      setMessage('');
    } catch (error) {
      console.error('Error fetching orders:', error);
      setMessage('Failed to fetch pending orders');
    } finally {
      setLoading(false);
    }
  };

  // Toggle supplier approval (only one supplier per item)
  const handleSupplierToggle = async (orderId, itemId, supplierId) => {
    try {
      await api.post(`/purchase-orders/${orderId}/approve_supplier/`, {
        supplier_id: supplierId
      });
      await fetchPendingOrders();
      setMessage('Supplier approved successfully');
    } catch (error) {
      console.error('Error approving supplier:', error);
      setMessage('Failed to approve supplier');
    }
  };

  // Final approve order (MD approves after selecting suppliers)
  const handleApproveOrder = async (orderId) => {
    try {
      await api.post(`/purchase-orders/${orderId}/final_approve_order/`);
      await fetchPendingOrders();
      setShowModal(false);
      setMessage('Order fully approved');
    } catch (error) {
      console.error('Error approving order:', error);
      setMessage('Failed to approve order');
    }
  };

  // Reject order
  const handleRejectOrder = async (orderId) => {
    try {
      await api.patch(`/purchase-orders/${orderId}/`, {
        approval_status: 'rejected'
      });
      await fetchPendingOrders();
      setShowModal(false);
      setMessage('Order rejected');
    } catch (error) {
      console.error('Error rejecting order:', error);
      setMessage('Failed to reject order');
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  // Map backend approval_status to badge colors/text
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', text: 'Pending' },
      approved: { color: 'bg-green-600', text: 'Approved' },
      rejected: { color: 'bg-red-500', text: 'Rejected' }
    };
    const config = statusConfig[status] || { color: 'bg-gray-400', text: 'Unknown' };
    return (
      <span className={`px-2 py-1 rounded text-white ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-4 mt-24 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 mt-24">
      <h2 className="text-2xl font-bold mb-4">MD Approval - Purchase Orders</h2>

      {message && (
        <div
          className={`p-3 mb-4 rounded ${
            message.includes('Failed') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}
        >
          {message}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No pending orders for approval
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow rounded">
            <thead>
              <tr className="bg-gray-100 text-left text-sm text-gray-700">
                <th className="p-3">Date</th>
                <th className="p-3">Order Type</th>
                <th className="p-3">Number of Items</th>
                <th className="p-3">Approval Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-gray-50 text-sm">
                  <td className="p-3">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="p-3 capitalize">{order.order_type}</td>
                  <td className="p-3 text-center">{order.items?.length || 0}</td>
                  <td className="p-3">{getStatusBadge(order.approval_status)}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleViewOrder(order)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedOrder && (
        <MDApprovalModal
          order={selectedOrder}
          onClose={() => setShowModal(false)}
          onApprove={() => handleApproveOrder(selectedOrder.id)}
          onReject={() => handleRejectOrder(selectedOrder.id)}
          onToggleSupplier={handleSupplierToggle}
        />
      )}
    </div>
  );
};

export default MDApprovalPage;
