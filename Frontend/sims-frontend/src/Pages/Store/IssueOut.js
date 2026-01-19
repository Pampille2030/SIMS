import React, { useState, useEffect, useMemo } from 'react'; 
import api from '../../Utils/api';
import { MaterialFuelTable, ToolTable } from '../../Components/SM/IssueOutTable';

const SearchableSelect = ({ 
  label, name, value, onChange, options, required = false,
  placeholder = "Type to search...", displayFormat = (option) => option.name,
  filterBy = ['name']
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOptions(options);
      return;
    }
    const filtered = options.filter(option => {
      return filterBy.some(prop => {
        const value = option[prop];
        if (!value) return false;
        return value.toString().toLowerCase().startsWith(searchTerm.toLowerCase());
      });
    });
    setFilteredOptions(filtered);
  }, [searchTerm, options, filterBy]);

  const handleSelect = (optionId) => {
    onChange({ target: { name, value: optionId } });
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const selectedOption = options.find(opt => opt.id == value);
  const displayValue = selectedOption ? displayFormat(selectedOption) : '';

  return (
    <div className="relative">
      {label && <label className="block text-white mb-1">{label}</label>}
      <input
        type="text"
        value={isOpen ? searchTerm : displayValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="w-full border rounded px-3 py-2"
        placeholder={placeholder}
        required={required}
      />
      
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.map(option => (
            <div
              key={option.id}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(option.id)}
            >
              {displayFormat(option)}
            </div>
          ))}
        </div>
      )}
      
      {isOpen && filteredOptions.length === 0 && searchTerm && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg">
          <div className="px-3 py-2 text-gray-500">No matches found</div>
        </div>
      )}
    </div>
  );
};

