// Pages/SM/PurchaseorderContainer.js
import React, { useState, useEffect } from 'react';
import api from '../../../Utils/api';
import PurchaseOrderPage from './PurchaseOrder';
import PurchaseOrderTable from '../../../Components/SM/PurchaseOrderTable';
import PurchaseOrderModal from '../../../Components/SM/PurchaseOrderModal';

const PurchaseorderContainer = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch all orders from backend
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('purchase-orders/');
        // Sort latest orders first
        const sortedOrders = res.data.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setOrders(sortedOrders);
      } catch (error) {
        console.error("Failed to fetch purchase orders:", error);
      }
    };
    fetchOrders();
  }, []);

  // Handle new order creation
  const handleOrderSubmit = async (orderData, formItemsWithFiles) => {
    try {
      const createRes = await api.post('purchase-orders/', orderData);
      const createdOrder = createRes.data;

      // Upload invoices for each supplier
      const uploads = [];
      formItemsWithFiles.forEach((item, itemIndex) => {
        item.suppliers.forEach((supplier, supplierIndex) => {
          const file = supplier.invoice;
          const createdSupplier = createdOrder.items?.[itemIndex]?.suppliers?.[supplierIndex];
          if (file && createdSupplier?.id) {
            const formData = new FormData();
            formData.append('invoice', file);
            uploads.push(
              api.patch(
                `purchase-orders/${createdOrder.id}/suppliers/${createdSupplier.id}/upload-invoice/`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
              ).catch(err => {
                console.error(`Invoice upload failed for supplier ${createdSupplier.id}`, err);
              })
            );
          }
        });
      });

      if (uploads.length) {
        await Promise.allSettled(uploads);
      }

      // Refresh order after invoice upload
      const fresh = await api.get(`purchase-orders/${createdOrder.id}/`);
      setOrders(prev => [fresh.data, ...prev]); // add new order at top
    } catch (err) {
      console.error("Failed to submit order:", err);
    }
  };

  // Confirm delivery (only if all items approved and payment done)
  const handleConfirmDelivery = async (orderId) => {
    try {
      const order = orders.find(o => o.id === orderId);

      if (!order.can_approve_order || order.payment_status !== 'paid') {
        alert("⚠️ Cannot confirm delivery yet. Wait for all necessary approvals and payment.");
        return;
      }

      const res = await api.post(`purchase-orders/${orderId}/mark_delivered/`);
      setOrders(prev => prev.map(o => (o.id === orderId ? res.data : o)));
      alert("✅ Delivery confirmed!");
    } catch (error) {
      console.error("Failed to confirm delivery:", error);
      alert("❌ Failed to confirm delivery");
    }
  };

  // Download invoice
  const handleDownloadInvoice = (supplier) => {
    if (supplier.invoice_url) {
      window.open(supplier.invoice_url, "_blank");
    } else {
      alert("No invoice available for this supplier.");
    }
  };

  // View order details in modal
  const onViewDetails = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleClose = () => {
    setSelectedOrder(null);
    setShowModal(false);
  };

  return (
    <div className="p-4 mt-20">
      {/* Create new order */}
      <PurchaseOrderPage onSubmitOrder={handleOrderSubmit} />

      {/* Orders table */}
      <PurchaseOrderTable
        orders={orders}
        onViewDetails={onViewDetails}
      />

      {/* Modal for order details */}
      {showModal && selectedOrder && (
        <PurchaseOrderModal
          show={showModal}
          selectedOrder={selectedOrder}
          onClose={handleClose}
          onConfirmDelivery={handleConfirmDelivery}
          onDownloadInvoice={handleDownloadInvoice}
        />
      )}
    </div>
  );
};

export default PurchaseorderContainer;
