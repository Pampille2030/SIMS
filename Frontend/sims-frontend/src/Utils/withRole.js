import React from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const withRole = (Component, allowedRoles = []) => {
  return (props) => {
    const token =
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken');

    if (!token) {
      console.warn(' No token found → redirecting to /login');
      return <Navigate to="/login" replace />;
    }

    try {
      const decoded = jwtDecode(token);

      const userRole = decoded.role?.toLowerCase();
      const allowed = allowedRoles.map(r => r.toLowerCase());

      if (allowed.includes(userRole)) {
        return <Component {...props} />;
      } else {
        return <Navigate to="/unauthorized" replace />;
      }
    } catch (error) {
      return <Navigate to="/login" replace />;
    }
  };
};

export default withRole;