const VehicleFuelTable = ({ records, handleConfirmIssue, handleCancelIssue, newRecordId }) => {
  const vehicleFuelRecords = records.filter(r => r.issue_type === 'fuel' && r.fuel_type === 'vehicle');

  return (
    <div className="overflow-x-auto mt-8">
      <h3 className="text-xl font-semibold mb-4">Vehicle Fuel Issuance</h3>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-3 py-2">Vehicle</th>
            <th className="border px-3 py-2">Fuel (L)</th>
            <th className="border px-3 py-2">Issued To</th>
            <th className="border px-3 py-2">Previous Mileage</th>
            <th className="border px-3 py-2">Current Mileage</th>
            <th className="border px-3 py-2">Distance (km)</th>
            <th className="border px-3 py-2">Efficiency (km/L)</th>
            <th className="border px-3 py-2">Status</th>
            <th className="border px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicleFuelRecords.map(record => {
            const vehicleDisplay = record.vehicle_plate ? 
              `${record.vehicle_name || 'Vehicle'} (${record.vehicle_plate})` : 
              'N/A';
            
            // Use distance_traveled from backend calculation
            const distance = record.distance_traveled || 0;
            
            // Use fuel_efficiency calculated by backend
            const efficiency = record.fuel_efficiency;
            
            return (
              <tr key={record.id} id={`record-${record.id}`} className={record.id === newRecordId ? 'bg-green-100' : ''}>
                <td className="border px-3 py-2">{vehicleDisplay}</td>
                <td className="border px-3 py-2">{record.fuel_litres}L</td>
                <td className="border px-3 py-2">{record.issued_to_name}</td>
                <td className="border px-3 py-2">{record.previous_mileage || 0}</td>
                <td className="border px-3 py-2">{record.current_mileage || 0}</td>
                <td className="border px-3 py-2">{distance} km</td>
                <td className="border px-3 py-2 font-medium">
                  <div className={`${
                    efficiency > 15 ? 'text-green-600' : 
                    efficiency < 5 ? 'text-red-600' : 
                    'text-blue-600'
                  }`}>
                    {efficiency ? `${Number(efficiency).toFixed(2)} km/L` : 'N/A'}
                  </div>
                  {record.status === 'Issued' && !efficiency && (
                    <div className="text-xs text-gray-500">First issuance</div>
                  )}
                </td>
                <td className="border px-3 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    record.status === 'Issued' ? 'bg-green-100 text-green-800' :
                    record.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                    record.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {record.status}
                  </span>
                </td>
                <td className="border px-3 py-2 flex gap-2">
                  <button
                    className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm disabled:opacity-50"
                    onClick={() => handleConfirmIssue(record.id)}
                    disabled={record.status === 'Issued' || record.status === 'Cancelled' || record.approval_status !== 'Approved'}
                  >
                    Issue
                  </button>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm disabled:opacity-50"
                    onClick={() => handleCancelIssue(record.id)}
                    disabled={record.status === 'Issued' || record.status === 'Cancelled'}
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            );
          })}
          {vehicleFuelRecords.length === 0 && (
            <tr>
              <td colSpan="9" className="text-center py-4">No vehicle fuel records found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const IssueOutPage = () => {
  const [formType, setFormType] = useState('material');
  const [fuelSubType, setFuelSubType] = useState('');
  const [formData, setFormData] = useState({});
  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [issuedRecords, setIssuedRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRecordId, setNewRecordId] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const [itemsRes, employeesRes, vehiclesRes] = await Promise.all([
          api.get('/inventory/items/'),
          api.get('/employees/'),
          api.get('/item_issuance/vehicles/')
        ]);

        setItems(itemsRes.data);
        setEmployees(employeesRes.data.filter(emp => emp.status === 'Active'));
        setVehicles(vehiclesRes.data);

        // Fetch issuance records with fuel efficiency data
        const recordsRes = await api.get('/item_issuance/issuerecords/');
        setIssuedRecords(recordsRes.data);
      } catch (error) {
        console.error('Failed to load data:', error);
        setNotification({ show: true, message: 'Failed to load data.', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Refresh vehicle fuel records when form type changes to vehicle fuel
  useEffect(() => {
    if (formType === 'fuel' && fuelSubType === 'vehicle') {
      fetchVehicleFuelRecords();
    }
  }, [formType, fuelSubType]);

  const fetchVehicleFuelRecords = async () => {
    try {
      const response = await api.get('/item_issuance/issuerecords/', {
        params: {
          issue_type: 'fuel',
          fuel_type: 'vehicle'
        }
      });
      setIssuedRecords(response.data);
    } catch (error) {
      console.error('Failed to fetch vehicle fuel records:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormTypeChange = (e) => {
    setFormType(e.target.value);
    setFuelSubType('');
    setFormData({});
  };

  const handleFuelSubTypeChange = (e) => {
    setFuelSubType(e.target.value);
    setFormData({});
  };

  const fuelItems = useMemo(() => items.filter(item => item.category === 'fuel'), [items]);
  const toolItems = useMemo(() => items.filter(item => item.category === 'tool'), [items]);
  const materialItems = useMemo(() => items.filter(item => item.category === 'material'), [items]);

  const hasFuelInStock = fuelItems.some(item => item.quantity_in_stock > 0);
  const hasToolsInStock = toolItems.some(item => item.quantity_in_stock > 0);
  const hasMaterialsInStock = materialItems.some(item => item.quantity_in_stock > 0);

  const vehicleOptions = useMemo(() => 
    vehicles.map(v => ({
      id: v.id,
      name: v.vehicle_name ? `${v.vehicle_name} (${v.plate_number})` : v.plate_number,
      plateNumber: v.plate_number,
      vehicleName: v.vehicle_name,
      fuelTypeName: v.fuel_type_name,
      fuelTypeItemId: v.fuel_type_item_id,
      currentMileage: v.current_mileage || 0,
      fuelType: v.fuel_type_name ? ` - ${v.fuel_type_name}` : ''
    })), 
    [vehicles]
  );

  const employeeOptions = useMemo(() => 
    employees.map(emp => ({
      id: emp.id,
      name: emp.job_number ? `${emp.full_name} (${emp.job_number})` : emp.full_name,
      fullName: emp.full_name,
      jobNumber: emp.job_number
    })), 
    [employees]
  );

  const getItemOptions = (itemList) => 
    itemList.map(item => ({
      id: item.id,
      name: `${item.name} (${item.quantity_in_stock} ${item.unit})`,
      itemName: item.name,
      quantity: item.quantity_in_stock
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let payload = { 
        issued_to: parseInt(formData.employeeId), 
        issue_type: formType, 
        reason: formData.reason || '', 
        items: [] 
      };

      if (formType === 'material' || formType === 'tool') {
        if (!formData.itemId || !formData.quantity || !formData.employeeId || !formData.reason) {
          throw new Error('All fields are required');
        }
        const selectedItem = items.find(item => item.id === parseInt(formData.itemId));
        if (!selectedItem) throw new Error('Item not found');
        if (parseFloat(formData.quantity) > selectedItem.quantity_in_stock) {
          throw new Error(`Insufficient stock (${selectedItem.quantity_in_stock} ${selectedItem.unit})`);
        }
        payload.items = [{ item_id: selectedItem.id, quantity_issued: parseFloat(formData.quantity) }];
      }

      if (formType === 'fuel' && fuelSubType === 'vehicle') {
        if (!formData.employeeId || !formData.vehicleId || !formData.fuelLitres || !formData.currentMileage || !formData.reason) {
          throw new Error('All fields are required');
        }

        const vehicle = vehicles.find(v => v.id === parseInt(formData.vehicleId));
        if (!vehicle) throw new Error('Vehicle not found');
        
        if (!vehicle.fuel_type_item_id || !vehicle.fuel_type_name) {
          throw new Error(`Vehicle "${vehicle.plate_number}" has no fuel type assigned`);
        }

        const fuelLitres = parseFloat(formData.fuelLitres);
        if (fuelLitres <= 0) throw new Error('Fuel litres must be > 0');

        const currentMileage = parseInt(formData.currentMileage);
        if (currentMileage < 0) throw new Error('Mileage must be positive');

        const vehicleCurrentMileage = vehicle.current_mileage || 0;
        
        if (currentMileage <= vehicleCurrentMileage) {
          throw new Error(`Current mileage (${currentMileage}) must be greater than vehicle's current mileage (${vehicleCurrentMileage})`);
        }

        payload.items = [{ item_id: vehicle.fuel_type_item_id, quantity_issued: fuelLitres }];
        payload.fuel_litres = fuelLitres;
        payload.vehicle = parseInt(formData.vehicleId);
        payload.fuel_type = 'vehicle';
        payload.current_mileage = currentMileage;
      }

      if (formType === 'fuel' && fuelSubType === 'machine') {
        if (!formData.fuelItemId || !formData.quantity || !formData.employeeId || !formData.reason) {
          throw new Error('All fields are required');
        }
        const selectedFuelItem = items.find(item => item.id === parseInt(formData.fuelItemId));
        if (!selectedFuelItem) throw new Error('Fuel item not found');
        const quantity = parseFloat(formData.quantity);
        if (quantity <= 0) throw new Error('Quantity must be > 0');

        payload.items = [{ item_id: selectedFuelItem.id, quantity_issued: quantity }];
        payload.fuel_litres = quantity;
        payload.fuel_type = 'machine';
      }
      
      const response = await api.post('/item_issuance/issuerecords/', payload);
      
      setFormData({});
      setFuelSubType('');
      
      // Refresh the records list
      if (formType === 'fuel' && fuelSubType === 'vehicle') {
        fetchVehicleFuelRecords();
      } else {
        const recordsRes = await api.get('/item_issuance/issuerecords/');
        setIssuedRecords(recordsRes.data);
      }
      
      setNewRecordId(response.data.id);

      setTimeout(() => {
        const element = document.getElementById(`record-${response.data.id}`);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);

      setTimeout(() => setNewRecordId(null), 3000);

      setNotification({ show: true, message: 'Issuance request submitted!', type: 'success' });

    } catch (error) {
      let errorMessage = error.message || 'Submission failed';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          const errorData = error.response.data;
          
          if (errorData.vehicle) errorMessage = `Vehicle: ${errorData.vehicle}`;
          else if (errorData.fuel_type) errorMessage = `Fuel Type: ${errorData.fuel_type}`;
          else if (errorData.items) errorMessage = `Items: ${errorData.items}`;
          else if (errorData.fuel_litres) errorMessage = `Fuel Litres: ${errorData.fuel_litres}`;
          else if (errorData.current_mileage) errorMessage = `Current Mileage: ${errorData.current_mileage}`;
          else if (errorData.non_field_errors) errorMessage = errorData.non_field_errors.join(', ');
          else {
            const firstError = Object.values(errorData)[0];
            if (Array.isArray(firstError)) errorMessage = firstError[0];
            else if (typeof firstError === 'string') errorMessage = firstError;
          }
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }
      
      setNotification({ show: true, message: errorMessage, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmIssue = async (recordId) => {
    if (window.confirm('Confirm issue?')) {
      try {
        await api.post(`/item_issuance/issuerecords/${recordId}/issue_out/`);
        
        // Refresh the records to get updated fuel efficiency
        if (formType === 'fuel' && fuelSubType === 'vehicle') {
          fetchVehicleFuelRecords();
        } else {
          const recordsRes = await api.get('/item_issuance/issuerecords/');
          setIssuedRecords(recordsRes.data);
        }
        
        setNotification({ show: true, message: 'Item issued successfully!', type: 'success' });
      } catch (error) {
        setNotification({ 
          show: true, 
          message: error.response?.data?.error || 'Failed to issue', 
          type: 'error' 
        });
      }
    }
  };

  const handleCancelIssue = async (recordId) => {
    if (window.confirm('Cancel this issue request?')) {
      try {
        await api.post(`/item_issuance/issuerecords/${recordId}/cancel/`);
        
        // Refresh the records
        if (formType === 'fuel' && fuelSubType === 'vehicle') {
          fetchVehicleFuelRecords();
        } else {
          const recordsRes = await api.get('/item_issuance/issuerecords/');
          setIssuedRecords(recordsRes.data);
        }
        
        setNotification({ show: true, message: 'Request cancelled!', type: 'success' });
      } catch (error) {
        setNotification({ show: true, message: 'Cancel failed', type: 'error' });
      }
    }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <div className="p-4 mt-20">
      <h2 className="text-2xl font-semibold mb-6">Issue Out</h2>

      {notification.show && (
        <div className={`mb-4 p-3 rounded ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {notification.message}
        </div>
      )}

      <div className="mb-6">
        <label className="mr-4 font-medium">Issue Category:</label>
        <select value={formType} onChange={handleFormTypeChange} className="border rounded px-3 py-2">
          <option value="material" disabled={!hasMaterialsInStock}>Material</option>
          <option value="tool" disabled={!hasToolsInStock}>Tool</option>
          <option value="fuel" disabled={!hasFuelInStock}>Fuel</option>
        </select>

        {formType === 'fuel' && (
          <div className="mt-4">
            <label className="mr-4 font-medium">Fuel Type:</label>
            <select value={fuelSubType} onChange={handleFuelSubTypeChange} className="border rounded px-3 py-2" required>
              <option value="">Select Type</option>
              <option value="vehicle">Vehicle</option>
              <option value="machine">Machine</option>
            </select>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10 bg-[#4B553A] p-6 rounded shadow">
        {(formType === 'material' || formType === 'tool') && (
          <>
            <SearchableSelect
              label={formType === 'material' ? 'Material Name' : 'Tool Name'}
              name="itemId"
              value={formData.itemId || ''}
              onChange={handleChange}
              options={getItemOptions(formType === 'material' ? materialItems : toolItems)}
              required={true}
              placeholder="Type to search..."
              filterBy={['itemName', 'name']}
            />
            <div>
              <label className="block text-white mb-1">Quantity</label>
              <input 
                type="number" 
                name="quantity" 
                value={formData.quantity || ''} 
                onChange={handleChange} 
                className="w-full border rounded px-3 py-2" 
                required 
                min="0.1"
                step="0.1"
              />
            </div>
          </>
        )}

        {formType === 'fuel' && fuelSubType === 'vehicle' && (
          <>
            <SearchableSelect
              label="Vehicle"
              name="vehicleId"
              value={formData.vehicleId || ''}
              onChange={handleChange}
              options={vehicleOptions}
              required={true}
              placeholder="Search vehicle..."
              filterBy={['plateNumber', 'vehicleName']}
            />
            <div>
              <label className="block text-white mb-1">Fuel Litres</label>
              <input 
                type="number" 
                name="fuelLitres" 
                value={formData.fuelLitres || ''} 
                onChange={handleChange} 
                className="w-full border rounded px-3 py-2" 
                required 
                min="0.1"
                step="0.1"
                placeholder="Enter litres"
              />
            </div>
            <div>
              <label className="block text-white mb-1">Current Mileage</label>
              <input 
                type="number" 
                name="currentMileage" 
                value={formData.currentMileage || ''} 
                onChange={handleChange} 
                className="w-full border rounded px-3 py-2" 
                required 
                min="0"
                placeholder={`Enter mileage`}
              />
            </div>
          </>
        )}

        {formType === 'fuel' && fuelSubType === 'machine' && (
          <>
            <SearchableSelect
              label="Fuel Item"
              name="fuelItemId"
              value={formData.fuelItemId || ''}
              onChange={handleChange}
              options={getItemOptions(fuelItems)}
              required={true}
              placeholder="Search fuel..."
              filterBy={['itemName', 'name']}
            />
            <div>
              <label className="block text-white mb-1">Quantity (litres)</label>
              <input 
                type="number" 
                name="quantity" 
                value={formData.quantity || ''} 
                onChange={handleChange} 
                className="w-full border rounded px-3 py-2" 
                required 
                min="0.1"
                step="0.1"
                placeholder="Enter litres"
              />
            </div>
          </>
        )}

        <SearchableSelect
          label="Issued To"
          name="employeeId"
          value={formData.employeeId || ''}
          onChange={handleChange}
          options={employeeOptions}
          required={true}
          placeholder="Search employee..."
          filterBy={['fullName', 'jobNumber', 'name']}
        />

        <div>
          <label className="block text-white mb-1">Reason</label>
          <input 
            type="text" 
            name="reason" 
            value={formData.reason || ''} 
            onChange={handleChange} 
            className="w-full border rounded px-3 py-2" 
            required 
            placeholder="Purpose of issuance"
          />
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded mt-4">
            {isSubmitting ? 'Submitting...' : 'Submit Issue'}
          </button>
        </div>
      </form>

      {formType === 'fuel' && fuelSubType === 'vehicle' && (
        <VehicleFuelTable
          records={issuedRecords}
          newRecordId={newRecordId}
          handleConfirmIssue={handleConfirmIssue}
          handleCancelIssue={handleCancelIssue}
        />
      )}

      {(formType === 'material' || (formType === 'fuel' && fuelSubType === 'machine')) && (
        <MaterialFuelTable
          issuedRecords={issuedRecords.filter(record => {
            if (record.issue_type === 'material') return true;
            if (record.issue_type === 'fuel') return record.fuel_type === 'machine';
            return false;
          })}
          newRecordId={newRecordId}
          handleConfirmIssue={handleConfirmIssue}
          handleCancelIssue={handleCancelIssue}
        />
      )}

      {formType === 'tool' && (
        <ToolTable
          issuedRecords={issuedRecords}
          newRecordId={newRecordId}
          handleConfirmIssue={handleConfirmIssue}
          handleCancelIssue={handleCancelIssue}
        />
      )}
    </div>
  );
};

export default IssueOutPage;