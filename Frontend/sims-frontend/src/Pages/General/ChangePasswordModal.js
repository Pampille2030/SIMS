import React, { useState } from 'react';
import api from '../../Utils/api';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Frontend validation
    if (formData.new_password !== formData.confirm_password) {
      setMessage("New passwords do not match.");
      return;
    }
    if (formData.new_password.length < 8) {
      setMessage("New password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/change-password/', {
  old_password: formData.old_password,
  new_password: formData.new_password,
  confirm_password: formData.confirm_password,
});

      setMessage(res.data.detail || 'Password changed successfully.');
      setFormData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === 'object') {
        const messages = Object.values(errors).flat().join(' ');
        setMessage(messages);
      } else {
        setMessage('Password change failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
        <h2 className="text-xl font-bold mb-4 text-center" style={{ color: '#4B553A' }}>
  Change Password
</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            name="old_password"
            placeholder="Old Password"
            value={formData.old_password}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
          />
          <input
            type="password"
            name="new_password"
            placeholder="New Password"
            value={formData.new_password}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
          />
          <input
            type="password"
            name="confirm_password"
            placeholder="Confirm New Password"
            value={formData.confirm_password}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
          />
          
          <button
  type="submit"
  disabled={loading}
  className={`w-full py-2 rounded text-white hover:opacity-90 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
  style={{ backgroundColor: '#4B553A' }}
>
  {loading ? 'Changing...' : 'Change Password'}
</button>

        </form>
        {message && (
          <p className="mt-3 text-sm text-center text-red-600">{message}</p>
        )}
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-500 hover:text-red-600 text-xl"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
