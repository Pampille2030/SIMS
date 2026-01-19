import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center">
    <h1 className="text-4xl font-bold text-red-600 mb-4">403 - Unauthorized</h1>
    <p className="text-gray-700 mb-6">You do not have permission to view this page.</p>
    <Link to="/" className="text-blue-600 underline">Back to Dashboard</Link>
  </div>
);

export default Unauthorized;
