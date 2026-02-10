// src/Pages/Store/Issuance/IssueOutPage.js
import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../Utils/api';
import IssueOutForm from './Components/IssueOutForm';
import VehicleFuelTable from './Components/VehicleFuelTable';
import MaterialTable from './Components/MaterialTable';
import ToolTable from './Components/ToolTable';

const IssueOutPage = () => {
  const [formType, setFormType] = useState('material');
  const [fuelSubType, setFuelSubType] = useState('');
  const [formData, setFormData] = useState({});
  const [items, setItems] = useState([]);
  const [itemsList, setItemsList] = useState([{ itemId: '', quantity: '' }]);
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [issuedRecords, setIssuedRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRecordId, setNewRecordId] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  /* -------------------- Fetch initial data -------------------- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [itemsRes, employeesRes, vehiclesRes, recordsRes] = await Promise.all([
          api.get('/inventory/items/'),
          api.get('/employees/'),
          api.get('/item_issuance/vehicles/'),
          api.get('/item_issuance/issuerecords/')
        ]);

        setItems(itemsRes.data);
        setEmployees(employeesRes.data.filter(emp => emp.status === 'Active'));
        setVehicles(
          vehiclesRes.data.map(v => ({
            ...v,
            fuelTypeItemId: v.fuel_type_item_id,
            fuelTypeName: v.fuel_type_name
          }))
        );
        setIssuedRecords(recordsRes.data);
      } catch (error) {
        setNotification({ show: true, message: 'Failed to load data.', type: 'error' });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  /* -------------------- Vehicle fuel records -------------------- */
  useEffect(() => {
    if (formType === 'fuel' && fuelSubType === 'vehicle') {
      fetchVehicleFuelRecords();
    }
  }, [formType, fuelSubType]);

  const fetchVehicleFuelRecords = async () => {
    try {
      const response = await api.get('/item_issuance/issuerecords/', {
        params: { issue_type: 'fuel', fuel_type: 'vehicle' }
      });
      setIssuedRecords(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  /* -------------------- Handlers -------------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormTypeChange = (e) => {
    const selectedType = e.target.value;
    setFormType(selectedType);
    setFuelSubType(selectedType === 'fuel' ? 'vehicle' : '');
    setFormData({});
    setItemsList([{ itemId: '', quantity: '' }]);
  };

  const handleFuelSubTypeChange = (e) => {
    setFuelSubType(e.target.value);
    setFormData({});
    setItemsList([{ itemId: '', quantity: '' }]);
  };

  const handleConfirmIssue = async (id) => {
    try {
      await api.patch(`/item_issuance/issuerecords/${id}/`, { status: 'Issued' });
      setIssuedRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'Issued' } : r));
    } catch (error) {
      console.error(error);
    }
  };

  const handleCancelIssue = async (id) => {
    try {
      await api.patch(`/item_issuance/issuerecords/${id}/`, { status: 'Cancelled' });
      setIssuedRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'Cancelled' } : r));
    } catch (error) {
      console.error(error);
    }
  };

  /* -------------------- Categorized items -------------------- */
  const materialItems = useMemo(() => items.filter(i => i.category === 'material'), [items]);
  const toolItems = useMemo(() => items.filter(i => i.category === 'tool'), [items]);
  const fuelItems = useMemo(() => items.filter(i => i.category === 'fuel'), [items]);

  /* -------------------- Submit -------------------- */
  const handleSubmit = async (e, submittedItemsList) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const employeeId = parseInt(formData.employeeId);
      if (!employeeId) throw new Error('Select a valid employee');

      let payload = {
        issued_to: employeeId,
        issue_type: formType,
        reason: formData.reason || '',
        items: []
      };

      // Material / Tool
      if (formType === 'material' || formType === 'tool') {
        const validItems = submittedItemsList.filter(i => i.itemId && i.quantity);
        if (!validItems.length) throw new Error('Select at least one item');

        payload.items = validItems.map(item => {
          const selectedItem = items.find(i => i.id === parseInt(item.itemId));
          if (!selectedItem) throw new Error('Select a valid item');

          const qty = parseFloat(item.quantity);
          if (isNaN(qty) || qty <= 0) throw new Error('Quantity must be greater than 0');
          if (qty > selectedItem.quantity_in_stock) {
            throw new Error(`Insufficient stock for ${selectedItem.name}`);
          }

          return { item_id: selectedItem.id, quantity_issued: qty };
        });
      }

      // Fuel
      if (formType === 'fuel') {
        if (fuelSubType === 'vehicle') {
          const vehicleId = parseInt(formData.vehicleId);
          const vehicle = vehicles.find(v => v.id === vehicleId);
          if (!vehicle || !vehicle.fuelTypeItemId) throw new Error('Select a valid vehicle');

          const qty = parseFloat(formData.fuelLitres);
          if (isNaN(qty) || qty <= 0) throw new Error('Fuel quantity must be greater than 0');

          // ✅ FIXED: Include odometer reading INSIDE the items array
          const odometer = parseFloat(formData.currentOdometer); // Changed to parseFloat
          if (isNaN(odometer) || odometer < 0) throw new Error('Enter a valid current odometer');

          payload.items = [{ 
            item_id: vehicle.fuelTypeItemId, 
            quantity_issued: qty.toString(), // toString() for Decimal field
            current_odometer: odometer  // ✅ MOVED FROM TOP LEVEL TO INSIDE ITEMS ARRAY
          }];
          payload.vehicle = vehicleId;
          payload.fuel_type = 'vehicle';
          // ❌ REMOVED: payload.current_odometer = odometer; // Don't send at top level

        } else if (fuelSubType === 'machine') {
          const validItems = submittedItemsList.filter(i => i.itemId && i.quantity);
          if (!validItems.length) throw new Error('Select a valid fuel item');

          payload.items = validItems.map(item => {
            const fuelItem = fuelItems.find(f => f.id === parseInt(item.itemId));
            if (!fuelItem) throw new Error('Select a valid fuel item');

            const qty = parseFloat(item.quantity);
            if (isNaN(qty) || qty <= 0) throw new Error('Fuel quantity must be greater than 0');
            if (qty > fuelItem.quantity_in_stock) {
              throw new Error(`Insufficient stock for ${fuelItem.name}`);
            }

            return { item_id: fuelItem.id, quantity_issued: qty };
          });

          payload.fuel_type = 'machine';
        }
      }

      console.log('DEBUG: Payload being sent:', payload); // Add this for debugging

      const response = await api.post('/item_issuance/issuerecords/', payload);

      // Refresh all issued records
      const res = await api.get('/item_issuance/issuerecords/');
      setIssuedRecords(res.data);

      // Reset form
      setFormData({});
      setFuelSubType(formType === 'fuel' ? 'vehicle' : '');
      setItemsList([{ itemId: '', quantity: '' }]);
      setNewRecordId(response.data.id);
      setNotification({ show: true, message: 'Issuance submitted successfully!', type: 'success' });

    } catch (error) {
      console.error('DEBUG: Submission error:', error.response?.data || error.message);
      setNotification({ show: true, message: error.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* -------------------- UI -------------------- */
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 mt-20">
      <h2 className="text-2xl font-semibold mb-6">Issue Out</h2>

      {notification.show && (
        <div className={`mb-4 p-3 rounded ${
          notification.type === 'success'
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }`}>
          {notification.message}
        </div>
      )}

      {/* -------------------- Issue Form -------------------- */}
      <IssueOutForm
        formType={formType}
        fuelSubType={fuelSubType}
        formData={formData}
        handleChange={handleChange}
        handleFormTypeChange={handleFormTypeChange}
        handleFuelSubTypeChange={handleFuelSubTypeChange}
        handleSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        materialItems={materialItems}
        toolItems={toolItems}
        fuelItems={fuelItems}
        employees={employees}
        vehicles={vehicles}
        itemsList={itemsList}
        setItemsList={setItemsList}
      />

      {/* -------------------- Issue Tables -------------------- */}
      {formType === 'fuel' && fuelSubType === 'vehicle' && (
        <VehicleFuelTable
          records={issuedRecords}
          newRecordId={newRecordId}
          handleConfirmIssue={handleConfirmIssue}
          handleCancelIssue={handleCancelIssue}
        />
      )}

      {/* Material + Machine Fuel */}
      {(formType === 'material' || (formType === 'fuel' && fuelSubType === 'machine')) && (
        <MaterialTable
          issuedRecords={issuedRecords}
          newRecordId={newRecordId}
          handleConfirmIssue={handleConfirmIssue}
          handleCancelIssue={handleCancelIssue}
        />
      )}

      {/* Tool */}
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