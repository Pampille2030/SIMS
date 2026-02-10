// src/Pages/Livestock/LivestockDefinitionPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LivestockDefinitionPage = () => {
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [remarks, setRemarks] = useState('');
  const [definitions, setDefinitions] = useState([]);
  const [message, setMessage] = useState('');

  const [typesList, setTypesList] = useState(['Cow', 'Sheep', 'Goat']); // initial types

  // Fetch existing definitions on page load
  useEffect(() => {
    fetchDefinitions();
  }, []);

  const fetchDefinitions = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get('/api/livestock-definitions/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDefinitions(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!type || !category) {
      setMessage('Type and Category are required.');
      return;
    }
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(
        '/api/livestock-definitions/',
        { type, category, remarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Livestock definition added successfully!');

      // Add new type to local list if it doesn't exist
      if (!typesList.includes(type)) setTypesList([...typesList, type]);

      setType('');
      setCategory('');
      setRemarks('');
      fetchDefinitions(); // refresh list
    } catch (error) {
      console.error(error);
      setMessage(
        error.response?.data?.detail || 'Failed to add definition.'
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-8 p-6 shadow rounded" style={{ backgroundColor: '#4a533b' }}>
      <h1 className="text-2xl font-semibold mb-4 text-white">
        Define Livestock Type & Category
      </h1>

      {message && (
        <div
          className={`mb-4 p-2 text-white ${
            message.includes('success') ? 'bg-green-500' : 'bg-red-500'
          } rounded`}
        >
          {message}
        </div>
      )}

      {/* Form: Single row layout */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end space-x-4 mb-6 flex-wrap"
      >
        {/* Type */}
        <div className="flex flex-col">
          <label className="mb-1 font-medium text-white">Type</label>
          <input
            list="typesList"
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="Select or type type"
            className="px-3 py-2 border rounded w-40 text-black"
            required
          />
          <datalist id="typesList">
            {typesList.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        {/* Category */}
        <div className="flex flex-col">
          <label className="mb-1 font-medium text-white">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Enter category"
            className="px-3 py-2 border rounded w-40 text-black"
            required
          />
        </div>

        {/* Remarks */}
        <div className="flex flex-col flex-1">
          <label className="mb-1 font-medium text-white">Remarks</label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional remarks"
            className="px-3 py-2 border rounded w-full text-black"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          style={{ backgroundColor: '#4a533b' }}
          className="px-6 py-2 text-white font-semibold rounded hover:opacity-90 transition"
        >
          Add
        </button>
      </form>

      {/* Existing Definitions Table */}
      {definitions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2 text-white">Existing Definitions</h2>
          <table className="w-full border text-white">
            <thead>
              <tr className="bg-gray-200 text-black">
                <th className="px-3 py-2 border">Date</th>
                <th className="px-3 py-2 border">Type</th>
                <th className="px-3 py-2 border">Category</th>
                <th className="px-3 py-2 border">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {definitions.map((def) => (
                <tr key={def.id}>
                  <td className="px-3 py-2 border">
                    {def.created_at ? new Date(def.created_at).toLocaleDateString() : '-'}uuu
                  </td>
                  <td className="px-3 py-2 border">{def.type}</td>
                  <td className="px-3 py-2 border">{def.category}</td>
                  <td className="px-3 py-2 border">{def.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LivestockDefinitionPage;
