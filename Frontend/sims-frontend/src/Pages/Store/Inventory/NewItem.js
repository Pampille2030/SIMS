import React, { useState, useEffect } from 'react';
import api from '../../../Utils/api';

const ItemManagement = () => {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [fuelItems, setFuelItems] = useState([]);
  const [formData, setFormData] = useState({
    category: '',
    itemName: '',
    unit: '',
    quantity: '',
    reorderLevel: '',
    plate_number: '',
    fuel_type: '',
  });
  const [showVehicleTable, setShowVehicleTable] = useState(false);

  // ---------------- FETCH ----------------
  useEffect(() => {
    fetchCategories();
    fetchItemsAndFuels();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/inventory/categories/');
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchItemsAndFuels = async () => {
    try {
      const res = await api.get('/inventory/items/');
      const sortedItems = [...res.data].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setItems(sortedItems);
      setFuelItems(sortedItems.filter(item => item.category === 'fuel'));
    } catch (err) {
      console.error('Error fetching items:', err);
    }
  };

  // ---------------- FORM HANDLERS ----------------
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'category') {
      let defaultUnit = '';
      if (value === 'tool') defaultUnit = 'pcs';
      else if (value === 'fuel') defaultUnit = 'litres';

      setFormData({
        category: value,
        itemName: '',
        unit: defaultUnit,
        quantity: '',
        reorderLevel: '',
        plate_number: '',
        fuel_type: '',
      });

      setShowVehicleTable(value === 'vehicle');
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // ---------------- SUBMIT HANDLER ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.itemName) {
      alert('Item name is required!');
      return;
    }

    try {
      let payload = { 
        name: formData.itemName, 
        category: formData.category 
      };

      if (formData.category === 'vehicle') {
        if (!formData.plate_number || !formData.fuel_type) {
          alert('Plate number and Fuel Type are required for vehicles');
          return;
        }

        const existingVehicle = items.find(
          item => item.category === 'vehicle' &&
                  item.plate_number?.toLowerCase() === formData.plate_number.toLowerCase()
        );

        if (existingVehicle) {
          alert(`Vehicle with plate number "${formData.plate_number}" already exists!`);
          return;
        }

        payload = {
          ...payload,
          plate_number: formData.plate_number,
          fuel_type: formData.fuel_type,
        };
      } 
      else {
        let defaultUnit = '';
        if (formData.category === 'tool') defaultUnit = 'pcs';
        else if (formData.category === 'fuel') defaultUnit = 'litres';

        payload = {
          ...payload,
          unit: formData.unit || defaultUnit,
          quantity_to_add: formData.quantity ? parseFloat(formData.quantity) : 0,
          reorder_level: formData.reorderLevel ? parseFloat(formData.reorderLevel) : null, // nullable
        };
      }

      await api.post('/inventory/items/', payload);
      fetchItemsAndFuels();
      
      // Reset form
      setFormData({
        category: '',
        itemName: '',
        unit: '',
        quantity: '',
        reorderLevel: '',
        plate_number: '',
        fuel_type: '',
      });
      setShowVehicleTable(false);
      alert('✅ Item saved successfully!');
    } catch (err) {
      console.error('Error saving item:', err.response?.data || err.message);
      
      if (err.response && err.response.data) {
        const errors = Object.entries(err.response.data)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value[0] : value}`)
          .join('\n');
        alert(`❌ Error saving item:\n${errors}`);
      } else {
        alert('❌ Error saving item. Please check details and try again.');
      }
    }
  };

  // ---------------- FILTER ITEMS ----------------
  const consumableItems = items.filter(item => item.category !== 'vehicle');
  const vehicleItems = items.filter(item => item.category === 'vehicle');

  // Helper function to get vehicle plate number
  const getVehiclePlateNumber = (vehicleItem) => {
    if (vehicleItem.plate_number) return vehicleItem.plate_number;
    if (vehicleItem.vehicle_display) {
      const match = vehicleItem.vehicle_display.match(/\((.*?)\)/);
      return match ? match[1] : '-';
    }
    return '-';
  };

  // ---------------- FORMAT DATE ----------------
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // ---------------- UI ----------------
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mt-10">Item Management</h1>

      {/* Form */}
      <div className="bg-[#4B553A] p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Add New Item</h2>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

            {/* Category */}
            <div>
              <label className="block text-white mb-1" htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">-- Select Category --</option>
                {categories.map(cat => (
                  <option key={cat.key} value={cat.key}>{cat.value}</option>
                ))}
              </select>
            </div>

            {/* Item Name */}
            <div>
              <label className="block text-white mb-1" htmlFor="itemName">Item Name</label>
              <input
                type="text"
                id="itemName"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Enter new item name"
                required
              />
            </div>

            {/* Vehicle-specific */}
            {formData.category === 'vehicle' && (
              <>
                <div>
                  <label className="block text-white mb-1" htmlFor="plate_number">Plate Number</label>
                  <input
                    type="text"
                    id="plate_number"
                    name="plate_number"
                    value={formData.plate_number}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white mb-1" htmlFor="fuel_type">Fuel Type</label>
                  <select
                    id="fuel_type"
                    name="fuel_type"
                    value={formData.fuel_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">-- Select Fuel --</option>
                    {fuelItems.map(fuel => (
                      <option key={fuel.id} value={fuel.id}>
                        {fuel.name} ({fuel.unit || 'litres'})
                      </option>
                    ))}
                  </select>
                  {fuelItems.length === 0 && (
                    <p className="text-yellow-200 text-xs mt-1">
                      No fuel items found. Please add fuel items first.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Non-vehicle inputs */}
            {formData.category && formData.category !== 'vehicle' && (
              <>
                <div>
                  <label className="block text-white mb-1" htmlFor="unit">Unit</label>
                  <input
                    type="text"
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white mb-1" htmlFor="quantity">Quantity</label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white mb-1" htmlFor="reorderLevel">Reorder Level</label>
                  <input
                    type="number"
                    id="reorderLevel"
                    name="reorderLevel"
                    value={formData.reorderLevel}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-4">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>

      {/* ---------------- VEHICLE TABLE ---------------- */}
      {showVehicleTable && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Existing Vehicles</h2>
          {vehicleItems.length === 0 ? (
            <p className="text-gray-500">No vehicles added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 border">Date Added</th>
                    <th className="py-2 px-4 border">Vehicle Name</th>
                    <th className="py-2 px-4 border">Plate Number</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleItems.map(vehicle => (
                    <tr key={vehicle.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border">{formatDate(vehicle.created_at)}</td>
                      <td className="py-2 px-4 border">{vehicle.name}</td>
                      <td className="py-2 px-4 border">
                        {getVehiclePlateNumber(vehicle)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------- CONSUMABLES TABLE ---------------- */}
      {!showVehicleTable && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Fuel, Tools & Materials</h2>
          {consumableItems.length === 0 ? (
            <p className="text-gray-500">No consumable items added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 border">Date Added</th>
                    <th className="py-2 px-4 border">Item Name</th>
                    <th className="py-2 px-4 border">Category</th>
                    <th className="py-2 px-4 border">Quantity</th>
                    <th className="py-2 px-4 border">Unit</th>
                    <th className="py-2 px-4 border">Reorder Level</th>
                  </tr>
                </thead>
                <tbody>
                  {consumableItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border">{formatDate(item.created_at)}</td>
                      <td className="py-2 px-4 border">{item.name}</td>
                      <td className="py-2 px-4 border">{item.category_display || item.category}</td>
                      <td className="py-2 px-4 border">{item.quantity_in_stock}</td>
                      <td className="py-2 px-4 border">{item.unit || '-'}</td>
                      <td className="py-2 px-4 border">{item.reorder_level ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemManagement;
