import React, { useEffect } from 'react';
import SearchableSelect from './SearchableSelect';

const IssueOutForm = ({
  formType,
  fuelSubType,
  formData,
  handleChange,
  handleFormTypeChange,
  handleFuelSubTypeChange,
  handleSubmit,
  isSubmitting,
  materialItems,
  toolItems,
  fuelItems,
  employees,
  vehicles,
  itemsList,
  setItemsList
}) => {

  /* -------------------- Stock availability -------------------- */
  const hasFuelInStock = fuelItems.some(item => item.quantity_in_stock > 0);
  const hasToolsInStock = toolItems.some(item => item.quantity_in_stock > 0);
  const hasMaterialsInStock = materialItems.some(item => item.quantity_in_stock > 0);

  /* -------------------- Options mapping -------------------- */
  const vehicleOptions = vehicles.map(v => ({
    id: v.id,
    name: v.vehicle_name ? `${v.vehicle_name} (${v.plate_number})` : v.plate_number,
    plateNumber: v.plate_number,
    vehicleName: v.vehicle_name,
    fuel_type_item_id: v.fuel_type_item_id,
    fuel_type_name: v.fuel_type_name
  }));

  const employeeOptions = employees.map(emp => ({
    id: emp.id,
    name: emp.job_number ? `${emp.full_name} (${emp.job_number})` : emp.full_name,
    fullName: emp.full_name,
    jobNumber: emp.job_number
  }));

  /* -------------------- Item handlers -------------------- */
  const handleAddItem = () => setItemsList([...itemsList, { itemId: '', quantity: '' }]);
  const handleRemoveItem = index => setItemsList(itemsList.filter((_, i) => i !== index));
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...itemsList];
    updatedItems[index][field] = value;
    setItemsList(updatedItems);
  };
  const handleSelectChange = name => option => handleChange({ target: { name, value: option.id } });

  /* -------------------- Prevent duplicate items -------------------- */
  const selectedItemIds = itemsList.map(item => item.itemId).filter(Boolean);
  const getItemOptions = (itemList, currentIndex) =>
    itemList.map(item => ({
      id: item.id,
      name: `${item.name} (${item.quantity_in_stock} ${item.unit})`,
      itemName: item.name,
      isDisabled: selectedItemIds.includes(item.id) && item.id !== itemsList[currentIndex]?.itemId
    }));

  /* -------------------- Auto-fill fuel item from vehicle -------------------- */
  useEffect(() => {
    if (formType === 'fuel' && fuelSubType === 'vehicle' && formData.vehicleId) {
      const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
      if (selectedVehicle?.fuel_type_item_id) {
        // Attach silently, no input field on frontend
        handleChange({ target: { name: 'fuelItemId', value: selectedVehicle.fuel_type_item_id } });
      }
    }
  }, [formData.vehicleId, fuelSubType, formType, vehicles]);

  /* -------------------- Form submission handler -------------------- */
  const handleFormSubmit = (e) => {
    e.preventDefault();

    console.log('DEBUG: Form submitted', { formData, formType, fuelSubType });

    let payloadItems = itemsList
      .filter(item => item.itemId && item.quantity)
      .map(item => ({
        itemId: item.itemId,
        quantity: parseFloat(item.quantity)
      }));

    // Vehicle fuel: automatically push fuel item + litres + odometer
    if (formType === 'fuel' && fuelSubType === 'vehicle') {
      console.log('DEBUG: Vehicle fuel submission', {
        fuelItemId: formData.fuelItemId,
        fuelLitres: formData.fuelLitres,
        currentOdometer: formData.currentOdometer
      });

      payloadItems = [{
        itemId: formData.fuelItemId,
        quantity: parseFloat(formData.fuelLitres),
        currentOdometer: parseFloat(formData.currentOdometer) // Changed from parseInt to parseFloat
      }];
    }

    console.log('DEBUG: Final payload items', payloadItems);
    
    // Call the parent's handleSubmit with the properly formatted items
    handleSubmit(e, payloadItems);
  };

  /* -------------------- Validation -------------------- */
  const hasIncompleteItem =
    formType === 'fuel' && fuelSubType === 'vehicle'
      ? !formData.vehicleId || !formData.fuelLitres || !formData.employeeId || !formData.reason || !formData.currentOdometer
      : formType === 'fuel' && fuelSubType === 'machine'
        ? itemsList.some(item => !item.itemId || !item.quantity || !formData.employeeId || !formData.reason)
        : itemsList.some(item => !item.itemId || !item.quantity);

  const hasDuplicateItems = new Set(selectedItemIds).size !== selectedItemIds.length;

  /* -------------------- Render Form -------------------- */
  return (
    <form
      onSubmit={handleFormSubmit}  // CHANGED: Use handleFormSubmit instead of inline function
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10 bg-[#4B553A] p-6 rounded shadow"
    >
      {/* Issue Category */}
      <div className="md:col-span-3">
        <label className="mr-4 font-medium text-white">Issue Category:</label>
        <select
          value={formType}
          onChange={handleFormTypeChange}
          className="border rounded px-3 py-2"
        >
          <option value="material" disabled={!hasMaterialsInStock}>Material</option>
          <option value="tool" disabled={!hasToolsInStock}>Tool</option>
          <option value="fuel" disabled={!hasFuelInStock}>Fuel</option>
        </select>
      </div>

      {/* Fuel Subtype */}
      {formType === 'fuel' && (
        <div className="md:col-span-3">
          <label className="mr-4 font-medium text-white">Fuel Type:</label>
          <select
            value={fuelSubType}
            onChange={handleFuelSubTypeChange}
            className="border rounded px-3 py-2"
          >
            <option value="vehicle">Vehicle Fuel</option>
            <option value="machine">Machine Fuel</option>
          </select>
        </div>
      )}

      {/* Vehicle Fuel Form */}
{formType === 'fuel' && fuelSubType === 'vehicle' && (
  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
    
    <SearchableSelect
      label="Vehicle"
      value={formData.vehicleId || ''}
      onChange={handleSelectChange('vehicleId')}
      options={vehicleOptions}
      required
      placeholder="Select vehicle..."
      filterBy={['vehicleName', 'plateNumber', 'name']}
    />

    {/* Current Odometer */}
    <div>
      <label className="block text-white mb-1">Current Odometer (km)</label>
      <input
        type="number"
        name="currentOdometer"
        value={formData.currentOdometer || ''}
        onChange={handleChange}
        className="w-full border rounded px-3 py-2"
        required
        min="0"
        step="0.1"
        placeholder="Enter current odometer"
      />
    </div>

    {/* Fuel Litres */}
    <div>
      <label className="block text-white mb-1">Fuel (Litres)</label>
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

    <SearchableSelect
      label="Issued To"
      value={formData.employeeId || ''}
      onChange={handleSelectChange('employeeId')}
      options={employeeOptions}
      required
      placeholder="Select employee..."
      filterBy={['fullName', 'jobNumber', 'name']}
    />

    {/* Reason */}
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

  </div>
)}


      {/* Machine Fuel Form */}
      {formType === 'fuel' && fuelSubType === 'machine' && (
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SearchableSelect
            label="Fuel Item"
            value={itemsList[0]?.itemId || ''}
            onChange={option => handleItemChange(0, 'itemId', option.id)}
            options={fuelItems.map(f => ({
              id: f.id,
              name: `${f.name} (${f.quantity_in_stock} ${f.unit})`,
              itemName: f.name
            }))}
            required
            placeholder="Select fuel..."
            filterBy={['itemName', 'name']}
          />

          <div>
            <label className="block text-white mb-1">Quantity</label>
            <input
              type="number"
              value={itemsList[0]?.quantity || ''}
              onChange={e => handleItemChange(0, 'quantity', e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
              min="0.1"
              step="0.1"
            />
          </div>

          <SearchableSelect
            label="Issued To"
            value={formData.employeeId || ''}
            onChange={handleSelectChange('employeeId')}
            options={employeeOptions}
            required
            placeholder="Select employee..."
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
        </div>
      )}

      {/* Material / Tool Items */}
      {(formType === 'material' || formType === 'tool') && (
        <div className="md:col-span-3">
          <div className="grid grid-cols-1 gap-4 mb-4">
            {itemsList.map((item, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                <SearchableSelect
                  label={formType === 'material' ? 'Material Name' : 'Tool Name'}
                  value={item.itemId}
                  onChange={option => handleItemChange(index, 'itemId', option.id)}
                  options={getItemOptions(
                    formType === 'material' ? materialItems : toolItems,
                    index
                  )}
                  required
                  placeholder="Type to search..."
                  filterBy={['itemName', 'name']}
                />

                <div>
                  <label className="block text-white mb-1">Quantity</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                    min="0.1"
                    step="0.1"
                  />
                </div>

                {index > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="w-full px-3 py-2 rounded font-semibold text-white bg-red-600 hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {index === 0 && (
                  <>
                    <SearchableSelect
                      label="Issued To"
                      value={formData.employeeId || ''}
                      onChange={handleSelectChange('employeeId')}
                      options={employeeOptions}
                      required
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
                  </>
                )}
              </div>
            ))}
          </div>

          {hasDuplicateItems && (
            <p className="text-red-400 text-sm mb-2">
              Same item cannot be issued more than once.
            </p>
          )}

          <button
            type="button"
            onClick={handleAddItem}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded"
          >
            + Add Item
          </button>
        </div>
      )}

      {/* Submit */}
      <div className="md:col-span-2 lg:col-span-3">
        <button
          type="submit"
          disabled={isSubmitting || hasIncompleteItem || hasDuplicateItems}
          className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded mt-4
            ${(hasIncompleteItem || hasDuplicateItems) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Issue'}
        </button>
      </div>
    </form>
  );
};

export default IssueOutForm;