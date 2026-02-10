import React, { useState, useEffect } from "react";
import api from "../../../Utils/api";

const ReturnedItemPage = () => {
  const [formData, setFormData] = useState({
    employee: "",
    issuedItem: "",
    returnedQuantity: "",
    condition: "",
  });

  const [employees, setEmployees] = useState([]);
  const [issuedItems, setIssuedItems] = useState([]);
  const [returnedItems, setReturnedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await api.get("/employees/");
        setEmployees(response.data);
      } catch (err) {
        console.error("Error fetching employees:", err);
        setNotification({ show: true, message: "Failed to load employees", type: "error" });
      }
    };
    fetchEmployees();
  }, []);

  // Fetch issued items for selected employee
  useEffect(() => {
    const fetchIssuedItems = async () => {
      if (!formData.employee) {
        setIssuedItems([]);
        return;
      }
      try {
        setLoading(true);
     const response = await api.get(
      `/item_issuance/issuerecords/issued_items_by_employee/?employee_id=${formData.employee}`
    );
        setIssuedItems(response.data.issued_items || []);
      } catch (err) {
        console.error("Error fetching issued items:", err);
        setNotification({ show: true, message: "Failed to load issued items", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchIssuedItems();
  }, [formData.employee]);

  // Fetch returned items history
  useEffect(() => {
    const fetchReturnedItems = async () => {
      try {
        const response = await api.get("/returns/returned-items/");
        setReturnedItems(response.data);
      } catch (err) {
        console.error("Error fetching returned items:", err);
      }
    };
    fetchReturnedItems();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "employee" && { issuedItem: "", returnedQuantity: "", condition: "" }),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.issuedItem || !formData.returnedQuantity || !formData.condition) {
      setNotification({ show: true, message: "Please fill all fields", type: "error" });
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/returns/returned-items/", {
        items_to_return: [
          {
            issue_item_id: formData.issuedItem,
            returned_quantity: parseFloat(formData.returnedQuantity),
            condition: formData.condition,
          },
        ],
      });

      setReturnedItems((prev) => [...response.data.returned_items, ...prev]);
      setFormData({ employee: formData.employee, issuedItem: "", returnedQuantity: "", condition: "" });
      setNotification({ show: true, message: "Item returned successfully!", type: "success" });
    } catch (err) {
      console.error("Error returning item:", err);
      setNotification({ show: true, message: "Failed to return item", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = issuedItems.find((i) => i.issue_item_id === parseInt(formData.issuedItem));
  const maxReturnable = selectedItem ? selectedItem.outstanding_quantity : 0;

  return (
    <div className="p-8 mt-24">
      {notification.show && (
        <div
          className={`mb-4 p-3 rounded ${
            notification.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {notification.message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end bg-[#4B553A] p-6 rounded shadow"
      >
        <div>
          <label className="block mb-1 font-medium text-white">Issued To</label>
          <select
            name="employee"
            value={formData.employee}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">Select Employee</option>
            {employees.map((emp) => {
              const fullName = emp.middle_name
                ? `${emp.first_name} ${emp.middle_name} ${emp.last_name} (${emp.job_number})`
                : `${emp.first_name} ${emp.last_name} (${emp.job_number})`;
              return <option key={emp.id} value={emp.id}>{fullName}</option>;
            })}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium text-white">Issued Item</label>
          <select
            name="issuedItem"
            value={formData.issuedItem}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">Select Issued Item</option>
            {issuedItems.map((item) => (
              <option key={item.issue_item_id} value={item.issue_item_id}>
                {item.item_name} (Outstanding: {item.outstanding_quantity})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium text-white">Returned Quantity</label>
          <input
            type="number"
            name="returnedQuantity"
            value={formData.returnedQuantity}
            onChange={handleChange}
            min="0.01"
            max={maxReturnable}
            step="0.01"
            className="w-full border rounded px-3 py-2"
            placeholder={`Max: ${maxReturnable}`}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-white">Condition</label>
          <select
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">Select Condition</option>
            <option value="Excellent">Excellent</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Damaged">Damaged</option>
            <option value="Lost">Lost</option>
          </select>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading || !formData.issuedItem}
            className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? "Returning..." : "Return Item"}
          </button>
        </div>
      </form>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Returned Items History</h2>
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b">Date</th>
              <th className="py-2 px-4 border-b">Issued To</th>
              <th className="py-2 px-4 border-b">Item</th>
              <th className="py-2 px-4 border-b">Quantity Returned</th>
              <th className="py-2 px-4 border-b">Condition</th>
            </tr>
          </thead>
          <tbody>
            {returnedItems.length ? (
              returnedItems.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 px-4 border-b">{new Date(item.return_date).toLocaleDateString()}</td>
                  <td className="py-2 px-4 border-b">{item.employee_name}</td>
                  <td className="py-2 px-4 border-b">{item.item_name}</td>
                  <td className="py-2 px-4 border-b">{item.returned_quantity}</td>
                  <td className="py-2 px-4 border-b">{item.condition}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="py-4 text-center text-gray-500">
                  No returned items yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReturnedItemPage;
