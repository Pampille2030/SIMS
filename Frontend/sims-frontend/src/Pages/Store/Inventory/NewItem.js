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
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchItemsAndFuels();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/inventory/categories/');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
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
      console.error(err);
    }
  };

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

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getItemLabel = () => {
    switch(formData.category) {
      case 'fuel': return 'Fuel Name';
      case 'vehicle': return 'Vehicle Name';
      case 'material': return 'Material Name';
      case 'tool': return 'Tool Name';
      default: return 'Item Name';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemName) return;

    try {
      let payload = { name: formData.itemName, category: formData.category };

      if (formData.category === 'vehicle') {
        if (!formData.plate_number || !formData.fuel_type) return;

        const exists = items.find(
          item => item.category === 'vehicle' &&
                  item.plate_number?.toLowerCase() === formData.plate_number.toLowerCase()
        );
        if (exists) return;

        payload = { ...payload, plate_number: formData.plate_number, fuel_type: formData.fuel_type };
      } else {
        const defaultUnit = formData.category === 'tool' ? 'pcs' : formData.category === 'fuel' ? 'litres' : '';
        payload = {
          ...payload,
          unit: formData.unit || defaultUnit,
          quantity_to_add: parseFloat(formData.quantity || 0),
          reorder_level: formData.reorderLevel ? parseFloat(formData.reorderLevel) : null
        };
      }

      await api.post('/inventory/items/', payload);
      fetchItemsAndFuels();

      setFormData({ category:'', itemName:'', unit:'', quantity:'', reorderLevel:'', plate_number:'', fuel_type:'' });
      setShowVehicleTable(false);
      setSuccessMessage('Item added successful!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const consumableItems = items.filter(i => i.category !== 'vehicle');
  const vehicleItems = items.filter(i => i.category === 'vehicle');

  const getVehiclePlateNumber = v => v.plate_number || v.vehicle_display?.match(/\((.*?)\)/)?.[1] || '-';
  const formatDate = d => d ? new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }) : '-';

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mt-10">Item Management</h1>

      {successMessage && (
        <div className="bg-green-500 text-white px-4 py-2 rounded mb-4">{successMessage}</div>
      )}

      <div className="bg-[#4B553A] p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Add New Item</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

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
                {categories.map(c => <option key={c.key} value={c.key}>{c.value}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-white mb-1" htmlFor="itemName">{getItemLabel()}</label>
              <input
                type="text"
                id="itemName"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder={`Enter ${getItemLabel()}`}
                required
              />
            </div>

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
                    {fuelItems.map(f => <option key={f.id} value={f.id}>{f.name} ({f.unit || 'litres'})</option>)}
                  </select>
                  {fuelItems.length === 0 && <p className="text-yellow-200 text-xs mt-1">No fuel items found. Please add fuel first.</p>}
                </div>
              </>
            )}

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
            <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">Add Item</button>
          </div>
        </form>
      </div>

      {showVehicleTable && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Existing Vehicles</h2>
          {vehicleItems.length === 0 ? <p className="text-gray-500">No vehicles added yet.</p> :
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
                  {vehicleItems.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border">{formatDate(v.created_at)}</td>
                      <td className="py-2 px-4 border">{v.name}</td>
                      <td className="py-2 px-4 border">{getVehiclePlateNumber(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </div>
      )}

      {!showVehicleTable && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Fuel, Tools & Materials</h2>
          {consumableItems.length === 0 ? <p className="text-gray-500">No consumable items added yet.</p> :
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
                  {consumableItems.map(i => (
                    <tr key={i.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border">{formatDate(i.created_at)}</td>
                      <td className="py-2 px-4 border">{i.name}</td>
                      <td className="py-2 px-4 border">{i.category_display || i.category}</td>
                      <td className="py-2 px-4 border">{i.quantity_in_stock}</td>
                      <td className="py-2 px-4 border">{i.unit || '-'}</td>
                      <td className="py-2 px-4 border">{i.reorder_level ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </div>
      )}
    </div>
  );
};

export default ItemManagement;
