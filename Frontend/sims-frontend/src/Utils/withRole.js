// src/Utils/withRole.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; // ✅ Default import

const withRole = (Component, allowedRoles = []) => {
  return (props) => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      console.warn('⛔ No token found → redirecting to /login');
      return <Navigate to="/login" replace />;
    }

    try {
      const decoded = jwtDecode(token);
      const userRole = decoded.role;
      console.log('🔐 Decoded role:', userRole);

      if (allowedRoles.includes(userRole)) {
        console.log('✅ Access granted to:', userRole);
        return <Component {...props} />;
      } else {
        console.warn('🚫 Role not allowed:', userRole);
        return <Navigate to="/unauthorized" replace />;
      }
    } catch (error) {
      console.error('❌ JWT decoding failed:', error);
      return <Navigate to="/login" replace />;
    }
  };
};

export default withRole;
