import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../Utils/api'; // axios instance with token headers

const ForgotPassword = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post('/auth/forgot-password/', { email });
      toast.success(res.data.detail || 'Reset link sent successfully!');
      setEmail('');
    } catch (err) {
      if (err.response && err.response.status === 404) {
        toast.error('Email address not found.');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#4B553A]">
      <Toaster position="top-right" />
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-center text-[#4B553A]">Reset Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#4B553A] focus:border-[#4B553A]"
              placeholder="Enter your email"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#4B553A] text-white py-2 rounded-md hover:bg-[#3a442e] transition duration-200"
          >
            Send Reset Link
          </button>

          <div className="text-sm text-center mt-4">
            <Link to="/login" className="text-[#4B553A] hover:underline">
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
