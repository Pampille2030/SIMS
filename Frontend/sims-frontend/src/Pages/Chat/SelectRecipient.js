// src/Components/Chat/SelectRecipient.js
import React, { useState, useEffect } from 'react';
import api from '../../Utils/api';

const SelectRecipient = ({ onSelect }) => {
  const [managers, setManagers] = useState([]);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const response = await api.get('chat/managers/');
        setManagers(response.data);
      } catch (error) {
        console.error('Error fetching manager list:', error);
      }
    };

    fetchManagers();
  }, []);

  const handleChange = (e) => {
    const selectedValue = e.target.value;
    setSelectedId(selectedValue);
    const selectedUser = managers.find(user => user.id.toString() === selectedValue);
    if (selectedUser) {
      onSelect(selectedUser); // Send selected user to parent
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700">Select Manager to Chat</label>
      <select
        value={selectedId}
        onChange={handleChange}
        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
      >
        <option value="">-- Select Manager --</option>
        {managers.map((manager) => (
          <option key={manager.id} value={manager.id}>
            {manager.username} ({manager.role})
          </option>
        ))}
      </select>
    </div>
  );
};

export default SelectRecipient;
