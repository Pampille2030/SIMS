import React from "react";

const PurchaseOrderTable = ({ orders, onViewDetails }) => {
  const safeOrders = Array.isArray(orders) ? orders : [];

  return (
    <div className="mt-10">
      <h3 className="text-xl font-semibold mb-4">Existing Orders</h3>
      {safeOrders.length === 0 ? (
        <p className="text-gray-500">No orders found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-black border rounded">
            <thead>
              <tr>
                <th className="px-4 py-2 border">Date Created</th>
                <th className="px-4 py-2 border">Order Type</th>
                <th className="px-4 py-2 border">Details</th>
                <th className="px-4 py-2 border">Approval Status</th>
                <th className="px-4 py-2 border">Payment Status</th>
                <th className="px-4 py-2 border">Delivery Status</th>
              </tr>
            </thead>
            <tbody>
              {safeOrders.map((order, i) => (
                <tr key={i} className="hover:bg-gray-100">
                  <td className="border px-4 py-2">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="border px-4 py-2 capitalize">{order.order_type}</td>
                  <td
                    className="border px-4 py-2 text-blue-600 cursor-pointer hover:underline"
                    onClick={() => onViewDetails(order)}
                  >
                    View
                  </td>
                  <td className="border px-4 py-2">{order.approval_status}</td>
                  <td className="border px-4 py-2">{order.payment_status}</td>
                  <td className="border px-4 py-2">
                    {order.delivery_status === "delivered" ? (
                      <span className="text-green-600 font-semibold">Delivered</span>
                    ) : (
                      <span className="text-gray-600 font-semibold">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderTable;
