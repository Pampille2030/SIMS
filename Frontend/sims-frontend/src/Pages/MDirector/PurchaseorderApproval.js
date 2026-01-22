import React, { useEffect, useState } from 'react';
import MDApprovalModal from '../../Components/Md/PurchaseOrderApprovalModal';
import api from '../../Utils/api';

const MDApprovalPage = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/purchase-orders/');
      const sortedOrders = response.data.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setOrders(sortedOrders);
      setFilteredOrders(sortedOrders);
      setMessage('');
    } catch (error) {
      console.error('Error fetching orders:', error);
      setMessage('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = (date = selectedDate, status = selectedStatus) => {
    let filtered = [...orders];

    if (date) {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.created_at);
        const yyyy = orderDate.getFullYear();
        const mm = String(orderDate.getMonth() + 1).padStart(2, '0');
        const dd = String(orderDate.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}` === date;
      });
    }

    if (status !== 'all') {
      filtered = filtered.filter(
        (order) => order.approval_status.toLowerCase() === status.toLowerCase()
      );
    }

    setFilteredOrders(filtered);
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    filterOrders(date, selectedStatus);
  };

  const handleStatusChange = (e) => {
    const status = e.target.value;
    setSelectedStatus(status);
    filterOrders(selectedDate, status);
  };

  const handleApproveOrder = async (orderId) => {
    try {
      await api.post(`/purchase-orders/${orderId}/final_approve_order/`);
      await fetchPendingOrders();
      setShowModal(false);
      setMessage('Order fully approved');
    } catch (error) {
      console.error('Error approving order:', error);
      setMessage(error.response?.data?.error || 'Failed to approve order');
    }
  };

  const handleRejectOrder = async (orderId) => {
    try {
      await api.post(`/purchase-orders/${orderId}/reject_order/`);
      await fetchPendingOrders();
      setShowModal(false);
      setMessage('Order rejected');
    } catch (error) {
      console.error('Error rejecting order:', error);
      setMessage(error.response?.data?.error || 'Failed to reject order');
    }
  };

  const handleToggleSupplier = async (orderId, itemId, supplierId) => {
    try {
      await api.post(`/purchase-orders/${orderId}/approve_supplier/`, {
        supplier_id: supplierId
      });

      // Refresh selected order data
      const response = await api.get(`/purchase-orders/${orderId}/`);
      setSelectedOrder(response.data);
    } catch (error) {
      console.error('Error approving supplier:', error);
      setMessage(error.response?.data?.error || 'Failed to approve supplier');
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    let bgColor = '';
    let textColor = '';

    switch (status?.toUpperCase()) {
      case 'APPROVED':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'REJECTED':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
      case 'PENDING':
      default:
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
    }

    return (
      <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${bgColor} ${textColor}`}>
        {status?.toUpperCase() || 'PENDING'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-4 mt-24 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4a533b]"></div>
      </div>
    );
  }

  const today = new Date();
  const maxDate = today.toISOString().split('T')[0];

  return (
    <div className="p-4 mt-24">
      <h2 className="text-2xl font-bold mb-4">MD Approval – Purchase Orders</h2>

      {message && (
        <div className={`p-3 mb-4 rounded ${message.includes('Failed') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {message}
        </div>
      )}

      {/* FILTERS */}
      <div className="mb-4 flex flex-wrap gap-4 items-center p-4 rounded" style={{ backgroundColor: '#4a533b' }}>
        <div>
          <label className="mr-2 font-semibold text-white">Filter by Date:</label>
          <input type="date" value={selectedDate} onChange={handleDateChange} className="border px-2 py-1 rounded" max={maxDate} />
        </div>

        <div>
          <label className="mr-2 font-semibold text-white">Filter by Status:</label>
          <select value={selectedStatus} onChange={handleStatusChange} className="border px-2 py-1 rounded">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No orders found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow rounded">
            <thead>
              <tr className="bg-gray-100 text-left text-sm text-gray-700">
                <th className="p-3">Date</th>
                <th className="p-3">Order Type</th>
                <th className="p-3">Items</th>
                <th className="p-3">Approval Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-gray-50 text-sm">
                  <td className="p-3">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="p-3 capitalize">{order.order_type}</td>
                  <td className="p-3 text-left">{order.items?.map((item) => item.item_name).join(', ') || '-'}</td>
                  <td className="p-3">{getStatusBadge(order.approval_status)}</td>
                  <td className="p-3">
                    <button onClick={() => handleViewOrder(order)} className="bg-[#4a533b] text-white px-3 py-1 rounded hover:bg-[#3c452f] text-sm transition-colors">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      {showModal && selectedOrder && (
        <MDApprovalModal
          order={selectedOrder}
          onClose={() => setShowModal(false)}
          onApprove={selectedOrder.approval_status.toLowerCase() === 'pending' ? () => handleApproveOrder(selectedOrder.id) : undefined}
          onReject={selectedOrder.approval_status.toLowerCase() === 'pending' ? () => handleRejectOrder(selectedOrder.id) : undefined}
          onToggleSupplier={handleToggleSupplier}
        />
      )}
    </div>
  );
};

export default MDApprovalPage;
