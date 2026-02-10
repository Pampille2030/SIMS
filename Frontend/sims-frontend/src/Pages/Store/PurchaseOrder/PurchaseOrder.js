// Pages/SM/PurchaseOrderPage.js
import React, { useState, useEffect } from "react";
import api from "../../../Utils/api";

const PurchaseOrderPage = ({ onSubmitOrder }) => {
  const [items, setItems] = useState([
    {
      itemId: "",
      quantity: 1,
      reason: "",
      suppliers: [
        { supplier_name: "", amount_per_unit: "", invoice: null, id: null, uploaded_invoice_url: null, order_id: null },
      ],
    },
  ]);
  const [orderType, setOrderType] = useState("");
  const [availableItems, setAvailableItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch inventory items excluding vehicles
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await api.get("inventory/items/");
        const filteredItems = res.data.filter((i) => i.category !== "vehicle");
        setAvailableItems(filteredItems);
      } catch (err) {
        console.error("Failed to fetch items:", err);
      }
    };
    fetchItems();
  }, []);

  // Update item-level field
  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const updated = [...items];
    updated[index][name] = name === "quantity" ? Math.max(1, parseInt(value) || 1) : value;
    setItems(updated);
  };

  // Update supplier-level field
  const handleSupplierChange = (itemIndex, supplierIndex, field, value) => {
    const updated = [...items];
    updated[itemIndex].suppliers[supplierIndex][field] = value;
    setItems(updated);
  };

  // Upload invoice immediately after file selection (if order exists)
  const handleInvoiceChange = async (itemIndex, supplierIndex, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const updated = [...items];
    updated[itemIndex].suppliers[supplierIndex].invoice = file;
    setItems(updated);

    const supplier = updated[itemIndex].suppliers[supplierIndex];
    if (!supplier.id || !supplier.order_id) return; // Wait until order submission

    const formData = new FormData();
    formData.append("invoice", file);

    try {
      const res = await api.patch(
        `/purchase-orders/${supplier.order_id}/suppliers/${supplier.id}/upload-invoice/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      supplier.uploaded_invoice_url = res.data.invoice_url;
      setItems(updated);
      alert(`✅ Invoice uploaded for supplier ${supplier.supplier_name}`);
    } catch (err) {
      console.error("Invoice upload failed:", err);
      alert("❌ Failed to upload invoice");
    }
  };

  // Add/remove supplier
  const addSupplier = (itemIndex) => {
    const updated = [...items];
    updated[itemIndex].suppliers.push({
      supplier_name: "",
      amount_per_unit: "",
      invoice: null,
      id: null,
      uploaded_invoice_url: null,
      order_id: null,
    });
    setItems(updated);
  };
  const removeSupplier = (itemIndex, supplierIndex) => {
    const updated = [...items];
    updated[itemIndex].suppliers.splice(supplierIndex, 1);
    setItems(updated);
  };

  // Add/remove item
  const addItem = () => {
    setItems([
      ...items,
      {
        itemId: "",
        quantity: 1,
        reason: "",
        suppliers: [
          { supplier_name: "", amount_per_unit: "", invoice: null, id: null, uploaded_invoice_url: null, order_id: null },
        ],
      },
    ]);
  };
  const removeItem = (index) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  // Validate invoices before submission
  const validateInvoices = () => {
    for (const item of items) {
      for (const supplier of item.suppliers) {
        if (!supplier.invoice) return false;
      }
    }
    return true;
  };

  // Submit purchase order
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateInvoices()) {
      alert("❌ Please select invoices for all suppliers. Invoices are mandatory.");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderData = {
        order_type: orderType,
        notes: "Generated from frontend form",
        items: items.map((item) => ({
          item: parseInt(item.itemId),
          quantity: parseInt(item.quantity),
          reason: item.reason,
          suppliers: item.suppliers.map((s) => ({
            supplier_name: s.supplier_name,
            amount_per_unit: parseFloat(s.amount_per_unit) || 0,
          })),
        })),
      };

      const res = await onSubmitOrder(orderData, items);

      if (res?.id && res?.items) {
        const updated = [...items];
        res.items.forEach((ci, i) => {
          ci.suppliers?.forEach((s, j) => {
            updated[i].suppliers[j].id = s.id;
            updated[i].suppliers[j].order_id = res.id;
          });
        });
        setItems(updated);

        // Upload invoices after order creation
        for (let i = 0; i < updated.length; i++) {
          for (let j = 0; j < updated[i].suppliers.length; j++) {
            const supplier = updated[i].suppliers[j];
            if (supplier.invoice && !supplier.uploaded_invoice_url) {
              const formData = new FormData();
              formData.append("invoice", supplier.invoice);
              try {
                const invoiceRes = await api.patch(
                  `/purchase-orders/${supplier.order_id}/suppliers/${supplier.id}/upload-invoice/`,
                  formData,
                  { headers: { "Content-Type": "multipart/form-data" } }
                );
                supplier.uploaded_invoice_url = invoiceRes.data.invoice_url;
              } catch (err) {
                console.error("Invoice upload failed:", err);
              }
            }
          }
        }
      }

      alert("✅ Purchase Order submitted successfully with all invoices!");

      // Reset form
      setItems([
        {
          itemId: "",
          quantity: 1,
          reason: "",
          suppliers: [
            { supplier_name: "", amount_per_unit: "", invoice: null, id: null, uploaded_invoice_url: null, order_id: null },
          ],
        },
      ]);
      setOrderType("");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to submit order: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 mt-20">
      <h2 className="text-2xl font-semibold mb-6">Create Purchase Order</h2>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-[#4B553A] p-6 rounded shadow text-white"
      >
        {items.map((item, index) => (
          <div key={index} className="border-t pt-4 space-y-4">
            <h3 className="text-lg font-medium">Item #{index + 1}</h3>

            {/* Order Type, Item, Quantity, Reason */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block font-medium mb-1">Order Type *</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                  required
                >
                  <option value="">Select Type</option>
                  <option value="reorder">Reorder</option>
                  <option value="accumulate">Accumulate</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Item *</label>
                <select
                  name="itemId"
                  value={item.itemId}
                  onChange={(e) => handleItemChange(index, e)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                  required
                >
                  <option value="">Select Item</option>
                  {availableItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Quantity *</label>
                <input
                  type="number"
                  name="quantity"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, e)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                  required
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Reason *</label>
                <input
                  type="text"
                  name="reason"
                  value={item.reason}
                  onChange={(e) => handleItemChange(index, e)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                  required
                />
              </div>
            </div>

            {/* Suppliers Section */}
            <div>
              <h4 className="text-md font-medium mb-2">Suppliers</h4>
              {item.suppliers.map((supplier, sIndex) => (
                <div
                  key={sIndex}
                  className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end p-3 rounded"
                >
                  <div>
                    <label className="block font-medium mb-1">Supplier Name *</label>
                    <input
                      type="text"
                      value={supplier.supplier_name}
                      onChange={(e) =>
                        handleSupplierChange(index, sIndex, "supplier_name", e.target.value)
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Amount Per Unit *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={supplier.amount_per_unit}
                      onChange={(e) =>
                        handleSupplierChange(index, sIndex, "amount_per_unit", e.target.value)
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-yellow-300">Invoice *</label>
                    <input
                      type="file"
                      onChange={(e) => handleInvoiceChange(index, sIndex, e)}
                      className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                      accept=".pdf,.jpg,.jpeg,.png"
                      required
                    />
                    {supplier.uploaded_invoice_url && (
                      <p className="text-sm text-green-300 mt-1">
                        Uploaded:{" "}
                        <a
                          href={supplier.uploaded_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Invoice
                        </a>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-medium mb-1 invisible">Actions</label>
                    <div className="flex space-x-2">
                      {item.suppliers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSupplier(index, sIndex)}
                          className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 flex-1"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => addSupplier(index)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                + Add Supplier
              </button>
            </div>

            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                − Remove This Item
              </button>
            )}
          </div>
        ))}

        {/* Add Another Item & Submit */}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={addItem}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            + Add Another Item
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit Purchase Order"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PurchaseOrderPage;
